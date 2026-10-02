/**
 * LibraryScreenContent
 *
 * Master Library screen orchestrator.
 * - Segmented filter chips (All, Playlists, Albums, Artists, Downloads)
 * - Pinned Liked Songs hero card
 * - Sort & View toggle (Compact List vs 2-Column Grid)
 * - Accessible DownloadStatusBadge on each item
 * - Offline filter: shows only downloaded items when offline / Downloads filter
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { color, space, BOTTOM_CHROME_HEIGHT } from '@/design/tokens';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { ScrollFadeEdge } from '@/design/components/ScrollFadeEdge';
import { OTOText } from '@/design/components/OTOText';
import { LibraryFilterBar } from '../components/LibraryFilterBar';
import { LikedSongsCard } from '../components/LikedSongsCard';
import { LibraryItemRow } from '../components/LibraryItemRow';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { getLiveHomeFeed } from '@/api/otoBackend';
import { useGoogleAuth } from '@/auth/useGoogleAuth';
import { upgradeArtworkUrl } from '@/utils/imageQuality';
import type { LibraryFilter, LibraryItem, LibrarySortOrder, LibraryViewMode, LikedSongsInfo } from '../types';

// ─── Utility ─────────────────────────────────────────────────────────

function applyFilter(items: LibraryItem[], filter: LibraryFilter, isOffline: boolean): LibraryItem[] {
  if (isOffline || filter === 'downloads') {
    return items.filter((i) => i.download.status === 'downloaded');
  }
  if (filter === 'all') return items;
  const kindMap: Record<string, LibraryItem['kind']> = {
    playlists: 'playlist',
    albums: 'album',
    artists: 'artist',
  };
  const kind = kindMap[filter];
  return kind ? items.filter((i) => i.kind === kind) : items;
}

function applySort(items: LibraryItem[], order: LibrarySortOrder): LibraryItem[] {
  const copy = [...items];
  if (order === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title));
  if (order === 'za') return copy.sort((a, b) => b.title.localeCompare(a.title));
  return copy.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

// ─── Screen ───────────────────────────────────────────────────────────

export function LibraryScreenContent() {
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [sortOrder, setSortOrder] = useState<LibrarySortOrder>('recent');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('list');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [likedInfo, setLikedInfo] = useState<LikedSongsInfo>({
    count: 0,
    recentArtworkUrls: [],
    tracks: [],
  });
  const isOffline = false;
  const { isSignedIn, likedSongs, userPlaylists } = useGoogleAuth();
  const router = useRouter();

  const { scrollY } = useScrollOffset();
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY]
  );

  const { width } = useWindowDimensions();
  const columnWidth = (width - space[4] * 2) / 2;

  useEffect(() => {
    let isMounted = true;
    void getLiveHomeFeed().then((feed) => {
      if (!isMounted || !feed) return;
      const items: LibraryItem[] = [];

      // 1. Playlists from Made For You shelves
      feed.madeForYou.forEach((mfy, idx) => {
        items.push({
          id: mfy.id,
          kind: 'playlist',
          title: mfy.title,
          subtitle: `${mfy.trackCount} songs · Curated`,
          artworkUrl: mfy.artworkUrl,
          thumbhash: mfy.thumbhash,
          download: { status: idx === 0 ? 'downloaded' : 'none' },
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

      // 2. Albums from New Releases
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

      setLibraryItems(items);

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

  // Sync real YouTube Music user playlists and liked songs
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

    if (userPlaylists.length > 0) {
      const ytPlaylistItems: LibraryItem[] = userPlaylists.map((pl, idx) => ({
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

      setLibraryItems((prev) => {
        const existingIds = new Set(ytPlaylistItems.map((p) => p.id));
        const filteredPrev = prev.filter((item) => !existingIds.has(item.id));
        return [...ytPlaylistItems, ...filteredPrev];
      });
    }
  }, [isSignedIn, likedSongs, userPlaylists]);

  const filteredItems = useMemo(
    () => applySort(applyFilter(libraryItems, filter, isOffline), sortOrder),
    [libraryItems, filter, sortOrder, isOffline],
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
      }
    },
    [router]
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

  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    if (viewMode === 'grid') {
      return <LibraryItemCard item={item} onPress={handleItemPress} columnWidth={columnWidth} />;
    }
    return <LibraryItemRow item={item} onPress={handleItemPress} />;
  }, [viewMode, handleItemPress, columnWidth]);

  const keyExtractor = useCallback((item: LibraryItem) => item.id, []);

  const ListHeader = useCallback(() => (
    <>
      <OTOText variant="title" weight="bold" style={styles.screenTitle}>
        Your Library
      </OTOText>
      <LibraryFilterBar active={filter} onChange={setFilter} />
      <LikedSongsCard info={likedInfo} onPlay={handleLikedSongsPlay} />
      <LibraryToolbar
        sortOrder={sortOrder}
        viewMode={viewMode}
        onSortChange={setSortOrder}
        onViewModeChange={setViewMode}
      />
    </>
  ), [filter, sortOrder, viewMode, likedInfo, handleLikedSongsPlay]);

  const ListEmpty = useCallback(() => {
    const msg =
      filter === 'downloads'
        ? 'No downloaded items yet. Download music to listen offline.'
        : 'Nothing here yet. Save albums, playlists, and artists to see them here.';
    return (
      <View style={styles.empty}>
        <OTOText variant="body" customColor={color.text.tertiary} style={styles.emptyText}>
          {msg}
        </OTOText>
      </View>
    );
  }, [filter]);

  return (
    <SafeAreaView style={styles.safe}>
      <FlashList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      <ScrollFadeEdge edge="bottom" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  list: {
    paddingBottom: BOTTOM_CHROME_HEIGHT + space[4],
  },
  screenTitle: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[2],
  },
  empty: {
    paddingHorizontal: space[4],
    paddingTop: space[7],
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
});
