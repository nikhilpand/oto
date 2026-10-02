/**
 * HomeScreenContent — Primary Home Feed Orchestrator
 *
 * Assembles all 6 editorial sections with varied visual densities:
 * 1. Editorial Header (Greeting, Avatar, Search Pill, Storybook Switch)
 * 2. Hero Section (Expansive atmospheric wash)
 * 3. Continue Listening (Compact progress cards)
 * 4. Made For You (Large rounded carousel)
 * 5. Quick Picks (Ultra-dense borderless rows)
 * 6. New Releases (Release date badge scroller)
 * 7. Moods & Genres (Typographic chip grid)
 *
 * Also handles loading states (HomeSkeleton) and designed offline states (OfflineBanner).
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { color, BOTTOM_CHROME_HEIGHT } from '@/design/tokens';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { HomeHeader } from '../components/HomeHeader';
import { HeroSection } from '../components/HeroSection';
import { ContinueListeningSection } from '../components/ContinueListeningSection';
import { MadeForYouSection } from '../components/MadeForYouSection';
import { QuickPicksSection } from '../components/QuickPicksSection';
import { NewReleasesSection } from '../components/NewReleasesSection';
import { MoodsGenresSection } from '../components/MoodsGenresSection';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { OfflineBanner } from '../components/OfflineBanner';
import { getLiveHomeFeed } from '@/api/otoBackend';
import { ContinueListeningItem, MadeForYouItem, NewReleaseItem, MoodGenreItem, HomeFeedData } from '../types';
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

export interface HomeScreenContentProps {
  isLoading?: boolean;
  isOffline?: boolean;
  onStorybookToggle?: () => void;
}

export function HomeScreenContent({
  isLoading = false,
  isOffline = false,
  onStorybookToggle,
}: HomeScreenContentProps): React.JSX.Element {
  const [refreshing, setRefreshing] = useState(false);
  const [feedData, setFeedData] = useState<HomeFeedData | null>(null);
  const { scrollY } = useScrollOffset();
  const router = useRouter();
  const scrollHandler = useAnimatedScrollHandler((e) => {
    'worklet';
    scrollY.value = e.contentOffset.y;
  });
  const [cachedOnly, setCachedOnly] = useState(false);
  const subtitle = useMemo(() => getTimeAwareSubtitle(), []);

  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  // Eagerly hydrate with live real catalog from backend
  React.useEffect(() => {
    let isMounted = true;
    void getLiveHomeFeed().then((live) => {
      if (isMounted && live) {
        setFeedData(live);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void getLiveHomeFeed().then((live) => {
      if (live) {
        setFeedData(live);
      }
      setRefreshing(false);
    }).catch(() => {
      setRefreshing(false);
    });
  }, []);

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
      if (item.tracks.length > 0) {
        playContext(item.tracks, 0, {
          id: item.id,
          title: item.title,
          type: 'playlist',
        });
        void engine.load(item.tracks[0]!, true);
      }
    },
    [engine, playContext]
  );

  const handleSelectNewRelease = useCallback(
    (item: NewReleaseItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item.tracks.length > 0) {
        playContext(item.tracks, 0, {
          id: item.id,
          title: item.title,
          type: 'album',
        });
        void engine.load(item.tracks[0]!, true);
      }
    },
    [engine, playContext]
  );

  const handleSelectMoodGenre = useCallback(
    (item: MoodGenreItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Play a session of quick picks or mood tracks
      const sessionTracks = feedData?.quickPicks || [];
      if (sessionTracks.length > 0) {
        playContext(sessionTracks, 0, {
          id: item.id,
          title: item.title,
          type: 'radio',
        });
        void engine.load(sessionTracks[0]!, true);
      }
    },
    [engine, feedData?.quickPicks, playContext]
  );

  if (isLoading || !feedData) {
    return <HomeSkeleton />;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={color.accent.signature}
          />
        }
      >
        {/* 1. Editorial Header */}
        <HomeHeader
          greeting={feedData.greeting}
          subtitle={subtitle}
          onSearchPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/search');
          }}
          onStorybookToggle={onStorybookToggle}
        />

        {/* Designed Offline Banner */}
        <OfflineBanner
          isOffline={isOffline}
          cachedOnlyActive={cachedOnly}
          onToggleCachedOnly={() => setCachedOnly((prev) => !prev)}
        />

        {/* 2. Hero Section (~320x340 dp atmospheric wash) */}
        <HeroSection
          track={feedData.heroTrack}
          onPlay={(t) =>
            handlePlayTrack(t, [feedData.heroTrack, ...(feedData.quickPicks || [])])
          }
          onPressCard={() =>
            handlePlayTrack(feedData.heroTrack, [
              feedData.heroTrack,
              ...(feedData.quickPicks || []),
            ])
          }
        />

        {/* 3. Continue Listening (Compact 220x72 dp horizontal pills with progress) */}
        <ContinueListeningSection
          items={feedData.continueListening}
          onResume={handleResume}
        />

        {/* 4. Made For You (Large 160x210 dp rounded cards) */}
        <MadeForYouSection
          items={feedData.madeForYou}
          onSelect={handleSelectMadeForYou}
        />

        {/* 5. Quick Picks (Dense 46x46 borderless song rows) */}
        <QuickPicksSection
          tracks={feedData.quickPicks}
          onPlayTrack={(t) => handlePlayTrack(t, feedData.quickPicks)}
        />

        {/* 6. New Releases (130x170 dp scroller with release badges) */}
        <NewReleasesSection
          items={feedData.newReleases}
          onSelect={handleSelectNewRelease}
        />

        {/* 7. Moods & Genres (Typographic capsules with curated palettes) */}
        <MoodsGenresSection
          items={feedData.moodsGenres}
          onSelect={handleSelectMoodGenre}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  container: {
    flex: 1,
  },
  content: {
    // Bottom clearance: tab bar + mini player + gap + safe area handled by token
    paddingBottom: BOTTOM_CHROME_HEIGHT + 16,
  },
});
