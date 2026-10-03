/**
 * Playlist Engine
 *
 * Implements BitChord playlist algorithms:
 * 1. MPREb album-to-VL-playlist expansion for full tracklist resolution.
 * 2. 3-stage ownership detection heuristic.
 * 3. Separation of "Suggestions" shelf from real playlist items.
 * 4. Exact setVideoId mutation building.
 */

export interface RawPlaylistResponse {
  header?: {
    title?: string;
    playButtonPlaylistId?: string;
  };
  previewTracksCount?: number;
}

export interface OwnershipSignals {
  hasEditableHeader: boolean;
  menuIcons: string[];
  hasSaveToggle: boolean;
}

export interface PartitionedTracks<T> {
  playlistTracks: T[];
  suggestedTracks: T[];
}

export interface RemoveEntry {
  videoId: string;
  setVideoId: string;
}

export class PlaylistEngine {
  /**
   * Expands catalogue album IDs (MPREb...) into backing playlist IDs (VL...)
   * to bypass YouTube's 3-5 track preview truncation bug.
   */
  static resolveAlbumBackingPlaylist(
    browseId: string,
    response: RawPlaylistResponse
  ): { isAlbum: boolean; backingPlaylistBrowseId: string | null } {
    if (!browseId.startsWith('MPREb')) {
      return { isAlbum: false, backingPlaylistBrowseId: null };
    }

    const playPlaylistId = response.header?.playButtonPlaylistId;
    if (!playPlaylistId) {
      return { isAlbum: true, backingPlaylistBrowseId: null };
    }

    const clean = playPlaylistId.replace(/^VL/, '');
    return {
      isAlbum: true,
      backingPlaylistBrowseId: `VL${clean}`,
    };
  }

  /**
   * BitChord 3-stage heuristic to detect if account owns the playlist.
   */
  static determineOwnership(signals: OwnershipSignals): boolean {
    if (signals.hasEditableHeader) return true;
    if (signals.menuIcons.some((icon) => icon === 'DELETE' || icon === 'EDIT')) return true;
    if (!signals.hasSaveToggle) return true;
    return false;
  }

  /**
   * Keeps suggested tracks strictly out of the actual playlist songs array.
   */
  static partitionTracks<T extends { isSuggested?: boolean }>(
    items: T[]
  ): PartitionedTracks<T> {
    const playlistTracks: T[] = [];
    const suggestedTracks: T[] = [];

    for (const item of items) {
      if (item.isSuggested) {
        suggestedTracks.push(item);
      } else {
        playlistTracks.push(item);
      }
    }

    return { playlistTracks, suggestedTracks };
  }

  /**
   * Generates remove action payload using setVideoId to guarantee correct deletion
   * when identical tracks exist in the same playlist.
   */
  static buildRemovePayload(playlistBrowseId: string, entries: RemoveEntry[]) {
    const playlistId = playlistBrowseId.replace(/^VL/, '');
    const actions = entries.map((entry) => ({
      action: 'ACTION_REMOVE_VIDEO',
      setVideoId: entry.setVideoId,
      removedVideoId: entry.videoId,
    }));

    return { playlistId, actions };
  }
}
