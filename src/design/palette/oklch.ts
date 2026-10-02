/**
 * oklch.ts — Pure OKLCH / OKLab color math.
 *
 * No UI-thread dependencies. Runs in any JS context (worklet-safe pure functions).
 * Sources: Björn Ottosson's OKLab spec (https://bottosson.github.io/posts/oklab/)
 */

/** Linear sRGB → OKLab */
function linearToOKLab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** sRGB channel (0–255) → linear */
function sRGBToLinear(c: number): number {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

/** OKLab → OKLCH */
export function labToLCH(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

/** OKLCH → OKLab */
export function lchToLab(L: number, C: number, H: number): [number, number, number] {
  const hRad = (H * Math.PI) / 180;
  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

/** RGB pixel [r, g, b] (0–255 each) → OKLab triple */
export function rgbToOKLab(r: number, g: number, b: number): [number, number, number] {
  return linearToOKLab(sRGBToLinear(r), sRGBToLinear(g), sRGBToLinear(b));
}

/** RGB pixel → OKLCH triple */
export function rgbToOKLCH(r: number, g: number, b: number): [number, number, number] {
  const [L, a, b_] = rgbToOKLab(r, g, b);
  return labToLCH(L, a, b_);
}

/** Euclidean distance in OKLab */
export function oklabDistance(
  [l1, a1, b1]: [number, number, number],
  [l2, a2, b2]: [number, number, number]
): number {
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/** OKLab → linear sRGB (clamped 0–1) */
function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    Math.max(0, Math.min(1, +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    Math.max(0, Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    Math.max(0, Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ];
}

/** linear sRGB channel → sRGB byte */
function linearToSRGB(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

/** OKLab → RGB hex string */
export function oklabToHex(L: number, a: number, b: number): string {
  const [r, g, bl] = oklabToLinear(L, a, b);
  const rB = linearToSRGB(r);
  const gB = linearToSRGB(g);
  const bB = linearToSRGB(bl);
  return `#${rB.toString(16).padStart(2, '0')}${gB.toString(16).padStart(2, '0')}${bB.toString(16).padStart(2, '0')}`;
}

/** WCAG relative luminance from linear sRGB */
function relativeLuminance(rLin: number, gLin: number, bLin: number): number {
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/** WCAG 2.1 contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return relativeLuminance(
      sRGBToLinear((n >> 16) & 0xff),
      sRGBToLinear((n >> 8) & 0xff),
      sRGBToLinear(n & 0xff)
    );
  };
  const L1 = lum(hex1);
  const L2 = lum(hex2);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Clamp OKLCH lightness until contrast ratio against `bgHex` meets `target`.
 * Moves lightness toward 1.0 (lighten) for dark bg, toward 0 (darken) for light bg.
 * Returns clamped hex.
 */
export function clampForContrast(
  colorHex: string,
  bgHex: string,
  target = 4.5,
  maxIter = 40
): string {
  let [L, a, b] = rgbToOKLab(
    parseInt(colorHex.slice(1, 3), 16),
    parseInt(colorHex.slice(3, 5), 16),
    parseInt(colorHex.slice(5, 7), 16)
  );
  const bgLum = relativeLuminance(
    sRGBToLinear(parseInt(bgHex.slice(1, 3), 16)),
    sRGBToLinear(parseInt(bgHex.slice(3, 5), 16)),
    sRGBToLinear(parseInt(bgHex.slice(5, 7), 16))
  );
  const lightenMode = bgLum < 0.18; // dark bg → lighten text
  const step = lightenMode ? 0.015 : -0.015;
  for (let i = 0; i < maxIter; i++) {
    const hex = oklabToHex(L, a, b);
    if (contrastRatio(hex, bgHex) >= target) return hex;
    L = Math.max(0, Math.min(1, L + step));
  }
  return oklabToHex(L, a, b);
}
