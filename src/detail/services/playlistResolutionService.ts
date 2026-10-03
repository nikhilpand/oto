/**
 * playlistResolutionService.ts — Full-fidelity live playlist resolver for OTO
 *
 * Implements clean-room BitChord resolution:
 * 1. Resolves authenticated Liked Songs from Innertube session.
 * 2. Resolves JioSaavn playlists via direct on-device endpoint.
 * 3. Resolves curated Made-For-You / editorial playlists from live feed.
 * 4. Resolves YouTube Music playlists (PL... / VL... / RD...).
 */

import { Track } from '@/domain/types';
import { Playlist } from '@/detail/types';
import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { parseDurationMs } from '@/auth/innertube/innertubeParsers';
import { upgradeArtworkUrl } from '@/utils/imageQuality';
import {
  mapJioSaavnSongToTrack,
  unescapeHtml,
  upgradeImageUrl,
} from '@/api/directJioSaavn';
import { getLiveHomeFeed } from '@/api/otoBackend';

export interface ResolvePlaylistOptions {
  title?: string;
  artworkUrl?: string;
  subtitle?: string;
}

export async function resolvePlaylist(
  id: string,
  options?: ResolvePlaylistOptions
): Promise<Playlist | null> {
  if (!id) return null;
  const session = GoogleAuthStore.toInnertubeSession();

  // 1. Liked Songs
  if (id === 'liked_songs' || id === 'LM') {
    try {
      const songs = session ? await innertubeClient.fetchLikedSongs(session) : [];
      const tracks: Track[] = songs.map((s) => ({
        id: s.videoId,
        title: s.title,
        artist: s.artist,
        artists: [s.artist],
        album: s.albumName || '',
        artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || options?.artworkUrl || ''),
        thumbhash: '',
        durationMs: parseDurationMs(s.durationText),
        isExplicit: Boolean(s.isExplicit),
      }));

      return {
        id: 'liked_songs',
        title: options?.title || 'Liked Songs',
        description: options?.subtitle || `${tracks.length} songs from YouTube Music`,
        artworkUrl: upgradeArtworkUrl(tracks[0]?.artworkUrl || options?.artworkUrl || ''),
        thumbhash: '',
        owner: session?.account?.name || 'You',
        totalTracks: tracks.length,
        durationMs: tracks.reduce((acc, t) => acc + (t.durationMs || 180000), 0),
        tracks,
      };
    } catch (e) {
      console.warn('[playlistResolutionService] Liked songs resolution failed:', e);
    }
  }

  // 2. JioSaavn Playlist (prefixed with saavn_ or numeric ID)
  if (id.startsWith('saavn_playlist_') || id.startsWith('saavn_list_') || /^\d+$/.test(id)) {
    try {
      const cleanListId = id.replace(/^saavn_playlist_/, '').replace(/^saavn_list_/, '');
      const resp = await fetch(
        `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&listid=${encodeURIComponent(
          cleanListId
        )}&api_version=4&_format=json&_marker=0&ctx=android`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

      const rawSongs = resp?.list || resp?.songs;
      if (Array.isArray(rawSongs) && rawSongs.length > 0) {
        const tracks: Track[] = rawSongs.map((s: any) => mapJioSaavnSongToTrack(s));
        return {
          id,
          title: unescapeHtml(resp.title || resp.listname || options?.title || 'Playlist'),
          description: unescapeHtml(resp.header_desc || options?.subtitle || `${tracks.length} tracks`),
          artworkUrl: upgradeImageUrl(resp.image || options?.artworkUrl || tracks[0]?.artworkUrl || ''),
          thumbhash: '',
          owner: unescapeHtml(resp.firstname || resp.owner || 'JioSaavn'),
          totalTracks: tracks.length,
          durationMs: tracks.reduce((acc, t) => acc + (t.durationMs || 180000), 0),
          tracks,
        };
      }
    } catch (e) {
      console.warn('[playlistResolutionService] JioSaavn playlist fetch failed:', e);
    }
  }

  // 3. Made For You / Curated Local Feed
  if (id.startsWith('curated_') || id.startsWith('mfy_')) {
    try {
      const feed = await getLiveHomeFeed();
      const mfy = feed?.madeForYou.find((p) => p.id === id);
      if (mfy && mfy.tracks.length > 0) {
        return {
          id: mfy.id,
          title: mfy.title,
          description: mfy.subtitle,
          artworkUrl: upgradeArtworkUrl(mfy.artworkUrl),
          thumbhash: mfy.thumbhash,
          owner: 'OTO Curated',
          totalTracks: mfy.trackCount,
          durationMs: mfy.tracks.reduce((acc, t) => acc + t.durationMs, 0),
          tracks: mfy.tracks.map((t) => ({
            ...t,
            artworkUrl: upgradeArtworkUrl(t.artworkUrl),
          })),
        };
      }
    } catch (e) {
      console.warn('[playlistResolutionService] Curated feed resolution failed:', e);
    }
  }

  // 4. YouTube Music Playlist (starts with PL, VL, RD, or YouTube playlist token)
  if (id.startsWith('PL') || id.startsWith('VL') || id.startsWith('RD') || id.length >= 16) {
    try {
      const songs = await innertubeClient.fetchPlaylistTracks(id, session);
      if (songs && songs.length > 0) {
        const tracks: Track[] = songs.map((s) => ({
          id: s.videoId,
          title: s.title,
          artist: s.artist,
          artists: [s.artist],
          album: s.albumName || '',
          artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || options?.artworkUrl || ''),
          thumbhash: '',
          durationMs: parseDurationMs(s.durationText),
          isExplicit: Boolean(s.isExplicit),
        }));

        return {
          id,
          title: options?.title || 'YouTube Music Playlist',
          description: options?.subtitle || `${tracks.length} tracks`,
          artworkUrl: upgradeArtworkUrl(options?.artworkUrl || tracks[0]?.artworkUrl || ''),
          thumbhash: '',
          owner: session?.account?.name || 'YouTube Music',
          totalTracks: tracks.length,
          durationMs: tracks.reduce((acc, t) => acc + (t.durationMs || 180000), 0),
          tracks,
        };
      }
    } catch (e) {
      console.warn('[playlistResolutionService] Innertube playlist fetch failed:', e);
    }
  }

  // 5. General fallback: check feed for any matching ID
  try {
    const feed = await getLiveHomeFeed();
    const mfy = feed?.madeForYou.find((p) => p.id === id);
    if (mfy && mfy.tracks.length > 0) {
      return {
        id: mfy.id,
        title: mfy.title,
        description: mfy.subtitle,
        artworkUrl: upgradeArtworkUrl(mfy.artworkUrl),
        thumbhash: mfy.thumbhash,
        owner: 'OTO Curated',
        totalTracks: mfy.trackCount,
        durationMs: mfy.tracks.reduce((acc, t) => acc + t.durationMs, 0),
        tracks: mfy.tracks.map((t) => ({
          ...t,
          artworkUrl: upgradeArtworkUrl(t.artworkUrl),
        })),
      };
    }
  } catch (e) {
    console.warn('[playlistResolutionService] Home feed fallback failed:', e);
  }

  return null;
}
