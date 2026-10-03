# BitChord Engineering Process: Reference, Advance, & Hard-Test Loop

## 1. Zero Hardcoding Policy
- No hardcoded mock catalogs, fake item slices, or simulated API returns in production routes (`app/`, `src/home/`, `src/search/`, `src/detail/`, `src/library/`).
- If an API or session is unavailable, use designed graceful degradation states (offline cached items, designed error banners, skeleton loaders), NEVER fake data arrays.

## 2. Six-Step Engineering Process
1. **Reference Inspection:** For any component, queue behavior, or network endpoint, inspect the reference Kotlin/C++ code in `BitChord/` and reverse-engineering dossiers in `BITCHORD_RE/`.
2. **Clean-Room TypeScript Architecture:** Adapt the algorithm cleanly into strict TypeScript and React Native (Expo) domain abstractions. Do not copy raw tokens.
3. **Behavioral Invariant Verification:** Cross-check data flows, protobuf parameters, headers, deduplication rules, and error conditions against BitChord.
4. **Advance Beyond Reference:** Elevate the experience with 120Hz Reanimated UI thread worklets, Skia runtime shader atmosphere, glass tokens, OKLCH contrast clamp, and accessibility traits.
5. **Hard Worst-Case Testing:** Write adversarial unit and integration tests covering empty payloads, malformed JSON, HTTP timeouts, rapid concurrent user gestures, and boundary limits.
6. **Iterative Convergence Loop:** Run `npm test` and `tsc --noEmit` iteratively until 100% of suites pass with 0 errors and 0 regressions.
