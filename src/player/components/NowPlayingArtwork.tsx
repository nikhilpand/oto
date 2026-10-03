import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Canvas, Fill, RadialGradient, vec } from '@shopify/react-native-skia';
import { space, radius, spring, shadow } from '@/design/tokens';
import { OTOArtwork } from '@/design/components';
import { usePalette } from '@/design/context/PaletteContext';
import { getPauseScale } from '../math/nowPlayingMath';
import type { Track } from '@/domain/types';

export interface NowPlayingArtworkProps {
  track: Track;
  artworkSize: number;
  isPlaying: boolean;
}

/** Glow extends past the artwork edge by this fraction of artwork size. */
const GLOW_SPREAD = 0.28;
const PAUSED_SCALE = getPauseScale(false);
const PLAYING_SCALE = getPauseScale(true);

/**
 * Artwork with a palette-tinted glow. Scale and glow intensity are both
 * derived from a single spring shared value on the UI thread, so play/pause
 * never triggers a React re-render or JS-thread animation work.
 */
export function NowPlayingArtwork({
  track,
  artworkSize,
  isPlaying,
}: NowPlayingArtworkProps): React.JSX.Element {
  const { activePalette } = usePalette();
  const artworkScale = useSharedValue(getPauseScale(isPlaying));

  useEffect(() => {
    artworkScale.value = withSpring(getPauseScale(isPlaying), spring.spatial.playful);
  }, [isPlaying, artworkScale]);

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  // Glow breathes with playback: dim and tight when paused, full when playing.
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      artworkScale.value,
      [PAUSED_SCALE, PLAYING_SCALE],
      [0.35, 0.9],
      Extrapolation.CLAMP
    ),
    transform: [{ scale: artworkScale.value }],
  }));

  const glowSize = artworkSize * (1 + GLOW_SPREAD * 2);
  const glowOffset = -artworkSize * GLOW_SPREAD;

  return (
    <View style={styles.artworkContainer}>
      <View style={{ width: artworkSize, height: artworkSize }}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { width: glowSize, height: glowSize, top: glowOffset, left: glowOffset },
            glowStyle,
          ]}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill>
              <RadialGradient
                c={vec(glowSize / 2, glowSize / 2)}
                r={glowSize / 2}
                colors={[activePalette.accent, activePalette.dominant, 'transparent']}
                positions={[0, 0.5, 1]}
              />
            </Fill>
          </Canvas>
        </Animated.View>
        <Animated.View
          style={[
            styles.artworkWrapper,
            { width: artworkSize, height: artworkSize },
            artworkStyle,
          ]}
        >
          <OTOArtwork
            uri={track.artworkUrl}
            thumbhash={track.thumbhash}
            size={artworkSize}
            borderRadius={radius.lg}
            alt={`${track.title} album artwork`}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space[2],
  },
  glow: {
    position: 'absolute',
  },
  artworkWrapper: {
    ...shadow.overlay,
  },
});
