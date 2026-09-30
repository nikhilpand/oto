# Prompt Slice P1: Design Tokens & Primitives

## Required Skills to Activate
- `ui-ux-designer`: Define tokens, OKLCH scales, 4-tier visual hierarchy, and component variants.
- `react-native-architecture`: Implement liquid glass fallback vs solid hairline borders, Reanimated spring physics.
- `ui-visual-validator`: Verify zero hard-coded values; enforce Storybook stories for all states.
- `a11y-debugging`: Dynamic Type support, touch targets >= 44x44pt / 48x48dp, reduced motion integration.
- `test-driven-development`: Unit test primitives across default, pressed, disabled, loading, and Tier 0 states.
- `wcag-audit-patterns`: Validate text contrast tokens against dark surfaces (>= 4.5:1).

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
1. Implement `src/design/tokens.ts` exactly matching the definitions in docs/DESIGN.md:
   - `color`: bg (base: '#0A0A0B', s1: '#111113', s2: '#17171A', s3: '#1E1E22'), text (primary: 0.94, secondary: 0.64, tertiary: 0.44, disabled: 0.32), accent (signature: '#E5A93C', signatureLight: '#F3C46B'), glass (tint, solidFallback, highlight), semantic, and hairline.
   - `space`: 4-pt grid `[0, 4, 8, 12, 16, 20, 24, 32, 48]`.
   - `radius`: sm: 8, md: 12, lg: 20, xl: 28, full: 999.
   - `type`: display [34, 40], title [28, 34], headline [22, 28], section [20, 26], track [17, 24], body [15, 22], artist [15, 20], meta [13, 18], caption [11, 14].
   - `spring`: spatial (fast, default, slow, playful) and effects (critically damped: fast, default, slow).
   - `duration`: micro: 140, standard: 280, large: 480, environment: 800.
2. Context & Hooks:
   - `ThemeProvider`: Distributes active theme and token constants.
   - `useQualityTier()`: Reads device state and provides active tier (3, 2, 1, 0) with automatic downgrade on sustained frame drops or battery saver.
   - `useReducedMotion()`: Integrates Reanimated's accessibility hook.
3. Primitives in `src/design/components/`:
   - `OTOText`: Supports token typography variants, OS Dynamic Type with `maxFontSizeMultiplier`, and fallback fonts for non-Latin scripts.
   - `OTOIconButton`: Touch target >= 44x44pt (iOS) / 48x48dp (Android) with light haptic feedback (`expo-haptics`) and `spring.spatial.playful` press physics.
   - `OTOButton`: Primary, secondary, and ghost variants.
   - `OTOGlassSurface`: Utilizes `expo-glass-effect` on iOS 26+ (guarded by `isLiquidGlassAvailable()`), falling back to `color.glass.solidFallback` with hairline highlight border on Android and older iOS.
   - `OTOArtwork`: Displays artwork with `expo-image`, caching policies, thumbhash placeholder, and rounded corners.

Constraints:
- All visual values MUST come from `src/design/tokens.ts`. No hardcoded hex or pixel values.
- Every primitive must have Storybook stories showing each state: default, pressed, disabled, loading, error, reduced-motion, and Tier 0.
- Touch targets >= 44pt (iOS) / 48dp (Android).

Acceptance Criteria:
- TypeScript compiles cleanly (`tsc --noEmit`).
- Storybook demonstrates all states and verifies Android fallback appearance.
```
