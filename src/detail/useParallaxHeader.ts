/**
 * useParallaxHeader — UI-thread parallax collapsing header math.
 *
 * Returns animated scroll handler and derived styles for:
 * - Artwork parallax (translates up at half scroll rate)
 * - Header opacity fade (bg fades in as artwork collapses)
 * - Sticky transport controls (snap to top bar at threshold)
 * - Title appear in nav bar once header collapses past threshold
 */
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export const HEADER_HEIGHT = 320;
export const COLLAPSE_THRESHOLD = HEADER_HEIGHT - 60; // distance to fully collapse

export function useParallaxHeader() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  /** Artwork translates up at 0.5x scroll speed (parallax). */
  const artworkStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [0, -HEADER_HEIGHT * 0.5],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-80, 0],
      [1.12, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });

  /** Palette tint overlay fades from 0 (top) to 1 (collapsed). */
  const headerBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_HEIGHT * 0.5, COLLAPSE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  /** Artwork content fades out as user scrolls. */
  const artworkContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  /** Transport controls translate up to snap to nav bar. */
  const transportStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [COLLAPSE_THRESHOLD - 60, COLLAPSE_THRESHOLD],
      [0, -COLLAPSE_THRESHOLD],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }] };
  });

  /** Nav bar title appears when header has fully collapsed. */
  const navTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [COLLAPSE_THRESHOLD - 20, COLLAPSE_THRESHOLD + 20],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return {
    scrollY,
    scrollHandler,
    artworkStyle,
    headerBgStyle,
    artworkContentStyle,
    transportStyle,
    navTitleStyle,
    HEADER_HEIGHT,
    COLLAPSE_THRESHOLD,
  };
}
