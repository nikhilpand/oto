import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { Track } from '@/domain/types';

const DEMO_TRACKS: Track[] = [
  {
    id: 'shell_demo_1',
    title: 'Starboy',
    artist: 'The Weeknd',
    artists: ['The Weeknd', 'Daft Punk'],
    album: 'Starboy',
    durationMs: 230000,
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    thumbhash: '3PcNNQSXeHiId4eAeHh3eIh4eA==',
    isExplicit: true,
  },
  {
    id: 'shell_demo_2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'After Hours',
    durationMs: 200000,
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    thumbhash: '3PcNNQSXeHiId4eAeHh3eIh4eB==',
    isExplicit: false,
  },
];

export function PlayerShellStories(): React.JSX.Element {
  const engine = useAudioEngine();
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);

  const handleLoadTrack = async (track: Track) => {
    await engine.load(track, true);
    usePlaybackStore.getState().setQueue(DEMO_TRACKS, DEMO_TRACKS.findIndex((t) => t.id === track.id));
  };

  return (
    <View style={styles.container}>
      <OTOText variant="title">P4 Player Shell Harness</OTOText>
      <OTOText variant="caption" colorRole="secondary">
        Persistent single player overlay (Mini ⇄ Full Now Playing)
      </OTOText>

      {/* Status card */}
      <View style={styles.statusCard}>
        <OTOText variant="caption" colorRole="tertiary">
          Active Track: <OTOText variant="caption" colorRole="accent">{currentTrack ? currentTrack.title : 'None (Load below)'}</OTOText>
        </OTOText>
        <OTOText variant="caption" colorRole="tertiary">
          Playback Status: <OTOText variant="caption" colorRole="accent">{isPlaying ? 'Playing' : 'Paused/Idle'}</OTOText>
        </OTOText>
      </View>

      {/* Actions to populate player */}
      <View style={styles.actionGroup}>
        <OTOText variant="meta" colorRole="tertiary">
          1. LOAD TRACK TO SHOW MINI PLAYER
        </OTOText>
        <View style={styles.buttonRow}>
          <OTOButton
            label="Load 'Starboy'"
            size="sm"
            variant="secondary"
            onPress={() => handleLoadTrack(DEMO_TRACKS[0]!)}
          />
          <OTOButton
            label="Load 'Blinding Lights'"
            size="sm"
            variant="secondary"
            onPress={() => handleLoadTrack(DEMO_TRACKS[1]!)}
          />
        </View>
      </View>

      {/* Motion & Gesture Instructions */}
      <View style={styles.instructionsCard}>
        <OTOText variant="meta" weight="bold" colorRole="primary">
          Gestures & Interactions:
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          • <OTOText variant="caption" weight="semibold">Tap Mini Player:</OTOText> Programmatic spring expansion to Full Now Playing.
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          • <OTOText variant="caption" weight="semibold">Drag Up / Down:</OTOText> Continuous 1:1 finger tracking with velocity release fling.
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          • <OTOText variant="caption" weight="semibold">Swipe Left / Right on Mini:</OTOText> Quick track skipping (next / previous).
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          • <OTOText variant="caption" weight="semibold">Continuous Artwork Travel:</OTOText> Artwork bounds travel seamlessly between the 44x44 mini rect and the full 340x340 rect with zero visual jumps.
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          • <OTOText variant="caption" weight="semibold">Interruptibility:</OTOText> Reverse direction mid-swipe with zero frame drops or stutter.
        </OTOText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space[4],
    gap: space[5],
  },
  statusCard: {
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.bg.s2,
    gap: space[1],
  },
  actionGroup: {
    gap: space[2],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: space[2],
    flexWrap: 'wrap',
  },
  instructionsCard: {
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: color.bg.s1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    gap: space[2],
  },
});
