# Rule: OTO Design System & Visual Architecture

When creating or modifying any UI component, screen, or visual effect in OTO, you must strictly adhere to `docs/DESIGN.md` and `OTO_master_prompt_v2.md`.

## 1. Design Tokens Only
- All visual values must come from `src/design/tokens.ts`:
  - `color.bg` (`base: '#0A0A0B'`, `s1: '#111113'`, `s2: '#17171A'`, `s3: '#1E1E22'`)
  - `color.text` (`primary: 0.94`, `secondary: 0.64`, `tertiary: 0.44`, `disabled: 0.32`)
  - `color.glass` (`tint: 'rgba(10,10,12,0.55)'`, `solidFallback: 'rgba(18,18,20,0.94)'`, `highlight: 'rgba(255,255,255,0.09)'`)
  - `space`: 4-pt grid `[0, 4, 8, 12, 16, 20, 24, 32, 48]`
  - `radius`: `sm: 8`, `md: 12`, `lg: 20`, `xl: 28`, `full: 999`
  - `spring.spatial`: for layout, position, size (may have slight overshoot).
  - `spring.effects`: critically damped for color, opacity (never overshoots).
- If a token is missing, add it to `src/design/tokens.ts` with a comment; **never inline an arbitrary hex color or pixel value**.

## 2. Glass Surfaces & Android Fallback
- Glass belongs **only on floating navigation/controls** (tab bar, mini-player, sheets, transport controls).
- Never place glass on content. Never stack glass on glass.
- **Android & Tier ≤1 Fallback:** Use `color.glass.solidFallback` with a hairline highlight border (`color.hairline`). The design must look intentional and polished without native glass refraction.

## 3. Dynamic Color & Contrast Clamp
- Extract artwork palette off the UI thread (downsample to 64×64).
- Cluster in **OKLCH/OKLab** to assign roles: `dominant`, `secondary`, `accent`, `shadow`, `highlight`.
- **Mandatory Contrast Clamp:**
  - Artwork colors are used only as fills, glows, and accents.
  - Body text is always near-white (`text.primary`).
  - Any accent used for text or icons on dark surfaces must be lightened in OKLCH until it reaches **$\ge 4.5:1$ contrast** ($\ge 3:1$ for large text/graphics).
- Define fallbacks for greyscale, near-black, near-white, and single-dot artwork.

## 4. Layer Stack & GPU Drawing
- Layer stack per screen:
  $$\text{Artwork} \longrightarrow \text{Palette} \longrightarrow \text{Atmosphere (Skia)} \longrightarrow \text{Blur} \longrightarrow \text{Vignette} \longrightarrow \text{Surface} \longrightarrow \text{Content}$$
- Only **Atmosphere** and **Vignette** are Skia. Content (text, rows, buttons) is native React Native.
- Pause Skia animations when the app is backgrounded or off-screen.

## 5. Quality Tiers & Reduced Motion
- Support 4 quality tiers (`QualityTier: 3, 2, 1, 0`).
- When `useReducedMotion()` is true:
  - Mini ⇄ Full player expansion uses a simple crossfade instead of artwork travel.
  - Lyrics snap instantly to current line without eased scroll or scale.
  - Visualizer is static or disabled.
  - Springs are replaced with short fades using `spring.effects`.
