import { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, space, radius, type, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOGlassSurface } from '@/design/components/OTOGlassSurface';
import { usePalette } from '@/design/context/PaletteContext';
import type { ParsedLyrics, LyricLine } from '@/utils/lyrics/types';
import { OTOLyricLine } from './OTOLyricLine';
import { LyricsSkeleton } from './LyricsSkeleton';

export interface OTOLyricsProps {
  lyrics?: ParsedLyrics | null;
  positionMs: SharedValue<number>;
  onSeek: (timeMs: number) => void;
  isLoading?: boolean;
  isInstrumental?: boolean;
  isUnavailable?: boolean;
  mode?: 'inline' | 'fullscreen';
  onExpand?: () => void;
}

const VIEWPORT_ANCHOR_RATIO = 0.35; // Keep active line at ~35% from top

function SyncIcon({ color: iconColor = color.accent.signature }: { color?: string }) {
  return (
    <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          borderWidth: 1.8,
          borderColor: iconColor,
          borderTopColor: 'transparent',
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

function MusicNoteIcon({ color: iconColor = color.text.secondary }: { color?: string }) {
  return (
    <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 8,
          height: 16,
          borderRightWidth: 3,
          borderColor: iconColor,
          position: 'absolute',
          top: 4,
          right: 10,
        }}
      />
      <View
        style={{
          width: 10,
          height: 8,
          borderRadius: 4,
          backgroundColor: iconColor,
          position: 'absolute',
          bottom: 6,
          left: 8,
          transform: [{ rotate: '-25deg' }],
        }}
      />
      <View
        style={{
          width: 8,
          height: 4,
          backgroundColor: iconColor,
          position: 'absolute',
          top: 4,
          right: 7,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

export const OTOLyrics = memo(function OTOLyrics({
  lyrics,
  positionMs,
  onSeek,
  isLoading = false,
  isInstrumental = false,
  isUnavailable = false,
  mode = 'fullscreen',
  onExpand,
}: OTOLyricsProps): React.JSX.Element {
  const { activePalette } = usePalette();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Line offsets pre-measured to avoid layout thrashing during playback
  const lineOffsets = useRef<number[]>([]);
  const containerHeight = useRef(Dimensions.get('window').height * 0.7);

  const activeLineIndex = useSharedValue(0);
  const resumePillOpacity = useSharedValue(0);

  const lines: LyricLine[] = lyrics?.lines ?? [];

  // Discrete line-change detection driven on UI thread
  useAnimatedReaction(
    () => {
      'worklet';
      const pos = positionMs.value;
      if (lines.length === 0) return 0;

      let idx = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line && line.timeMs <= pos) {
          idx = i;
        } else {
          break;
        }
      }
      return idx;
    },
    (currIdx, prevIdx) => {
      if (currIdx !== prevIdx) {
        activeLineIndex.value = currIdx;
        runOnJS(setActiveIndex)(currIdx);
      }
    },
    [lines]
  );

  // Auto-scroll to current line if user is not actively dragging
  useEffect(() => {
    if (isUserScrolling || lines.length === 0 || mode === 'inline') return;

    const targetY = lineOffsets.current[activeIndex];
    if (targetY !== undefined && scrollRef.current) {
      const anchorOffset = containerHeight.current * VIEWPORT_ANCHOR_RATIO;
      const scrollY = Math.max(0, targetY - anchorOffset);

      scrollRef.current.scrollTo({
        y: scrollY,
        animated: !reducedMotion,
      });
    }
  }, [activeIndex, isUserScrolling, lines.length, mode, reducedMotion]);

  // Handle manual scroll drag start: pause auto-follow & show Resume pill
  const handleScrollBeginDrag = useCallback(() => {
    setIsUserScrolling(true);
    resumePillOpacity.value = withTiming(1, { duration: 200 });

    if (scrollIdleTimer.current) {
      clearTimeout(scrollIdleTimer.current);
    }
  }, [resumePillOpacity]);

  // Handle manual scroll end: start a 4.5-second timeout to auto-resume sync
  const handleScrollEndDrag = useCallback(() => {
    if (scrollIdleTimer.current) {
      clearTimeout(scrollIdleTimer.current);
    }
    scrollIdleTimer.current = setTimeout(() => {
      resumePillOpacity.value = withTiming(0, { duration: 250 });
      setIsUserScrolling(false);
    }, 4500);
  }, [resumePillOpacity]);

  // Tapping Resume pill
  const handleResumeSync = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resumePillOpacity.value = withTiming(0, { duration: 200 });
    setIsUserScrolling(false);

    if (scrollIdleTimer.current) {
      clearTimeout(scrollIdleTimer.current);
    }

    const targetY = lineOffsets.current[activeIndex];
    if (targetY !== undefined && scrollRef.current) {
      const anchorOffset = containerHeight.current * VIEWPORT_ANCHOR_RATIO;
      const scrollY = Math.max(0, targetY - anchorOffset);
      scrollRef.current.scrollTo({
        y: scrollY,
        animated: !reducedMotion,
      });
    }
  }, [activeIndex, reducedMotion, resumePillOpacity]);

  // Pre-measure line layout once on load
  const handleLineLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    lineOffsets.current[index] = y;
  }, []);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerHeight.current = event.nativeEvent.layout.height;
  }, []);

  const resumePillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resumePillOpacity.value,
    transform: [
      {
        scale: resumePillOpacity.value > 0 ? 1 : 0.85,
      },
    ],
  }));

  // Fallback 1: Loading skeleton
  if (isLoading) {
    return <LyricsSkeleton />;
  }

  // Fallback 2: Instrumental track banner
  if (isInstrumental) {
    return (
      <View style={styles.fallbackContainer} accessible accessibilityLabel="Instrumental track">
        <View style={styles.instrumentalIconWrapper}>
          <MusicNoteIcon color={activePalette.dominant || color.accent.signature} />
        </View>
        <OTOText variant="title" weight="bold">
          Instrumental
        </OTOText>
        <OTOText variant="body" colorRole="secondary" style={styles.fallbackSubtitle}>
          This track contains no vocals. Relax and enjoy the music.
        </OTOText>
      </View>
    );
  }

  // Fallback 3: Lyrics unavailable
  if (isUnavailable || lines.length === 0) {
    return (
      <View style={styles.fallbackContainer} accessible accessibilityLabel="Lyrics unavailable">
        <OTOText variant="title" weight="semibold" colorRole="secondary">
          Lyrics Unavailable
        </OTOText>
        <OTOText variant="caption" colorRole="tertiary" style={styles.fallbackSubtitle}>
          We couldn&apos;t find lyrics for this song yet.
        </OTOText>
      </View>
    );
  }

  // Inline mode: 3-line preview that snaps right inside player sheet
  if (mode === 'inline') {
    const activeLine = lines[activeIndex];
    const prevLine = activeIndex > 0 ? lines[activeIndex - 1] : undefined;
    const nextLine = activeIndex < lines.length - 1 ? lines[activeIndex + 1] : undefined;

    const previewLines: LyricLine[] = [];
    if (prevLine) previewLines.push(prevLine);
    if (activeLine) previewLines.push(activeLine);
    if (nextLine) previewLines.push(nextLine);

    return (
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Expand full-screen lyrics"
        onPress={onExpand}
        style={styles.inlineContainer}
      >
        <OTOGlassSurface style={styles.inlineGlass}>
          <View style={styles.inlineHeader}>
            <OTOText variant="meta" weight="semibold" colorRole="tertiary">
              LYRICS
            </OTOText>
            <OTOText variant="meta" weight="medium" colorRole="accent">
              Expand
            </OTOText>
          </View>
          <View style={styles.inlineLinesWrapper}>
            {previewLines.map((line, idx) => {
              const isCurrent = line.id === activeLine?.id;
              return (
                <OTOText
                  key={`inline-${line.id}-${idx}`}
                  variant={isCurrent ? 'body' : 'caption'}
                  weight={isCurrent ? 'bold' : 'regular'}
                  colorRole={isCurrent ? 'primary' : 'tertiary'}
                  numberOfLines={1}
                  style={isCurrent ? styles.inlineActiveLine : undefined}
                >
                  {line.text}
                </OTOText>
              );
            })}
          </View>
        </OTOGlassSurface>
      </Pressable>
    );
  }

  // Fullscreen mode: 120Hz synchronized scrolling text with word-level sweep
  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
      >
        {lines.map((line, index) => (
          <View
            key={line.id}
            onLayout={(e) => handleLineLayout(index, e)}
          >
            <OTOLyricLine
              line={line}
              index={index}
              activeIndex={activeIndex}
              positionMs={positionMs}
              onSeek={onSeek}
              activeColor={activePalette.dominant || color.accent.signature}
              reducedMotion={reducedMotion}
              script={lyrics?.script}
            />
          </View>
        ))}
      </Animated.ScrollView>

      {/* Floating Resume Sync Pill */}
      <Animated.View
        style={[styles.resumePillContainer, resumePillAnimatedStyle]}
        pointerEvents={isUserScrolling ? 'auto' : 'none'}
      >
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Resume lyrics synchronization"
          onPress={handleResumeSync}
          style={styles.resumePillButton}
        >
          <OTOGlassSurface style={styles.resumePillGlass}>
            <SyncIcon color={activePalette.dominant || color.accent.signature} />
            <OTOText variant="caption" weight="semibold" colorRole="primary">
              Resume Sync
            </OTOText>
          </OTOGlassSurface>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingVertical: space[8],
    paddingHorizontal: space[3],
    gap: space[2],
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[4],
    gap: space[2],
  },
  fallbackSubtitle: {
    textAlign: 'center',
    maxWidth: 260,
  },
  instrumentalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space[2],
  },
  inlineContainer: {
    marginVertical: space[2],
  },
  inlineGlass: {
    padding: space[3],
    borderRadius: radius.md,
    gap: space[2],
  },
  inlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineLinesWrapper: {
    gap: space[1],
  },
  inlineActiveLine: {
    fontSize: type.body[0] + 1,
  },
  resumePillContainer: {
    position: 'absolute',
    bottom: space[4],
    right: space[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  resumePillButton: {
    minHeight: touchTarget.ios,
    justifyContent: 'center',
  },
  resumePillGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.full,
    backgroundColor: color.glass.solidFallback,
  },
});
