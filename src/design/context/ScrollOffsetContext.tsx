/**
 * ScrollOffsetContext
 *
 * Provides a shared Reanimated SharedValue<number> for the active tab's
 * scroll offset so the tab bar can animate hide-on-scroll without any
 * JS bridge traffic.
 *
 * Usage:
 *   const { scrollY } = useScrollOffset();
 *   const handler = useAnimatedScrollHandler((e) => {
 *     scrollY.value = e.contentOffset.y;
 *   });
 */

import { createContext, useContext, useMemo } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

interface ScrollOffsetContextValue {
  scrollY: SharedValue<number>;
}

const ScrollOffsetContext = createContext<ScrollOffsetContextValue | null>(null);

export function ScrollOffsetProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useSharedValue(0);
  const value = useMemo(() => ({ scrollY }), [scrollY]);
  return (
    <ScrollOffsetContext.Provider value={value}>
      {children}
    </ScrollOffsetContext.Provider>
  );
}

export function useScrollOffset(): ScrollOffsetContextValue {
  const ctx = useContext(ScrollOffsetContext);
  if (!ctx) throw new Error('useScrollOffset must be inside ScrollOffsetProvider');
  return ctx;
}
