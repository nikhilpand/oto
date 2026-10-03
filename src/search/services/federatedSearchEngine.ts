/**
 * Federated Search Engine
 *
 * Implements BitChord search protocol:
 * 1. Two-phase search: Cookie-stripped anonymous live typeahead vs authenticated final query.
 * 2. Exact protobuf base64 search category parameters.
 * 3. Promoted card shelf top result extraction.
 * 4. Identity-key deduplication (v:videoId, b:browseId).
 */

export enum SearchFilterType {
  ALL = 'ALL',
  SONGS = 'SONGS',
  VIDEOS = 'VIDEOS',
  ALBUMS = 'ALBUMS',
  ARTISTS = 'ARTISTS',
  PLAYLISTS = 'PLAYLISTS',
}

export const SEARCH_PROTOBUF_PARAMS: Record<SearchFilterType, string | null> = {
  [SearchFilterType.ALL]: null,
  [SearchFilterType.SONGS]: 'EgWKAQIIAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.VIDEOS]: 'EgWKAQIQAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.ALBUMS]: 'EgWKAQIYAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.ARTISTS]: 'EgWKAQIgAWoKEAkQChAFEAMQBA==',
  [SearchFilterType.PLAYLISTS]: 'EgWKAQIoAWoKEAkQChAFEAMQBA==',
};

export interface RawSearchHit {
  kind: 'card_shelf' | 'row' | 'browse';
  videoId?: string;
  browseId?: string;
  title: string;
  artist?: string;
  subtitle?: string;
  thumbnailUrl?: string;
  isVideo?: boolean;
}

export interface PreparedRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    query: string;
    params?: string;
  };
  isAnonymous: boolean;
}

export interface AssembledSearchResults {
  topResult: RawSearchHit | null;
  tracks: RawSearchHit[];
  browseItems: RawSearchHit[];
}

export class FederatedSearchEngine {
  /**
   * Prepares unauthenticated typeahead request to prevent user search history pollution.
   */
  static prepareTypeaheadRequest(params: {
    query: string;
    userCookie?: string;
  }): PreparedRequest {
    return {
      url: 'https://music.youtube.com/youtubei/v1/search',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        query: params.query,
      },
      isAnonymous: true,
    };
  }

  /**
   * Prepares authenticated search request for confirmed user searches.
   */
  static prepareConfirmedSearchRequest(params: {
    query: string;
    filter: SearchFilterType;
    userCookie?: string;
  }): PreparedRequest {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (params.userCookie) {
      headers['Cookie'] = params.userCookie;
    }

    const protoParam = SEARCH_PROTOBUF_PARAMS[params.filter];
    return {
      url: 'https://music.youtube.com/youtubei/v1/search',
      headers,
      body: {
        query: params.query,
        ...(protoParam ? { params: protoParam } : {}),
      },
      isAnonymous: !params.userCookie,
    };
  }

  /**
   * Promotes top card shelf, eliminates duplicate video and browse IDs.
   */
  static assembleSearchResults(params: {
    topCard: RawSearchHit | null;
    rows: RawSearchHit[];
    filter: SearchFilterType;
  }): AssembledSearchResults {
    const seen = new Set<string>();
    let topResult: RawSearchHit | null = null;

    if (params.topCard && params.topCard.videoId && !params.topCard.isVideo) {
      topResult = params.topCard;
      seen.add(`v:${params.topCard.videoId}`);
    }

    const tracks: RawSearchHit[] = [];
    const browseItems: RawSearchHit[] = [];

    for (const row of params.rows) {
      if (row.browseId) {
        const key = `b:${row.browseId}`;
        if (!seen.has(key)) {
          seen.add(key);
          browseItems.push(row);
        }
      } else if (row.videoId) {
        const key = `v:${row.videoId}`;
        if (!seen.has(key) && !row.isVideo) {
          seen.add(key);
          tracks.push(row);
        }
      }
    }

    return { topResult, tracks, browseItems };
  }
}
