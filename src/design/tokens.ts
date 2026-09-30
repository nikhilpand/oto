/**
 * OTO Design Tokens
 *
 * Single source of truth for all visual values in the application.
 * Never hard-code colors, sizes, spacing, radii, durations, or spring values.
 * Always import from this file.
 *
 * @see docs/DESIGN.md §3 for rationale and design decisions.
 */

// ─── Color Tokens ─────────────────────────────────────────────────────

export const color = {
  bg: {
    base: '#0A0A0B', // App canvas background
    s1: '#111113', // Elevated surface 1
    s2: '#17171A', // Elevated surface 2
    s3: '#1E1E22', // Elevated surface 3 (cards, dialogs)
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.94)', // Headings, titles, active track
    secondary: 'rgba(255, 255, 255, 0.64)', // Artists, body copy, active icons
    tertiary: 'rgba(255, 255, 255, 0.44)', // Metadata, timestamps only
    disabled: 'rgba(255, 255, 255, 0.32)', // Disabled states, inactive icons
  },
  accent: {
    signature: '#E5A93C', // Warm Amber / Ochre fallback accent
    signatureLight: '#F3C46B', // Contrast-clamped accent for text on dark
  },
  hairline: 'rgba(255, 255, 255, 0.06)', // Subtle top edge highlights
  glass: {
    tint: 'rgba(10, 10, 12, 0.55)', // Translucent fill behind blur
    solidFallback: 'rgba(18, 18, 20, 0.94)', // Android & Tier <= 1 fallback
    highlight: 'rgba(255, 255, 255, 0.09)', // 1px top edge inner glow
  },
  semantic: {
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
} as const;

// ─── Spacing Scale ────────────────────────────────────────────────────

/** 8-point-aligned spacing scale (index → dp/pt). Usage: space[4] = 16 */
export const space = [0, 4, 8, 12, 16, 20, 24, 32, 48] as const;

// ─── Border Radii ─────────────────────────────────────────────────────

export const radius = {
  sm: 8, // Chips, small buttons, row indicators
  md: 12, // Cards, context menus
  lg: 20, // Large cards, artwork corners
  xl: 28, // Sheets, mini-player bar
  full: 999, // Pill buttons, avatars
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────

/**
 * [fontSize, lineHeight] in pt before OS font scaling.
 * Font family: Plus Jakarta Sans (variable) with system fallbacks.
 */
export const type = {
  display: [34, 40] as const,
  title: [28, 34] as const,
  headline: [22, 28] as const,
  section: [20, 26] as const,
  track: [17, 24] as const, // semibold
  body: [15, 22] as const,
  artist: [15, 20] as const,
  meta: [13, 18] as const,
  caption: [11, 14] as const, // minimum allowed size
} as const;

// ─── Font Family ──────────────────────────────────────────────────────

export const fontFamily = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  /** System fallback for platforms where Jakarta isn't loaded yet */
  system: 'System',
} as const;

// ─── Spring Physics ───────────────────────────────────────────────────

/**
 * Two spring families:
 * - `spatial`: Position/scale — slight overshoot acceptable for playfulness.
 * - `effects`: Color/opacity — critically damped, NEVER overshoots.
 */
export const spring = {
  spatial: {
    fast: { damping: 22, stiffness: 420, mass: 1 },
    default: { damping: 26, stiffness: 300, mass: 1 }, // player expand: no visible overshoot
    slow: { damping: 28, stiffness: 200, mass: 1 },
    playful: { damping: 16, stiffness: 320, mass: 1 }, // press/like: slight bouncy overshoot
  },
  effects: {
    // Critically damped: color and opacity NEVER overshoot
    fast: { damping: 40, stiffness: 600, mass: 1 },
    default: { damping: 40, stiffness: 400, mass: 1 },
    slow: { damping: 40, stiffness: 200, mass: 1 },
  },
} as const;

// ─── Duration (ms) ────────────────────────────────────────────────────

/** Timing durations for non-spring transitions (ms). */
export const duration = {
  micro: 140, // Button press, toggle, icon morph
  standard: 280, // Sheet content, list row changes
  large: 480, // Player expand/collapse, page transitions
  environment: 800, // Dynamic artwork palette & atmosphere morph
} as const;

// ─── Touch Targets ────────────────────────────────────────────────────

/** Minimum touch target sizes per platform (dp/pt). */
export const touchTarget = {
  ios: 44,
  android: 48,
} as const;

// ─── Quality Tiers ────────────────────────────────────────────────────

export enum QualityTier {
  Minimal = 0,
  Lite = 1,
  Balanced = 2,
  Full = 3,
}

// ─── Aliases & Helper Types ──────────────────────────────────────────

/** Alias for typography scale for syntax convenience */
export const typeScale = type;

export type ColorTokens = typeof color;
export type TypographyScale = typeof type;
export type TypographyVariant = keyof typeof type;
export type TextColorRole = 'primary' | 'secondary' | 'tertiary' | 'disabled';
export type RadiusSize = keyof typeof radius;
export type SpacingScale = typeof space;
