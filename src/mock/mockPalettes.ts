import { PaletteResult } from '@/design/color/types';
import { hexToRgbaTuple } from '@/design/color/oklch';
import { globalPaletteCache } from '@/design/color/cache';

function makePalette(
  dominant: string,
  secondary: string,
  accent: string,
  shadow: string,
  highlight: string
): PaletteResult {
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
 * Curated OKLCH-compliant palettes for mock catalog tracks.
 * Pre-seeded to provide immediate, rich atmosphere transitions on track skips.
 */
export const MOCK_PALETTES: Record<string, PaletteResult> = {
  // Midnight Drive (Deep indigo / electric violet)
  'oto-001': makePalette('#1E2442', '#2F365F', '#6C82E8', '#0D0F1A', '#A1B2FF'),
  // Golden Hour (Deep warm amber / radiant gold)
  'oto-002': makePalette('#3D2714', '#593619', '#E5A93C', '#140C06', '#F7D18C'),
  // Concrete Jungle (Urban slate / dusk crimson)
  'oto-003': makePalette('#2B1D24', '#3E2734', '#E05A6D', '#120B0F', '#F39AA8'),
  // Weightless (Deep oceanic teal / celestial cyan)
  'oto-004': makePalette('#122C2F', '#1B4247', '#38B8A6', '#071314', '#7CE2D5'),
  // Rust & Velvet (Warm deep copper rust / terracotta)
  'oto-005': makePalette('#361E1A', '#4E2A24', '#D47055', '#140A08', '#E8A392'),
  // Solar Flare (Solar amber / radiant orange)
  'oto-006': makePalette('#382012', '#522F18', '#F28D35', '#120904', '#FFB877'),
};

/** Seeds the global in-memory palette cache with mock palettes. */
export function seedMockPalettes(): void {
  for (const [key, palette] of Object.entries(MOCK_PALETTES)) {
    globalPaletteCache.set(key, palette);
  }
}

// Auto-seed on load
seedMockPalettes();
