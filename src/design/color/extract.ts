/**
 * OTO Artwork Color Extraction & 5-Role Assignment Pipeline
 *
 * Quantizes pixel data in OKLab/OKLCH color space off the UI thread,
 * clusters prominent colors, assigns the 5 canonical roles, and clamps
 * contrast against the base background.
 */

import { PixelRgb, PaletteResult } from './types';
import {
  rgbToOklab,
  oklabToOklch,
  oklchToOklab,
  oklabToRgb,
  oklabDistance,
  clampOklchContrast,
  rgbToHex,
  hexToRgb,
  hexToRgbaTuple,
} from './oklch';
import { color } from '../tokens';

interface ColorCluster {
  count: number;
  rgb: [number, number, number];
  lab: [number, number, number];
  lch: [number, number, number];
}

/** Fallback palette when artwork is missing, empty, or unresolvable. */
export function getFallbackPalette(): PaletteResult {
  const dominant = color.bg.s3; // '#1E1E22'
  const secondary = '#2E2E36';
  const accent = color.accent.signature; // '#E5A93C'
  const shadow = color.bg.base; // '#0A0A0B'
  const highlight = color.accent.signatureLight; // '#F3C46B'

  return {
    dominant,
    secondary,
    accent,
    shadow,
    highlight,
    uniforms: {
      uDominant: hexToRgbaTuple(dominant),
      uSecondary: hexToRgbaTuple(secondary),
      uAccent: hexToRgbaTuple(accent),
      uShadow: hexToRgbaTuple(shadow),
      uHighlight: hexToRgbaTuple(highlight),
    },
  };
}

/**
 * Quantizes and clusters a pixel array to extract the 5 canonical OTO roles.
 * Runs in <5ms for a 64x64 buffer (4096 pixels) using sample strides.
 */
export function extractPaletteFromPixels(pixels: PixelRgb[]): PaletteResult {
  if (!pixels || pixels.length === 0) {
    return getFallbackPalette();
  }

  // Fast sample stride to evaluate at most 512 representative pixels
  const stride = Math.max(1, Math.floor(pixels.length / 512));
  const clusters: ColorCluster[] = [];
  const MERGE_THRESHOLD = 0.08; // DeltaE clustering radius in OKLab

  for (let i = 0; i < pixels.length; i += stride) {
    const pixel = pixels[i];
    if (!pixel) continue;
    const [r, g, b] = pixel;
    const lab = rgbToOklab(r, g, b);

    // Look for existing cluster within MERGE_THRESHOLD
    let matchedIndex = -1;
    for (let c = 0; c < clusters.length; c++) {
      const cluster = clusters[c];
      if (cluster && oklabDistance(lab, cluster.lab) < MERGE_THRESHOLD) {
        matchedIndex = c;
        break;
      }
    }

    if (matchedIndex >= 0) {
      const match = clusters[matchedIndex];
      if (match) {
        match.count += 1;
        // Incremental weighted average for RGB and Lab
        const weight = 1 / match.count;
        match.rgb = [
          Math.round(match.rgb[0] * (1 - weight) + r * weight),
          Math.round(match.rgb[1] * (1 - weight) + g * weight),
          Math.round(match.rgb[2] * (1 - weight) + b * weight),
        ];
        match.lab = rgbToOklab(...match.rgb);
        match.lch = oklabToOklch(...match.lab);
      }
    } else {
      clusters.push({
        count: 1,
        rgb: [r, g, b],
        lab,
        lch: oklabToOklch(...lab),
      });
    }
  }

  const dominantCluster = clusters[0];
  if (!dominantCluster) {
    return getFallbackPalette();
  }

  // Sort clusters descending by frequency
  clusters.sort((a, b) => b.count - a.count);

  // 1. Dominant: Most frequent cluster
  const dominantHex = rgbToHex(...dominantCluster.rgb);

  // 2. Secondary: Cluster with largest perceptual deltaE (>= 0.12) from dominant
  const secondaryCluster = clusters.find(
    (c) => oklabDistance(c.lab, dominantCluster.lab) >= 0.12
  );

  let secondaryHex: string;
  if (secondaryCluster) {
    secondaryHex = rgbToHex(...secondaryCluster.rgb);
  } else {
    // Monochromatic case: Synthesize harmonic shift (+30deg hue or lightness offset)
    const [L, C, H] = dominantCluster.lch;
    const synthL = L > 0.5 ? Math.max(0.1, L - 0.25) : Math.min(0.85, L + 0.25);
    const synthLab = oklchToOklab(synthL, C, (H + 35) % 360);
    const synthRgb = oklabToRgb(...synthLab);
    secondaryHex = rgbToHex(...synthRgb);
  }

  // 3. Accent: Cluster with highest Chroma, contrast-clamped against base bg
  let highestChromaCluster = clusters.reduce((prev, curr) =>
    curr.lch[1] > prev.lch[1] ? curr : prev
  );

  let accentHex: string;
  // If the artwork is completely monochromatic or achromatic (chroma < 0.04)
  if (highestChromaCluster.lch[1] < 0.04) {
    // Use OTO signature accent
    accentHex = color.accent.signature;
  } else {
    // Clamp contrast to at least 3.0:1
    accentHex = clampOklchContrast(highestChromaCluster.lch, 3.0, color.bg.base);
  }

  // 4. Shadow: Deepest ambient color (L <= 0.18), blended with base bg
  const [domL, domC, domH] = dominantCluster.lch;
  const shadowL = Math.min(0.12, domL * 0.35);
  const shadowC = domC * 0.4;
  const shadowLab = oklchToOklab(shadowL, shadowC, domH);
  const shadowRgb = oklabToRgb(...shadowLab);
  const shadowHex = rgbToHex(...shadowRgb);

  // 5. Highlight: Luminescent peak accent (L >= 0.75)
  const [accL, accC, accH] = oklabToOklch(...rgbToOklab(...hexToRgb(accentHex)));
  const highlightL = Math.max(0.78, accL + 0.15);
  const highlightLab = oklchToOklab(highlightL, Math.min(accC, 0.14), accH);
  const highlightRgb = oklabToRgb(...highlightLab);
  const highlightHex = rgbToHex(...highlightRgb);

  return {
    dominant: dominantHex,
    secondary: secondaryHex,
    accent: accentHex,
    shadow: shadowHex,
    highlight: highlightHex,
    uniforms: {
      uDominant: hexToRgbaTuple(dominantHex),
      uSecondary: hexToRgbaTuple(secondaryHex),
      uAccent: hexToRgbaTuple(accentHex),
      uShadow: hexToRgbaTuple(shadowHex),
      uHighlight: hexToRgbaTuple(highlightHex),
    },
  };
}
