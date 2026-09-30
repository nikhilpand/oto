# Rule: BitChord Audio Engine Integration

When working on audio playback, crossfade, queue management, caching, stream resolution, lyrics parsing, or persistence in OTO, you must follow the architectural solutions verified in `BITCHORD_RE/` and `docs/reverse_engineering/`.

## 1. Dual-Player Peer Crossfade (`BITCHORD_RE/04_CROSSFADE.md`)
- **Problem solved:** Eliminates the 9ms–41ms audio duplicate seam bug and buffer underrun common in single-player crossfade architectures.
- **Rule:** Maintain two symmetric player peers (`PlayerNodeA` and `PlayerNodeB`).
- **Arming window:** Arm the standby player when remaining time $\le \text{crossfadeDuration} + 3000\text{ms}$. Pre-roll the incoming track silently.
- **Handoff ($t=0$):** At transition start, swap active session player role to the incoming player.
- **Attenuation curve:** Use equal-power trigonometric attenuation:
  $$V_{\text{out}}(t) = \cos\left(\frac{\pi}{2} \cdot \frac{t}{T}\right), \quad V_{\text{in}}(t) = \sin\left(\frac{\pi}{2} \cdot \frac{t}{T}\right) \implies V_{\text{out}}^2 + V_{\text{in}}^2 = 1.0$$
- **Audio focus:** Keep audio focus strictly with the active session player; do not grant focus to the standby player during fades.

## 2. 2MB Range Chunking Cache (`BITCHORD_RE/06_CACHE.md`)
- **Problem solved:** Bypasses YouTube/InnerTube CDN bitrate pacing that artificially slows playback downloads.
- **Rule:** Issue HTTP requests in discrete 2MB `Range` slices (`bytes=0-2097151`, `bytes=2097152-4194303`).
- **Canonical Keying:** Key cache files on static URNs (`oto://track/{id}`) instead of CDN URLs with expiring query parameters (`expire=...`).
- **Eviction:** Use dynamic LRU eviction monitoring total device free space (`DynamicLruCacheEvictor.kt`).

## 3. 3-Phase Fuzzy TrackMatcher (`BITCHORD_RE/05_STREAM_RESOLUTION.md`)
- **Problem solved:** Eliminates wrong-version mismatches (e.g. matching a studio cut to a 10-minute live concert recording).
- **Rule:**
  1. Tokenize and normalize title (strip context brackets, accents, punctuation).
  2. Enforce strict version marker symmetry (`remix`, `live`, `acoustic`, `clean`, `instrumental`). If candidate has a version marker absent in target, reject with score 0.
  3. Strict duration gate: reject candidates if $|T_{\text{target}} - T_{\text{candidate}}| > 3000\text{ms}$.

## 4. Zero-Database High-Speed Storage (`BITCHORD_RE/13_DATABASE_STATE.md`)
- **Problem solved:** Avoids SQLite/Room schema migration lockups, database version crashes, and heavy JNI serialization.
- **Rule:**
  - Store volatile player state, queue, tokens, and settings in **MMKV** ($<0.1$ms access).
  - Store listening history and analytics in monthly-partitioned JSON files: `${FS.DocumentDir}/stats/stats_YYYY_MM.json`.
  - Reserve SQLite strictly for offline downloaded file manifests.

## 5. TTML Syllable-to-Word Merging (`BITCHORD_RE/09_LYRICS.md`)
- **Rule:** Parse Apple/Spotify TTML XML by merging individual syllable spans into complete, fluid words while preserving inter-word whitespace and duet agent indicators (`v1` vs `v2`).
- **Rendering:** Render in React Native Skia with masked gradient sweeps driven by the 120Hz UI-thread playhead clock.

## 6. Precision Audio Output & USB DAC Probing (`docs/reverse_engineering/03_PRECISION_AUDIO_ENGINE_AND_DSP.md`)
- **Bit-Perfect Audio:** Pipe 32-bit Float PCM directly to native HAL (AAudio on Android, CoreAudio on iOS).
- **Sample Rate Matching:** When an external USB DAC or audiophile interface is connected, dynamically match DAC hardware sample rates (44.1kHz, 48kHz, 96kHz, 192kHz) to eliminate Android OS resampling distortion.
- **16KB ELF Page Alignment:** Native C++ shared libraries (`.so`) must be built with `-Wl,-z,max-page-size=16384` for Android 15/16 16KB page size compliance.

## 7. Listen Together Clock Drift Sync (`docs/reverse_engineering/07_LISTEN_TOGETHER_SYNC_PROTOCOL.md`)
- **NTP RTT Synchronization:** Calculate client-to-server time offset:
  $$t_{\text{offset}} = \frac{(t_{\text{recv}} - t_{\text{orig}}) + (t_{\text{transmit}} - t_{\text{resp}})}{2}$$
- **Micro-Sync Adjustment:** When delta $> 25\text{ms}$ but $< 500\text{ms}$, do **NOT** jump or stutter the audio track. Dynamically adjust playback rate by $\pm 0.5\%$ until phase alignment is achieved.

## 8. Automix DJ Engine (`BITCHORD_RE/07_AUTOMIX.md` & `docs/reverse_engineering/04_AUTOMIX_NEURAL_MODELS_AND_NATIVE_DSP.md`)
- **Head/Tail 45s Analysis:** Only decode the first 45s and last 45s of audio to determine intro/outro cue points and BPM, preventing thermal throttling.
- **Camelot Harmonic Compatibility:** Grade transitions via Camelot wheel arithmetic ($\Delta \text{number} \le 1$ or relative major/minor letter swap).
- **DJ Blend Bass Frequency Swap:** When executing a DJ blend, crossfade the low-end frequencies ($<250\text{Hz}$) at 70% transition progress using Biquad filters to avoid low-end acoustic mud.
