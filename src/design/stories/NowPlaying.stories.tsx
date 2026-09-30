import { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { color, space, radius, QualityTier } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { OTODynamicBackground } from '@/player/components/OTODynamicBackground';
import { OTOProgressBar } from '@/player/components/OTOProgressBar';
import { OTONowPlayingContent } from '@/player/components/OTONowPlayingContent';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import mockCatalog from '@/mock/mockCatalog.json';
import { Track } from '@/domain/types';

export function NowPlayingStories() {
  const { width: screenWidth } = useWindowDimensions();
  const [activeTier, setActiveTier] = useState<QualityTier>(QualityTier.Full);
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const setTrack = usePlaybackStore((s) => s.setTrack);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);

  // Scrubber harness shared values
  const dummyProgress = useSharedValue(0.35);
  const dummyPositionMs = useSharedValue(82000);
  const durationMs = 234000;

  const handleSeek = (targetMs: number) => {
    dummyPositionMs.value = targetMs;
    dummyProgress.value = targetMs / durationMs;
  };

  const handleLoadTrack = (idx: number) => {
    const t = mockCatalog.tracks[idx] as Track;
    if (t) {
      setTrack(t);
    }
  };

  const artworkSize = Math.min(260, screenWidth - space[6] * 2);

  return (
    <View style={styles.container}>
      <OTOText variant="title">P5: Now Playing Content & Dynamic Atmosphere</OTOText>
      <OTOText variant="caption" colorRole="secondary">
        Validates the 4 visual quality tiers, pause-scale artwork physics, and 120Hz draggable scrubber.
      </OTOText>

      {/* Section 1: Quality Tiers */}
      <View style={styles.section}>
        <OTOText variant="meta" colorRole="tertiary">
          1. Dynamic Atmosphere Quality Tiers
        </OTOText>
        <View style={styles.tierSelector}>
          {(
            [
              [QualityTier.Full, 'Tier 3 (Shader)'],
              [QualityTier.Balanced, 'Tier 2 (Radial)'],
              [QualityTier.Lite, 'Tier 1 (Linear)'],
              [QualityTier.Minimal, 'Tier 0 (Flat)'],
            ] as const
          ).map(([tier, label]) => (
            <Pressable
              key={tier}
              onPress={() => setActiveTier(tier)}
              style={[
                styles.tierButton,
                activeTier === tier && styles.tierButtonActive,
              ]}
            >
              <OTOText
                variant="caption"
                weight={activeTier === tier ? 'bold' : 'regular'}
                colorRole={activeTier === tier ? 'primary' : 'tertiary'}
              >
                {label}
              </OTOText>
            </Pressable>
          ))}
        </View>

        {/* Dynamic Background Preview Box */}
        <View style={styles.bgPreviewContainer}>
          <OTODynamicBackground forcedTier={activeTier} />
          <View style={styles.bgPreviewOverlay}>
            <OTOText variant="headline" weight="bold">
              Atmosphere Preview
            </OTOText>
            <OTOText variant="caption" colorRole="secondary">
              Active: Tier {activeTier}
            </OTOText>
          </View>
        </View>
      </View>

      {/* Section 2: Scrubber Harness */}
      <View style={styles.section}>
        <OTOText variant="meta" colorRole="tertiary">
          2. 120Hz Draggable Scrubber with Haptics & Accessible Actions
        </OTOText>
        <View style={styles.scrubberBox}>
          <OTOProgressBar
            progress={dummyProgress}
            positionMs={dummyPositionMs}
            durationMs={durationMs}
            onSeek={handleSeek}
          />
        </View>
      </View>

      {/* Section 3: Track Switching & Pause-Scale Controls */}
      <View style={styles.section}>
        <OTOText variant="meta" colorRole="tertiary">
          3. Track Switching & Playback State
        </OTOText>
        <View style={styles.buttonRow}>
          <OTOButton
            label={isPlaying ? 'Pause Audio' : 'Play Audio'}
            onPress={() => setPlaying(!isPlaying)}
            variant="primary"
          />
          <OTOButton
            label="Track 1"
            onPress={() => handleLoadTrack(0)}
            variant="secondary"
          />
          <OTOButton
            label="Track 2"
            onPress={() => handleLoadTrack(1)}
            variant="secondary"
          />
        </View>
        <OTOText variant="caption" colorRole="tertiary">
          Current: {currentTrack?.title ?? 'None'} — Status: {isPlaying ? 'Playing (Scale 1.0)' : 'Paused (Scale 0.92)'}
        </OTOText>
      </View>

      {/* Section 4: Full Now Playing Hierarchy Demo */}
      <View style={styles.section}>
        <OTOText variant="meta" colorRole="tertiary">
          4. Full Now Playing Screen Container Demo
        </OTOText>
        <View style={styles.contentCard}>
          <OTODynamicBackground forcedTier={activeTier} />
          <View style={styles.contentWrapper}>
            <OTONowPlayingContent
              onCollapse={() => {}}
              artworkSize={artworkSize}
              progress={dummyProgress}
              positionMs={dummyPositionMs}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space[4],
    gap: space[5],
  },
  section: {
    gap: space[2],
  },
  tierSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  tierButton: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  tierButtonActive: {
    backgroundColor: color.bg.s3,
    borderColor: color.accent.signature,
  },
  bgPreviewContainer: {
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    marginTop: space[2],
  },
  bgPreviewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 12, 0.4)',
    gap: 4,
  },
  scrubberBox: {
    padding: space[4],
    backgroundColor: color.bg.s1,
    borderRadius: radius.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  contentCard: {
    height: 600,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  contentWrapper: {
    flex: 1,
    padding: space[4],
    backgroundColor: 'rgba(10, 10, 12, 0.35)',
  },
});
