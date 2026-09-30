import type { SharedValue } from 'react-native-reanimated';
import type { Rect } from './motionMath';

export type PlayerMode = 'mini' | 'full';

export interface PlayerLayoutMeasurements {
  miniArtworkRect: Rect;
  fullArtworkRect: Rect;
  screenHeight: number;
  screenWidth: number;
  tabBarHeight: number;
  miniPlayerHeight: number;
}

export interface PlayerMotionController {
  /**
   * Continuous progress value from 0.0 (mini) to 1.0 (full now playing).
   * Drives all spatial transformations, opacity fades, and rect interpolations.
   */
  playerProgress: SharedValue<number>;
  /**
   * Programmatic spring expansion to full screen.
   */
  expand: () => void;
  /**
   * Programmatic spring collapse to mini player.
   */
  collapse: () => void;
  /**
   * Toggle between mini and full screen.
   */
  toggle: () => void;
}
