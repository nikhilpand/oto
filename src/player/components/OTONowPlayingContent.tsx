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
import {
  OTOText,
  OTOIconButton,
  OTOArtwork,
  ChevronDownIcon,
  MoreHorizontalIcon,
  HeartIcon,
  PlayIcon,
  PauseIcon,
  SkipForwardIcon,
  SkipBackIcon,
  ShuffleIcon,
  RepeatIcon,
  LyricsIcon,
  QueueIcon,
  DeviceIcon,
  TimerIcon,
} from '@/design/components';
import { usePalette } from '@/design/context/PaletteContext';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { OTOProgressBar } from './OTOProgressBar';
import { getPauseScale } from '../math/nowPlayingMath';
import { OTOLyrics } from '@/lyrics/components/OTOLyrics';
import { mockParsedDuetLyrics } from '@/mock/mockLyrics';
import { OTOQueue } from '@/queue/components/OTOQueue';

export interface OTONowPlayingContentProps {
  onCollapse: () => void;
  artworkSize: number;
  progress: SharedValue<number>;
  positionMs: SharedValue<number>;
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
  const setTrack = usePlaybackStore((s) => s.setTrack);
  const engine = useAudioEngine();
  const { activePalette } = usePalette();

  const [isLiked, setIsLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

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
            {showQueue
              ? 'PLAYBACK QUEUE'
              : showLyrics
                ? 'SYNCHRONIZED LYRICS'
                : 'PLAYING FROM'}
          </OTOText>
          <OTOText variant="caption" weight="medium" colorRole="primary" numberOfLines={1}>
            {showQueue
              ? 'Upcoming Tracks'
              : showLyrics
                ? currentTrack.title
                : (currentTrack.album ?? 'Now Playing')}
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

      {/* 2 & 3. Hero Artwork OR Fullscreen Lyrics OR Queue */}
      {showQueue ? (
        <View style={styles.lyricsSection}>
          <OTOQueue
            onClose={() => setShowQueue(false)}
            onTrackSelect={(selected) => {
              setTrack(selected);
              void engine.load(selected, true);
            }}
          />
        </View>
      ) : showLyrics ? (
        <View style={styles.lyricsSection}>
          <OTOLyrics
            lyrics={mockParsedDuetLyrics}
            positionMs={positionMs}
            onSeek={handleSeek}
            mode="fullscreen"
          />
        </View>
      ) : (
        <>
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
        </>
      )}

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
          icon={<ShuffleIcon size={22} active={isShuffled} />}
          accessibilityLabel={isShuffled ? 'Shuffle active' : 'Shuffle off'}
          onPress={handleToggleShuffle}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<SkipBackIcon size={26} />}
          accessibilityLabel="Previous track"
          onPress={handleSkipPrev}
          size={minTouchSize}
        />
        <View
          style={[
            styles.playButtonWrapper,
            {
              shadowColor: activePalette.accent || color.accent.signature,
            },
          ]}
        >
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            onPress={handleTogglePlay}
            style={({ pressed }) => [
              styles.playButton,
              pressed && { transform: [{ scale: 0.93 }], opacity: 0.92 },
            ]}
          >
            {isPlaying ? (
              <PauseIcon size={28} color={color.bg.base} />
            ) : (
              <PlayIcon size={30} color={color.bg.base} />
            )}
          </Pressable>
        </View>
        <OTOIconButton
          icon={<SkipForwardIcon size={26} />}
          accessibilityLabel="Next track"
          onPress={handleSkipNext}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={<RepeatIcon size={22} mode={repeatMode} />}
          accessibilityLabel={`Repeat mode: ${repeatMode}`}
          onPress={handleToggleRepeat}
          size={minTouchSize}
        />
      </View>

      {/* 6. Secondary Action Bar (~8%) */}
      <View style={styles.secondaryRow}>
        <OTOIconButton
          icon={
            <LyricsIcon
              color={
                showLyrics
                  ? activePalette.dominant || color.accent.signature
                  : color.text.tertiary
              }
            />
          }
          accessibilityLabel={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowLyrics((prev) => {
              if (!prev) setShowQueue(false);
              return !prev;
            });
          }}
          size={minTouchSize}
        />
        <OTOIconButton
          icon={
            <QueueIcon
              color={
                showQueue
                  ? activePalette.dominant || color.accent.signature
                  : color.text.tertiary
              }
            />
          }
          accessibilityLabel={showQueue ? 'Hide queue' : 'Show queue'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowQueue((prev) => {
              if (!prev) setShowLyrics(false);
              return !prev;
            });
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
  lyricsSection: {
    flex: 1,
    minHeight: 280,
    marginVertical: space[2],
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
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: color.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
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
