import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget, spring } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { usePalette } from '@/design/context/PaletteContext';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { OTOProgressBar } from './OTOProgressBar';
import { getPauseScale } from '../math/nowPlayingMath';

export interface OTONowPlayingContentProps {
  onCollapse: () => void;
  artworkSize: number;
  progress: SharedValue<number>;
  positionMs: SharedValue<number>;
}

// Minimal vector icons matching OTO dark design system
function ChevronDownIcon({ color: iconColor = color.text.secondary }: { color?: string }) {
  return (
    <View
      style={{
        width: 14,
        height: 14,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: iconColor,
        transform: [{ rotate: '45deg' }, { translateY: -2 }],
      }}
    />
  );
}

function MoreHorizontalIcon({ color: iconColor = color.text.secondary }: { color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: iconColor }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: iconColor }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: iconColor }} />
    </View>
  );
}

function HeartIcon({ filled, color: iconColor = color.accent.signature }: { filled: boolean; color?: string }) {
  return (
    <View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 14,
          height: 14,
          backgroundColor: filled ? iconColor : 'transparent',
          borderColor: filled ? iconColor : color.text.tertiary,
          borderWidth: filled ? 0 : 2,
          transform: [{ rotate: '45deg' }],
          borderRadius: 2,
        }}
      />
    </View>
  );
}

function PlayIcon({ color: iconColor = color.bg.base, size = 24 }: { color?: string; size?: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size,
        borderTopWidth: size * 0.65,
        borderBottomWidth: size * 0.65,
        borderLeftColor: iconColor,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 4,
      }}
    />
  );
}

function PauseIcon({ color: iconColor = color.bg.base, size = 22 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.35 }}>
      <View style={{ width: size * 0.32, height: size * 1.1, backgroundColor: iconColor, borderRadius: 2 }} />
      <View style={{ width: size * 0.32, height: size * 1.1, backgroundColor: iconColor, borderRadius: 2 }} />
    </View>
  );
}

function SkipForwardIcon({ color: iconColor = color.text.primary, size = 20 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderLeftColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderLeftColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
    </View>
  );
}

function SkipBackIcon({ color: iconColor = color.text.primary, size = 20 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderRightWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderRightColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderRightWidth: size * 0.7,
          borderTopWidth: size * 0.5,
          borderBottomWidth: size * 0.5,
          borderRightColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
    </View>
  );
}

function ShuffleIcon({ active }: { active: boolean }) {
  const iconColor = active ? color.accent.signature : color.text.tertiary;
  return (
    <View style={{ width: 20, height: 16, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 2, left: 1, width: 7, height: 2, backgroundColor: iconColor, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 2, left: 7, width: 7, height: 2, backgroundColor: iconColor, transform: [{ rotate: '38deg' }] }} />
      <View style={{ position: 'absolute', bottom: 2, right: 3, width: 5, height: 2, backgroundColor: iconColor, borderRadius: 1 }} />
      <View style={{ position: 'absolute', bottom: 0, right: 1, width: 0, height: 0, borderLeftWidth: 4, borderTopWidth: 3, borderBottomWidth: 3, borderLeftColor: iconColor, borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
      
      <View style={{ position: 'absolute', bottom: 2, left: 1, width: 7, height: 2, backgroundColor: iconColor, borderRadius: 1 }} />
      <View style={{ position: 'absolute', bottom: 2, left: 7, width: 7, height: 2, backgroundColor: iconColor, transform: [{ rotate: '-38deg' }] }} />
      <View style={{ position: 'absolute', top: 2, right: 3, width: 5, height: 2, backgroundColor: iconColor, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 0, right: 1, width: 0, height: 0, borderLeftWidth: 4, borderTopWidth: 3, borderBottomWidth: 3, borderLeftColor: iconColor, borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
    </View>
  );
}

function RepeatIcon({ mode }: { mode: 'off' | 'all' | 'one' }) {
  const active = mode !== 'off';
  const iconColor = active ? color.accent.signature : color.text.tertiary;
  return (
    <View style={{ width: 20, height: 18, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 16,
          height: 12,
          borderRadius: 3.5,
          borderWidth: 1.8,
          borderColor: iconColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 2,
          width: 0,
          height: 0,
          borderLeftWidth: 4,
          borderTopWidth: 3,
          borderBottomWidth: 3,
          borderLeftColor: iconColor,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
      {mode === 'one' && (
        <View style={{ position: 'absolute', width: 2, height: 5, backgroundColor: iconColor, borderRadius: 1 }} />
      )}
    </View>
  );
}

function LyricsIcon({ color: iconColor = color.text.tertiary }: { color?: string }) {
  return (
    <View style={{ width: 18, height: 16, justifyContent: 'space-between', paddingVertical: 1 }}>
      <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: iconColor }} />
      <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: iconColor }} />
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: iconColor }} />
    </View>
  );
}

function QueueIcon({ color: iconColor = color.text.tertiary }: { color?: string }) {
  return (
    <View style={{ width: 18, height: 16, justifyContent: 'space-between', paddingVertical: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: iconColor }} />
        <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: iconColor }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: iconColor }} />
        <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: iconColor }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: iconColor }} />
        <View style={{ width: 8, height: 2, borderRadius: 1, backgroundColor: iconColor }} />
      </View>
    </View>
  );
}

function DeviceIcon({ color: iconColor = color.text.tertiary }: { color?: string }) {
  return (
    <View style={{ width: 18, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 18,
          height: 11,
          borderRadius: 2.5,
          borderWidth: 1.8,
          borderColor: iconColor,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 3.5,
          borderRightWidth: 3.5,
          borderBottomWidth: 4,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: iconColor,
          marginTop: -1,
        }}
      />
    </View>
  );
}

function TimerIcon({ color: iconColor = color.text.tertiary }: { color?: string }) {
  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.8,
        borderColor: iconColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 3,
          width: 1.5,
          height: 5,
          borderRadius: 0.75,
          backgroundColor: iconColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 7,
          left: 7,
          width: 4,
          height: 1.5,
          borderRadius: 0.75,
          backgroundColor: iconColor,
        }}
      />
    </View>
  );
}

/**
 * OTONowPlayingContent — Full Interactive Hierarchy for Now Playing.
 *
 * Implements the 6 primary zones specified in docs/DESIGN.md & prompt P05:
 * 1. Top Header (~8%)
 * 2. Hero Artwork with Pause-Scale (~42%)
 * 3. Title / Artist / Like Row (~12%)
 * 4. Interactive Scrubber (~10%)
 * 5. Transport Controls (~12%)
 * 6. Secondary Action Bar (~8%)
 */
export function OTONowPlayingContent({
  onCollapse,
  artworkSize,
  progress,
  positionMs,
}: OTONowPlayingContentProps): React.JSX.Element | null {
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isShuffled = usePlaybackStore((s) => s.isShuffled);
  const repeatMode = usePlaybackStore((s) => s.repeatMode);
  const setShuffle = usePlaybackStore((s) => s.setShuffle);
  const setRepeatMode = usePlaybackStore((s) => s.setRepeatMode);
  const engine = useAudioEngine();
  const { activePalette } = usePalette();

  const [isLiked, setIsLiked] = useState(false);

  // Artwork pause-scale animation: 1.0 playing -> 0.92 paused
  const artworkScale = useSharedValue(getPauseScale(isPlaying));

  useEffect(() => {
    artworkScale.value = withSpring(getPauseScale(isPlaying), spring.spatial.playful);
  }, [isPlaying, artworkScale]);

  const artworkAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: artworkScale.value }],
    };
  });

  const handleTogglePlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      void engine.pause();
    } else {
      void engine.play();
    }
  }, [engine, isPlaying]);

  const handleSkipNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void engine.skipToNext();
  }, [engine]);

  const handleSkipPrev = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void engine.skipToPrevious();
  }, [engine]);

  const handleToggleLike = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLiked((prev) => !prev);
  }, []);

  const handleToggleShuffle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShuffle(!isShuffled);
  }, [isShuffled, setShuffle]);

  const handleToggleRepeat = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
  }, [repeatMode, setRepeatMode]);

  const handleSeek = useCallback(
    (targetMs: number) => {
      void engine.seekTo(targetMs);
    },
    [engine]
  );

  if (!currentTrack) {
    return null;
  }

  const minTouchSize = Platform.select({
    ios: touchTarget.ios,
    default: touchTarget.android,
  });

  return (
    <View style={styles.container}>
      {/* 1. Top Header (~8%) */}
      <View style={styles.headerRow}>
        <OTOIconButton
          icon={<ChevronDownIcon />}
          accessibilityLabel="Dismiss Now Playing"
          accessibilityHint="Returns to the mini player"
          onPress={onCollapse}
          size={minTouchSize}
        />
        <View style={styles.headerCenter}>
          <OTOText variant="meta" weight="semibold" colorRole="tertiary" numberOfLines={1}>
            PLAYING FROM
          </OTOText>
          <OTOText variant="caption" weight="medium" colorRole="primary" numberOfLines={1}>
            {currentTrack.album ?? 'Now Playing'}
          </OTOText>
        </View>
        <OTOIconButton
          icon={<MoreHorizontalIcon />}
          accessibilityLabel="Track actions"
          accessibilityHint="Opens track options menu"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          size={minTouchSize}
        />
      </View>

      {/* 2. Artwork Square (~42%) */}
      <View style={styles.artworkContainer}>
        <Animated.View
          style={[
            styles.artworkWrapper,
            { width: artworkSize, height: artworkSize },
            artworkAnimatedStyle,
          ]}
        >
          <OTOArtwork
            uri={currentTrack.artworkUrl}
            thumbhash={currentTrack.thumbhash}
            size={artworkSize}
            borderRadius={radius.lg}
            alt={`${currentTrack.title} album artwork`}
          />
        </Animated.View>
      </View>

      {/* 3. Title / Artist / Like Row (~12%) */}
      <View style={styles.metaRow}>
        <View style={styles.metaTextContainer}>
          <OTOText variant="headline" weight="bold" numberOfLines={1}>
            {currentTrack.title}
          </OTOText>
          <OTOText variant="body" colorRole="secondary" numberOfLines={1}>
            {currentTrack.artist}
          </OTOText>
        </View>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike track' : 'Like track'}
          onPress={handleToggleLike}
          style={[styles.likeButton, { width: minTouchSize, height: minTouchSize }]}
        >
          <HeartIcon filled={isLiked} />
        </Pressable>
      </View>

      {/* 4. Interactive Scrubber (~10%) */}
      <View style={styles.scrubberRow}>
        <OTOProgressBar
          progress={progress}
          positionMs={positionMs}
          durationMs={currentTrack.durationMs}
          onSeek={handleSeek}
        />
      </View>

      {/* 5. Transport Controls (~12%) */}
      <View style={styles.transportRow}>
        <OTOIconButton
          icon={<ShuffleIcon active={isShuffled} />}
          accessibilityLabel={isShuffled ? 'Shuffle active' : 'Shuffle off'}
          onPress={handleToggleShuffle}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<SkipBackIcon />}
          accessibilityLabel="Previous track"
          onPress={handleSkipPrev}
          size={minTouchSize}
        />
        <View
          style={[
            styles.playButtonWrapper,
            {
              backgroundColor: activePalette.dominant || color.accent.signature,
              shadowColor: activePalette.dominant || color.accent.signature,
            },
          ]}
        >
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={handleTogglePlay}
            style={styles.playButton}
          >
            {isPlaying ? <PauseIcon color={color.bg.base} /> : <PlayIcon color={color.bg.base} />}
          </Pressable>
        </View>
        <OTOIconButton
          icon={<SkipForwardIcon />}
          accessibilityLabel="Next track"
          onPress={handleSkipNext}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<RepeatIcon mode={repeatMode} />}
          accessibilityLabel={`Repeat mode: ${repeatMode}`}
          onPress={handleToggleRepeat}
          size={minTouchSize}
        />
      </View>

      {/* 6. Secondary Action Bar (~8%) */}
      <View style={styles.secondaryRow}>
        <OTOIconButton
          icon={<LyricsIcon />}
          accessibilityLabel="Lyrics"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<QueueIcon />}
          accessibilityLabel="Queue"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<DeviceIcon />}
          accessibilityLabel="Audio output route"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<TimerIcon />}
          accessibilityLabel="Sleep timer"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          size={minTouchSize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[1],
  },
  metaTextContainer: {
    flex: 1,
    gap: space[1],
  },
  likeButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrubberRow: {
    marginVertical: space[1],
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButtonWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: color.accent.signature,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: color.accent.signature,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playButton: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: space[1],
  },
});
