/**
 * SpotlightFlowCard — Immersive Full-Width Track Feature Card
 * Edge-to-edge card with full-bleed artwork, glass rim, and contrast scrim.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Canvas, Fill, LinearGradient, vec } from '@shopify/react-native-skia';
import { color, space, radius, spring, shadow } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { OTOButton } from '@/design/components/OTOButton';
import { PlayIcon } from '@/design/components';
import { Track } from '@/domain/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - space[4] * 2;
export const CARD_HEIGHT = 340;

export interface SpotlightFlowCardProps {
  track: Track;
  accentColor: string;
  dominantColor: string;
  label?: string;
  onPlay: (track: Track) => void;
  onPressCard?: (track: Track) => void;
}

export function SpotlightFlowCard({
  track,
  accentColor,
  dominantColor,
  label = 'SPOTLIGHT',
  onPlay,
  onPressCard,
}: SpotlightFlowCardProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.97, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(1, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handlePlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPlay(track);
  }, [onPlay, track]);

  return (
    <Animated.View style={[styles.cardWrapper, cardStyle]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${track.album ?? track.title} by ${track.artist}. Double tap to open.`}
        onPress={() => (onPressCard ? onPressCard(track) : onPlay(track))}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {/* Atmospheric background wash */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${dominantColor}CC` }]} />

        {/* Specular top rim */}
        <View style={styles.topRim} />

        {/* Content: artwork + info stacked vertically */}
        <View style={styles.artworkWrap}>
          <OTOArtwork
            uri={track.artworkUrl}
            thumbhash={track.thumbhash}
            borderRadius={0}
            alt={`${track.title} cover art`}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Gradient scrim for text legibility (verified dark floor under text) */}
        <Canvas style={styles.scrim} pointerEvents="none">
          <Fill>
            <LinearGradient
              start={vec(0, CARD_HEIGHT * 0.3)}
              end={vec(0, CARD_HEIGHT)}
              colors={['transparent', `${color.bg.base}B3`, `${color.bg.base}F2`]}
            />
          </Fill>
        </Canvas>

        {/* Text + CTA overlay */}
        <View style={styles.overlay}>
          {/* Label badge */}
          <View style={[styles.badge, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
            <OTOText variant="caption" weight="bold" style={[styles.badgeText, { color: accentColor }]}>
              {label}
            </OTOText>
          </View>

          <OTOText variant="headline" weight="bold" numberOfLines={2} style={styles.trackTitle}>
            {track.album ?? track.title}
          </OTOText>

          <OTOText variant="body" colorRole="secondary" numberOfLines={1} style={styles.artistName}>
            {track.artist}
          </OTOText>

          <View style={styles.ctaRow}>
            <OTOButton
              variant="primary"
              size="md"
              label="Play Now"
              icon={<PlayIcon size={12} color={color.bg.base} focused />}
              onPress={handlePlay}
              accessibilityLabel={`Play ${track.title} by ${track.artist}`}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: space[4],
  },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.glass.highlight,
    backgroundColor: color.bg.s1,
    ...shadow.sheet,
  },
  topRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    zIndex: 2,
  },
  artworkWrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: space[4],
    paddingBottom: space[5],
    zIndex: 3,
    gap: space[1],
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: space[1],
  },
  badgeText: {
    letterSpacing: 1.0,
    fontSize: 10,
  },
  trackTitle: {
    letterSpacing: -0.3,
  },
  artistName: {
    marginTop: 2,
  },
  ctaRow: {
    marginTop: space[2],
    alignSelf: 'flex-start',
  },
});
