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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useAnimatedScrollHandler } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space } from '@/design/tokens';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { ScrollFadeEdge } from '@/design/components/ScrollFadeEdge';
import { OTOText } from '@/design/components/OTOText';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { LibraryFilterBar } from '../components/LibraryFilterBar';
import { LikedSongsCard } from '../components/LikedSongsCard';
import { LibraryItemRow } from '../components/LibraryItemRow';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { getLiveHomeFeed } from '@/api/otoBackend';
import type { LibraryFilter, LibraryItem, LibrarySortOrder, LibraryViewMode, LikedSongsInfo } from '../types';
import type { Track } from '@/domain/types';

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

  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const { scrollY } = useScrollOffset();
  const scrollHandler = useAnimatedScrollHandler((e) => {
    'worklet';
    scrollY.value = e.contentOffset.y;
  });

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

  const filteredItems = useMemo(
    () => applySort(applyFilter(libraryItems, filter, isOffline), sortOrder),
    [libraryItems, filter, sortOrder, isOffline],
  );

  const handleItemPress = useCallback(
    (item: LibraryItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const tracksToPlay: Track[] = item.playlist?.tracks || item.album?.tracks || [];
      if (tracksToPlay.length === 0) return;

      playContext(tracksToPlay, 0, {
        id: item.id,
        title: item.title,
        type: item.kind === 'playlist' ? 'playlist' : 'album',
      });
      const firstTrack = tracksToPlay[0];
      if (firstTrack) {
        void engine.load(firstTrack, true);
      }
    },
    [engine, playContext]
  );

  const handleLikedSongsPlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tracks = likedInfo.tracks;
    if (tracks.length > 0) {
      playContext(tracks, 0, {
        id: 'liked_songs',
        title: 'Liked Songs',
        type: 'playlist',
      });
      const firstTrack = tracks[0];
      if (firstTrack) {
        void engine.load(firstTrack, true);
      }
    }
  }, [engine, likedInfo.tracks, playContext]);

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
        onScroll={scrollHandler}
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
    paddingBottom: space[8],
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
