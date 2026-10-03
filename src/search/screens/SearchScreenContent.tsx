/**
 * SearchScreenContent — Production Federated Search Hub
 *
 * Full end-to-end integration:
 * - Live categorized search (YouTube Music protobuf + JioSaavn federator)
 * - Category filter pills ('All', 'Songs', 'Videos', 'Albums', 'Artists', 'Playlists')
 * - Full routing to /artist/[id], /album/[id], /playlist/[id]
 * - Instant playback for song results
 * - Recent search persistence
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space } from '@/design/tokens';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { useLayout } from '@/design/hooks/useLayout';
import { SearchInputBar } from '../components/SearchInputBar';
import { RecentSearchesView } from '../components/RecentSearchesView';
import { SearchEmptyState } from '../components/SearchEmptyState';
import { SearchCategoryPills } from '../components/SearchCategoryPills';
import { SearchResultsSections } from '../components/SearchResultsSections';
import { useSearchScreen } from '../hooks/useSearchScreen';

export function SearchScreenContent(): React.JSX.Element {
  const { bottomChrome } = useLayout();
  const { scrollY } = useScrollOffset();

  const {
    inputValue,
    results,
    recentQueries,
    activeFilter,
    isSearching,
    hasResults,
    handleChangeText,
    handleClearInput,
    handleFilterChange,
    handlePlayTrack,
    handleArtistPress,
    handleAlbumPress,
    handlePlaylistPress,
    handleTopResultPress,
    handleSelectRecent,
    handleRemoveRecent,
    handleClearAllRecents,
    handleSuggestionPress,
  } = useSearchScreen();

  const scrollHandler = useAnimatedScrollHandler((e) => {
    'worklet';
    scrollY.value = e.contentOffset.y;
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <SearchInputBar
        value={inputValue}
        onChangeText={handleChangeText}
        onClear={handleClearInput}
        placeholder="Search songs, artists, albums, playlists"
      />

      {isSearching && (
        <SearchCategoryPills
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      )}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!isSearching && (
          <>
            <RecentSearchesView
              queries={recentQueries}
              onSelect={handleSelectRecent}
              onRemove={handleRemoveRecent}
              onClearAll={handleClearAllRecents}
            />
            <SearchEmptyState mode="idle" onSuggestionPress={handleSuggestionPress} />
          </>
        )}

        {isSearching && !hasResults && results && (
          <SearchEmptyState
            mode="no-results"
            query={results.query}
            onSuggestionPress={handleSuggestionPress}
          />
        )}

        {isSearching && hasResults && results && (
          <SearchResultsSections
            results={results}
            activeFilter={activeFilter}
            onTopResultPress={handleTopResultPress}
            onPlayTrack={handlePlayTrack}
            onArtistPress={handleArtistPress}
            onAlbumPress={handleAlbumPress}
            onPlaylistPress={handlePlaylistPress}
          />
        )}

        <View style={{ height: bottomChrome + space[4] }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space[4],
  },
});
