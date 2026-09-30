# Prompt Slice P10: Album, Artist & Playlist Details

## Required Skills to Activate
- `react-native-architecture`: Parallax collapsing header driven purely on the UI thread via `useAnimatedScrollHandler`.
- `mobile-developer`: Card -> header shared rect measured transition, context action bottom sheet.
- `ui-ux-designer`: Sticky transport snap, borderless track rows separated by luminance steps, artist discography tabs.
- `performance-engineer`: Frame rate verification during rapid header collapse and scroll flings.
- `a11y-debugging`: Accessible context sheet actions (Play Next, Add to Queue, Download, Share).

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build the detail screens (Album, Artist, Playlist) with parallax collapsing headers:
1. Header Visuals:
   - Parallax collapsing header driven by Reanimated scroll offset.
   - Background tinted with the artwork palette, fading into `color.bg.base` upon scrolling down.
   - Sticky play and shuffle buttons that snap to the top bar when the header collapses.
2. Track List Rows (`OTOSongRow`):
   - Number or thumbnail, track title, artist name, explicit badge, download indicator, and context trigger `...`.
   - Borderless rows separated by luminance steps and spacing.
3. Card -> Header Shared Rect Transition:
   - Tapping an album card on Home/Library expands its artwork into the detail header using the same measured rect technique as the player shell.
4. Artist Specifics:
   - Popular songs, discography tabs (Albums, EPs, Singles), and related artists carousel.
5. Context Action Sheet:
   - Built with `@gorhom/bottom-sheet` or native menu: Play Next, Add to Queue, Add to Playlist, Like, Download, Share.

Constraints:
- Scroll physics driven purely on the UI thread via `useAnimatedScrollHandler`.
- Shared rect transition must be interruptible.

Acceptance Criteria:
- Header collapses smoothly without frame stutter on 60Hz and 120Hz displays.
- Context sheet dismisses cleanly and handles actions instantly.
```
