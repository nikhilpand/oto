import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { space, radius, spring } from '@/design/tokens';
import { OTOArtwork } from '@/design/components';
import { getPauseScale } from '../math/nowPlayingMath';
import type { Track } from '@/domain/types';

export interface NowPlayingArtworkProps {
  track: Track;
  artworkSize: number;
  isPlaying: boolean;
}

export function NowPlayingArtwork({
  track,
  artworkSize,
  isPlaying,
}: NowPlayingArtworkProps): React.JSX.Element {
  const artworkScale = useSharedValue(getPauseScale(isPlaying));

  useEffect(() => {
    artworkScale.value = withSpring(getPauseScale(isPlaying), spring.spatial.playful);
  }, [isPlaying, artworkScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: artworkScale.value }],
  }));

  return (
    <View style={styles.artworkContainer}>
      <Animated.View
        style={[
          styles.artworkWrapper,
          { width: artworkSize, height: artworkSize },
          animatedStyle,
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
  );
}

const styles = StyleSheet.create({
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space[2],
  },
  artworkWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
});
