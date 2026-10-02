/**
 * quantize.ts — Artwork color quantization & palette role assignment.
 *
 * Pipeline:
 *  1. Accept a flat Uint8Array of RGBA pixels from a 64×64 downsample.
 *  2. Filter near-black/near-white pixels (boring) and low-opacity.
 *  3. Convert remaining pixels to OKLab.
 *  4. Run k-means clustering (k=5, max 20 iter) in OKLab space.
 *  5. Assign 5 canonical roles based on lightness + chroma rank.
 *  6. OKLCH contrast-clamp accent / highlight for WCAG AA.
 *
 * Must run off the UI thread — no React imports, no Reanimated, pure math.
 */

import { rgbToOKLab, oklabDistance, oklabToHex, clampForContrast } from './oklch';

export interface OTOPalette {
  /** Darkest dominant color — used for background atmosphere tint */
  dominant: string;
  /** Mid-tone complement — card/surface tint */
  secondary: string;
  /** Most chromatic cluster — buttons, progress bar, accents */
  accent: string;
  /** Very dark shadow tint */
  shadow: string;
  /** Bright highlight edge glow */
  highlight: string;
}

const BG_HEX = '#0A0B0E'; // OTO OLED base
const K = 5;
const MAX_ITER = 20;
const MIN_OPACITY = 128; // skip transparent pixels

type Lab = [number, number, number];

const FALLBACK_LAB: Lab = [0, 0, 0];

/** k-means on OKLab points, returns K centroids */
function kMeans(points: Lab[], k: number, maxIter: number): Lab[] {
  if (points.length === 0) return Array(k).fill([0, 0, 0]) as Lab[];
  // Seed centroids via k-means++ style: spread initial picks
  const firstPoint = points[Math.floor(Math.random() * points.length)] ?? FALLBACK_LAB;
  const centroids: Lab[] = [firstPoint];
  while (centroids.length < k) {
    const dists = points.map((p) =>
      Math.min(...centroids.map((c) => oklabDistance(p, c) ** 2))
    );
    const sum = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    let pushed = false;
    for (let i = 0; i < points.length; i++) {
      r -= (dists[i] ?? 0);
      if (r <= 0) {
        centroids.push(points[i] ?? FALLBACK_LAB);
        pushed = true;
        break;
      }
    }
    if (!pushed) {
      centroids.push(points[points.length - 1] ?? FALLBACK_LAB);
    }
  }

  const assignments = new Int32Array(points.length);
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let j = 0; j < k; j++) {
        const d = oklabDistance(points[i] ?? FALLBACK_LAB, centroids[j] ?? FALLBACK_LAB);
        if (d < bestDist) { bestDist = d; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;
    // Recompute centroids
    for (let j = 0; j < k; j++) {
      const members = points.filter((_, i) => assignments[i] === j);
      if (members.length === 0) continue;
      centroids[j] = [
        members.reduce((s, p) => s + p[0], 0) / members.length,
        members.reduce((s, p) => s + p[1], 0) / members.length,
        members.reduce((s, p) => s + p[2], 0) / members.length,
      ];
    }
  }
  return centroids;
}

/**
 * Extract OTOPalette from a 64×64 RGBA Uint8Array.
 * @param pixels - flat RGBA bytes, length = 64 * 64 * 4
 */
export function extractPalette(pixels: Uint8Array): OTOPalette {
  const labs: Lab[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const a = pixels[i + 3] ?? 0;
    if (a < MIN_OPACITY) continue;
    // Skip near-black and near-white (low visual interest)
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma < 12 || luma > 245) continue;
    labs.push(rgbToOKLab(r, g, b));
  }

  // Fallback: monochrome/pitch-black/white artwork → safe defaults
  if (labs.length < K) {
    return {
      dominant: '#1A1B1F',
      secondary: '#2C2D32',
      accent: '#E5A93C',
      shadow: '#080809',
      highlight: '#3A3B40',
    };
  }

  const centroids = kMeans(labs, K, MAX_ITER);

  // Sort by OKLab L (lightness) ascending
  const sorted = [...centroids].sort((a, b) => a[0] - b[0]);

  // Chroma = sqrt(a²+b²) for accent selection
  const withChroma = sorted.map((lab, idx) => ({
    lab,
    idx,
    hex: oklabToHex(lab[0], lab[1], lab[2]),
    chroma: Math.sqrt(lab[1] ** 2 + lab[2] ** 2),
  }));

  // shadow = darkest
  const shadowEntry = withChroma[0] ?? withChroma[withChroma.length - 1]!;
  // highlight = lightest
  const highlightEntry = withChroma[withChroma.length - 1] ?? shadowEntry;
  // dominant = 2nd darkest (atmospheric background)
  const dominantEntry = withChroma[1] ?? shadowEntry;
  // secondary = middle
  const secondaryEntry = withChroma[2] ?? dominantEntry;
  // accent = most chromatic remaining
  const remaining = withChroma.filter(
    (e) => e !== shadowEntry && e !== highlightEntry && e !== dominantEntry && e !== secondaryEntry
  );
  const fallbackAccent = withChroma[0]!;
  const accentEntry =
    remaining.length > 0
      ? remaining.reduce((max, e) => (e.chroma > max.chroma ? e : max), remaining[0] ?? fallbackAccent)
      : withChroma.reduce((max, e) => (e.chroma > max.chroma ? e : max), fallbackAccent);

  // WCAG clamp: accent must be ≥ 3:1 against BG; text-facing colors ≥ 4.5:1
  const accentClamped = clampForContrast(accentEntry.hex, BG_HEX, 3.0);
  const highlightClamped = clampForContrast(highlightEntry.hex, BG_HEX, 3.0);

  return {
    dominant: dominantEntry.hex,
    secondary: secondaryEntry.hex,
    accent: accentClamped,
    shadow: shadowEntry.hex,
    highlight: highlightClamped,
  };
}
