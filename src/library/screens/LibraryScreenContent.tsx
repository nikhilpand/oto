import React, { useState, useCallback } from 'react';
import { StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { color, space } from '@/design/tokens';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { useLayout } from '@/design/hooks/useLayout';
import { GoogleSignInModal } from '@/auth/components/GoogleSignInModal';
import { useDownloadStore } from '@/downloads/DownloadStore';
import { LibraryHeader } from '../components/LibraryHeader';
import { LibraryFilterBar } from '../components/LibraryFilterBar';
import { LikedSongsCard } from '../components/LikedSongsCard';
import { LibraryItemRow } from '../components/LibraryItemRow';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { ListeningExperienceCarousel } from '../components/ListeningExperienceCarousel';
import { OnDeviceHubSection } from '../components/OnDeviceHubSection';
import { useLibraryData } from '../hooks/useLibraryData';
import type { LibraryItem } from '../types';

export function LibraryScreenContent(): React.JSX.Element {
  const router = useRouter();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { scrollY } = useScrollOffset();
  const { width, gridColumns, bottomChrome } = useLayout();
  const columnWidth = (width - space[4] * 2) / gridColumns;
  const downloadRecords = useDownloadStore((s) => s.records);

  const {
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
  } = useLibraryData();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY]
  );

  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => {
      if (viewMode === 'grid') {
        return <LibraryItemCard item={item} onPress={handleItemPress} columnWidth={columnWidth} />;
      }
      return <LibraryItemRow item={item} onPress={handleItemPress} />;
    },
    [viewMode, handleItemPress, columnWidth]
  );

  const keyExtractor = useCallback((item: LibraryItem) => item.id, []);

  const ListHeader = useCallback(
    () => (
      <>
        <LibraryHeader
          isSignedIn={isSignedIn}
          activeProfile={activeProfile}
          onOpenAuth={() => setAuthModalVisible(true)}
        />
        <LibraryFilterBar active={filter} onChange={setFilter} />

        {/* BitChord Listening Experience & On Device Hub */}
        {filter === 'all' && (
          <>
            <ListeningExperienceCarousel />
            <OnDeviceHubSection
              downloadCount={downloadRecords.length}
              onDownloadsPress={() => router.push('/downloads' as any)}
            />
          </>
        )}

        {filter === 'downloads' && (
          <OnDeviceHubSection
            downloadCount={downloadRecords.length}
            onDownloadsPress={() => router.push('/downloads' as any)}
          />
        )}

        <LikedSongsCard info={likedInfo} onPlay={handleLikedSongsPlay} />
        <LibraryToolbar
          sortOrder={sortOrder}
          viewMode={viewMode}
          onSortChange={setSortOrder}
          onViewModeChange={setViewMode}
        />
      </>
    ),
    [
      isSignedIn,
      activeProfile,
      filter,
      setFilter,
      downloadRecords.length,
      router,
      likedInfo,
      handleLikedSongsPlay,
      sortOrder,
      viewMode,
      setSortOrder,
      setViewMode,
    ]
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlashList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={viewMode === 'grid' ? gridColumns : 1}
        key={viewMode}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={<View style={{ height: bottomChrome + space[4] }} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <GoogleSignInModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  listContent: {
    paddingBottom: space[4],
  },
});
