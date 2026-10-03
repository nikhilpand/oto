import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { executeLiveSearch } from '../services/liveSearchService';
import {
  getRecentQueries,
  addRecentQuery,
  removeRecentQuery,
  clearRecentQueries,
} from '../storage/recentSearchesStorage';
import type { SearchFilter } from '../components/SearchCategoryPills';
import type { SearchResults, TopResult, SearchSuggestion, SearchArtist, SearchAlbum, SearchPlaylist } from '../types';
import type { Track } from '@/domain/types';

let searchSequence = 0;
function nextSequenceToken(): number {
  return ++searchSequence;
}
function isCurrentToken(token: number): boolean {
  return token === searchSequence;
}

export function useSearchScreen() {
  const router = useRouter();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => getRecentQueries());
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = inputValue.trim().length > 0;

  const performSearch = useCallback(async (text: string, filter: SearchFilter) => {
    if (!text.trim()) {
      setResults(null);
      return;
    }
    const token = nextSequenceToken();
    const liveResults = await executeLiveSearch(text, filter);
    if (!isCurrentToken(token)) return;

    if (
      liveResults &&
      (liveResults.tracks.length > 0 ||
        liveResults.topResult ||
        liveResults.artists.length > 0 ||
        liveResults.albums.length > 0)
    ) {
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
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setInputValue(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        setResults(null);
        return;
      }
      debounceRef.current = setTimeout(() => {
        void performSearch(text, activeFilter);
      }, 250);
    },
    [activeFilter, performSearch]
  );

  const handleFilterChange = useCallback(
    (filter: SearchFilter) => {
      setActiveFilter(filter);
      if (inputValue.trim()) {
        void performSearch(inputValue, filter);
      }
    },
    [inputValue, performSearch]
  );

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

  const handleArtistPress = useCallback(
    (artist: SearchArtist) => {
      addRecentQuery(artist.name);
      setRecentQueries(getRecentQueries());
      router.push({
        pathname: '/artist/[id]',
        params: { id: artist.id, name: artist.name, artworkUrl: artist.artworkUrl },
      });
    },
    [router]
  );

  const handleAlbumPress = useCallback(
    (album: SearchAlbum) => {
      addRecentQuery(album.title);
      setRecentQueries(getRecentQueries());
      router.push({
        pathname: '/album/[id]',
        params: {
          id: album.id,
          title: album.title,
          artist: album.artist,
          artworkUrl: album.artworkUrl,
        },
      });
    },
    [router]
  );

  const handlePlaylistPress = useCallback(
    (playlist: SearchPlaylist) => {
      addRecentQuery(playlist.title);
      setRecentQueries(getRecentQueries());
      router.push({
        pathname: '/playlist/[id]',
        params: {
          id: playlist.id,
          title: playlist.title,
          subtitle: playlist.description,
          artworkUrl: playlist.artworkUrl,
        },
      });
    },
    [router]
  );

  const handleTopResultPress = useCallback(
    (result: TopResult) => {
      if (result.kind === 'track' && result.track) {
        handlePlayTrack(result.track, results?.tracks);
      } else if (result.kind === 'artist' && result.artist) {
        handleArtistPress(result.artist);
      } else if (result.kind === 'album' && result.album) {
        handleAlbumPress(result.album);
      } else if (result.kind === 'playlist' && result.playlist) {
        handlePlaylistPress(result.playlist);
      }
    },
    [handlePlayTrack, handleArtistPress, handleAlbumPress, handlePlaylistPress, results?.tracks]
  );

  const handleSelectRecent = useCallback(
    (q: string) => {
      handleChangeText(q);
      setInputValue(q);
    },
    [handleChangeText]
  );

  const handleRemoveRecent = useCallback((q: string) => {
    removeRecentQuery(q);
    setRecentQueries(getRecentQueries());
  }, []);

  const handleClearAllRecents = useCallback(() => {
    clearRecentQueries();
    setRecentQueries([]);
  }, []);

  const handleSuggestionPress = useCallback(
    (suggestion: SearchSuggestion) => {
      handleChangeText(suggestion.label);
      setInputValue(suggestion.label);
    },
    [handleChangeText]
  );

  const handleClearInput = useCallback(() => {
    setInputValue('');
    setResults(null);
  }, []);

  const hasResults = Boolean(
    results &&
      (results.topResult ||
        results.tracks.length > 0 ||
        results.artists.length > 0 ||
        results.albums.length > 0 ||
        (results.playlists?.length ?? 0) > 0)
  );

  return {
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
  };
}
