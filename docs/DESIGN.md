# OTO — Design System Specification

This document defines the visual architecture, design tokens, interaction models, and rendering pipelines for the OTO mobile music application.

---

## 1. Design Principles (Ranked Decision Hierarchy)

When any two principles conflict, the higher-ranked principle always wins:
1. **Usability:** Every core action reachable one-handed; all touch targets $\ge 44\times 44$ pt (iOS) / $\ge 48\times 48$ dp (Android).
2. **Music Experience:** Audio playback never stutters, controls never lag, music is the visual hero.
3. **Performance:** Visual flourishes degrade before interaction responsiveness does.
4. **Hierarchy:** Exactly one clear focal point per screen.
5. **Motion Quality:** Continuity and causality over decorative spectacle.
6. **Accessibility:** Treated as an inviolable constraint on 1–5, never a polish afterthought.
7. **Polish, then Novelty:** Perfect the fundamentals before inventing novel paradigms.

**Explicitly Avoid:** Spotify/Apple Music direct clones, card-everything grids, blanket glassmorphism, neon/cyberpunk aesthetics, decorative 3D, gradients on every surface, glow as a default, JS-thread-driven animations, and hundreds of React nodes for a single visual effect.

---

## 2. Rendering Layer Stack & Threading Model

### 2.1 Screen Layer Architecture
```
Artwork  ──▶  Palette  ──▶  Atmosphere (Skia)  ──▶  Blur  ──▶  Vignette  ──▶  Surface  ──▶  Content
```
- **Atmosphere and Vignette** are the only Skia canvas layers.
- **Content** (text, buttons, scroll views) is native React Native to preserve native accessibility, font rendering, and zero-overhead layout.

### 2.2 Threading & High-Frequency Motion
```
Gesture Handler ──▶ Shared Value ──▶ Worklet (UI thread) ──▶ Animated Style / Skia Uniforms
```
- No `setState` during any gesture or per-frame animation.
- React state changes occur **strictly on discrete events** (track change, sheet snapped, mode toggled).

---

## 3. Design Tokens (`src/design/tokens.ts`)

```typescript
// src/design/tokens.ts

export const color = {
  bg: {
    base: '#0A0A0B',      // App canvas background
    s1:   '#111113',      // Elevated surface 1
    s2:   '#17171A',      // Elevated surface 2
    s3:   '#1E1E22',      // Elevated surface 3 (cards, dialogs)
  },
  text: {
    primary:   'rgba(255, 255, 255, 0.94)', // Headings, titles, active track
    secondary: 'rgba(255, 255, 255, 0.64)', // Artists, body copy, active icons
    tertiary:  'rgba(255, 255, 255, 0.44)', // Metadata, timestamps only
    disabled:  'rgba(255, 255, 255, 0.32)', // Disabled states, inactive icons
  },
  accent: {
    signature: '#E5A93C',                  // Warm Amber / Ochre fallback accent
    signatureLight: '#F3C46B',             // Contrast-clamped accent for text
  },
  hairline: 'rgba(255, 255, 255, 0.06)',   // Subtle top edge highlights
  glass: {
    tint:          'rgba(10, 10, 12, 0.55)', // Translucent fill behind blur
    solidFallback: 'rgba(18, 18, 20, 0.94)', // Android & Tier <= 1 fallback
    highlight:     'rgba(255, 255, 255, 0.09)',// 1px top edge inner glow
  },
  semantic: {
    success: '#4ADE80',
    warning: '#FBBF24',
    error:   '#F87171',
    info:    '#60A5FA',
  }
} as const;

export const space = [0, 4, 8, 12, 16, 20, 24, 32, 48] as const;

export const radius = {
  sm:   8,    // Chips, small buttons, row indicators
  md:   12,   // Cards, context menus
  lg:   20,   // Large cards, artwork corners
  xl:   28,   // Sheets, mini-player bar
  full: 999,  // Pill buttons, avatars
} as const;

export const type = {
  // [fontSize, lineHeight] in pt before OS font scaling
  display:  [34, 40] as const,
  title:    [28, 34] as const,
  headline: [22, 28] as const,
  section:  [20, 26] as const,
  track:    [17, 24] as const, // semibold
  body:     [15, 22] as const,
  artist:   [15, 20] as const,
  meta:     [13, 18] as const,
  caption:  [11, 14] as const, // minimum allowed size
} as const;

// Dual spring physics families (spatial vs effects)
export const spring = {
  spatial: {
    fast:    { damping: 22, stiffness: 420, mass: 1 },
    default: { damping: 26, stiffness: 300, mass: 1 }, // player expand: no visible overshoot
    slow:    { damping: 28, stiffness: 200, mass: 1 },
    playful: { damping: 16, stiffness: 320, mass: 1 }, // press/like: slight bouncy overshoot
  },
  effects: { // critically damped: color and opacity NEVER overshoot
    fast:    { damping: 40, stiffness: 600, mass: 1 },
    default: { damping: 40, stiffness: 400, mass: 1 },
    slow:    { damping: 40, stiffness: 200, mass: 1 },
  },
} as const;

export const duration = {
  micro:       140, // Button press, toggle, icon morph
  standard:    280, // Sheet content, list row changes
  large:       480, // Player expand/collapse, page transitions
  environment: 800, // Dynamic artwork palette & atmosphere morph
} as const;
```

---

## 4. Glass Surface Recipe & Android Fallback

Glass is reserved **exclusively for floating navigation and control surfaces** (tab bar, mini-player, bottom sheets, transport controls).

```
backdrop blur ──▶ dark tint (surface.2 @ 55–70%) ──▶ 1px inner highlight (white @ 8–10%)
             ──▶ hairline border (white @ 6%) ──▶ content
```

### Platform Rules:
- **iOS 26+:** Native Liquid Glass via `expo-glass-effect` (`GlassView`). Guarded with `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()`.
- **Android & Tier $\le 1$:** Opaque or high-opacity translucent tint (`color.glass.solidFallback`) with hairline border and top highlight. **Never attempt unsupported Android blur shaders that drop frames.** The Android fallback must look intentional, sharp, and premium.

---

## 5. Dynamic Artwork Color Pipeline & OKLCH Clamping

```
Artwork URL ──▶ Decode (64×64 off UI thread) ──▶ Quantize ──▶ OKLCH Clustering
            ──▶ Role Assignment ──▶ Contrast Clamp ──▶ Cache (MMKV/SQLite)
            ──▶ Reanimated Shared Values ──▶ Skia Uniforms
```

### 5.1 Palette Roles:
1. `dominant`: Primary atmospheric wash.
2. `secondary`: Gradient complement.
3. `accent`: Transport highlights, scrubber fill, active pills.
4. `shadow`: Deepest ambient color, blended with `color.bg.base`.
5. `highlight`: Luminescent glow, particles, or waveform peak accents.

### 5.2 Contrast Clamping Algorithm:
```typescript
export function clampOklchContrast(lch: [number, number, number], targetContrast = 4.5): string {
  let [L, C, H] = lch;
  // If contrast against #0A0A0B (L ~ 0.05) is below target, increment L in OKLCH
  while (calculateContrast(L, 0.05) < targetContrast && L < 0.95) {
    L += 0.02;
    C = Math.max(0, C - 0.005); // slight desaturation to prevent hyper-neon clipping
  }
  return oklchToRgbString(L, C, H);
}
```

---

## 6. Skia Runtime Shader: Atmospheric Liquid Background

Adapted from BitChord's AGSL runtime shader (`docs/reverse_engineering/08_UI_DESIGN_SYSTEM_AND_AGSL_SHADERS.md`), implemented in React Native Skia:

```glsl
// src/design/shaders/atmosphere.sksl
uniform float2 iResolution;
uniform float iTime;
uniform float4 uDominant;
uniform float4 uSecondary;
uniform float4 uAccent;
uniform float4 uShadow;

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    
    // Low-frequency organic drift
    float wave1 = sin(uv.x * 2.5 + iTime * 0.15) * 0.5 + 0.5;
    float wave2 = cos(uv.y * 3.0 - iTime * 0.12) * 0.5 + 0.5;
    float blend = clamp((wave1 + wave2) * 0.5, 0.0, 1.0);
    
    // Radial falloff towards vignette edges
    vec2 center = uv - vec2(0.5, 0.4);
    float dist = length(center);
    float vignette = smoothstep(0.85, 0.2, dist);
    
    vec4 color = mix(uShadow, uDominant, blend);
    color = mix(color, uSecondary, uv.y * 0.6);
    color += uAccent * (1.0 - smoothstep(0.0, 0.45, dist)) * 0.25;
    
    return color * vignette;
}
```

---

## 7. Four Quality Tiers

The app dynamically sets its quality tier at launch and auto-downgrades if performance degrades:

| Quality Tier | Atmospheric Background | Blur & Glass Surfaces | Visualizer | Motion Physics |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 3 (Full)** | Animated Skia atmosphere runtime shader | Native Liquid Glass (iOS 26) / live blur | On (capped $\le 60$ fps) | Full spatial springs |
| **Tier 2 (Balanced)** | Static Skia gradient, slow palette morph | Native blur or solid tint fallback | Off by default | Full spatial springs |
| **Tier 1 (Lite)** | Pre-rendered static gradient image | Solid translucent tint | Off | Simplified motion |
| **Tier 0 (Minimal)** | Flat palette background color | Solid opaque surfaces | Off | Linear crossfades only |

**Auto-Downgrade Triggers:**
- Sustained dropped frames: UI-thread frame time exceeds 16.6ms over a 2-second moving window.
- Device enters OS Low Power Mode / Battery Saver.
- Device thermal status reports "serious" or "critical".
- User enables OS "Reduce Motion" or "Reduce Transparency".

---

## 8. Anti-"AI Slop" Checklist (Enforced by Agent Rules)

Every component must pass this audit before being accepted into the codebase:
- [ ] Zero hard-coded hex colors, spacing values, or durations (everything from `tokens.ts`).
- [ ] No generic purple/blue "AI" gradients, neon borders, or Spotify green clones.
- [ ] No emoji used as navigation, transport, or control icons.
- [ ] No continuous, repetitive card grids stacked without density variation.
- [ ] No borders around every element (elevation is communicated via luminance steps and spacing).
- [ ] No glass placed on content or glass stacked on glass.
- [ ] No per-frame React state or context updates during animations or gestures.
- [ ] Every gesture (pan to expand, swipe to skip, drag to reorder) has an accessible non-gesture alternative.
- [ ] No placeholder copy ("Lorem ipsum", "Track 1") in shipped code.
