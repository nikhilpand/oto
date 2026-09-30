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
  FlatList,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { color, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { LibraryFilterBar } from '../components/LibraryFilterBar';
import { LikedSongsCard } from '../components/LikedSongsCard';
import { LibraryItemRow } from '../components/LibraryItemRow';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { MOCK_LIBRARY_ITEMS, LIKED_SONGS_INFO } from '../data/mockLibraryData';
import type { LibraryFilter, LibraryItem, LibrarySortOrder, LibraryViewMode } from '../types';

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

  const { width } = useWindowDimensions();
  const columnWidth = (width - space[4] * 2) / 2;

  const filteredItems = useMemo(
    () => applySort(applyFilter(MOCK_LIBRARY_ITEMS, filter, isOffline), sortOrder),
    [filter, sortOrder, isOffline],
  );

  const handleItemPress = useCallback((item: LibraryItem) => {
    // TODO: navigate to item detail in P11
    console.log('library item pressed:', item.id);
  }, []);

  const handleLikedSongsPlay = useCallback(() => {
    // TODO: play liked songs via AudioEngine in P10
    console.log('play liked songs');
  }, []);

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
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // re-mount FlatList on view mode change to reset numColumns
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
