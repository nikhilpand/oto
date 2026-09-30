# Prompt Slice P9: Search & Library

## Required Skills to Activate
- `react-native-architecture`: Debounced search pipeline (150-250ms) with in-flight abort cancellation, FlashList recycling.
- `react-state-management`: MMKV recent search queries with instant CRUD, offline library state cache.
- `ui-ux-designer`: Grouped results hierarchy ("Top Result" card), download status badges using icon + text (never color alone).
- `performance-engineer`: Sub-16ms keystroke responsiveness; zero frame stutters while filtering 500+ items.
- `test-driven-development`: Unit tests for search debouncing, tokenization, and offline filter switches.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build the Search and Library screens with high responsiveness:
1. Search Screen:
   - Instant search input with 150-250ms debounce and in-flight cancellation.
   - Recent queries stored in MMKV with one-tap removal.
   - Grouped search results: "Top Result" card first, followed by categorized lists (Songs, Artists, Albums, Playlists).
   - Rich empty and no-results states offering genre recommendations rather than dead ends.
2. Library Screen:
   - Segmented filter chips: Playlists, Albums, Artists, Downloads.
   - Pinned "Liked Songs" hero card with glowing gradient accent.
   - Sort & View toggle (Compact List vs 2-Column Grid).
   - Download status badges (Downloaded, Downloading with percentage, Queued, Failed) using icon + text (never color alone).
   - Seamless offline filtering when internet connectivity is lost.

Constraints:
- Search recents stored in MMKV for instant retrieval.
- FlashList v2 utilized for all search and library lists.

Acceptance Criteria:
- Typing into search feels instantaneous with zero frame stutters.
- Library filter toggles work completely offline.
```
