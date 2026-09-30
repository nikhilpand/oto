import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { FakeAudioEngine } from '@/audio/FakeAudioEngine';
import { usePlayheadProgress } from '@/audio/usePlayheadProgress';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { Track } from '@/domain/types';

const MOCK_STORY_TRACK: Track = {
  id: 'audio_demo_1',
  title: 'Starboy',
  artist: 'The Weeknd',
  artists: ['The Weeknd', 'Daft Punk'],
  album: 'Starboy',
  durationMs: 230000,
  artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
  thumbhash: '3PcNNQSXeHiId4eAeHh3eIh4eA==',
  isExplicit: true,
};

function AnimatedScrubberBar({
  progress,
}: {
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, progress.value * 100))}%`,
    };
  });

  return (
    <View style={styles.trackBackground}>
      <Animated.View style={[styles.trackFill, animatedStyle]} />
    </View>
  );
}

export function AudioHarnessStories() {
  const [engine] = useState(() => new FakeAudioEngine());
  const [mountTime] = useState(() => new Date().toLocaleTimeString());

  const { progress, seekUI } = usePlayheadProgress(
    engine,
    MOCK_STORY_TRACK.durationMs
  );

  const status = usePlaybackStore((s) => s.status);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const handleLoadAndPlay = async () => {
    await engine.load(MOCK_STORY_TRACK, true);
    usePlaybackStore.getState().setTrack(MOCK_STORY_TRACK);
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await engine.pause();
    } else {
      await engine.play();
    }
  };

  const handleSeek = (percentage: number) => {
    const targetMs = MOCK_STORY_TRACK.durationMs * percentage;
    seekUI(targetMs);
  };

  return (
    <View style={styles.container}>
      <OTOText variant="title">P3 Audio Engine Harness</OTOText>
      <OTOText variant="caption" colorRole="secondary">
        120Hz Reanimated UI-thread playhead interpolation with 0 React re-renders during playback
      </OTOText>

      {/* Render Diagnostics */}
      <View style={styles.card}>
        <OTOText variant="caption" colorRole="tertiary">
          Mounted At: {mountTime} (Zero React re-renders on ticks)
        </OTOText>
        <OTOText variant="caption" colorRole="tertiary">
          Playback Status: <OTOText variant="caption" colorRole="accent">{status}</OTOText>
        </OTOText>
      </View>

      {/* 120Hz Fluid Playhead Scrubber */}
      <View style={styles.scrubberContainer}>
        <AnimatedScrubberBar progress={progress} />
        <View style={styles.seekRow}>
          <Pressable onPress={() => handleSeek(0.0)} style={styles.seekChip}>
            <OTOText variant="caption">0%</OTOText>
          </Pressable>
          <Pressable onPress={() => handleSeek(0.25)} style={styles.seekChip}>
            <OTOText variant="caption">25%</OTOText>
          </Pressable>
          <Pressable onPress={() => handleSeek(0.5)} style={styles.seekChip}>
            <OTOText variant="caption">50%</OTOText>
          </Pressable>
          <Pressable onPress={() => handleSeek(0.75)} style={styles.seekChip}>
            <OTOText variant="caption">75%</OTOText>
          </Pressable>
          <Pressable onPress={() => handleSeek(1.0)} style={styles.seekChip}>
            <OTOText variant="caption">100%</OTOText>
          </Pressable>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.buttonRow}>
        <OTOButton
          label="Load & Play"
          variant="secondary"
          size="sm"
          onPress={handleLoadAndPlay}
        />
        <OTOButton
          label={isPlaying ? 'Pause' : 'Play'}
          variant="primary"
          size="sm"
          onPress={handleTogglePlay}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space[4],
    gap: space[4],
  },
  card: {
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.bg.s2,
    gap: space[1],
  },
  scrubberContainer: {
    gap: space[2],
  },
  trackBackground: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: color.accent.signature,
  },
  seekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seekChip: {
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
    backgroundColor: color.bg.s2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: space[3],
  },
});
