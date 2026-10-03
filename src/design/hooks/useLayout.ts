/**
 * useLayout — responsive layout metrics.
 *
 * Single source for size class, bottom chrome clearance (tab bar + mini player
 * + safe-area inset) and grid column counts. Screens read this instead of
 * hand-rolling padding so content never hides behind floating chrome.
 */
import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ANDROID_MIN_BOTTOM_INSET,
  BOTTOM_CHROME_HEIGHT,
  MAX_CONTENT_WIDTH,
  TAB_BAR_HEIGHT,
  breakpoint,
  space,
} from '@/design/tokens';

export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface LayoutMetrics {
  width: number;
  height: number;
  sizeClass: SizeClass;
  isLandscape: boolean;
  bottomInset: number;
  tabBarHeight: number;
  /** Scroll content bottom padding that clears tab bar + mini player. */
  bottomChrome: number;
  /** Horizontal page gutter. */
  gutter: number;
  /** Width of the centered content column. */
  contentWidth: number;
  /** Columns for card/category grids. */
  gridColumns: number;
}

export function getSizeClass(width: number): SizeClass {
  if (width >= breakpoint.expanded) return 'expanded';
  if (width >= breakpoint.medium) return 'medium';
  return 'compact';
}

export function useLayout(): LayoutMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const sizeClass = getSizeClass(width);
    const bottomInset = Math.max(
      insets.bottom,
      Platform.OS === 'android' ? ANDROID_MIN_BOTTOM_INSET : 0,
    );
    const contentWidth = Math.min(width, MAX_CONTENT_WIDTH * (sizeClass === 'expanded' ? 1.4 : 1));
    return {
      width,
      height,
      sizeClass,
      isLandscape: width > height,
      bottomInset,
      tabBarHeight: TAB_BAR_HEIGHT + bottomInset,
      bottomChrome: BOTTOM_CHROME_HEIGHT + bottomInset + space[4],
      gutter: sizeClass === 'compact' ? space[4] : space[6],
      contentWidth,
      gridColumns: sizeClass === 'compact' ? 2 : sizeClass === 'medium' ? 3 : 4,
    };
  }, [width, height, insets.bottom]);
}
