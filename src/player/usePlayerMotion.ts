import { useCallback } from 'react';
import {
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { spring, duration } from '@/design/tokens';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import {
  calculateProgressFromTranslation,
  determineSnapTarget,
} from './motionMath';
import type { PlayerMotionController } from './types';

export interface UsePlayerMotionOptions {
  screenHeight: number;
}

/**
 * High-performance Reanimated 4 gesture & spring motion controller.
 *
 * Drives the single source of truth `playerProgress` shared value on the UI thread.
 * 100% interruptible mid-gesture with zero visual jumps or hitching.
 */
export function usePlayerMotion({
  screenHeight,
}: UsePlayerMotionOptions): PlayerMotionController & {
  panGesture: ReturnType<typeof Gesture.Pan>;
} {
  const isReducedMotion = useReducedMotion();
  const playerProgress = useSharedValue(0);
  const startProgress = useSharedValue(0);

  const expand = useCallback(() => {
    if (isReducedMotion) {
      playerProgress.value = withTiming(1, { duration: duration.micro });
    } else {
      playerProgress.value = withSpring(1, spring.spatial.default);
    }
  }, [isReducedMotion, playerProgress]);

  const collapse = useCallback(() => {
    if (isReducedMotion) {
      playerProgress.value = withTiming(0, { duration: duration.micro });
    } else {
      playerProgress.value = withSpring(0, spring.spatial.default);
    }
  }, [isReducedMotion, playerProgress]);

  const toggle = useCallback(() => {
    const target = playerProgress.value > 0.5 ? 0 : 1;
    if (isReducedMotion) {
      playerProgress.value = withTiming(target, { duration: duration.micro });
    } else {
      playerProgress.value = withSpring(target, spring.spatial.default);
    }
  }, [isReducedMotion, playerProgress]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      'worklet';
      // Capture current progress at the exact millisecond of touch (interruptible)
      startProgress.value = playerProgress.value;
    })
    .onUpdate((event) => {
      'worklet';
      playerProgress.value = calculateProgressFromTranslation(
        event.translationY,
        screenHeight,
        startProgress.value
      );
    })
    .onEnd((event) => {
      'worklet';
      const target = determineSnapTarget(playerProgress.value, event.velocityY);

      if (isReducedMotion) {
        playerProgress.value = withTiming(target, { duration: duration.micro });
      } else {
        // Normalize velocity for spring physics
        const normalizedVelocity = screenHeight > 0 ? -event.velocityY / screenHeight : 0;
        playerProgress.value = withSpring(target, {
          ...spring.spatial.default,
          velocity: normalizedVelocity,
        });
      }
    });

  return {
    playerProgress,
    expand,
    collapse,
    toggle,
    panGesture,
  };
}
