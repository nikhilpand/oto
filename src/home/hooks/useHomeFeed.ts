import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGoogleAuth } from '@/auth/useGoogleAuth';
import { InnertubeSong } from '@/auth/innertube/types';
import { parseDurationMs } from '@/auth/innertube/innertubeParsers';
import { upgradeArtworkUrl } from '@/utils/imageQuality';
import { fetchLiveHomeFeed, getCachedHomeFeed } from '../services/liveHomeFeedService';
import {
  ContinueListeningItem,
  MadeForYouItem,
  NewReleaseItem,
  MoodGenreItem,
  HomeFeedData,
  getGreeting,
} from '../types';
import { Track } from '@/domain/types';
import { useQueueStore } from '@/store/useQueueStore';
import { useAudioEngine } from '@/audio/AudioContext';

function getTimeAwareSubtitle(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night listening session';
  if (hour < 12) return 'Good music to start your morning';
  if (hour < 17) return 'Afternoon soundtracks, curated for you';
  if (hour < 21) return 'Evening vibes, just for you';
  return 'Wind down with some great music';
}

function innertubeSongToTrack(s: InnertubeSong): Track {
  return {
    id: s.videoId,
    title: s.title,
    artist: s.artist,
    artists: [s.artist],
    album: s.albumName || '',
    artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || ''),
    thumbhash: '',
    durationMs: parseDurationMs(s.durationText),
    isExplicit: Boolean(s.isExplicit),
  };
}

export function useHomeFeed() {
  const router = useRouter();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const [refreshing, setRefreshing] = useState(false);
  const [rawFeedData, setRawFeedData] = useState<HomeFeedData | null>(() => getCachedHomeFeed());
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const {
    isSignedIn,
    activeProfile,
    likedSongs,
    userPlaylists,
    history,
    refresh: refreshGoogleAuth,
  } = useGoogleAuth();

  const defaultSubtitle = useMemo(() => getTimeAwareSubtitle(), []);
  const subtitle = isSignedIn ? 'Personalized from YouTube Music' : defaultSubtitle;

  useEffect(() => {
    let isMounted = true;
    void fetchLiveHomeFeed().then((live) => {
      if (isMounted && live) {
        setRawFeedData(live);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const p1 = fetchLiveHomeFeed().then((live) => {
      if (live) setRawFeedData(live);
    });
    const p2 = isSignedIn ? refreshGoogleAuth() : Promise.resolve();
    void Promise.allSettled([p1, p2]).then(() => {
      setRefreshing(false);
    });
  }, [isSignedIn, refreshGoogleAuth]);

  const feedData = useMemo<HomeFeedData | null>(() => {
    if (!rawFeedData) return null;
    if (!isSignedIn) {
      return rawFeedData;
    }

    const greeting = `${getGreeting()}${activeProfile?.name ? `, ${activeProfile.name}` : ''}`;

    const heroTrack =
      likedSongs.length > 0
        ? innertubeSongToTrack(likedSongs[0]!)
        : history.length > 0
          ? innertubeSongToTrack(history[0]!)
          : rawFeedData.heroTrack;

    let continueListening: ContinueListeningItem[] = rawFeedData.continueListening;
    if (history.length > 0) {
      const progressSteps = [75, 45, 90, 60];
      continueListening = history.slice(0, 6).map((s, idx) => ({
        track: innertubeSongToTrack(s),
        progressPercent: progressSteps[idx % progressSteps.length] ?? 50,
        lastPlayedAt: Date.now() - idx * 3600000,
      }));
    } else if (likedSongs.length > 0) {
      const progressSteps = [80, 50, 95, 65];
      continueListening = likedSongs.slice(0, 4).map((s, idx) => ({
        track: innertubeSongToTrack(s),
        progressPercent: progressSteps[idx % progressSteps.length] ?? 50,
        lastPlayedAt: Date.now() - idx * 3600000,
      }));
    }

    const userMadeForYou: MadeForYouItem[] = [];
    if (likedSongs.length > 0) {
      userMadeForYou.push({
        id: 'liked_songs',
        title: 'Liked Songs',
        subtitle: `${likedSongs.length} songs`,
        artworkUrl: upgradeArtworkUrl(likedSongs[0]?.thumbnailUrl || ''),
        thumbhash: '',
        trackCount: likedSongs.length,
        tracks: likedSongs.slice(0, 20).map(innertubeSongToTrack),
      });
    }

    if (userPlaylists.length > 0) {
      userPlaylists.forEach((pl) => {
        userMadeForYou.push({
          id: pl.playlistId,
          title: pl.title,
          subtitle: pl.subtitle || 'YouTube Music Playlist',
          artworkUrl: upgradeArtworkUrl(pl.thumbnailUrl || ''),
          thumbhash: '',
          trackCount: 0,
          tracks: [],
        });
      });
    }

    const existingIds = new Set(userMadeForYou.map((i) => i.id));
    const extraMadeForYou = rawFeedData.madeForYou.filter((i) => !existingIds.has(i.id));
    const madeForYou =
      userMadeForYou.length > 0 ? [...userMadeForYou, ...extraMadeForYou] : rawFeedData.madeForYou;

    const quickPicks =
      likedSongs.length > 0
        ? likedSongs.map(innertubeSongToTrack)
        : history.length > 0
          ? history.map(innertubeSongToTrack)
          : rawFeedData.quickPicks;

    return {
      ...rawFeedData,
      greeting,
      heroTrack,
      continueListening,
      madeForYou,
      quickPicks,
    };
  }, [isSignedIn, activeProfile, likedSongs, userPlaylists, history, rawFeedData]);

  const handlePlayTrack = useCallback(
    (track: Track, tracksContext?: Track[]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const list = tracksContext && tracksContext.length > 0 ? tracksContext : [track];
      const targetIndex = Math.max(0, list.findIndex((t) => t.id === track.id));

      playContext(list, targetIndex, {
        id: 'home_feed',
        title: track.album ?? 'Home Recommendations',
        type: 'album',
      });

      void engine.load(track, true);
    },
    [engine, playContext]
  );

  const handleResume = useCallback(
    (item: ContinueListeningItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      playContext([item.track], 0, {
        id: 'continue_listening',
        title: 'Continue Listening',
        type: 'playlist',
      });
      void engine.load(item.track, true);
      const targetMs = (item.progressPercent / 100) * item.track.durationMs;
      void engine.seekTo(targetMs);
    },
    [engine, playContext]
  );

  const handleSelectMadeForYou = useCallback(
    (item: MadeForYouItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/playlist/[id]',
        params: {
          id: item.id,
          title: item.title,
          artworkUrl: item.artworkUrl,
          subtitle: item.subtitle,
        },
      });
    },
    [router]
  );

  const handleSelectNewRelease = useCallback(
    (item: NewReleaseItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/album/[id]',
        params: {
          id: item.id,
          title: item.title,
          artworkUrl: item.artworkUrl,
          artist: item.artist,
        },
      });
    },
    [router]
  );

  const handleSelectMoodGenre = useCallback(
    (item: MoodGenreItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/search',
        params: { q: item.title },
      });
    },
    [router]
  );

  return {
    feedData,
    subtitle,
    refreshing,
    isSignedIn,
    activeProfile,
    authModalVisible,
    setAuthModalVisible,
    handleRefresh,
    handlePlayTrack,
    handleResume,
    handleSelectMadeForYou,
    handleSelectNewRelease,
    handleSelectMoodGenre,
  };
}
