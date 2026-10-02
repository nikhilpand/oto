import {
  rgbToOklab,
  oklabToRgb,
  oklabToOklch,
  oklchToOklab,
  oklabDistance,
  wcagLuminance,
  wcagContrast,
  clampOklchContrast,
  hexToRgb,
  topBandScrimAlpha,
  averageRelativeLuminance,
} from '@/design/color/oklch';
import {
  extractPaletteFromPixels,
  getFallbackPalette,
  adaptedArtworkSaturation,
} from '@/design/color/extract';
import { PaletteCache } from '@/design/color/cache';
import { PaletteResult, PixelRgb } from '@/design/color/types';

describe('OKLab and OKLCH Color Space Math', () => {
  test('converts RGB to OKLab and back with high precision', () => {
    const testColors: [number, number, number][] = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
      [0, 0, 0],
      [128, 128, 128],
      [229, 169, 60], // OTO signature accent #E5A93C
    ];

    testColors.forEach(([r, g, b]) => {
      const lab = rgbToOklab(r, g, b);
      const [r2, g2, b2] = oklabToRgb(lab[0], lab[1], lab[2]);
      expect(Math.abs(r - r2)).toBeLessThanOrEqual(1);
      expect(Math.abs(g - g2)).toBeLessThanOrEqual(1);
      expect(Math.abs(b - b2)).toBeLessThanOrEqual(1);
    });
  });

  test('converts OKLab to OKLCH and back', () => {
    const lab: [number, number, number] = [0.75, 0.12, 0.08];
    const lch = oklabToOklch(lab[0], lab[1], lab[2]);
    const lab2 = oklchToOklab(lch[0], lch[1], lch[2]);

    expect(Math.abs(lab[0] - lab2[0])).toBeLessThan(0.001);
    expect(Math.abs(lab[1] - lab2[1])).toBeLessThan(0.001);
    expect(Math.abs(lab[2] - lab2[2])).toBeLessThan(0.001);
  });

  test('calculates perceptual color distance deltaE in OKLab', () => {
    const c1: [number, number, number] = [0.5, 0.1, 0.1];
    expect(oklabDistance(c1, c1)).toBe(0);

    const blackLab = rgbToOklab(0, 0, 0);
    const whiteLab = rgbToOklab(255, 255, 255);
    const blackWhiteDist = oklabDistance(blackLab, whiteLab);
    expect(blackWhiteDist).toBeGreaterThan(0.9);
  });

  test('calculates WCAG 2.1 relative luminance and contrast ratio accurately', () => {
    const whiteLum = wcagLuminance(255, 255, 255);
    const blackLum = wcagLuminance(0, 0, 0);
    expect(whiteLum).toBeCloseTo(1.0, 2);
    expect(blackLum).toBeCloseTo(0.0, 2);

    const maxContrast = wcagContrast(whiteLum, blackLum);
    expect(maxContrast).toBeCloseTo(21.0, 1);

    const sameContrast = wcagContrast(whiteLum, whiteLum);
    expect(sameContrast).toBeCloseTo(1.0, 1);
  });

  test('clampOklchContrast boosts dark colors to pass target contrast against base background', () => {
    // Very dark color: L=0.15, C=0.08, H=45
    const darkLch: [number, number, number] = [0.15, 0.08, 45];
    const baseBgHex = '#0A0A0B'; // OTO base background

    const clampedHex = clampOklchContrast(darkLch, 4.5, baseBgHex);
    const clampedRgb = hexToRgb(clampedHex);
    const bgRgb = hexToRgb(baseBgHex);

    const clampedLum = wcagLuminance(clampedRgb[0], clampedRgb[1], clampedRgb[2]);
    const bgLum = wcagLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    const contrast = wcagContrast(clampedLum, bgLum);

    expect(contrast).toBeGreaterThanOrEqual(4.45); // small rounding margin
  });
});

describe('Dynamic Palette Extraction & 12 Edge Cases', () => {
  // Helper to generate a 64x64 flat color array
  function makeSolidCanvas(r: number, g: number, b: number): PixelRgb[] {
    const arr: PixelRgb[] = new Array(64 * 64);
    for (let i = 0; i < 64 * 64; i++) {
      arr[i] = [r, g, b];
    }
    return arr;
  }

  test('extracts all 5 canonical roles with hex and normalized float rgba', () => {
    const canvas = makeSolidCanvas(180, 80, 50);
    const palette = extractPaletteFromPixels(canvas);

    expect(palette.dominant).toBeDefined();
    expect(palette.secondary).toBeDefined();
    expect(palette.accent).toBeDefined();
    expect(palette.shadow).toBeDefined();
    expect(palette.highlight).toBeDefined();

    // Check normalized uniform tuples [r, g, b, a]
    ['dominant', 'secondary', 'accent', 'shadow', 'highlight'].forEach((role) => {
      const key = ('u' +
        role.charAt(0).toUpperCase() +
        role.slice(1)) as keyof PaletteResult['uniforms'];
      const uniform = palette.uniforms[key];
      expect(uniform).toHaveLength(4);
      expect(uniform[0]).toBeGreaterThanOrEqual(0);
      expect(uniform[0]).toBeLessThanOrEqual(1);
      expect(uniform[3]).toBe(1); // alpha is 1
    });
  });

  test('handles all 12 edge case artworks with valid, clamped palettes', () => {
    const edgeCases: { name: string; pixels: PixelRgb[] }[] = [
      // 1. Monochromatic / pure grey
      { name: 'greyscale', pixels: makeSolidCanvas(128, 128, 128) },
      // 2. Pitch black
      { name: 'pitch_black', pixels: makeSolidCanvas(0, 0, 0) },
      // 3. Pure white
      { name: 'pure_white', pixels: makeSolidCanvas(255, 255, 255) },
      // 4. Single saturated dot on white canvas
      {
        name: 'single_dot_on_white',
        pixels: (() => {
          const p = makeSolidCanvas(255, 255, 255);
          p[0] = [255, 0, 0]; // 1 red pixel
          return p;
        })(),
      },
      // 5. Single saturated dot on black canvas
      {
        name: 'single_dot_on_black',
        pixels: (() => {
          const p = makeSolidCanvas(0, 0, 0);
          p[0] = [0, 220, 180]; // 1 teal pixel
          return p;
        })(),
      },
      // 6. Split half-black half-white
      {
        name: 'split_bw',
        pixels: (() => {
          const p = makeSolidCanvas(0, 0, 0);
          for (let i = 2048; i < 4096; i++) p[i] = [255, 255, 255];
          return p;
        })(),
      },
      // 7. Pastel (high lightness, very low saturation)
      { name: 'pastel', pixels: makeSolidCanvas(240, 230, 235) },
      // 8. Ultra saturated neon
      { name: 'neon', pixels: makeSolidCanvas(0, 255, 128) },
      // 9. Warm monochromatic sepia/red
      { name: 'warm_sepia', pixels: makeSolidCanvas(140, 40, 20) },
      // 10. Cool monochromatic navy
      { name: 'cool_navy', pixels: makeSolidCanvas(15, 25, 70) },
      // 11. Subtle noise / low-contrast texture
      {
        name: 'subtle_texture',
        pixels: (() => {
          const p: PixelRgb[] = new Array(4096);
          for (let i = 0; i < 4096; i++) {
            const v = 50 + (i % 10);
            p[i] = [v, v + 2, v + 4];
          }
          return p;
        })(),
      },
      // 12. Empty / missing pixels (empty array)
      { name: 'empty_fallback', pixels: [] },
    ];

    const bgRgb = hexToRgb('#0A0A0B');
    const bgLum = wcagLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);

    edgeCases.forEach(({ pixels }) => {
      const palette = pixels.length > 0
        ? extractPaletteFromPixels(pixels)
        : getFallbackPalette();

      expect(palette).toBeDefined();
      expect(palette.dominant).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.shadow).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.highlight).toMatch(/^#[0-9A-Fa-f]{6}$/);

      // Verify accent has >= 3:1 contrast against base background
      const accentRgb = hexToRgb(palette.accent);
      const accentLum = wcagLuminance(accentRgb[0], accentRgb[1], accentRgb[2]);
      const contrast = wcagContrast(accentLum, bgLum);
      expect(contrast).toBeGreaterThanOrEqual(3.0);
    });
  });
});

describe('Palette Cache Sub-Millisecond Performance', () => {
  test('retrieves cached palette in less than 1ms', () => {
    const cache = new PaletteCache();
    const mockPalette = getFallbackPalette();
    const key = 'test_artwork_sha256_hash_12345';

    cache.set(key, mockPalette);

    const start = performance.now();
    const result = cache.get(key);
    const durationMs = performance.now() - start;

    expect(result).toEqual(mockPalette);
    expect(durationMs).toBeLessThan(1.0); // Sub-millisecond requirement
  });

  test('returns null for cache miss', () => {
    const cache = new PaletteCache();
    expect(cache.get('non_existent_key')).toBeNull();
  });
});

describe('Artwork Palette Adaptation (BitChord Reference ArtworkPaletteTest)', () => {
  test('grayscale does not acquire the default red hue', () => {
    expect(adaptedArtworkSaturation(0, 0.2, 0.62)).toBe(0);
    expect(adaptedArtworkSaturation(0, 0.55, 1)).toBe(0);
  });

  test('nearly neutral artwork keeps its subtle saturation', () => {
    expect(adaptedArtworkSaturation(0.08, 0.2, 0.62)).toBe(0.08);
  });

  test('genuinely chromatic artwork is still strengthened and capped', () => {
    expect(adaptedArtworkSaturation(0.25, 0.55, 1)).toBe(0.55);
    expect(adaptedArtworkSaturation(0.9, 0.2, 0.62)).toBe(0.62);
  });
});

describe('Status Bar Contrast Scrim (BitChord Reference StatusBarContrastTest)', () => {
  test('dark top band uses subtle base scrim', () => {
    expect(topBandScrimAlpha(0)).toBeCloseTo(0.16, 4);
    expect(topBandScrimAlpha(null)).toBeCloseTo(0.16, 4);
  });

  test('light top band uses maximum scrim', () => {
    expect(topBandScrimAlpha(1)).toBeCloseTo(0.65, 4);
    // Out of range is clamped, not extrapolated
    expect(topBandScrimAlpha(2)).toBeCloseTo(0.65, 4);
  });

  test('mixed top band interpolates scrim in linear luminance', () => {
    // 4 pixels: Black, White, Black, White
    const mixed = averageRelativeLuminance([
      0xff000000,
      0xffffffff,
      0xff000000,
      0xffffffff,
    ]);

    expect(mixed).toBeCloseTo(0.5, 4);
    // The midpoint of the 0.16...0.65 band in linear luminance is 0.405
    expect(topBandScrimAlpha(mixed)).toBeCloseTo(0.405, 4);
  });
});
