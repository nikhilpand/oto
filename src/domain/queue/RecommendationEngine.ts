/**
 * Recommendation Engine
 *
 * Implements BitChord recommendations and autoplay:
 * 1. 4-Stage waterfall Quick Picks with strict history and queue exclusion.
 * 2. RDAMVM radio queue builder and seed-track stripping.
 * 3. Watchtime telemetry pings for recommendation reinforcement.
 */

export interface CandidateTrack {
  id: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
}

export interface HomeCandidateShelf {
  title: string;
  tracks: CandidateTrack[];
}

export class RecommendationEngine {
  /**
   * 4-Stage waterfall Quick Picks recommendation algorithm.
   */
  static quickPicks(
    shelves: HomeCandidateShelf[],
    excludeIds: Set<string>,
    exploreFallback: CandidateTrack[] = []
  ): CandidateTrack[] {
    // 1. Direct "Quick picks", "Mix", or "Recommend" shelf
    const directShelf = shelves.find((shelf) => {
      const lower = shelf.title.toLowerCase();
      return (
        lower.includes('quick') ||
        lower.includes('pick') ||
        lower.includes('mix') ||
        lower.includes('recommend')
      );
    });

    if (directShelf) {
      const filtered = directShelf.tracks.filter((t) => !excludeIds.has(t.id));
      if (filtered.length > 0) return filtered;
    }

    // 2. Candidate shelves (excluding recent/history/listen again, skip top shelf)
    const candidateShelves = shelves.length > 1 ? shelves.slice(1) : shelves;
    const cleanShelves = candidateShelves.filter((shelf) => {
      const lower = shelf.title.toLowerCase();
      return (
        !lower.includes('recent') &&
        !lower.includes('history') &&
        !lower.includes('listen again')
      );
    });

    const shelfTracks: CandidateTrack[] = [];
    const seen = new Set<string>();

    for (const shelf of cleanShelves) {
      for (const track of shelf.tracks) {
        if (!excludeIds.has(track.id) && !seen.has(track.id)) {
          seen.add(track.id);
          shelfTracks.push(track);
        }
      }
    }
    if (shelfTracks.length > 0) return shelfTracks;

    // 3. Global Home flat tracks
    for (const shelf of shelves) {
      for (const track of shelf.tracks) {
        if (!excludeIds.has(track.id) && !seen.has(track.id)) {
          seen.add(track.id);
          shelfTracks.push(track);
        }
      }
    }
    if (shelfTracks.length > 0) return shelfTracks;

    // 4. Explore / New Releases Fallback
    return exploreFallback.filter((t) => !excludeIds.has(t.id));
  }

  /**
   * Builds the RDAMVM radio payload for YouTube Music next endpoint.
   */
  static buildRadioPayload(videoId: string) {
    return {
      videoId,
      playlistId: `RDAMVM${videoId}`,
      isAudioOnly: true,
    };
  }

  /**
   * Parses radio watch queue and filters out the seed track at index 0.
   */
  static parseRadioQueue<T extends { videoId: string }>(
    queue: T[],
    seedVideoId: string
  ): T[] {
    return queue.filter((item) => item.videoId !== seedVideoId);
  }
}
