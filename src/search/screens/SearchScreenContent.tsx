/**
 * SearchScreenContent
 *
 * Master Search screen orchestrator.
 * - Instant-responsive input (< 16ms state update)
 * - 180ms debounced search with sequence-token cancellation
 * - MMKV-backed recent queries
 * - Grouped results: TopResult, Tracks, Artists, Albums, Playlists
 * - Empty + no-results states
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { color, space } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { SearchInputBar } from '../components/SearchInputBar';
import { RecentSearchesView } from '../components/RecentSearchesView';
import { TopResultCard } from '../components/TopResultCard';
import { SearchEmptyState } from '../components/SearchEmptyState';
import {
  query as searchQuery,
  nextSequenceToken,
} from '../services/searchEngine';
import {
  getRecentQueries,
  addRecentQuery,
  removeRecentQuery,
  clearRecentQueries,
} from '../storage/recentSearchesStorage';
import type { SearchResults, TopResult, SearchSuggestion } from '../types';
import type { Track } from '@/domain/types';

const DEBOUNCE_MS = 180;

// ─── Result Row Components ────────────────────────────────────────────

function TrackRow({ track }: { track: Track }) {
  const mins = Math.floor(track.durationMs / 60000);
  const secs = String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0');
  return (
    <View style={rowStyles.container} accessibilityRole="button" accessibilityLabel={`${track.title} by ${track.artist}`}>
      <View style={rowStyles.artwork} />
      <View style={rowStyles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>{track.title}</OTOText>
        <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>{track.artist}</OTOText>
      </View>
      <OTOText variant="meta" customColor={color.text.tertiary}>{mins}:{secs}</OTOText>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 64,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: color.bg.s3,
    marginRight: space[3],
  },
  meta: { flex: 1 },
});

// ─── Section Header ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={sectionStyles.header}>
      <OTOText variant="track" weight="semibold">{title}</OTOText>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: { paddingHorizontal: space[4], paddingTop: space[5], paddingBottom: space[2] },
});

// ─── Main Screen ──────────────────────────────────────────────────────

export function SearchScreenContent() {
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = inputValue.trim().length > 0;

  // Load recents on mount
  useEffect(() => {
    setRecentQueries(getRecentQueries());
  }, []);

  // Handle text change — synchronous state update, debounced search
  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const token = nextSequenceToken();
      const r = searchQuery(text, token);
      if (r !== null) setResults(r);
    }, DEBOUNCE_MS);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
    setResults(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleSelectRecent = useCallback((q: string) => {
    handleChangeText(q);
    setInputValue(q);
  }, [handleChangeText]);

  const handleRemoveRecent = useCallback((q: string) => {
    removeRecentQuery(q);
    setRecentQueries(getRecentQueries());
  }, []);

  const handleClearAllRecents = useCallback(() => {
    clearRecentQueries();
    setRecentQueries([]);
  }, []);

  const handleTopResultPress = useCallback((result: TopResult) => {
    if (result.kind === 'track' && result.track) {
      addRecentQuery(result.track.title);
    } else if (result.kind === 'artist' && result.artist) {
      addRecentQuery(result.artist.name);
    } else if (result.kind === 'album' && result.album) {
      addRecentQuery(result.album.title);
    } else if (result.kind === 'playlist' && result.playlist) {
      addRecentQuery(result.playlist.title);
    }
    setRecentQueries(getRecentQueries());
  }, []);

  const handleSuggestionPress = useCallback((suggestion: SearchSuggestion) => {
    handleChangeText(suggestion.label);
    setInputValue(suggestion.label);
  }, [handleChangeText]);

  const hasResults = results && (
    results.topResult ||
    results.tracks.length > 0 ||
    results.artists.length > 0 ||
    results.albums.length > 0 ||
    results.playlists.length > 0
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search Input */}
      <View style={styles.inputWrapper}>
        <SearchInputBar
          value={inputValue}
          onChangeText={handleChangeText}
          onClear={handleClear}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Idle state: recents + browse categories */}
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

        {/* Active search — no results */}
        {isSearching && !hasResults && results && (
          <SearchEmptyState
            mode="no-results"
            query={results.query}
            onSuggestionPress={handleSuggestionPress}
          />
        )}

        {/* Active search — results */}
        {isSearching && hasResults && (
          <>
            {results.topResult && (
              <TopResultCard result={results.topResult} onPress={handleTopResultPress} />
            )}

            {results.tracks.length > 0 && (
              <>
                <SectionHeader title="Songs" />
                {results.tracks.slice(0, 5).map((track) => (
                  <TrackRow key={track.id} track={track} />
                ))}
              </>
            )}

            {results.artists.length > 0 && (
              <>
                <SectionHeader title="Artists" />
                {results.artists.slice(0, 3).map((artist) => (
                  <View key={artist.id} style={rowStyles.container}>
                    <View style={[rowStyles.artwork, { borderRadius: 22 }]} />
                    <View style={rowStyles.meta}>
                      <OTOText variant="body" weight="semibold" numberOfLines={1}>{artist.name}</OTOText>
                      <OTOText variant="meta" customColor={color.text.secondary}>
                        {artist.isVerified ? '✓ Verified · ' : ''}{artist.trackCount} songs
                      </OTOText>
                    </View>
                  </View>
                ))}
              </>
            )}

            {results.albums.length > 0 && (
              <>
                <SectionHeader title="Albums" />
                {results.albums.slice(0, 3).map((album) => (
                  <View key={album.id} style={rowStyles.container}>
                    <View style={rowStyles.artwork} />
                    <View style={rowStyles.meta}>
                      <OTOText variant="body" weight="semibold" numberOfLines={1}>{album.title}</OTOText>
                      <OTOText variant="meta" customColor={color.text.secondary}>{album.artist} · {album.year}</OTOText>
                    </View>
                  </View>
                ))}
              </>
            )}

            {results.playlists.length > 0 && (
              <>
                <SectionHeader title="Playlists" />
                {results.playlists.slice(0, 3).map((playlist) => (
                  <View key={playlist.id} style={rowStyles.container}>
                    <View style={rowStyles.artwork} />
                    <View style={rowStyles.meta}>
                      <OTOText variant="body" weight="semibold" numberOfLines={1}>{playlist.title}</OTOText>
                      <OTOText variant="meta" customColor={color.text.secondary}>
                        {playlist.curated ? 'Playlist · ' : ''}{playlist.trackCount} songs
                      </OTOText>
                    </View>
                  </View>
                ))}
              </>
            )}

            <View style={styles.bottomPad} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  inputWrapper: {
    paddingHorizontal: space[4],
    paddingTop: Platform.select({ ios: space[2], android: space[4] }),
    paddingBottom: space[3],
  },
  scroll: {
    flex: 1,
  },
  bottomPad: {
    height: space[7],
  },
});
