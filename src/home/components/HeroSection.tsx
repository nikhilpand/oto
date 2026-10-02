/**
 * HeroSection — Artwork-Led Atmospheric Album Feature
 *
 * Implements the expansive hero card with palette-derived LinearGradient background,
 * Reanimated spring press, FadeInDown mount animation, editorial badge, album title,
 * artist, and primary "Listen Now" action.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
// expo-linear-gradient removed — native module not in current APK build.
// Use View + backgroundColor until next `expo run:android` rebuild.
import * as Haptics from 'expo-haptics';
import { color, space, radius, spring, type } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { PlayIcon } from '@/design/components';
import { usePalette } from '@/design/context/PaletteContext';
import { Track } from '@/domain/types';

export interface HeroSectionProps {
  track: Track;
  onPlay: (track: Track) => void;
  onPressCard?: (track: Track) => void;
}

export function HeroSection({
  track,
  onPlay,
  onPressCard,
}: HeroSectionProps): React.JSX.Element {
  const { activePalette } = usePalette();
  const accentColor = activePalette.accent || activePalette.secondary || color.accent.signature;
  const dominantColor = activePalette.dominant || color.bg.base;

  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const borderColorProgress = useSharedValue(0);

  // Animate border to accent on mount
  React.useEffect(() => {
    borderColorProgress.value = withTiming(accentColor ? 1 : 0, { duration: 800 });
  }, [accentColor, borderColorProgress]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      borderColorProgress.value,
      [0, 1],
      [color.hairline, `${accentColor}55`]
    );
    return { borderColor };
  });

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(0.975, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) scale.value = withSpring(1, spring.spatial.fast);
  }, [scale, reducedMotion]);

  const handleListenNow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPlay(track);
  }, [onPlay, track]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(80).duration(500).springify()}
      style={styles.container}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Featured album: ${track.album ?? track.title} by ${track.artist}. Double tap to open.`}
        onPress={() => (onPressCard ? onPressCard(track) : onPlay(track))}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.card, cardAnimatedStyle, borderAnimatedStyle]}>
          {/* Atmospheric tint from artwork palette */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: `${dominantColor}99` },
            ]}
          />
          {/* Subtle noise/grain layer for depth */}
          <View style={[StyleSheet.absoluteFill, styles.grainOverlay]} />
          {/* Specular highlight at top edge */}
          <View style={styles.specularSheen} />

          {/* Content Layout */}
          <View style={styles.content}>
            {/* Hero Artwork */}
            <View style={styles.artworkContainer}>
              <OTOArtwork
                uri={track.artworkUrl}
                thumbhash={track.thumbhash}
                size={138}
                borderRadius={radius.md}
                alt={`${track.title} cover art`}
              />
            </View>

            {/* Editorial Info */}
            <View style={styles.infoContainer}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: `${accentColor}22`,
                    borderColor: `${accentColor}44`,
                  },
                ]}
              >
                <OTOText variant="meta" weight="bold" colorRole="accent" style={styles.badgeText}>
                  FEATURED RELEASE
                </OTOText>
              </View>

              <OTOText variant="title" weight="bold" numberOfLines={2}>
                {track.album ?? track.title}
              </OTOText>

              <OTOText variant="body" colorRole="secondary" numberOfLines={1}>
                {track.artist}
              </OTOText>

              {/* Listen Now fires independently — stopPropagation via onPress containment */}
              <View style={styles.buttonWrapper}>
                <OTOButton
                  variant="primary"
                  size="md"
                  label="Listen Now"
                  icon={<PlayIcon size={12} color={color.bg.base} focused />}
                  onPress={handleListenNow}
                  accessibilityLabel={`Listen now to ${track.title} by ${track.artist}`}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[3],
    marginBottom: space[4],
  },
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: color.glass.highlight,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  grainOverlay: {
    // color.glass.highlight is rgba(255,255,255,0.09); combined with opacity:0.025 gives ~0.2% grain
    backgroundColor: color.glass.highlight,
  },
  specularSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: color.glass.highlight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
    gap: space[3],
  },
  artworkContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  infoContainer: {
    flex: 1,
    gap: space[1],
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 2,
  },
  badgeText: {
    letterSpacing: 0.8,
    fontSize: type.caption[0],
  },
  buttonWrapper: {
    marginTop: space[1],
    alignSelf: 'flex-start',
  },
});
