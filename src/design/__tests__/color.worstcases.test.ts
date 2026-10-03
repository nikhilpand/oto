import {
  clampOklchContrast,
  hexToRgb,
  wcagContrast,
  wcagLuminance,
  averageRelativeLuminance,
  rgbToOklab,
  oklabToOklch,
} from '../color/oklch';
import { extractPaletteFromPixels, getFallbackPalette } from '../color/extract';
import { PixelRgb } from '../color/types';

describe('OKLCH Contrast Clamp & Color Extraction — Worst-Case Stress Tests', () => {
  describe('clampOklchContrast WCAG Hard Enforcement', () => {
    const darkSurface = '#0c0d12'; // Standard OTO dark surface

    it('clamps pitch-black text (#000000) on dark surface to reach at least 4.5:1 contrast', () => {
      const blackLch = oklabToOklch(...rgbToOklab(0, 0, 0));
      const clampedHex = clampOklchContrast(blackLch, 4.5, darkSurface);

      const [cr, cg, cb] = hexToRgb(clampedHex);
      const [sr, sg, sb] = hexToRgb(darkSurface);
      const contrast = wcagContrast(wcagLuminance(cr, cg, cb), wcagLuminance(sr, sg, sb));

      expect(contrast).toBeGreaterThanOrEqual(4.45); // allowing rounding tolerance
    });

    it('clamps dark navy/purple low-contrast accent to meet 3.0:1 graphic/icon contrast', () => {
      const darkNavyRgb = hexToRgb('#0f1a30');
      const darkNavyLch = oklabToOklch(...rgbToOklab(darkNavyRgb[0], darkNavyRgb[1], darkNavyRgb[2]));
      const clampedHex = clampOklchContrast(darkNavyLch, 3.0, darkSurface);

      const [cr, cg, cb] = hexToRgb(clampedHex);
      const [sr, sg, sb] = hexToRgb(darkSurface);
      const contrast = wcagContrast(wcagLuminance(cr, cg, cb), wcagLuminance(sr, sg, sb));

      expect(contrast).toBeGreaterThanOrEqual(2.95);
    });

    it('leaves already-compliant text (#FFFFFF) untouched without washing out colors', () => {
      const whiteLch = oklabToOklch(...rgbToOklab(255, 255, 255));
      const clampedHex = clampOklchContrast(whiteLch, 4.5, darkSurface);
      expect(clampedHex.toUpperCase()).toBe('#FFFFFF');
    });
  });

  describe('hexToRgb Malformed Hex Defensive Handling', () => {
    it('returns [0, 0, 0] fallback on corrupted or invalid hex strings', () => {
      expect(hexToRgb('')).toEqual([0, 0, 0]);
      expect(hexToRgb('#XYZ123')).toEqual([0, 0, 0]);
      expect(hexToRgb('not_a_hex')).toEqual([0, 0, 0]);
      expect(hexToRgb('#12345')).toEqual([0, 0, 0]); // 5-char hex
    });

    it('correctly expands 3-digit shorthand hex codes (#fff, #000, #abc)', () => {
      expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#f00')).toEqual([255, 0, 0]);
      expect(hexToRgb('#0f0')).toEqual([0, 255, 0]);
    });
  });

  describe('wcagContrast Mathematical Invariants', () => {
    it('returns 1.0 for identical colors', () => {
      expect(wcagContrast(0.5, 0.5)).toBe(1.0);
      expect(wcagContrast(0.0, 0.0)).toBe(1.0);
      expect(wcagContrast(1.0, 1.0)).toBe(1.0);
    });

    it('returns maximum 21.0 for black vs white', () => {
      expect(wcagContrast(0.0, 1.0)).toBe(21.0);
      expect(wcagContrast(1.0, 0.0)).toBe(21.0);
    });
  });

  describe('extractPaletteFromPixels Extreme Artwork Inputs', () => {
    it('handles monochromatic 100% pitch-black album art (Donda / Black Album)', () => {
      // 100 black pixels
      const blackPixels: PixelRgb[] = Array.from({ length: 100 }, () => [0, 0, 0]);
      const palette = extractPaletteFromPixels(blackPixels);

      // Must produce a valid palette with non-NaN hex codes
      expect(palette.dominant).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.shadow).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.highlight).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('handles monochromatic 100% pure white album art (The Beatles White Album)', () => {
      const whitePixels: PixelRgb[] = Array.from({ length: 100 }, () => [255, 255, 255]);
      const palette = extractPaletteFromPixels(whitePixels);

      expect(palette.dominant).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.shadow).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.highlight).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('empty pixel array returns getFallbackPalette without crashing', () => {
      const palette = extractPaletteFromPixels([]);
      const fallback = getFallbackPalette();

      expect(palette.dominant).toBe(fallback.dominant);
      expect(palette.secondary).toBe(fallback.secondary);
      expect(palette.accent).toBe(fallback.accent);
    });

    it('averageRelativeLuminance on empty pixels returns 0 without divide-by-zero NaN', () => {
      expect(averageRelativeLuminance([])).toBe(0);
    });
  });
});
