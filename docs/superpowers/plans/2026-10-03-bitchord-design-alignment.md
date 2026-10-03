# BitChord Design Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve 100% pixel-precise visual and functional alignment with the 20 BitChord design screenshots in [`docs/bichord`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/bichord), covering the Track Options Bottom Sheet (`8.48.10 PM (1)`), Audio Output Bottom Sheet (`8.48.09 PM (2)`), Player Bottom Dock with Listen Together & Queue controls (`8.48.06`, `8.48.10`), Library Experience & On-Device cards (`8.48.12 PM (2)`), and Listen Together Modal. All component files strictly `< 200` lines.

**Architecture:**
- Player auxiliary interactions rendered via Reanimated bottom sheet overlays (`TrackOptionsSheet`, `AudioOutputSheet`).
- Player bottom dock responds to `showQueue` mode by dynamically toggling between solo/party and shuffle/repeat/autoplay segmented pills.
- Library screen integrates listening stats (`ListeningRecorder`), on-device hubs (Downloads, Local Music, WebDAV), and Liked Music thumbs-up playlist banner.
- Clean-room Listen Together client (`ListenTogether.ts`) implementing NTP-style offset calculations and room state machine.

**Tech Stack:** React Native New Architecture, Expo Router, Reanimated 4, `@shopify/flash-list` v2, MMKV, expo-sqlite, TypeScript strict.

**Reference:** [`docs/bichord`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/bichord), [`docs/SPEC.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/SPEC.md), [`docs/DESIGN.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/DESIGN.md), [`docs/reverse_engineering/07_LISTEN_TOGETHER_SYNC_PROTOCOL.md`](file:///c:/Users/nikhil/Desktop/projects/music-mobile/docs/reverse_engineering/07_LISTEN_TOGETHER_SYNC_PROTOCOL.md)

## Global Constraints

- **File Length:** Component files strictly `< 200` lines.
- **Zero Mock Data:** Wired to live stores, audio engine, or SQLite.
- **Touch Targets:** $\ge 44\times 44$ pt (iOS) / $\ge 48\times 48$ dp (Android).
- **Design Tokens:** All colors, spacing, and radii imported from `@/design/tokens`.

---

### Task 1: Track Options Bottom Sheet (`8.48.10 PM (1).jpeg`)

**Files:**
- Create: `src/player/components/TrackOptionsSheet.tsx`
- Modify: `src/player/components/NowPlayingHeader.tsx`
- Modify: `src/player/components/NowPlayingMetadata.tsx`
- Modify: `src/player/components/OTONowPlayingContent.tsx`
- Test: `src/player/__tests__/TrackOptionsSheet.worstcases.test.tsx`

**Interfaces:**
- Consumes: `Track`, `useDownloadStore`, `usePlaybackStore`, `Autoplay`
- Produces: `TrackOptionsSheet` component (< 180 lines)

- [x] **Step 1: Write failing worst-case test for `TrackOptionsSheet`**
  Assert rendering of track header, options (Revert, Like, Dislike, Add to playlist, Download, Start radio), action callbacks, and accessibility traits.

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test -- TrackOptionsSheet.worstcases.test.tsx`
  Expected: FAIL (missing module).

- [x] **Step 3: Implement `TrackOptionsSheet.tsx` (< 180 lines)**
  Build glass bottom sheet matching `8.48.10 PM (1).jpeg`:
  - Drag handle
  - Track thumbnail + title + artist
  - "Revert to original", "Like", "Dislike", "Add to playlist", "Download" (triggers `startDownload`), "Start radio" (triggers `Autoplay.checkAndFetch`).

- [x] **Step 4: Wire `TrackOptionsSheet` into `OTONowPlayingContent.tsx`**
  Connect `MoreHorizontalIcon` in `NowPlayingHeader.tsx` and `NowPlayingMetadata.tsx` to toggle the sheet.

- [x] **Step 5: Run test to verify it passes**
  Run: `npm test -- TrackOptionsSheet.worstcases.test.tsx`
  Expected: PASS.

---

### Task 2: Audio Output Bottom Sheet (`8.48.09 PM (2).jpeg`)

**Files:**
- Create: `src/player/components/AudioOutputSheet.tsx`
- Modify: `src/player/components/NowPlayingSecondaryBar.tsx`
- Modify: `src/player/components/OTONowPlayingContent.tsx`
- Test: `src/player/__tests__/AudioOutputSheet.worstcases.test.tsx`

**Interfaces:**
- Consumes: `useAudioEngine`, `useSettings`
- Produces: `AudioOutputSheet` (< 170 lines)

- [x] **Step 1: Write failing worst-case test for `AudioOutputSheet`**
  Assert rendering of active device card with checkmark, volume slider, and audio pipeline card (sample rate & bit depth).

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test -- AudioOutputSheet.worstcases.test.tsx`
  Expected: FAIL.

- [x] **Step 3: Implement `AudioOutputSheet.tsx` (< 170 lines)**
  Build sheet matching `8.48.09 PM (2).jpeg`:
  - Active device card (Phone icon, "F²F's Phone", "Playing here", checkmark)
  - Volume slider card with speaker icon
  - Audio Pipeline card: waveform icon, "Audio Pipeline", "16-bit PCM / 32-bit float · 48 kHz", navigates to Settings audio output precision.

- [x] **Step 4: Wire `AudioOutputSheet` into `NowPlayingSecondaryBar.tsx`**
  Make device footer text and pill open `AudioOutputSheet`.

- [x] **Step 5: Run test to verify it passes**
  Run: `npm test -- AudioOutputSheet.worstcases.test.tsx`
  Expected: PASS.

---

### Task 3: Player Bottom Dock & Dynamic Segmented Controls (`8.48.06`, `8.48.10`)

**Files:**
- Modify: `src/player/components/NowPlayingSecondaryBar.tsx`
- Modify: `src/player/components/OTONowPlayingContent.tsx`
- Test: `src/player/__tests__/NowPlayingSecondaryBar.worstcases.test.tsx`

**Interfaces:**
- Consumes: `showQueue`, `showLyrics`, `isShuffled`, `repeatMode`, `autoplayEnabled`
- Produces: Dynamic segmented pill matching BitChord dock

- [x] **Step 1: Write failing worst-case test for `NowPlayingSecondaryBar`**
  Assert that when `showQueue === false`, center shows `[Headphones (Solo) | People (Party)]`; when `showQueue === true`, center shows `[Shuffle | Repeat | Autoplay Infinity]`.

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test -- NowPlayingSecondaryBar.worstcases.test.tsx`
  Expected: FAIL.

- [x] **Step 3: Refactor `NowPlayingSecondaryBar.tsx` (< 180 lines)**
  Implement the dual-state segmented control pill with haptic feedback.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test -- NowPlayingSecondaryBar.worstcases.test.tsx`
  Expected: PASS.

---

### Task 4: Library Screen Alignment with BitChord (`8.48.12 PM (2).jpeg`)

**Files:**
- Create: `src/library/components/ListeningExperienceCarousel.tsx`
- Create: `src/library/components/OnDeviceHubSection.tsx`
- Modify: `src/library/screens/LibraryScreenContent.tsx`
- Test: `src/library/__tests__/LibraryBitChordAlignment.worstcases.test.tsx`

**Interfaces:**
- Consumes: `useListeningRecorder` / `useListeningStats`, `useDownloadStore`
- Produces: BitChord-aligned Library screen layout

- [x] **Step 1: Write failing test for Library BitChord alignment**
  Assert rendering of Listening Experience cards (minutes listened, top song) and On Device hub cards (Downloads, Local Music, WebDAV).

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test -- LibraryBitChordAlignment.worstcases.test.tsx`
  Expected: FAIL.

- [x] **Step 3: Create `ListeningExperienceCarousel.tsx` (< 130 lines)**
  Build green gradient stats cards matching `8.48.12 PM (2).jpeg`:
  - 80 MINUTES LISTENED / Plays count / Year / Member since.

- [x] **Step 4: Create `OnDeviceHubSection.tsx` (< 140 lines)**
  Build the 3 colorful gradient cards:
  - Downloads (blue/purple gradient -> `/downloads`)
  - Local Music (teal/cyan gradient)
  - WebDAV (indigo/purple gradient)

- [x] **Step 5: Assemble in `LibraryScreenContent.tsx` (< 180 lines)**
  Integrate the new sections with FlashList v2 while keeping the file strictly under 200 lines.

- [x] **Step 6: Run test to verify it passes**
  Run: `npm test -- LibraryBitChordAlignment.worstcases.test.tsx`
  Expected: PASS.

---

### Task 5: Listen Together Sync Client & Modal (`8.48.09 PM (1).jpeg`)

**Files:**
- Create: `src/domain/party/ListenTogetherClient.ts`
- Create: `src/party/components/ListenTogetherModal.tsx`
- Test: `src/domain/party/__tests__/ListenTogetherClient.worstcases.test.ts`

**Interfaces:**
- Consumes: WebSocket, NTP clock drift math (`07_LISTEN_TOGETHER_SYNC_PROTOCOL.md`)
- Produces: `ListenTogetherClient`, `ListenTogetherModal` (< 180 lines)

- [ ] **Step 1: Write failing test for `ListenTogetherClient`**
  Test connection, room code handshake, NTP offset calculation from ping/pong, and state broadcast handling.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- ListenTogetherClient.worstcases.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `ListenTogetherClient.ts` (< 180 lines)**
  Clean-room implementation of the NTP clock calibration and room state protocol.

- [ ] **Step 4: Create `ListenTogetherModal.tsx` (< 160 lines)**
  Build modal to create party (generate room code) or join with code, wired to party button in player dock.

- [ ] **Step 5: Run test to verify it passes**
  Run: `npm test -- ListenTogetherClient.worstcases.test.ts`
  Expected: PASS.

---

### Task 6: End-to-End Verification Gate

**Files:** All modified and created files.

- [ ] **Step 1: Full TypeScript Compilation**
  Run: `npm run typecheck`
  Expected: 0 errors (`tsc --noEmit`).

- [ ] **Step 2: Full Test Suite Execution**
  Run: `npm test -- --silent`
  Expected: 100% green pass rate across all test suites.

- [ ] **Step 3: Component Line Count Audit**
  Audit all modified and created files to ensure strict `< 200` lines compliance.
