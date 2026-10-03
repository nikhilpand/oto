/**
 * useLibraryData.worstcases.test.ts — Hard Worst-Case Tests for Library Data Hub
 */

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useLibraryData } from '../useLibraryData';
import * as otoBackend from '@/api/otoBackend';
import { useGoogleAuth } from '@/auth/useGoogleAuth';
import { useDownloadStore } from '@/downloads/DownloadStore';

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

jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'ios' },
}), { virtual: true });

jest.mock('@/auth/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(() => ({
    isSignedIn: false,
    activeProfile: null,
    likedSongs: [],
    userPlaylists: [],
  })),
}));

jest.mock('@/api/otoBackend', () => ({
  getLiveHomeFeed: jest.fn().mockResolvedValue(null),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}), { virtual: true });

jest.mock('@/downloads/DownloadStore', () => ({
  useDownloadStore: jest.fn((selector) => selector({ records: [] })),
}));

function renderLibraryHook(): { current: ReturnType<typeof useLibraryData> } {
  const returnVal: { current: ReturnType<typeof useLibraryData> } = {} as any;
  function TestComponent() {
    returnVal.current = useLibraryData();
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(TestComponent));
  });
  return returnVal;
}

describe('useLibraryData Worst-Case Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGoogleAuth as unknown as jest.Mock).mockReturnValue({
      isSignedIn: false,
      activeProfile: null,
      likedSongs: [],
      userPlaylists: [],
    });
    (useDownloadStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({ records: [] })
    );
    jest.spyOn(otoBackend, 'getLiveHomeFeed').mockResolvedValue(null as any);
  });

  it('initializes safely with empty states without throwing', () => {
    const result = renderLibraryHook();
    expect(result.current.filter).toBe('all');
    expect(result.current.sortOrder).toBe('recent');
    expect(result.current.viewMode).toBe('list');
    expect(result.current.filteredItems).toEqual([]);
    expect(result.current.likedInfo.count).toBe(0);
  });

  it('filters downloaded items strictly against completed SQLite records', async () => {
    const mockTrack = {
      id: 'downloaded_1',
      title: 'Offline Masterpiece',
      artist: 'Studio Artist',
      artists: ['Studio Artist'],
      album: 'Studio Album',
      durationMs: 180000,
      artworkUrl: 'https://img.com/off.jpg',
      thumbhash: '',
      isExplicit: false,
    };

    (useDownloadStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        records: [
          {
            id: 'rec_1',
            track: mockTrack,
            localUri: 'file:///data/track.mp3',
            fileSizeBytes: 5000000,
            status: 'completed',
            progress: 1,
            createdAt: 1700000000000,
          },
          {
            id: 'rec_2',
            track: { ...mockTrack, id: 'in_progress_track' },
            localUri: '',
            fileSizeBytes: 0,
            status: 'downloading',
            progress: 0.5,
            createdAt: 1700000001000,
          },
        ],
      })
    );

    jest.spyOn(otoBackend, 'getLiveHomeFeed').mockResolvedValue({
      madeForYou: [],
      newReleases: [],
      quickPicks: [],
    } as any);

    let result = renderLibraryHook();
    await act(async () => {
      await Promise.resolve();
    });

    // Switch filter to downloads
    act(() => {
      result.current.setFilter('downloads');
    });

    const downloadedItems = result.current.filteredItems;
    expect(downloadedItems.length).toBeGreaterThanOrEqual(1);
    expect(downloadedItems.every((i) => i.download.status === 'downloaded')).toBe(true);
    expect(downloadedItems.some((i) => i.id === 'downloaded_1')).toBe(true);
    expect(downloadedItems.some((i) => i.id === 'in_progress_track')).toBe(false);
  });

  it('routes correctly when tapping playlist, album, and artist items', async () => {
    const result = renderLibraryHook();

    // 1. Playlist
    act(() => {
      result.current.handleItemPress({
        id: 'pl_1',
        kind: 'playlist',
        title: 'Morning Acoustic',
        subtitle: 'Curated by OTO',
        artworkUrl: 'https://img.com/pl.jpg',
        thumbhash: '',
        download: { status: 'none' },
        addedAt: new Date().toISOString(),
      });
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/playlist/[id]',
      params: {
        id: 'pl_1',
        title: 'Morning Acoustic',
        artworkUrl: 'https://img.com/pl.jpg',
        subtitle: 'Curated by OTO',
      },
    });

    // 2. Album
    act(() => {
      result.current.handleItemPress({
        id: 'al_1',
        kind: 'album',
        title: 'Discovery',
        subtitle: 'Daft Punk',
        artworkUrl: 'https://img.com/al.jpg',
        thumbhash: '',
        download: { status: 'none' },
        addedAt: new Date().toISOString(),
      });
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/album/[id]',
      params: {
        id: 'al_1',
        title: 'Discovery',
        artist: 'Daft Punk',
        artworkUrl: 'https://img.com/al.jpg',
      },
    });

    // 3. Artist
    act(() => {
      result.current.handleItemPress({
        id: 'ar_1',
        kind: 'artist',
        title: 'Daft Punk',
        subtitle: 'Artist',
        artworkUrl: 'https://img.com/ar.jpg',
        thumbhash: '',
        download: { status: 'none' },
        addedAt: new Date().toISOString(),
      });
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/artist/[id]',
      params: {
        id: 'ar_1',
        name: 'Daft Punk',
        artworkUrl: 'https://img.com/ar.jpg',
      },
    });
  });

  it('routes to Liked Songs playlist when handleLikedSongsPlay is called', () => {
    const result = renderLibraryHook();
    act(() => {
      result.current.handleLikedSongsPlay();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/playlist/[id]',
      params: {
        id: 'liked_songs',
        title: 'Liked Songs',
        subtitle: '0 songs',
        artworkUrl: '',
      },
    });
  });
});
