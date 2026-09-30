/**
 * HomeSkeleton — Staged Shimmer Skeletons Matching Exact Section Geometries
 *
 * Implements anti-AI-slop rule: no generic wireframe bars. Every skeleton matches
 * the exact shape of its corresponding section (Hero card, continue pill, carousel square).
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';

export function HomeSkeleton(): React.JSX.Element {
  const shimmerOpacity = useSharedValue(0.4);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmerOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading home feed music recommendations"
    >
      {/* 1. Header Skeleton */}
      <Animated.View style={[styles.headerSkeleton, animatedStyle]}>
        <View style={styles.greetingBar} />
        <View style={styles.searchPillBar} />
      </Animated.View>

      {/* 2. Hero Card Skeleton (matches HeroSection) */}
      <Animated.View style={[styles.heroSkeleton, animatedStyle]}>
        <View style={styles.heroArtwork} />
        <View style={styles.heroInfo}>
          <View style={styles.heroBadge} />
          <View style={styles.heroTitle} />
          <View style={styles.heroSubtitle} />
          <View style={styles.heroButton} />
        </View>
      </Animated.View>

      {/* 3. Continue Listening Skeleton */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionTitleBar} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {[1, 2, 3].map((key) => (
            <Animated.View key={key} style={[styles.continuePill, animatedStyle]} />
          ))}
        </ScrollView>
      </View>

      {/* 4. Made For You Skeleton */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionTitleBar} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {[1, 2, 3].map((key) => (
            <Animated.View key={key} style={[styles.madeForYouCard, animatedStyle]} />
          ))}
        </ScrollView>
      </View>

      {/* 5. Quick Picks Rows Skeleton */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionTitleBar} />
        <View style={styles.rowsWrapper}>
          {[1, 2, 3, 4].map((key) => (
            <Animated.View key={key} style={[styles.songRowSkeleton, animatedStyle]} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  content: {
    paddingBottom: 120,
  },
  headerSkeleton: {
    paddingHorizontal: space[3],
    paddingTop: space[2],
    paddingBottom: space[3],
    gap: space[2],
  },
  greetingBar: {
    width: 180,
    height: 32,
    backgroundColor: color.bg.s2,
    borderRadius: radius.sm,
  },
  searchPillBar: {
    width: '100%',
    height: 48,
    backgroundColor: color.bg.s2,
    borderRadius: radius.full,
  },
  heroSkeleton: {
    marginHorizontal: space[3],
    height: 180,
    backgroundColor: color.bg.s2,
    borderRadius: radius.xl,
    padding: space[3],
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'center',
    marginBottom: space[4],
  },
  heroArtwork: {
    width: 140,
    height: 140,
    backgroundColor: color.bg.s3,
    borderRadius: radius.md,
  },
  heroInfo: {
    flex: 1,
    gap: space[2],
    justifyContent: 'center',
  },
  heroBadge: {
    width: 90,
    height: 18,
    backgroundColor: color.bg.s3,
    borderRadius: radius.full,
  },
  heroTitle: {
    width: '90%',
    height: 24,
    backgroundColor: color.bg.s3,
    borderRadius: radius.xs,
  },
  heroSubtitle: {
    width: '60%',
    height: 16,
    backgroundColor: color.bg.s3,
    borderRadius: radius.xs,
  },
  heroButton: {
    width: 110,
    height: 36,
    backgroundColor: color.bg.s3,
    borderRadius: radius.full,
    marginTop: space[1],
  },
  sectionWrapper: {
    marginBottom: space[4],
  },
  sectionTitleBar: {
    width: 140,
    height: 20,
    backgroundColor: color.bg.s2,
    borderRadius: radius.xs,
    marginHorizontal: space[3],
    marginBottom: space[2],
  },
  hScroll: {
    paddingHorizontal: space[3],
    gap: space[2],
  },
  continuePill: {
    width: 220,
    height: 70,
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
  },
  madeForYouCard: {
    width: 150,
    height: 190,
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
  },
  rowsWrapper: {
    paddingHorizontal: space[3],
    gap: space[2],
  },
  songRowSkeleton: {
    height: 52,
    backgroundColor: color.bg.s2,
    borderRadius: radius.md,
  },
});
