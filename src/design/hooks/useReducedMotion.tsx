import { createContext, useContext, ReactNode } from 'react';
import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';

const ReducedMotionOverrideContext = createContext<boolean | null>(null);

export interface ReducedMotionProviderProps {
  reducedMotion?: boolean;
  children: ReactNode;
}

/**
 * Optional provider to override reduced motion state (useful for Storybook, testing, settings).
 */
export function ReducedMotionProvider({ reducedMotion, children }: ReducedMotionProviderProps) {
  return (
    <ReducedMotionOverrideContext.Provider value={reducedMotion ?? null}>
      {children}
    </ReducedMotionOverrideContext.Provider>
  );
}

/**
 * Access whether reduced motion is active (via OS accessibility setting or manual override).
 */
export function useReducedMotion(): boolean {
  const override = useContext(ReducedMotionOverrideContext);
  const reanimatedReducedMotion = useReanimatedReducedMotion();

  if (override !== null && override !== undefined) {
    return override;
  }

  return reanimatedReducedMotion ?? false;
}
