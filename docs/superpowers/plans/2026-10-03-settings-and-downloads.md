# Settings Hub & Offline Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Settings Hub (`/settings`) and Offline Downloads Manager (`/downloads`), wire them to persistent MMKV / SQLite stores, decompose all component files under the 200-line standard, and verify with hard worst-case test suites.

**Architecture:** 
- Settings store powered by typed MMKV with Zod validation (`AppSettings.ts`), providing reactive hook `useSettings()` without React Context overhead.
- Downloads screen decomposed from monolithic 498 lines into focused sub-components (`StorageSummaryBar`, `DownloadItemRow`, `DownloadsScreenContent`).
- Complete route wiring in Expo Router: `app/settings.tsx` and `app/downloads.tsx` accessible via header action buttons.

**Tech Stack:** React Native New Architecture, Expo Router, MMKV, expo-sqlite, Reanimated 4, `@shopify/flash-list` v2, TypeScript strict.

**Spec:** [`docs/SPEC.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/SPEC.md), [`docs/DESIGN.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/DESIGN.md), [`docs/prompts/P13_downloads_and_offline.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P13_downloads_and_offline.md), [`docs/prompts/P14_discovery_insights_hardening.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/prompts/P14_discovery_insights_hardening.md)

## Global Constraints

- **File Length:** Component files must be `< 200` lines.
- **Zero Mock Data:** All screens wired to live MMKV, SQLite, or federated providers.
- **UI Thread Motion:** High-frequency gestures and progress bars run on UI thread via Reanimated worklets.
- **Touch Targets:** All interactive elements $\ge 44\times 44$ pt.
- **Quality Tiers:** UI honors active `QualityTier` tokens and reduced motion settings.

---

### Task 1: Decompose & Modularize Downloads Screen

**Files:**
- Create: `src/downloads/components/StorageSummaryBar.tsx`
- Create: `src/downloads/components/DownloadItemRow.tsx`
- Modify: `src/downloads/screens/DownloadsScreenContent.tsx`
- Create: `app/downloads.tsx`
- Test: `src/downloads/__tests__/DownloadsScreen.worstcases.test.ts`

**Interfaces:**
- Consumes: `useDownloadStore` (`src/downloads/DownloadStore.ts`), `DownloadRecord` (`src/downloads/DownloadDB.ts`)
- Produces: `StorageSummaryBar` component, `DownloadItemRow` component, `DownloadsScreenContent` screen (< 200 lines), route `app/downloads.tsx`.

- [x] **Step 1: Write failing hard worst-case test for Downloads Screen**

Create `src/downloads/__tests__/DownloadsScreen.worstcases.test.ts` asserting safe rendering with 0 downloads, active downloads, completed downloads, and storage calculations.

- [x] **Step 2: Run test to verify it fails or needs component exports**

Run: `npm test -- DownloadsScreen.worstcases.test.ts`
Expected: FAIL (missing component exports or modules).

- [x] **Step 3: Create `StorageSummaryBar.tsx` (< 100 lines)**

Extract the storage breakdown logic and visual bar (Audio, System, Free Space) into `src/downloads/components/StorageSummaryBar.tsx`.

- [x] **Step 4: Create `DownloadItemRow.tsx` (< 120 lines)**

Extract individual download record rendering, swipe-to-delete action, and animated progress into `src/downloads/components/DownloadItemRow.tsx`.

- [x] **Step 5: Refactor `DownloadsScreenContent.tsx` to `< 160 lines`**

Assemble `StorageSummaryBar`, `DownloadItemRow`, and FlashList v2 into `DownloadsScreenContent.tsx`.

- [x] **Step 6: Create `app/downloads.tsx` route**

Create route `app/downloads.tsx` with safe-area header and back button navigation.

- [x] **Step 7: Run test to verify it passes**

Run: `npm test -- DownloadsScreen.worstcases.test.ts`
Expected: PASS.

---

### Task 2: Settings Data Store & Hook

**Files:**
- Modify: `src/store/settings/AppSettings.ts`
- Create: `src/settings/hooks/useSettings.ts`
- Test: `src/settings/__tests__/useSettings.worstcases.test.ts`

**Interfaces:**
- Consumes: `AppSettingsSchema` and MMKV storage in `AppSettings.ts`
- Produces: `useSettings()` hook exposing `{ settings, updateSetting, resetSettings }`.

- [x] **Step 1: Write failing worst-case test for `useSettings`**

Create `src/settings/__tests__/useSettings.worstcases.test.ts` testing schema validation, default fallbacks on corrupt data, and update reactivity.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- useSettings.worstcases.test.ts`
Expected: FAIL with missing module.

- [x] **Step 3: Implement `useSettings.ts`**

Build reactive hook subscribing to MMKV storage events with memoized getters and type-safe setters.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- useSettings.worstcases.test.ts`
Expected: PASS.

---

### Task 3: Settings UI Components & Screen

**Files:**
- Create: `src/settings/components/SettingRow.tsx`
- Create: `src/settings/components/PlaybackSettingsSection.tsx`
- Create: `src/settings/components/AppearanceSettingsSection.tsx`
- Create: `src/settings/components/StorageSettingsSection.tsx`
- Create: `src/settings/screens/SettingsScreenContent.tsx`
- Create: `app/settings.tsx`
- Test: `src/settings/__tests__/SettingsScreen.worstcases.test.ts`

**Interfaces:**
- Consumes: `useSettings()` hook, `usePalette()`, `StreamCache`
- Produces: `SettingsScreenContent` (< 180 lines), route `app/settings.tsx`.

- [x] **Step 1: Write failing test for Settings Screen**

Create `src/settings/__tests__/SettingsScreen.worstcases.test.ts` verifying rendering of playback, appearance, and storage sections.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- SettingsScreen.worstcases.test.ts`
Expected: FAIL.

- [x] **Step 3: Create `SettingRow.tsx` (< 90 lines)**

Create generic accessible setting row supporting toggle switch, slider, value display, and navigation chevron.

- [x] **Step 4: Create `PlaybackSettingsSection.tsx` (< 120 lines)**

Create section with crossfade duration slider (0s - 12s), audio quality picker ('low' | 'normal' | 'high' | 'lossless'), and gapless toggle.

- [x] **Step 5: Create `AppearanceSettingsSection.tsx` (< 120 lines)**

Create section with Quality Tier selector (Auto / 3 / 2 / 1 / 0) and reduce motion / reduce blur toggles.

- [x] **Step 6: Create `StorageSettingsSection.tsx` (< 110 lines)**

Create section with discrete cache stats, "Clear Stream Cache" trigger (`StreamCache.clear()`), and link to `/downloads`.

- [x] **Step 7: Create `SettingsScreenContent.tsx` (< 180 lines) & `app/settings.tsx`**

Assemble all sections into a smooth scrollable settings view with glass header.

- [x] **Step 8: Run test to verify it passes**

Run: `npm test -- SettingsScreen.worstcases.test.ts`
Expected: PASS.

---

### Task 4: Navigation Entry Points & Header Integration

**Files:**
- Modify: `src/library/components/LibraryHeader.tsx`
- Modify: `src/explore/components/ExploreHeader.tsx`
- Modify: `src/home/screens/HomeScreenContent.tsx`

**Interfaces:**
- Consumes: Expo Router `useRouter().push('/settings')`
- Produces: Header settings gear icon button with `44x44pt` touch target and accessible label.

- [x] **Step 1: Add Settings gear icon button to `LibraryHeader.tsx`**

Add gear icon button next to profile avatar in `LibraryHeader.tsx` navigating to `/settings`.

- [x] **Step 2: Add Settings gear icon button to `ExploreHeader.tsx`**

Add gear icon button in `ExploreHeader.tsx` navigating to `/settings`.

- [x] **Step 3: Verify navigation with typecheck and tests**

Run `npm run typecheck` and `npm test` to ensure zero compilation or regression errors.

---

### Task 5: End-to-End Verification & Verification Gate

**Files:** All modified and created files.

- [x] **Step 1: Full TypeScript Compilation**
  Run: `npm run typecheck`
  Expected: 0 errors.

- [x] **Step 2: Full Test Suite Execution**
  Run: `npm test -- --silent`
  Expected: 100% green pass rate across all test suites.

- [x] **Step 3: Component Line Count Audit**
  Verify all component files strictly adhere to `< 200` lines.
