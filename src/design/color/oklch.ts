/**
 * OKLab & OKLCH Color Space Math and WCAG 2.1 Contrast Clamping
 *
 * Implements Björn Ottosson's perceptual color space conversion algorithms
 * and WCAG 2.1 relative luminance and contrast calculations.
 */

import { RgbaTuple } from './types';

// ─── sRGB <-> Linear sRGB ─────────────────────────────────────────────

export function srgbToLinear(c: number): number {
  const norm = c / 255;
  if (norm <= 0.04045) {
    return norm / 12.92;
  }
  return Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  if (clamped <= 0.0031308) {
    return Math.round(clamped * 12.92 * 255);
  }
  return Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
}

// ─── RGB <-> OKLab ────────────────────────────────────────────────────

export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);

  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return [L, a, bVal];
}

export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [linearToSrgb(rLin), linearToSrgb(gLin), linearToSrgb(bLin)];
}

// ─── OKLab <-> OKLCH ──────────────────────────────────────────────────

export function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) {
    H += 360;
  }
  return [L, C, H];
}

export function oklchToOklab(L: number, C: number, H: number): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  return [L, a, b];
}

// ─── Perceptual Color Distance ────────────────────────────────────────

/** Computes DeltaE in OKLab color space (Euclidean distance). */
export function oklabDistance(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  const dL = c1[0] - c2[0];
  const da = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// ─── WCAG 2.1 Luminance & Contrast ────────────────────────────────────

/** Computes WCAG 2.1 relative luminance for RGB [0, 255]. */
export function wcagLuminance(r: number, g: number, b: number): number {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/** Computes WCAG 2.1 contrast ratio between two relative luminances. */
export function wcagContrast(lum1: number, lum2: number): number {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

// ─── OKLCH Contrast Clamping ──────────────────────────────────────────

/**
 * Progressively increases OKLCH Lightness and slightly desaturates Chroma
 * until contrast meets or exceeds `targetContrast` against `bgHex`.
 * Matches docs/DESIGN.md Section 5.2.
 */
export function clampOklchContrast(
  lch: [number, number, number],
  targetContrast = 4.5,
  bgHex = '#0A0A0B'
): string {
  let [L, C, H] = lch;
  const bgRgb = hexToRgb(bgHex);
  const bgLum = wcagLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);

  let currentRgb = oklabToRgb(...oklchToOklab(L, C, H));
  let currentLum = wcagLuminance(currentRgb[0], currentRgb[1], currentRgb[2]);
  let contrast = wcagContrast(currentLum, bgLum);

  // If already passing target contrast, return current hex
  if (contrast >= targetContrast) {
    return rgbToHex(currentRgb[0], currentRgb[1], currentRgb[2]);
  }

  // Iteratively lighten and slightly desaturate to avoid clipping
  let iterations = 0;
  while (contrast < targetContrast && L < 0.96 && iterations < 50) {
    L += 0.02;
    C = Math.max(0, C - 0.005);
    currentRgb = oklabToRgb(...oklchToOklab(L, C, H));
    currentLum = wcagLuminance(currentRgb[0], currentRgb[1], currentRgb[2]);
    contrast = wcagContrast(currentLum, bgLum);
    iterations++;
  }

  return rgbToHex(currentRgb[0], currentRgb[1], currentRgb[2]);
}

// ─── Hex Helpers ──────────────────────────────────────────────────────

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const c0 = clean[0] ?? '0';
    const c1 = clean[1] ?? '0';
    const c2 = clean[2] ?? '0';
    const r = parseInt(c0 + c0, 16);
    const g = parseInt(c1 + c1, 16);
    const b = parseInt(c2 + c2, 16);
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

export function hexToRgbaTuple(hex: string, alpha = 1.0): RgbaTuple {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255, g / 255, b / 255, alpha];
}

// ─── Status Bar & Scrim Contrast Adaptation ───────────────────────────

export const PLAYER_STATUS_SCRIM_MIN_ALPHA = 0.16;
export const PLAYER_STATUS_SCRIM_MAX_ALPHA = 0.65;

/**
 * Maps artwork linear luminance to top scrim opacity to keep white status bar
 * icons legible over light album covers while staying subtle on dark ones.
 *
 * @param artworkLuminance Relative luminance in [0, 1] (or null for default dark base)
 * @returns Scrim alpha in [0.16, 0.65]
 * @see BitChord/app/src/test/java/com/music/bitchord/ui/theme/StatusBarContrastTest.kt
 */
export function topBandScrimAlpha(artworkLuminance?: number | null): number {
  const luminance = Math.max(0, Math.min(1, artworkLuminance ?? 0));
  return (
    PLAYER_STATUS_SCRIM_MIN_ALPHA +
    (PLAYER_STATUS_SCRIM_MAX_ALPHA - PLAYER_STATUS_SCRIM_MIN_ALPHA) * luminance
  );
}

/**
 * Computes average WCAG relative luminance across a collection of RGB pixels
 * in linear light (never gamma-encoded sRGB).
 *
 * @param pixels Array of [r, g, b] tuples or 0xAARRGGBB integer values
 * @returns Average linear luminance in [0, 1]
 */
export function averageRelativeLuminance(
  pixels: ([number, number, number] | number)[]
): number {
  if (!pixels || pixels.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (Array.isArray(p)) {
      sum += wcagLuminance(p[0], p[1], p[2]);
    } else if (typeof p === 'number') {
      const r = (p >> 16) & 0xff;
      const g = (p >> 8) & 0xff;
      const b = p & 0xff;
      sum += wcagLuminance(r, g, b);
    }
  }

  return sum / pixels.length;
}
