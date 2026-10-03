/**
 * useGoogleAuth — React Hook for Google / YouTube Music User Authentication
 *
 * Subscribes to GoogleAuthStore and manages authenticated Innertube data retrieval
 * (profile, liked songs, playlists, history).
 */

import { useCallback, useEffect, useState } from 'react';
import { GoogleAccountSession, GoogleAuthStore, YouTubeProfile } from './GoogleAuthStore';
import { extractSapisid } from './innertube/crypto';
import { innertubeClient } from './innertube/InnertubeClient';
import { InnertubePlaylist, InnertubeSession, InnertubeSong } from './innertube/types';

import { Linking } from 'react-native';
import { YtMusicAuthBridge } from './native/YtMusicAuthBridge';

export interface UseGoogleAuthResult {
  readonly isSignedIn: boolean;
  readonly activeSession: GoogleAccountSession | null;
  readonly activeProfile: YouTubeProfile | null;
  readonly likedSongs: InnertubeSong[];
  readonly userPlaylists: InnertubePlaylist[];
  readonly history: InnertubeSong[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  readonly loginWithCookie: (cookie: string) => Promise<{ success: boolean; error?: string }>;
  readonly isNativeWebSignInAvailable: boolean;
  readonly signOut: () => void;
  readonly refresh: () => Promise<void>;
}

export function useGoogleAuth(): UseGoogleAuthResult {
  const [activeSession, setActiveSession] = useState<GoogleAccountSession | null>(() =>
    GoogleAuthStore.getActiveSession()
  );
  const [likedSongs, setLikedSongs] = useState<InnertubeSong[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<InnertubePlaylist[]>([]);
  const [history, setHistory] = useState<InnertubeSong[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Derive active profile
  const activeProfile =
    activeSession?.profiles.find((p) => p.profileId === activeSession.activeProfileId) ??
    activeSession?.profiles[0] ??
    null;

  const isSignedIn = Boolean(activeSession && activeSession.cookie && GoogleAuthStore.isSignedIn());

  // Listen to store updates
  useEffect(() => {
    const unsubscribe = GoogleAuthStore.subscribe(() => {
      setActiveSession(GoogleAuthStore.getActiveSession());
    });
    return unsubscribe;
  }, []);

  // Fetch real account data
  const refresh = useCallback(async () => {
    const innertubeSession = GoogleAuthStore.toInnertubeSession();
    if (!innertubeSession) {
      setLikedSongs([]);
      setUserPlaylists([]);
      setHistory([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch for speed
      const [fetchedLiked, fetchedPlaylists, fetchedHistory] = await Promise.all([
        innertubeClient.fetchLikedSongs(innertubeSession),
        innertubeClient.fetchUserPlaylists(innertubeSession),
        innertubeClient.fetchUserHistory(innertubeSession),
      ]);

      setLikedSongs(fetchedLiked);
      setUserPlaylists(fetchedPlaylists);
      setHistory(fetchedHistory);
    } catch (err: any) {
      setError(err?.message || 'Failed to sync YouTube Music data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-sync data on mount or when session changes
  useEffect(() => {
    if (isSignedIn) {
      void refresh();
    } else {
      setLikedSongs([]);
      setUserPlaylists([]);
      setHistory([]);
    }
  }, [isSignedIn, refresh]);

  // Login handler
  const loginWithCookie = useCallback(
    async (cookie: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = cookie.trim();
      if (!trimmed) {
        return { success: false, error: 'Cookie string is empty' };
      }

      const sapisid = extractSapisid(trimmed);
      if (!sapisid) {
        return {
          success: false,
          error: 'No SAPISID found in cookie. Please ensure your cookie includes SAPISID or __Secure-3PAPISID.',
        };
      }

      setIsLoading(true);
      setError(null);

      const tentativeSession: InnertubeSession = {
        cookie: trimmed,
        sapisid,
        authUser: '0',
      };

      try {
        const account = await innertubeClient.fetchAccountProfile(tentativeSession);
        if (!account || !account.name) {
          setIsLoading(false);
          const err = 'Could not authenticate with YouTube Music. Please verify your cookie is valid and active.';
          setError(err);
          return { success: false, error: err };
        }

        const profile: YouTubeProfile = {
          profileId: account.channelId || account.name,
          name: account.name,
          email: account.email,
          avatarUrl: account.avatarUrl,
          pageId: account.pageId,
          isBrandAccount: Boolean(account.pageId),
        };

        const sessionRecord: GoogleAccountSession = {
          accountId: account.name,
          cookie: trimmed,
          profiles: [profile],
          activeProfileId: profile.profileId,
          createdAt: Date.now(),
        };

        GoogleAuthStore.upsertSession(sessionRecord);
        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        setIsLoading(false);
        const errMessage = err?.message || 'Authentication failed';
        setError(errMessage);
        return { success: false, error: errMessage };
      }
    },
    []
  );

  // Login via native in-app Google Sign-In WebView (BitChord protocol)
  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!YtMusicAuthBridge.isAvailable()) {
      try {
        await Linking.openURL(
          'https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&passive=true&continue=https%3A%2F%2Fmusic.youtube.com%2F'
        );
      } catch {}
      return {
        success: false,
        error: 'Opening Google Sign-In in browser. Once logged in, copy and paste your cookie string below.',
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[OTO_AUTH] Launching Google Sign-In native WebView...');
      const captured = await YtMusicAuthBridge.openGoogleSignIn();
      console.log(
        '[OTO_AUTH] Session captured! Cookie length:',
        captured.cookie ? captured.cookie.length : 0,
        'authUser:',
        captured.authUser
      );

      const sapisid = extractSapisid(captured.cookie);
      if (!sapisid) {
        setIsLoading(false);
        const err = 'Failed to extract signing secret (SAPISID) from Google session.';
        console.warn('[OTO_AUTH]', err);
        setError(err);
        return { success: false, error: err };
      }

      console.log('[OTO_AUTH] Extracted valid SAPISID secret');

      const tentativeSession: InnertubeSession = {
        cookie: captured.cookie,
        sapisid,
        authUser: captured.authUser || '0',
        pageId: captured.pageId,
        visitorData: captured.visitorData,
      };

      // Attempt to fetch live account profile from Innertube, with graceful fallback
      console.log('[OTO_AUTH] Requesting account profile from Innertube account/account_menu...');
      let account: any = null;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), 5000);
      });
      try {
        account = await Promise.race([
          innertubeClient.fetchAccountProfile(tentativeSession),
          timeoutPromise,
        ]);
        console.log('[OTO_AUTH] Profile fetch completed:', account ? account.name : 'null (using default)');
      } catch (e: any) {
        console.warn('[OTO_AUTH] fetchAccountProfile error, proceeding with session fallback:', e?.message);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      const name = account?.name || 'YouTube Music User';

      const profile: YouTubeProfile = {
        profileId: account?.channelId || captured.pageId || name,
        name,
        email: account?.email || '',
        avatarUrl: account?.avatarUrl,
        pageId: captured.pageId || account?.pageId,
        isBrandAccount: Boolean(captured.pageId || account?.pageId),
      };

      const sessionRecord: GoogleAccountSession = {
        accountId: name,
        cookie: captured.cookie,
        profiles: [profile],
        activeProfileId: profile.profileId,
        createdAt: Date.now(),
      };

      console.log('[OTO_AUTH] Saving session to GoogleAuthStore and hydrating state');
      GoogleAuthStore.upsertSession(sessionRecord);
      setActiveSession(sessionRecord);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      const errMessage = err?.message || 'In-app Google sign-in was cancelled or failed.';
      console.warn('[OTO_AUTH] Google Sign-In error:', errMessage);
      if (errMessage !== 'User closed Google sign-in' && errMessage !== 'CANCELLED') {
        setError(errMessage);
      }
      return { success: false, error: errMessage };
    }
  }, []);

  const signOut = useCallback(() => {
    GoogleAuthStore.signOut();
    void YtMusicAuthBridge.clearGoogleCookies();
    setLikedSongs([]);
    setUserPlaylists([]);
    setHistory([]);
  }, []);

  return {
    isSignedIn,
    activeSession,
    activeProfile,
    likedSongs,
    userPlaylists,
    history,
    isLoading,
    error,
    loginWithGoogle,
    loginWithCookie,
    isNativeWebSignInAvailable: YtMusicAuthBridge.isAvailable(),
    signOut,
    refresh,
  };
}
