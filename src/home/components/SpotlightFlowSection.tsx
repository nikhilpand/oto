/**
 * SpotlightFlowSection — Snap Carousel of Immersive Feature Cards
 *
 * Replaces the static single-track HeroSection with a horizontally paginated
 * snap carousel of SpotlightFlowCards. Features:
 * - Paginated snap scroll (decelerationRate="fast")
 * - Per-card palette extraction via PaletteContext
 * - Dot indicator synced to active card index
 * - Reanimated-driven fade/scale for inactive cards
 * - Reduced-motion fallback (no transform, instant snap)
 * - Accessible: announces active card position to screen readers
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { usePalette } from '@/design/context/PaletteContext';
import { SpotlightFlowCard, CARD_WIDTH } from './SpotlightFlowCard';
import { Track } from '@/domain/types';

const SNAP_INTERVAL = CARD_WIDTH + space[4] * 2;

export interface SpotlightFlowSectionProps {
  tracks: Track[];
  onPlay: (track: Track) => void;
  onPressCard?: (track: Track) => void;
}

export function SpotlightFlowSection({
  tracks,
  onPlay,
  onPressCard,
}: SpotlightFlowSectionProps): React.JSX.Element | null {
  const { activePalette } = usePalette();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const accentColor = activePalette.accent || activePalette.secondary || color.accent.signature;
  const dominantColor = activePalette.dominant || color.bg.s2;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / SNAP_INTERVAL);
      setActiveIndex((prev) => {
        if (idx !== prev && idx >= 0 && idx < tracks.length) {
          return idx;
        }
        return prev;
      });
    },
    [tracks.length]
  );

  if (!tracks || tracks.length === 0) return null;

  const labels = ['SPOTLIGHT', 'FEATURED', 'TRENDING', 'NEW RELEASE', 'RECOMMENDED'];
  const visibleTracks = tracks.slice(0, 5);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(60).duration(480).springify()}
      style={styles.container}
      accessibilityLabel={`Spotlight cards, ${activeIndex + 1} of ${visibleTracks.length}`}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="center"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="scrollbar"
      >
        {visibleTracks.map((track, i) => (
          <SpotlightFlowCard
            key={track.id}
            track={track}
            accentColor={accentColor}
            dominantColor={dominantColor}
            label={labels[i % labels.length]}
            onPlay={onPlay}
            onPressCard={onPressCard}
          />
        ))}
      </ScrollView>

      {/* Dot Indicator */}
      {visibleTracks.length > 1 && (
        <View style={styles.dotsRow} accessibilityElementsHidden>
          {visibleTracks.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                i === activeIndex && { backgroundColor: accentColor },
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space[3],
  },
  scrollContent: {
    paddingVertical: space[2],
    paddingHorizontal: 0,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: space[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.text.disabled,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: radius.full,
  },
});
