/**
 * usePalette.ts — Artwork color extraction hook.
 *
 * Contract:
 *  - Accepts an artwork URI.
 *  - Returns an OTOPalette (hex strings) and Reanimated SharedValues
 *    for the dominant, accent, and highlight colors as [r,g,b] float triples.
 *  - Cache hit: synchronous, <1ms.
 *  - Cache miss: async extraction on JS thread (Skia pixel read happens
 *    off the React render cycle via a hidden off-screen canvas reference).
 *  - Zero React re-renders during palette transitions — only SharedValues update.
 *
 * Architecture note:
 *  Skia's `surface.makeImageSnapshot()` + `image.readPixels()` runs synchronously
 *  in a background JS task queued via `InteractionManager.runAfterInteractions`.
 *  This keeps the main React commit phase clean.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { Skia, AlphaType, ColorType } from '@shopify/react-native-skia';
import { extractPalette, OTOPalette } from './quantize';
import { getCachedPalette, setCachedPalette } from './paletteCache';

/** Shared value triple [r, g, b] each 0.0–1.0 */
export interface PaletteSharedValues {
  dominantRGB: ReturnType<typeof useSharedValue<[number, number, number]>>;
  accentRGB: ReturnType<typeof useSharedValue<[number, number, number]>>;
  highlightRGB: ReturnType<typeof useSharedValue<[number, number, number]>>;
}

export interface UsePaletteResult {
  palette: OTOPalette | null;
  sharedValues: PaletteSharedValues;
}

const FALLBACK_PALETTE: OTOPalette = {
  dominant: '#1A1B1F',
  secondary: '#2C2D32',
  accent: '#E5A93C',
  shadow: '#080809',
  highlight: '#3A3B40',
};

const TRANSITION_MS = 600;
const DOWNSAMPLE_SIZE = 64;

/** hex → [r,g,b] 0–1 */
function hexToRGB01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 0xff) / 255, (n >> 8 & 0xff) / 255, (n & 0xff) / 255];
}

/**
 * Download + downsample artwork to 64×64 using Skia, then read pixels.
 * Returns null if fetch or decode fails.
 */
async function downsampleViaSkia(uri: string): Promise<Uint8Array | null> {
  try {
    const data = await Skia.Data.fromURI(uri);
    if (!data) return null;
    const srcImage = Skia.Image.MakeImageFromEncoded(data);
    if (!srcImage) return null;

    // Draw into 64×64 surface
    const surface = Skia.Surface.Make(DOWNSAMPLE_SIZE, DOWNSAMPLE_SIZE);
    if (!surface) return null;
    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    const srcRect = Skia.XYWHRect(0, 0, srcImage.width(), srcImage.height());
    const dstRect = Skia.XYWHRect(0, 0, DOWNSAMPLE_SIZE, DOWNSAMPLE_SIZE);
    canvas.drawImageRect(srcImage, srcRect, dstRect, paint);
    surface.flush();

    const snapshot = surface.makeImageSnapshot();
    const pixels = snapshot.readPixels(0, 0, {
      width: DOWNSAMPLE_SIZE,
      height: DOWNSAMPLE_SIZE,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    return pixels ? new Uint8Array(pixels.buffer) : null;
  } catch {
    return null;
  }
}

export function usePalette(uri: string | null | undefined): UsePaletteResult {
  const dominantRGB = useSharedValue<[number, number, number]>(hexToRGB01(FALLBACK_PALETTE.dominant));
  const accentRGB = useSharedValue<[number, number, number]>(hexToRGB01(FALLBACK_PALETTE.accent));
  const highlightRGB = useSharedValue<[number, number, number]>(hexToRGB01(FALLBACK_PALETTE.highlight));
  const [asyncPalette, setAsyncPalette] = useState<OTOPalette | null>(null);
  const activeUri = useRef<string | null>(null);

  const cached = uri ? getCachedPalette(uri) : null;
  const currentPalette = cached ?? asyncPalette;

  const updateSharedValues = useCallback(
    (p: OTOPalette) => {
      dominantRGB.value = withTiming(hexToRGB01(p.dominant), { duration: TRANSITION_MS }) as unknown as [number, number, number];
      accentRGB.value = withTiming(hexToRGB01(p.accent), { duration: TRANSITION_MS }) as unknown as [number, number, number];
      highlightRGB.value = withTiming(hexToRGB01(p.highlight), { duration: TRANSITION_MS }) as unknown as [number, number, number];
    },
    [dominantRGB, accentRGB, highlightRGB]
  );

  useEffect(() => {
    if (!uri || uri === activeUri.current) return;
    activeUri.current = uri;

    const hit = getCachedPalette(uri);
    if (hit) {
      updateSharedValues(hit);
      return;
    }

    const task = InteractionManager.runAfterInteractions(async () => {
      if (activeUri.current !== uri) return;
      const pixels = await downsampleViaSkia(uri);
      if (activeUri.current !== uri) return;

      const nextPalette = pixels ? extractPalette(pixels) : FALLBACK_PALETTE;
      setCachedPalette(uri, nextPalette);
      updateSharedValues(nextPalette);
      setAsyncPalette(nextPalette);
    });

    return () => task.cancel();
  }, [uri, updateSharedValues]);

  return {
    palette: currentPalette,
    sharedValues: { dominantRGB, accentRGB, highlightRGB },
  };
}
