import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getLiveHomeFeed } from '@/api/otoBackend';
import { useGoogleAuth } from '@/auth/useGoogleAuth';
import { useDownloadStore } from '@/downloads/DownloadStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { upgradeArtworkUrl } from '@/utils/imageQuality';
import type {
  LibraryFilter,
  LibraryItem,
  LibrarySortOrder,
  LibraryViewMode,
  LikedSongsInfo,
} from '../types';

function applyFilter(
  items: LibraryItem[],
  filter: LibraryFilter,
  downloadedItemIds: Set<string>
): LibraryItem[] {
  const result = items.map((item) => {
    if (downloadedItemIds.has(item.id)) {
      return { ...item, download: { status: 'downloaded' as const } };
    }
    return item;
  });

  if (filter === 'downloads') {
    return result.filter((i) => i.download.status === 'downloaded');
  }
  if (filter === 'all') {
    return result;
  }
  const kindMap: Record<string, LibraryItem['kind']> = {
    playlists: 'playlist',
    albums: 'album',
    artists: 'artist',
    songs: 'song',
  };
  const kind = kindMap[filter];
  return kind ? result.filter((i) => i.kind === kind) : result;
}

function applySort(items: LibraryItem[], order: LibrarySortOrder): LibraryItem[] {
  const copy = [...items];
  if (order === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title));
  if (order === 'za') return copy.sort((a, b) => b.title.localeCompare(a.title));
  return copy.sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}

export function useLibraryData() {
  const router = useRouter();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);
  const { isSignedIn, activeProfile, likedSongs, userPlaylists } = useGoogleAuth();
  const downloadRecords = useDownloadStore((s) => s.records);

  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [sortOrder, setSortOrder] = useState<LibrarySortOrder>('recent');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('list');
  const [backendItems, setBackendItems] = useState<LibraryItem[]>([]);
  const [likedInfo, setLikedInfo] = useState<LikedSongsInfo>({
    count: 0,
    recentArtworkUrls: [],
    tracks: [],
  });

  // Track completed downloads from SQLite download store
  const completedDownloadIds = useMemo(() => {
    const set = new Set<string>();
    for (const rec of downloadRecords) {
      if (rec.status === 'completed' && rec.track?.id) {
        set.add(rec.track.id);
      }
    }
    return set;
  }, [downloadRecords]);

  // Downloaded song items derived directly from downloadRecords
  const downloadedSongItems = useMemo<LibraryItem[]>(() => {
    const items: LibraryItem[] = [];
    downloadRecords.forEach((rec, idx) => {
      if (rec.status === 'completed' && rec.track) {
        items.push({
          id: rec.track.id,
          kind: 'song',
          title: rec.track.title,
          subtitle: `${rec.track.artist} · Downloaded`,
          artworkUrl: rec.track.artworkUrl,
          thumbhash: rec.track.thumbhash,
          download: { status: 'downloaded' },
          addedAt: new Date(rec.createdAt || Date.now() - idx * 1000).toISOString(),
        });
      }
    });
    return items;
  }, [downloadRecords]);

  // YouTube Music playlists derived directly from userPlaylists
  const ytPlaylistItems = useMemo<LibraryItem[]>(() => {
    if (!isSignedIn || userPlaylists.length === 0) return [];
    return userPlaylists.map((pl, idx) => ({
      id: pl.playlistId,
      kind: 'playlist',
      title: pl.title,
      subtitle: pl.subtitle || 'YouTube Music Playlist',
      artworkUrl: upgradeArtworkUrl(pl.thumbnailUrl || ''),
      thumbhash: '',
      download: { status: 'none' },
      addedAt: new Date(Date.now() - idx * 60000).toISOString(),
      playlist: {
        id: pl.playlistId,
        title: pl.title,
        description: pl.subtitle || '',
        artworkUrl: upgradeArtworkUrl(pl.thumbnailUrl || ''),
        thumbhash: '',
        trackCount: 0,
        curated: false,
        tracks: [],
      },
    }));
  }, [isSignedIn, userPlaylists]);

  // Initial load from live backend
  useEffect(() => {
    let isMounted = true;
    void getLiveHomeFeed().then((feed) => {
      if (!isMounted || !feed) return;
      const items: LibraryItem[] = [];

      feed.madeForYou.forEach((mfy, idx) => {
        items.push({
          id: mfy.id,
          kind: 'playlist',
          title: mfy.title,
          subtitle: `${mfy.trackCount} songs · Curated`,
          artworkUrl: mfy.artworkUrl,
          thumbhash: mfy.thumbhash,
          download: { status: 'none' },
          addedAt: new Date(Date.now() - idx * 86400000).toISOString(),
          playlist: {
            id: mfy.id,
            title: mfy.title,
            description: mfy.subtitle,
            artworkUrl: mfy.artworkUrl,
            thumbhash: mfy.thumbhash,
            trackCount: mfy.trackCount,
            curated: true,
            tracks: mfy.tracks,
          },
        });
      });

      feed.newReleases.forEach((nr, idx) => {
        items.push({
          id: nr.id,
          kind: 'album',
          title: nr.title,
          subtitle: `${nr.artist} · 2026`,
          artworkUrl: nr.artworkUrl,
          thumbhash: nr.thumbhash,
          download: { status: 'none' },
          addedAt: new Date(Date.now() - (idx + 10) * 86400000).toISOString(),
          album: {
            id: nr.id,
            title: nr.title,
            artist: nr.artist,
            artworkUrl: nr.artworkUrl,
            thumbhash: nr.thumbhash,
            year: 2026,
            trackCount: nr.tracks.length,
            tracks: nr.tracks,
          },
        });
      });

      setBackendItems(items);

      if (feed.quickPicks.length > 0) {
        setLikedInfo({
          count: feed.quickPicks.length,
          recentArtworkUrls: feed.quickPicks.slice(0, 4).map((t) => t.artworkUrl),
          tracks: feed.quickPicks,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync real YouTube Music liked songs
  useEffect(() => {
    if (!isSignedIn) return;

    if (likedSongs.length > 0) {
      setLikedInfo({
        count: likedSongs.length,
        recentArtworkUrls: likedSongs
          .slice(0, 4)
          .map((s) => upgradeArtworkUrl(s.thumbnailUrl || ''))
          .filter(Boolean),
        tracks: likedSongs.map((s) => ({
          id: s.videoId,
          title: s.title,
          artist: s.artist,
          artists: [s.artist],
          album: s.albumName || '',
          artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || ''),
          thumbhash: '',
          durationMs: 0,
          isExplicit: Boolean(s.isExplicit),
        })),
      });
    }
  }, [isSignedIn, likedSongs]);

  // Combined library items: User playlists + Downloaded songs + Curated backend items
  const allLibraryItems = useMemo<LibraryItem[]>(() => {
    const combined: LibraryItem[] = [...ytPlaylistItems, ...downloadedSongItems];
    const existingIds = new Set(combined.map((i) => i.id));
    for (const b of backendItems) {
      if (!existingIds.has(b.id)) {
        combined.push(b);
      }
    }
    return combined;
  }, [ytPlaylistItems, downloadedSongItems, backendItems]);

  const filteredItems = useMemo(
    () => applySort(applyFilter(allLibraryItems, filter, completedDownloadIds), sortOrder),
    [allLibraryItems, filter, completedDownloadIds, sortOrder]
  );

  const handleItemPress = useCallback(
    (item: LibraryItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item.kind === 'playlist') {
        router.push({
          pathname: '/playlist/[id]',
          params: {
            id: item.id,
            title: item.title,
            artworkUrl: item.artworkUrl,
            subtitle: item.subtitle,
          },
        });
      } else if (item.kind === 'album') {
        router.push({
          pathname: '/album/[id]',
          params: {
            id: item.id,
            title: item.title,
            artworkUrl: item.artworkUrl,
            artist: item.subtitle,
          },
        });
      } else if (item.kind === 'artist') {
        router.push({
          pathname: '/artist/[id]',
          params: {
            id: item.id,
            name: item.title,
            artworkUrl: item.artworkUrl,
          },
        });
      } else if (item.kind === 'song') {
        const downloaded = downloadRecords.find((r) => r.track.id === item.id);
        if (downloaded) {
          playContext([downloaded.track], 0, {
            id: 'library_downloaded',
            title: 'Downloaded Tracks',
            type: 'playlist',
          });
          void engine.load(downloaded.track, true);
        }
      }
    },
    [router, downloadRecords, engine, playContext]
  );

  const handleLikedSongsPlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/playlist/[id]',
      params: {
        id: 'liked_songs',
        title: 'Liked Songs',
        subtitle: `${likedInfo.count} songs`,
        artworkUrl: likedInfo.recentArtworkUrls[0] || '',
      },
    });
  }, [router, likedInfo.count, likedInfo.recentArtworkUrls]);

  return {
    isSignedIn,
    activeProfile,
    filter,
    setFilter,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    filteredItems,
    likedInfo,
    handleItemPress,
    handleLikedSongsPlay,
  };
}
