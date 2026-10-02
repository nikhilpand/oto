/**
 * InnertubeClient — Clean-room YouTube Music Innertube API Client
 *
 * Implements WEB_REMIX API transport with SAPISIDHASH signing,
 * session management, and response extraction.
 *
 * Zero native dependencies. Operates over standard fetch.
 */

import { sapisidHash } from './crypto';
import {
  parseAccount,
  parsePlaylistSongs,
  parseUserPlaylists,
  parseHomeFeed,
  ParsedHomeSection,
} from './innertubeParsers';
import {
  InnertubeAccount,
  InnertubePlaylist,
  InnertubeSession,
  InnertubeSong,
} from './types';

const MUSIC_API_BASE = 'https://music.youtube.com/youtubei/v1';
const MUSIC_ORIGIN = 'https://music.youtube.com';
const WEB_REMIX_CLIENT_NAME = '67';
const DEFAULT_CLIENT_VERSION = '1.20250101.01.00';
const WEB_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export class InnertubeClient {
  /**
   * Sends an authenticated (or anonymous) POST request to an Innertube endpoint.
   */
  async postMusic(
    endpoint: string,
    body: Record<string, any>,
    session?: InnertubeSession | null
  ): Promise<any | null> {
    try {
      const clientVersion = session?.clientVersion || DEFAULT_CLIENT_VERSION;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': WEB_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Origin': MUSIC_ORIGIN,
        'Origin': MUSIC_ORIGIN,
        'Referer': `${MUSIC_ORIGIN}/`,
        'X-YouTube-Client-Name': WEB_REMIX_CLIENT_NAME,
        'X-YouTube-Client-Version': clientVersion,
      };

      if (session) {
        if (session.visitorData) {
          headers['X-Goog-Visitor-Id'] = session.visitorData;
        }

        if (session.cookie) {
          headers['Cookie'] = session.cookie;
          headers['X-Goog-AuthUser'] = session.authUser || '0';
          if (session.pageId) {
            headers['X-Goog-PageId'] = session.pageId;
          }
          if (session.sapisid) {
            headers['Authorization'] = sapisidHash(session.sapisid, MUSIC_ORIGIN);
          }
        }
      }

      const requestPayload = {
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion,
            hl: 'en',
            gl: 'US',
            ...(session?.visitorData ? { visitorData: session.visitorData } : {}),
          },
          user: {
            lockedSafetyMode: false,
            ...(session?.dataSyncId ? { onBehalfOfUser: session.dataSyncId } : {}),
          },
          request: {
            useSsl: true,
          },
        },
        ...body,
      };

      const response = await fetch(`${MUSIC_API_BASE}/${endpoint}?prettyPrint=false`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetches user profile (name, handle/email, avatar) from account/account_menu.
   */
  async fetchAccountProfile(session: InnertubeSession): Promise<InnertubeAccount | null> {
    const raw = await this.postMusic('account/account_menu', {}, session);
    return parseAccount(raw);
  }

  /**
   * Fetches user's saved / created playlists from FEmusic_liked_playlists.
   */
  async fetchUserPlaylists(session: InnertubeSession): Promise<InnertubePlaylist[]> {
    const raw = await this.postMusic(
      'browse',
      { browseId: 'FEmusic_liked_playlists' },
      session
    );
    return parseUserPlaylists(raw);
  }

  /**
   * Fetches user's Liked Songs (thumbs up) playlist from FEmusic_liked_videos.
   */
  async fetchLikedSongs(session: InnertubeSession): Promise<InnertubeSong[]> {
    const raw = await this.postMusic(
      'browse',
      { browseId: 'FEmusic_liked_videos' },
      session
    );
    return parsePlaylistSongs(raw);
  }

  /**
   * Fetches listening history from FEmusic_history.
   */
  async fetchUserHistory(session: InnertubeSession): Promise<InnertubeSong[]> {
    const raw = await this.postMusic(
      'browse',
      { browseId: 'FEmusic_history' },
      session
    );
    return parsePlaylistSongs(raw);
  }

  /**
   * Fetches tracks for a specific playlist.
   */
  async fetchPlaylistTracks(
    playlistId: string,
    session?: InnertubeSession | null
  ): Promise<InnertubeSong[]> {
    const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;
    const raw = await this.postMusic('browse', { browseId }, session);
    return parsePlaylistSongs(raw);
  }

  /**
   * Fetches the personalized YouTube Music home feed for an authenticated user.
   */
  async fetchHomeFeed(session?: InnertubeSession | null): Promise<ParsedHomeSection[]> {
    const raw = await this.postMusic(
      'browse',
      { browseId: 'FEmusic_home' },
      session
    );
    return parseHomeFeed(raw);
  }
}

export const innertubeClient = new InnertubeClient();

