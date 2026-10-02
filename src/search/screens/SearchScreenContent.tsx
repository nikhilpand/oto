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

import { useCallback, useRef, useState } from 'react';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color, space, radius, BOTTOM_CHROME_HEIGHT } from '@/design/tokens';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { ScrollFadeEdge } from '@/design/components/ScrollFadeEdge';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { SearchInputBar } from '../components/SearchInputBar';
import { RecentSearchesView } from '../components/RecentSearchesView';
import { TopResultCard } from '../components/TopResultCard';
import { SearchEmptyState } from '../components/SearchEmptyState';
import {
  nextSequenceToken,
  isCurrentToken,
} from '../services/searchEngine';
import { searchLiveCatalog } from '@/api/otoBackend';
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

function TrackRow({ track, onPlay }: { track: Track; onPlay: (track: Track) => void }) {
  const mins = Math.floor(track.durationMs / 60000);
  const secs = String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0');
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
      onPress={() => onPlay(track)}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}. Tap to play.`}
    >
      <OTOArtwork
        uri={track.artworkUrl}
        thumbhash={track.thumbhash}
        size={44}
        borderRadius={radius.xs}
        style={rowStyles.artwork}
      />
      <View style={rowStyles.meta}>
        <OTOText variant="body" weight="semibold" numberOfLines={1}>{track.title}</OTOText>
        <OTOText variant="meta" customColor={color.text.secondary} numberOfLines={1}>{track.artist}</OTOText>
      </View>
      <OTOText variant="meta" customColor={color.text.tertiary}>{mins}:{secs}</OTOText>
    </Pressable>
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
  pressed: { opacity: 0.75 },
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
  const [recentQueries, setRecentQueries] = useState<string[]>(() => getRecentQueries());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = inputValue.trim().length > 0;

  const { scrollY } = useScrollOffset();
  const scrollHandler = useAnimatedScrollHandler((e) => {
    'worklet';
    scrollY.value = e.contentOffset.y;
  });

  // Handle text change — synchronous state update, debounced search
  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const token = nextSequenceToken();
      // Query real live backend catalog (JioSaavn + YouTube)
      const liveResults = await searchLiveCatalog(text);
      if (!isCurrentToken(token)) return;

      if (liveResults && liveResults.tracks.length > 0) {
        setResults(liveResults);
      } else {
        setResults({
          query: text,
          topResult: null,
          tracks: [],
          artists: [],
          albums: [],
          playlists: [],
        });
      }
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

  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const handlePlayTrack = useCallback(
    (track: Track, tracksContext?: Track[]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const list = tracksContext && tracksContext.length > 0 ? tracksContext : [track];
      const targetIndex = Math.max(0, list.findIndex((t) => t.id === track.id));

      playContext(list, targetIndex, {
        id: 'search_results',
        title: 'Search Results',
        type: 'playlist',
      });

      void engine.load(track, true);
      addRecentQuery(track.title);
      setRecentQueries(getRecentQueries());
    },
    [engine, playContext]
  );

  const handleTopResultPress = useCallback(
    (result: TopResult) => {
      if (result.kind === 'track' && result.track) {
        handlePlayTrack(result.track, results?.tracks);
      } else if (result.kind === 'artist' && result.artist) {
        addRecentQuery(result.artist.name);
        setRecentQueries(getRecentQueries());
      } else if (result.kind === 'album' && result.album) {
        addRecentQuery(result.album.title);
        setRecentQueries(getRecentQueries());
      } else if (result.kind === 'playlist' && result.playlist) {
        addRecentQuery(result.playlist.title);
        setRecentQueries(getRecentQueries());
      }
    },
    [handlePlayTrack, results?.tracks]
  );

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

      <Animated.ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
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
                  <TrackRow
                    key={track.id}
                    track={track}
                    onPlay={(t) => handlePlayTrack(t, results.tracks)}
                  />
                ))}
              </>
            )}

            {results.artists.length > 0 && (
              <>
                <SectionHeader title="Artists" />
                {results.artists.slice(0, 3).map((artist) => (
                  <Pressable
                    key={artist.id}
                    style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addRecentQuery(artist.name);
                      setRecentQueries(getRecentQueries());
                    }}
                  >
                    <OTOArtwork
                      uri={artist.artworkUrl}
                      size={44}
                      borderRadius={22}
                      style={rowStyles.artwork}
                    />
                    <View style={rowStyles.meta}>
                      <OTOText variant="body" weight="semibold" numberOfLines={1}>{artist.name}</OTOText>
                      <OTOText variant="meta" customColor={color.text.secondary}>
                        {artist.isVerified ? 'Verified · ' : ''}{artist.trackCount} songs
                      </OTOText>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {results.albums.length > 0 && (
              <>
                <SectionHeader title="Albums" />
                {results.albums.slice(0, 3).map((album) => (
                  <Pressable
                    key={album.id}
                    style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addRecentQuery(album.title);
                      setRecentQueries(getRecentQueries());
                    }}
                  >
                    <OTOArtwork
                      uri={album.artworkUrl}
                      size={44}
                      borderRadius={radius.xs}
                      style={rowStyles.artwork}
                    />
                    <View style={rowStyles.meta}>
                      <OTOText variant="body" weight="semibold" numberOfLines={1}>{album.title}</OTOText>
                      <OTOText variant="meta" customColor={color.text.secondary}>{album.artist} · {album.year}</OTOText>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {results.playlists.length > 0 && (
              <>
                <SectionHeader title="Playlists" />
                {results.playlists.slice(0, 3).map((playlist) => (
                  <Pressable
                    key={playlist.id}
                    style={({ pressed }) => [rowStyles.container, pressed && rowStyles.pressed]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addRecentQuery(playlist.title);
                      setRecentQueries(getRecentQueries());
                    }}
                  >
                    <OTOArtwork
                      uri={playlist.artworkUrl}
                      size={44}
                      borderRadius={radius.xs}
                      style={rowStyles.artwork}
                    />
                    <View style={rowStyles.meta}>
                      <OTOText variant="body" weight="semibold" numberOfLines={1}>{playlist.title}</OTOText>
                      <OTOText variant="meta" customColor={color.text.secondary}>
                        {playlist.curated ? 'Playlist · ' : ''}{playlist.trackCount} songs
                      </OTOText>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            <View style={styles.bottomPad} />
          </>
        )}
      </Animated.ScrollView>
      <ScrollFadeEdge edge="bottom" />
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
    height: BOTTOM_CHROME_HEIGHT + space[4],
  },
});
