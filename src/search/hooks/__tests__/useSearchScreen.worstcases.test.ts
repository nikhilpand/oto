/**
 * useSearchScreen.worstcases.test.ts — Hard Worst-Case Tests for Search Orchestrator
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useSearchScreen } from '../useSearchScreen';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockLoad = jest.fn().mockResolvedValue(undefined);
jest.mock('@/audio/AudioContext', () => ({
  useAudioEngine: () => ({
    load: mockLoad,
  }),
}));

const mockPlayContext = jest.fn();
jest.mock('@/store/useQueueStore', () => ({
  useQueueStore: (selector: any) => selector({ playContext: mockPlayContext }),
}));

function renderSearchHook(): { current: ReturnType<typeof useSearchScreen> } {
  const returnVal: { current: ReturnType<typeof useSearchScreen> } = {} as any;
  function TestComponent() {
    returnVal.current = useSearchScreen();
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(TestComponent));
  });
  return returnVal;
}

describe('useSearchScreen Worst-Case Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles empty text without executing search or retaining stale results', () => {
    const result = renderSearchHook();

    act(() => {
      result.current.handleChangeText('   ');
      jest.advanceTimersByTime(300);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.isSearching).toBe(false);
  });

  it('routes to artist detail when artist is pressed', () => {
    const result = renderSearchHook();

    act(() => {
      result.current.handleArtistPress({
        id: 'artist_123',
        name: 'The Weeknd',
        artworkUrl: 'https://img.com/art.jpg',
        thumbhash: '',
        trackCount: 50,
        isVerified: true,
      });
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/artist/[id]',
      params: { id: 'artist_123', name: 'The Weeknd', artworkUrl: 'https://img.com/art.jpg' },
    });
  });

  it('routes to album detail when album is pressed', () => {
    const result = renderSearchHook();

    act(() => {
      result.current.handleAlbumPress({
        id: 'album_456',
        title: 'After Hours',
        artist: 'The Weeknd',
        artworkUrl: 'https://img.com/album.jpg',
        thumbhash: '',
        year: 2020,
        trackCount: 14,
        tracks: [],
      });
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/album/[id]',
      params: {
        id: 'album_456',
        title: 'After Hours',
        artist: 'The Weeknd',
        artworkUrl: 'https://img.com/album.jpg',
      },
    });
  });

  it('routes to playlist detail when playlist is pressed', () => {
    const result = renderSearchHook();

    act(() => {
      result.current.handlePlaylistPress({
        id: 'playlist_789',
        title: 'Top Hits',
        description: 'Global chart toppers',
        artworkUrl: 'https://img.com/pl.jpg',
        thumbhash: '',
        trackCount: 100,
        curated: true,
        tracks: [],
      });
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/playlist/[id]',
      params: {
        id: 'playlist_789',
        title: 'Top Hits',
        subtitle: 'Global chart toppers',
        artworkUrl: 'https://img.com/pl.jpg',
      },
    });
  });

  it('loads audio engine and sets queue context when playTrack is called', () => {
    const result = renderSearchHook();
    const mockTrack = {
      id: 'track_1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      artists: ['The Weeknd'],
      album: 'After Hours',
      durationMs: 200000,
      artworkUrl: 'https://img.com/art.jpg',
      thumbhash: '',
      isExplicit: false,
    };

    act(() => {
      result.current.handlePlayTrack(mockTrack, [mockTrack]);
    });

    expect(mockPlayContext).toHaveBeenCalledWith([mockTrack], 0, expect.any(Object));
    expect(mockLoad).toHaveBeenCalledWith(mockTrack, true);
  });
});
