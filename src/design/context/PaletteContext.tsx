import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { InteractionManager } from 'react-native';
import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';
import { PaletteResult, PixelRgb, RgbaTuple } from '../color/types';
import { getFallbackPalette, extractPaletteFromPixels } from '../color/extract';
import { globalPaletteCache } from '../color/cache';
import { duration } from '../tokens';

export interface PaletteContextValue {
  /** Discrete active palette for components that need standard hex strings */
  activePalette: PaletteResult;
  /**
   * Asynchronously extracts and applies palette.
   * - If `artworkUri` is provided: Skia off-thread pixel extraction runs.
   * - If `pixels` is provided: CPU quantization runs.
   * - If neither: falls back to cached result or default palette.
   */
  extractAndApplyPalette: (
    imageKey: string,
    pixelsOrUri?: PixelRgb[] | string
  ) => Promise<void>;
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
const DOWNSAMPLE = 64;

/** Skia-based off-thread artwork downsampling → pixel array */
async function extractPixelsViaSkia(uri: string): Promise<PixelRgb[] | null> {
  try {
    const data = await Skia.Data.fromURI(uri);
    if (!data) return null;
    const srcImage = Skia.Image.MakeImageFromEncoded(data);
    if (!srcImage) return null;

    const surface = Skia.Surface.Make(DOWNSAMPLE, DOWNSAMPLE);
    if (!surface) return null;
    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    const srcRect = Skia.XYWHRect(0, 0, srcImage.width(), srcImage.height());
    const dstRect = Skia.XYWHRect(0, 0, DOWNSAMPLE, DOWNSAMPLE);
    canvas.drawImageRect(srcImage, srcRect, dstRect, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const raw = snapshot.readPixels(0, 0, {
      width: DOWNSAMPLE,
      height: DOWNSAMPLE,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!raw) return null;

    const bytes = new Uint8Array(raw.buffer);
    const pixels: PixelRgb[] = [];
    for (let i = 0; i < bytes.length; i += 4) {
      pixels.push([bytes[i]!, bytes[i + 1]!, bytes[i + 2]!]);
    }
    return pixels;
  } catch {
    return null;
  }
}

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

  const applyResult = useCallback(
    (resolvedPalette: PaletteResult) => {
      const timingConfig = {
        duration: duration.environment,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      };
      uDominant.value = withTiming(resolvedPalette.uniforms.uDominant, timingConfig);
      uSecondary.value = withTiming(resolvedPalette.uniforms.uSecondary, timingConfig);
      uAccent.value = withTiming(resolvedPalette.uniforms.uAccent, timingConfig);
      uShadow.value = withTiming(resolvedPalette.uniforms.uShadow, timingConfig);
      uHighlight.value = withTiming(resolvedPalette.uniforms.uHighlight, timingConfig);
      setActivePalette(resolvedPalette);
    },
    [uDominant, uSecondary, uAccent, uShadow, uHighlight]
  );

  const extractAndApplyPalette = useCallback(
    async (imageKey: string, pixelsOrUri?: PixelRgb[] | string) => {
      // 1. Cache hit — synchronous, <1ms
      const cached = globalPaletteCache.get(imageKey);
      if (cached) {
        applyResult(cached);
        return;
      }

      // 2. Cache miss
      let resolvedPalette: PaletteResult;

      if (Array.isArray(pixelsOrUri) && pixelsOrUri.length > 0) {
        // Caller-provided pixel array (legacy path)
        resolvedPalette = await new Promise<PaletteResult>((resolve) => {
          const task = InteractionManager.runAfterInteractions(() => {
            const extracted = extractPaletteFromPixels(pixelsOrUri as PixelRgb[]);
            globalPaletteCache.set(imageKey, extracted);
            resolve(extracted);
          });
          // No cancel needed — runs once
          void task;
        });
      } else if (typeof pixelsOrUri === 'string' && pixelsOrUri.length > 0) {
        // URI path — Skia off-thread extraction
        await new Promise<void>((resolve) => {
          const task = InteractionManager.runAfterInteractions(async () => {
            const pixels = await extractPixelsViaSkia(pixelsOrUri);
            resolvedPalette = pixels
              ? extractPaletteFromPixels(pixels)
              : getFallbackPalette();
            globalPaletteCache.set(imageKey, resolvedPalette);
            applyResult(resolvedPalette);
            resolve();
          });
          void task;
        });
        return;
      } else {
        resolvedPalette = getFallbackPalette();
        globalPaletteCache.set(imageKey, resolvedPalette);
      }

      applyResult(resolvedPalette);
    },
    [applyResult]
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
