/**
 * Search Federator
 *
 * Implements BitChord multi-source search federation with custom rank slicing
 * (sources above YouTube vs below YouTube) and background stream pre-warming.
 */

import { Track } from '@/domain/types';

export interface SourceSearchProvider {
  id: string;
  rank: number;
  search(query: string, limit?: number): Promise<Track[]>;
}

export interface FederationParams {
  query: string;
  youtubeRank: number;
  youtubeTracks: Track[];
  externalSources: SourceSearchProvider[];
  timeoutMs?: number;
  limitPerSource?: number;
}

export class SearchFederator {
  static async federate(params: FederationParams): Promise<Track[]> {
    const timeoutMs = params.timeoutMs ?? 1500;
    const limit = params.limitPerSource ?? 10;

    const queryPromise = (provider: SourceSearchProvider): Promise<{ provider: SourceSearchProvider; tracks: Track[] }> => {
      const searchWithTimeout = Promise.race([
        provider.search(params.query, limit),
        new Promise<Track[]>((_, reject) =>
          setTimeout(() => reject(new Error('Source search timed out')), timeoutMs)
        ),
      ]);

      return searchWithTimeout
        .then((tracks) => ({ provider, tracks }))
        .catch(() => ({ provider, tracks: [] }));
    };

    const externalResults = await Promise.all(params.externalSources.map(queryPromise));

    const aboveYoutube: Track[] = [];
    const belowYoutube: Track[] = [];

    for (const res of externalResults) {
      if (res.provider.rank < params.youtubeRank) {
        aboveYoutube.push(...res.tracks);
      } else {
        belowYoutube.push(...res.tracks);
      }
    }

    return [...aboveYoutube, ...params.youtubeTracks, ...belowYoutube];
  }

  /**
   * Pre-warms stream URL for the top result in the background so tapping starts instantaneously.
   */
  static prewarmTopResult(
    trackId: string,
    resolveStreamUrl: (id: string) => Promise<string | null>
  ): Promise<string | null> {
    return resolveStreamUrl(trackId).catch(() => null);
  }
}
