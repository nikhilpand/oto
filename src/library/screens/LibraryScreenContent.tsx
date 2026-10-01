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

import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { color, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { LibraryFilterBar } from '../components/LibraryFilterBar';
import { LikedSongsCard } from '../components/LikedSongsCard';
import { LibraryItemRow } from '../components/LibraryItemRow';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { MOCK_LIBRARY_ITEMS, LIKED_SONGS_INFO } from '../data/mockLibraryData';
import { CATALOG_TRACKS } from '@/search/data/searchCatalog';
import type { LibraryFilter, LibraryItem, LibrarySortOrder, LibraryViewMode } from '../types';
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
  const isOffline = false; // TODO: hook into network state in P12

  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const { width } = useWindowDimensions();
  const columnWidth = (width - space[4] * 2) / 2;

  const filteredItems = useMemo(
    () => applySort(applyFilter(MOCK_LIBRARY_ITEMS, filter, isOffline), sortOrder),
    [filter, sortOrder, isOffline],
  );

  const handleItemPress = useCallback(
    (item: LibraryItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let tracksToPlay: Track[] = [];
      if (item.kind === 'album' && item.album) {
        tracksToPlay = CATALOG_TRACKS.filter((t) => t.album === item.album?.title);
      } else if (item.kind === 'artist' && item.artist) {
        tracksToPlay = CATALOG_TRACKS.filter((t) => t.artist === item.artist?.name);
      }
      if (tracksToPlay.length === 0) {
        tracksToPlay = CATALOG_TRACKS.slice(0, 5);
      }
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
    const tracks = LIKED_SONGS_INFO.tracks;
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
  }, [engine, playContext]);

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
      <LikedSongsCard info={LIKED_SONGS_INFO} onPlay={handleLikedSongsPlay} />
      <LibraryToolbar
        sortOrder={sortOrder}
        viewMode={viewMode}
        onSortChange={setSortOrder}
        onViewModeChange={setViewMode}
      />
    </>
  ), [filter, sortOrder, viewMode, handleLikedSongsPlay]);

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
      />
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
