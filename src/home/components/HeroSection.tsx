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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { color, space, radius } from '@/design/tokens';
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

  const scale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.975, { damping: 20, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [scale]);

  return (
    <Animated.View
      entering={FadeInDown.delay(80).duration(500).springify()}
      style={styles.container}
    >
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Featured album: ${track.album ?? track.title} by ${track.artist}. Double tap to view details.`}
        onPress={() => onPressCard?.(track)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* Atmospheric gradient from artwork palette */}
          <LinearGradient
            colors={[`${dominantColor}CC`, `${accentColor}55`, color.bg.s2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
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
              {/* Bottom scrim on artwork */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.35)']}
                style={styles.artworkScrim}
              />
            </View>

            {/* Editorial Info */}
            <View style={styles.infoContainer}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: `${accentColor}1A`,
                    borderColor: `${accentColor}3D`,
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

              <View style={styles.buttonWrapper}>
                <OTOButton
                  variant="primary"
                  size="md"
                  label="Listen Now"
                  icon={<PlayIcon size={12} color={color.bg.base} focused />}
                  onPress={() => onPlay(track)}
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
    borderColor: color.hairline,
    borderTopColor: color.glass.highlight,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
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
  artworkScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
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
    fontSize: 10,
  },
  buttonWrapper: {
    marginTop: space[1],
    alignSelf: 'flex-start',
  },
});
