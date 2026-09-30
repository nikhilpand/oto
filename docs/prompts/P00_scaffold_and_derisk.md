# Prompt Slice P0: Scaffold & De-Risk

## Required Skills to Activate
- `react-native-architecture`: Configure Expo SDK 57, New Architecture, native modules, Metro/Babel worklet plugin.
- `mobile-developer`: Setup Expo build configuration, app.json, and native audio/graphics parameters.
- `performance-engineer`: Profile Hermes worklet runtime memory and ensure no startup leaks.
- `verification-before-completion`: Run `expo-doctor` (21/21 checks) and `tsc --noEmit` before concluding.
- `writing-plans`: Plan architecture scaffolding and stack de-risking before edits.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Initialize and configure the OTO Expo project using the New Architecture and TypeScript strict mode:
1. Expo Setup:
   - Configure Expo Router with Native Tabs (`app/(tabs)/_layout.tsx`: Home, Search, Library).
   - Configure `app.json` with bundle identifiers, New Architecture flags, and development build settings.
   - Configure TypeScript strict (`tsconfig.json`), ESLint, Prettier, and Jest.
2. Pinned Stack Dependencies:
   Install via `npx expo install`:
   - `expo-image`
   - `react-native-reanimated` (v4) + `react-native-worklets`
   - `react-native-gesture-handler`
   - `@shopify/react-native-skia`
   - `@shopify/flash-list` (v2)
   - `react-native-mmkv`
   - `expo-sqlite`
   - `expo-haptics`
   - `expo-glass-effect`
   - `expo-blur`
   - `zustand`
3. Mock Catalog Setup:
   - Create `src/mock/mockCatalog.json` containing 10 high-fidelity test tracks with titles, artists, albums, durationMs, and verified artwork URLs with thumbhashes.

De-Risk Task:
Add a temporary test view in `app/index.tsx` that mounts:
1. A Reanimated 4 shared value driving a 60/120Hz test animation worklet.
2. A Skia canvas rendering a basic shader/rect.
Verify whether the Hermes v1 / worklets memory issue noted in Part 2.4 applies to the pinned package versions, and confirm clean startup.

Constraints:
- No other dependencies beyond the core stack.
- No `@react-navigation/*` imports (Expo Router uses the native tabs engine).
- Must run `npx expo-doctor` with 0 warnings or errors.

Acceptance Criteria:
- `tsc --noEmit`, ESLint, and test commands pass cleanly.
- `npx expo-doctor` reports clean configuration.
- Written summary of pinned versions and initial memory findings posted.
```
