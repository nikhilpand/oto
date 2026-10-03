/**
 * HomeScreenContent — Primary Home Feed Orchestrator
 *
 * Assembles all editorial sections:
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

import React from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { color } from '@/design/tokens';
import { useLayout } from '@/design/hooks/useLayout';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';
import { HomeHeader } from '../components/HomeHeader';
import { GoogleSignInModal } from '@/auth/components/GoogleSignInModal';
import { SpotlightFlowSection } from '../components/SpotlightFlowSection';
import { ContinueListeningSection } from '../components/ContinueListeningSection';
import { MadeForYouSection } from '../components/MadeForYouSection';
import { QuickPicksSection } from '../components/QuickPicksSection';
import { NewReleasesSection } from '../components/NewReleasesSection';
import { MoodsGenresSection } from '../components/MoodsGenresSection';
import { HomeSkeleton } from '../components/HomeSkeleton';
import { OfflineBanner } from '../components/OfflineBanner';
import { useHomeFeed } from '../hooks/useHomeFeed';

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
  const { scrollY } = useScrollOffset();
  const { bottomChrome } = useLayout();

  const {
    feedData,
    subtitle,
    refreshing,
    authModalVisible,
    setAuthModalVisible,
    handleRefresh,
    handlePlayTrack,
    handleResume,
    handleSelectMadeForYou,
    handleSelectNewRelease,
    handleSelectMoodGenre,
  } = useHomeFeed();

  const scrollHandler = useAnimatedScrollHandler((e) => {
    'worklet';
    scrollY.value = e.contentOffset.y;
  });

  const router = useRouter();

  if (isLoading || !feedData) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <HomeHeader
          greeting="Good music"
          onSearchPress={() => router.push('/(tabs)/search' as any)}
          onSettingsPress={() => router.push('/settings' as any)}
          onStorybookToggle={onStorybookToggle}
        />
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomChrome }]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={color.accent.signature}
          />
        }
      >
        {/* 1. BitChord Header: Waveform Logo, Search Bar, Avatar */}
        <HomeHeader
          greeting={feedData.greeting}
          subtitle={subtitle}
          onSearchPress={() => router.push('/(tabs)/search' as any)}
          onProfilePress={() => setAuthModalVisible(true)}
          onSettingsPress={() => router.push('/settings' as any)}
          onStorybookToggle={onStorybookToggle}
        />

        {isOffline && <OfflineBanner isOffline={isOffline} />}

        {/* 2. Spotlight Flow — multi-card immersive snap carousel */}
        <SpotlightFlowSection
          tracks={feedData.spotlightTracks ?? [feedData.heroTrack, ...feedData.quickPicks.slice(0, 4)]}
          onPlay={handlePlayTrack}
        />

        {/* 3. Continue Listening (Recent history items) */}
        <ContinueListeningSection
          items={feedData.continueListening}
          onResume={handleResume}
        />

        {/* 4. Made For You (Curated playlists) */}
        <MadeForYouSection
          items={feedData.madeForYou}
          onSelect={handleSelectMadeForYou}
        />

        {/* 5. Quick Picks (Song recommendations) */}
        <QuickPicksSection
          tracks={feedData.quickPicks}
          onPlayTrack={handlePlayTrack}
        />

        {/* 6. New Releases (New albums) */}
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

      {/* Google / YouTube Music Auth & Account Hub Modal */}
      <GoogleSignInModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
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
    flexGrow: 1,
  },
});
