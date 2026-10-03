jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn().mockResolvedValue(true),
  },
  Platform: {
    OS: 'android',
  },
  NativeModules: {},
}));

jest.mock('../native/YtMusicAuthBridge', () => ({
  YtMusicAuthBridge: {
    isAvailable: jest.fn(() => false),
    openGoogleSignIn: jest.fn(),
    clearGoogleCookies: jest.fn().mockResolvedValue(true),
  },
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useGoogleAuth, UseGoogleAuthResult } from '../useGoogleAuth';
import { GoogleAuthStore } from '../GoogleAuthStore';
import { innertubeClient } from '../innertube/InnertubeClient';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useGoogleAuth Hook', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    GoogleAuthStore.setStorageForTesting({
      getString: (k: string) => mockStorage[k],
      set: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      delete: (k: string) => {
        delete mockStorage[k];
      },
    });
    jest.clearAllMocks();
  });

  function renderCustomHook(): { current: UseGoogleAuthResult } {
    const returnVal: { current: UseGoogleAuthResult } = {} as any;
    function TestComponent() {
      const hook = useGoogleAuth();
      returnVal.current = hook;
      return null;
    }
    act(() => {
      TestRenderer.create(React.createElement(TestComponent));
    });
    return returnVal;
  }

  it('starts signed out with empty lists', () => {
    const result = renderCustomHook();

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.activeProfile).toBeNull();
    expect(result.current.likedSongs).toEqual([]);
    expect(result.current.userPlaylists).toEqual([]);
  });

  it('fails gracefully when cookie has no SAPISID', async () => {
    const result = renderCustomHook();

    let res: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      res = await result.current.loginWithCookie('OTHER=123; TEST=456;');
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('No SAPISID found in cookie');
    expect(result.current.isSignedIn).toBe(false);
  });

  it('authenticates and populates profile when valid cookie is provided', async () => {
    jest.spyOn(innertubeClient, 'fetchAccountProfile').mockResolvedValueOnce({
      name: 'Test Listener',
      email: 'listener@example.com',
      avatarUrl: 'https://avatar.url/avatar.png',
    });

    jest.spyOn(innertubeClient, 'fetchLikedSongs').mockResolvedValueOnce([
      { videoId: 'song1', title: 'Song 1', artist: 'Artist 1' },
    ]);
    jest.spyOn(innertubeClient, 'fetchUserPlaylists').mockResolvedValueOnce([
      { playlistId: 'pl1', title: 'Playlist 1' },
    ]);
    jest.spyOn(innertubeClient, 'fetchUserHistory').mockResolvedValueOnce([]);

    const result = renderCustomHook();

    await act(async () => {
      const res = await result.current.loginWithCookie('SAPISID=valid_sapisid_token;');
      expect(res.success).toBe(true);
      await Promise.resolve();
    });

    // Wait for the async refresh to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.activeProfile?.name).toBe('Test Listener');
    expect(result.current.activeProfile?.email).toBe('listener@example.com');
  });

  it('signs out properly', async () => {
    jest.spyOn(innertubeClient, 'fetchAccountProfile').mockResolvedValueOnce({
      name: 'Test Listener',
    });
    jest.spyOn(innertubeClient, 'fetchLikedSongs').mockResolvedValueOnce([]);
    jest.spyOn(innertubeClient, 'fetchUserPlaylists').mockResolvedValueOnce([]);
    jest.spyOn(innertubeClient, 'fetchUserHistory').mockResolvedValueOnce([]);

    const result = renderCustomHook();

    await act(async () => {
      await result.current.loginWithCookie('SAPISID=token;');
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isSignedIn).toBe(true);

    await act(async () => {
      result.current.signOut();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.activeProfile).toBeNull();
  });

  it('authenticates via native Google sign-in bridge when available', async () => {
    const { YtMusicAuthBridge } = require('../native/YtMusicAuthBridge');
    (YtMusicAuthBridge.isAvailable as jest.Mock).mockReturnValue(true);
    (YtMusicAuthBridge.openGoogleSignIn as jest.Mock).mockResolvedValueOnce({
      cookie: 'SAPISID=captured_secret; SID=foo;',
      authUser: '0',
      pageId: '123456789',
      visitorData: 'Cgtsb2dnZWRfaW4',
      clientVersion: '2.20250101.01.00',
    });

    jest.spyOn(innertubeClient, 'fetchAccountProfile').mockResolvedValueOnce({
      name: 'Google Streamer',
      channelId: 'UC123456',
      email: 'streamer@google.com',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      pageId: '123456789',
    });
    jest.spyOn(innertubeClient, 'fetchLikedSongs').mockResolvedValueOnce([]);
    jest.spyOn(innertubeClient, 'fetchUserPlaylists').mockResolvedValueOnce([]);
    jest.spyOn(innertubeClient, 'fetchUserHistory').mockResolvedValueOnce([]);

    const result = renderCustomHook();

    let res: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      res = await result.current.loginWithGoogle();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(res.success).toBe(true);
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.activeProfile?.name).toBe('Google Streamer');
    expect(result.current.activeProfile?.isBrandAccount).toBe(true);
  });
});

