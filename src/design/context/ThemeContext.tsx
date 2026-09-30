import { createContext, useContext, ReactNode } from 'react';
import {
  color,
  space,
  radius,
  type,
  typeScale,
  fontFamily,
  spring,
  duration,
  touchTarget,
  QualityTier,
} from '@/design/tokens';
import { QualityTierProvider, useQualityTier } from '@/design/hooks/useQualityTier';
import { ReducedMotionProvider, useReducedMotion } from '@/design/hooks/useReducedMotion';

export interface ThemeContextValue {
  color: typeof color;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  typeScale: typeof typeScale;
  fontFamily: typeof fontFamily;
  spring: typeof spring;
  duration: typeof duration;
  touchTarget: typeof touchTarget;
  tier: QualityTier;
  reducedMotion: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  color,
  space,
  radius,
  type,
  typeScale,
  fontFamily,
  spring,
  duration,
  touchTarget,
  tier: QualityTier.Full,
  reducedMotion: false,
});

export interface ThemeProviderProps {
  initialTier?: QualityTier;
  reducedMotion?: boolean;
  children: ReactNode;
}

function ThemeConsumer({ children }: { children: ReactNode }) {
  const { tier } = useQualityTier();
  const reducedMotion = useReducedMotion();

  const themeValue: ThemeContextValue = {
    color,
    space,
    radius,
    type,
    typeScale,
    fontFamily,
    spring,
    duration,
    touchTarget,
    tier,
    reducedMotion,
  };

  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
}

/**
 * Root theme provider distributing tokens, quality tier, and reduced motion settings.
 */
export function ThemeProvider({
  initialTier = QualityTier.Full,
  reducedMotion,
  children,
}: ThemeProviderProps) {
  return (
    <ReducedMotionProvider reducedMotion={reducedMotion}>
      <QualityTierProvider initialTier={initialTier}>
        <ThemeConsumer>{children}</ThemeConsumer>
      </QualityTierProvider>
    </ReducedMotionProvider>
  );
}

/**
 * Hook to access active theme tokens and system states.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
