import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { PaletteResult, PixelRgb, RgbaTuple } from '../color/types';
import { getFallbackPalette, extractPaletteFromPixels } from '../color/extract';
import { globalPaletteCache } from '../color/cache';
import { duration } from '../tokens';

export interface PaletteContextValue {
  /** Discrete active palette for components that need standard hex strings */
  activePalette: PaletteResult;
  /** Asynchronously extracts and applies palette with sub-millisecond cache lookups */
  extractAndApplyPalette: (imageKey: string, pixels?: PixelRgb[]) => Promise<void>;
  /** Reanimated Shared Value uniforms for direct UI-thread Skia canvas rendering (0 re-renders) */
  uniforms: {
    uDominant: SharedValue<RgbaTuple>;
    uSecondary: SharedValue<RgbaTuple>;
    uAccent: SharedValue<RgbaTuple>;
    uShadow: SharedValue<RgbaTuple>;
    uHighlight: SharedValue<RgbaTuple>;
  };
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

const DEFAULT_PALETTE = getFallbackPalette();

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [activePalette, setActivePalette] = useState<PaletteResult>(DEFAULT_PALETTE);

  // Reanimated shared values driving Skia uniforms directly on the UI thread
  const uDominant = useSharedValue<RgbaTuple>(DEFAULT_PALETTE.uniforms.uDominant);
  const uSecondary = useSharedValue<RgbaTuple>(DEFAULT_PALETTE.uniforms.uSecondary);
  const uAccent = useSharedValue<RgbaTuple>(DEFAULT_PALETTE.uniforms.uAccent);
  const uShadow = useSharedValue<RgbaTuple>(DEFAULT_PALETTE.uniforms.uShadow);
  const uHighlight = useSharedValue<RgbaTuple>(DEFAULT_PALETTE.uniforms.uHighlight);

  const sharedUniforms = useMemo(
    () => ({
      uDominant,
      uSecondary,
      uAccent,
      uShadow,
      uHighlight,
    }),
    [uDominant, uSecondary, uAccent, uShadow, uHighlight]
  );

  const extractAndApplyPalette = useCallback(
    async (imageKey: string, pixels?: PixelRgb[]) => {
      // 1. Check cache first (sub-millisecond <1ms lookup)
      let resolvedPalette = globalPaletteCache.get(imageKey);

      if (!resolvedPalette) {
        if (pixels && pixels.length > 0) {
          // Offload to background microtask to keep UI thread unblocked
          resolvedPalette = await new Promise<PaletteResult>((resolve) => {
            setTimeout(() => {
              const extracted = extractPaletteFromPixels(pixels);
              globalPaletteCache.set(imageKey, extracted);
              resolve(extracted);
            }, 0);
          });
        } else {
          resolvedPalette = getFallbackPalette();
          globalPaletteCache.set(imageKey, resolvedPalette);
        }
      }

      // 2. Animate Reanimated shared values on UI thread over duration.environment (800ms)
      const timingConfig = {
        duration: duration.environment,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      };

      uDominant.value = withTiming(resolvedPalette.uniforms.uDominant, timingConfig);
      uSecondary.value = withTiming(resolvedPalette.uniforms.uSecondary, timingConfig);
      uAccent.value = withTiming(resolvedPalette.uniforms.uAccent, timingConfig);
      uShadow.value = withTiming(resolvedPalette.uniforms.uShadow, timingConfig);
      uHighlight.value = withTiming(resolvedPalette.uniforms.uHighlight, timingConfig);

      // 3. Update discrete React state once
      setActivePalette(resolvedPalette);
    },
    [uDominant, uSecondary, uAccent, uShadow, uHighlight]
  );

  const contextValue = useMemo(
    () => ({
      activePalette,
      extractAndApplyPalette,
      uniforms: sharedUniforms,
    }),
    [activePalette, extractAndApplyPalette, sharedUniforms]
  );

  return (
    <PaletteContext.Provider value={contextValue}>
      {children}
    </PaletteContext.Provider>
  );
}

/** Hook to consume active palette and Skia uniform shared values */
export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error('usePalette must be used within a PaletteProvider');
  }
  return ctx;
}
