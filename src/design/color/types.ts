/**
 * OTO Color Pipeline Types
 */

/** An RGB color tuple where each channel is an integer in [0, 255]. */
export type PixelRgb = [number, number, number];

/** An RGBA color tuple where each channel is a normalized float in [0.0, 1.0]. Used for Skia uniforms. */
export type RgbaTuple = [number, number, number, number];

/** The 5 canonical palette roles in OTO's visual system. */
export interface PaletteRoles {
  /** Primary atmospheric wash */
  dominant: string;
  /** Gradient complement (separated in hue/lightness) */
  secondary: string;
  /** Transport highlights, scrubber fill, active pills (contrast clamped) */
  accent: string;
  /** Deepest ambient color, blended with base dark background */
  shadow: string;
  /** Luminescent glow / peak accent */
  highlight: string;
}

/** Complete palette result containing hex representations and normalized Skia uniforms. */
export interface PaletteResult extends PaletteRoles {
  uniforms: {
    uDominant: RgbaTuple;
    uSecondary: RgbaTuple;
    uAccent: RgbaTuple;
    uShadow: RgbaTuple;
    uHighlight: RgbaTuple;
  };
}
