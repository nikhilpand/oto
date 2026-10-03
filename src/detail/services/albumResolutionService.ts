/**
 * Album Resolution Service
 *
 * Implements clean-room BitChord album resolution:
 * 1. Resolves MPREb catalogue IDs to backing playlist IDs (VL...) via PlaylistEngine
 *    to bypass YouTube Music's 3-5 track preview truncation bug.
 * 2. Directly resolves JioSaavn albums with on-device parsing.
 * 3. Graceful fallback to search federator when browsing unindexed album IDs.
 *
 * Zero hardcoded catalogs or mock data.
 */

import { Track } from '@/domain/types';
import { Album } from '@/detail/types';
import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { parseDurationMs, parsePlaylistSongs } from '@/auth/innertube/innertubeParsers';
import { PlaylistEngine } from '@/library/services/playlistEngine';
import {
  mapJioSaavnSongToTrack,
  searchJioSaavn,
  unescapeHtml,
  upgradeImageUrl,
} from '@/api/directJioSaavn';
import { upgradeArtworkUrl } from '@/utils/imageQuality';
import { getCachedHomeFeed } from '@/home/services/liveHomeFeedService';

const JIOSAAVN_API_BASE = 'https://www.jiosaavn.com/api.php';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export interface ResolveAlbumOptions {
  title?: string;
  artist?: string;
  artworkUrl?: string;
}

/**
 * Resolves a full, untruncated Album domain model from YouTube Music or JioSaavn.
 */
export async function resolveAlbum(
  albumId: string,
  options?: ResolveAlbumOptions
): Promise<Album | null> {
  if (!albumId) return null;

  // 1. YouTube Music album (starts with MPREb, OLAK, or VL)
  if (albumId.startsWith('MPREb') || albumId.startsWith('OLAK') || albumId.startsWith('VL')) {
    try {
      const session = GoogleAuthStore.toInnertubeSession();
      const raw = await innertubeClient.browse(albumId, undefined, session);

      if (raw) {
        // Look for backing playlist ID to expand 3-5 preview track truncation
        const header =
          raw.header?.musicDetailHeaderRenderer ||
          raw.header?.musicVisualHeaderRenderer ||
          raw.header?.musicImmersiveHeaderRenderer;

        const playButtonPlaylistId =
          header?.menu?.menuRenderer?.topLevelButtons?.[0]?.buttonRenderer
            ?.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
          header?.buttons?.find((b: any) => b?.musicPlayButtonRenderer)?.musicPlayButtonRenderer
            ?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId ||
          raw.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.bottomEndpoint
            ?.browseEndpoint?.browseId;

        const { backingPlaylistBrowseId } = PlaylistEngine.resolveAlbumBackingPlaylist(
          albumId,
          {
            header: {
              title: header?.title?.runs?.[0]?.text,
              playButtonPlaylistId,
            },
          }
        );

        let parsedTracks: Track[] = [];

        // If backing playlist ID exists, fetch full untruncated tracklist
        if (backingPlaylistBrowseId) {
          const songs = await innertubeClient.fetchPlaylistTracks(
            backingPlaylistBrowseId,
            session
          );
          if (songs && songs.length > 0) {
            parsedTracks = songs.map((s) => ({
              id: s.videoId,
              title: s.title,
              artist: s.artist,
              artists: [s.artist],
              album: s.albumName || header?.title?.runs?.[0]?.text || '',
              artworkUrl: upgradeArtworkUrl(
                s.thumbnailUrl || options?.artworkUrl || ''
              ),
              thumbhash: '',
              durationMs: parseDurationMs(s.durationText),
              isExplicit: Boolean(s.isExplicit),
            }));
          }
        }

        // Fallback to parsing tracks from the direct browse response if backing fetch was empty
        if (parsedTracks.length === 0) {
          const rawSongs = parsePlaylistSongs(raw);
          if (rawSongs.length > 0) {
            parsedTracks = rawSongs.map((s) => ({
              id: s.videoId,
              title: s.title,
              artist: s.artist,
              artists: [s.artist],
              album: s.albumName || header?.title?.runs?.[0]?.text || '',
              artworkUrl: upgradeArtworkUrl(
                s.thumbnailUrl || options?.artworkUrl || ''
              ),
              thumbhash: '',
              durationMs: parseDurationMs(s.durationText),
              isExplicit: Boolean(s.isExplicit),
            }));
          }
        }

        if (parsedTracks.length > 0) {
          const title =
            header?.title?.runs?.[0]?.text || options?.title || 'Unknown Album';
          const rawArtist =
            header?.subtitle?.runs?.find((r: any) =>
              r?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType?.includes(
                'ARTIST'
              )
            )?.text ||
            header?.subtitle?.runs?.[0]?.text ||
            options?.artist ||
            'Unknown Artist';
          const artist = rawArtist.includes('•')
            ? rawArtist.split('•')[0]!.trim()
            : rawArtist;

          const yearMatch = header?.subtitle?.runs
            ?.map((r: any) => r.text)
            .join(' ')
            .match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1]!, 10) : 2024;

          const rawThumbnails =
            header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
            header?.thumbnail?.thumbnails;
          const bestThumb =
            rawThumbnails?.[rawThumbnails.length - 1]?.url ||
            options?.artworkUrl ||
            parsedTracks[0]?.artworkUrl ||
            '';

          return {
            id: albumId,
            title,
            artist,
            artworkUrl: upgradeArtworkUrl(bestThumb),
            thumbhash: '',
            year,
            totalTracks: parsedTracks.length,
            durationMs: parsedTracks.reduce(
              (acc, t) => acc + (t.durationMs || 180000),
              0
            ),
            tracks: parsedTracks,
            isExplicit: parsedTracks.some((t) => t.isExplicit),
          };
        }
      }
    } catch (err) {
      console.warn('[albumResolutionService] YouTube Music album error:', err);
    }
  }

  // 2. JioSaavn album (starts with saavn_album_, saavn_, or numeric ID)
  const isJioAlbum =
    albumId.startsWith('saavn_album_') ||
    albumId.startsWith('saavn_') ||
    /^\d+$/.test(albumId);

  if (isJioAlbum) {
    try {
      const cleanId = albumId
        .replace(/^saavn_album_/, '')
        .replace(/^saavn_/, '');
      const resp = await fetch(
        `${JIOSAAVN_API_BASE}?__call=content.getAlbumDetails&albumid=${encodeURIComponent(
          cleanId
        )}&api_version=4&_format=json&_marker=0&ctx=android`,
        { headers: { 'User-Agent': USER_AGENT } }
      ).then((r) => (r.ok ? r.json() : null));

      if (resp && Array.isArray(resp.list) && resp.list.length > 0) {
        const tracks: Track[] = resp.list.map((s: any) =>
          mapJioSaavnSongToTrack(s)
        );
        const title = unescapeHtml(resp.title || resp.name || options?.title || 'Album');
        const artist = unescapeHtml(
          resp.primary_artists || resp.artist || options?.artist || 'Unknown Artist'
        );
        const year = parseInt(resp.year, 10) || 2024;
        const artworkUrl = upgradeImageUrl(resp.image || options?.artworkUrl || '');

        return {
          id: albumId,
          title,
          artist,
          artworkUrl,
          thumbhash: '',
          year,
          totalTracks: tracks.length,
          durationMs: tracks.reduce((acc, t) => acc + t.durationMs, 0),
          tracks,
          isExplicit: tracks.some((t) => t.isExplicit),
        };
      }
    } catch (err) {
      console.warn('[albumResolutionService] JioSaavn album error:', err);
    }
  }

  // 3. Fallback: Check local cached home feed new releases
  const cachedFeed = getCachedHomeFeed();
  if (cachedFeed) {
    const nr = cachedFeed.newReleases.find((r) => r.id === albumId);
    if (nr && nr.tracks.length > 0) {
      return {
        id: nr.id,
        title: nr.title,
        artist: nr.artist,
        artworkUrl: nr.artworkUrl,
        thumbhash: nr.thumbhash,
        year: 2024,
        totalTracks: nr.tracks.length,
        durationMs: nr.tracks.reduce((acc, t) => acc + t.durationMs, 0),
        tracks: nr.tracks,
        isExplicit: false,
      };
    }
  }

  // 4. Fallback: Search for album by query
  if (options?.title) {
    try {
      const searchRes = await searchJioSaavn(
        `${options.title} ${options.artist || ''}`.trim(),
        15
      );
      const searchTracks = searchRes?.tracks || [];
      if (searchTracks.length > 0) {
        return {
          id: albumId,
          title: options.title,
          artist: options.artist || searchTracks[0]?.artist || 'Unknown Artist',
          artworkUrl: options.artworkUrl || searchTracks[0]?.artworkUrl || '',
          thumbhash: '',
          year: 2024,
          totalTracks: searchTracks.length,
          durationMs: searchTracks.reduce((acc, t) => acc + t.durationMs, 0),
          tracks: searchTracks,
          isExplicit: searchTracks.some((t) => t.isExplicit),
        };
      }
    } catch (err) {
      console.warn('[albumResolutionService] Search fallback error:', err);
    }
  }

  return null;
}
