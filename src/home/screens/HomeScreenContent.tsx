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

import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { color } from '@/design/tokens';
import { HomeHeader } from '../components/HomeHeader';
import { HeroSection } from '../components/HeroSection';
import { ContinueListeningSection } from '../components/ContinueListeningSection';
import { MadeForYouSection } from '../components/MadeForYouSection';
import { QuickPicksSection } from '../components/QuickPicksSection';
import { NewReleasesSection } from '../components/NewReleasesSection';
import { MoodsGenresSection } from '../components/MoodsGenresSection';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { OfflineBanner } from '../components/OfflineBanner';
import { getMockHomeFeed } from '../data/mockHomeData';
import { ContinueListeningItem, MadeForYouItem, NewReleaseItem, MoodGenreItem } from '../types';
import { Track } from '@/domain/types';
import { useQueueStore } from '@/store/useQueueStore';
import { useAudioEngine } from '@/audio/AudioContext';

export interface HomeScreenContentProps {
  isLoading?: boolean;
  isOffline?: boolean;
  onStorybookToggle?: () => void;
  onSearchPress?: () => void;
}

export function HomeScreenContent({
  isLoading = false,
  isOffline = false,
  onStorybookToggle,
  onSearchPress,
}: HomeScreenContentProps): React.JSX.Element {
  const [feedData, setFeedData] = useState(() => getMockHomeFeed());
  const [refreshing, setRefreshing] = useState(false);
  const [cachedOnly, setCachedOnly] = useState(false);

  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setFeedData(getMockHomeFeed());
      setRefreshing(false);
    }, 600);
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
      const sessionTracks = feedData.quickPicks;
      if (sessionTracks.length > 0) {
        playContext(sessionTracks, 0, {
          id: item.id,
          title: item.title,
          type: 'radio',
        });
        void engine.load(sessionTracks[0]!, true);
      }
    },
    [engine, feedData.quickPicks, playContext]
  );

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
          onSearchPress={() => onSearchPress?.()}
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
          onPlay={(t) => handlePlayTrack(t, [feedData.heroTrack])}
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
      </ScrollView>
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
    // Generous bottom clearance to ensure content is never covered by floating mini player + tabs
    paddingBottom: 128,
  },
});
