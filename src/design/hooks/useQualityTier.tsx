import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { QualityTier } from '@/design/tokens';

interface QualityTierContextType {
  tier: QualityTier;
  setTier: (tier: QualityTier) => void;
  autoDowngrade: () => void;
  resetTier: () => void;
}

const QualityTierContext = createContext<QualityTierContextType>({
  tier: QualityTier.Full,
  setTier: () => {},
  autoDowngrade: () => {},
  resetTier: () => {},
});

export interface QualityTierProviderProps {
  initialTier?: QualityTier;
  children: ReactNode;
}

/**
 * Quality Tier Provider
 * Manages the current visual rendering tier across the app.
 * Tier 3: Animated Skia atmosphere, progressive blur, native liquid glass.
 * Tier 2: Static Skia radial gradient, slow palette morph, native blur/tint.
 * Tier 1: Pre-rendered gradient, solid translucent tint, simplified motion.
 * Tier 0: Flat palette color, no blur, crossfades only.
 */
export function QualityTierProvider({
  initialTier = QualityTier.Full,
  children,
}: QualityTierProviderProps) {
  const [tier, setTierState] = useState<QualityTier>(initialTier);

  const autoDowngrade = useCallback(() => {
    setTierState((current) => {
      if (current > QualityTier.Minimal) {
        return (current - 1) as QualityTier;
      }
      return current;
    });
  }, []);

  const resetTier = useCallback(() => {
    setTierState(initialTier);
  }, [initialTier]);

  return (
    <QualityTierContext.Provider
      value={{
        tier,
        setTier: setTierState,
        autoDowngrade,
        resetTier,
      }}
    >
      {children}
    </QualityTierContext.Provider>
  );
}

/**
 * Hook to access the active Quality Tier and tier control functions.
 */
export function useQualityTier() {
  return useContext(QualityTierContext);
}
