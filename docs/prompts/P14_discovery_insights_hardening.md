# Prompt Slice P14: Discovery, Settings & Hardening Pass

## Required Skills to Activate
- `e2e-testing-patterns`: Maestro automated E2E test suite (Play -> Expand -> Scrub -> Lyrics -> Queue -> Offline).
- `accessibility-compliance-accessibility-audit`: Comprehensive WCAG 2.2 audit, screen reader semantics, and color contrast clamp check.
- `screen-reader-testing`: TalkBack / VoiceOver full navigation traversal, verifying accessible alternatives for all gestures.
- `performance-engineer`: Profiling Hermes memory heap, UI-thread frame times, zero unhandled errors or redboxes.
- `code-reviewer`: Strict enforcement of docs/DESIGN.md anti-AI-slop checklist and dead code elimination.
- `verification-before-completion`: Final production gate sign-off verifying all P0-P14 requirements.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
Build the final secondary screens and execute a comprehensive production hardening pass:
1. Discovery Surfaces:
   - "Quick Mix", "Because You Listened To...", "Hidden Gems" sections, each with a 1-line contextual explanation of why it was recommended.
2. Profile & Insights:
   - Listening minutes, top genres, monthly listening trend charts (Skia or lightweight SVG, avoiding generic dashboard tables).
   - Full accessible text alternatives for every chart.
3. Settings Screen:
   - Playback: Crossfade duration, audio quality per network.
   - Appearance: Quality Tier override (Auto/3/2/1/0), Reduce Motion, Reduce Blur, Dynamic Colors, Visualizer toggle.
   - Storage & Cache: Clear audio cache, view storage usage.
   - About & Licenses.
4. Hardening & Verification Pass:
   - Complete Accessibility Audit: Walk all screens with screen reader semantics, verify accessible actions on all gestures, and test 200% font scaling.
   - Performance Profiling: Profile UI-thread frame times on benchmark Android device during continuous playback, lyrics scrolling, and player expansion.
   - Maestro E2E Test Suite: Script end-to-end user flows (Play track -> Expand player -> Scrub position -> Toggle lyrics -> Reorder queue -> Offline mode).

Constraints:
- Zero unhandled exceptions or redbox warnings across all flows.
- 100% compliance with docs/DESIGN.md anti-AI-slop checklist.

Acceptance Criteria:
- All Maestro E2E test runs pass.
- Accessibility audit reports zero contrast violations or missing gesture alternatives.
```
