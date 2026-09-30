# Automix & Transition Planning Evidence Log — BitChord Reverse-Engineering

This document records verified facts about Automix planning, cue point selection, Camelot harmonic matching, and transition styling from `TransitionPlanner.kt`.

---

## Evidence 1: Transition Styles & Energy Classification
- **Claim:** Automix chooses among 4 distinct transition styles: `GAPLESS` (album tracks), `EQUAL_POWER` (unaligned fallback), `DJ_BLEND` (beat-aligned with bass swap), and `DJ_FILTER` (frequency sweep for disparate BPMs).
- **Evidence:**
  - `TransitionPlanner.kt` lines 98–110 defines `enum class TransitionStyle`.
  - Album tracks in sequential order use `GAPLESS` (near-instantaneous splice).
  - Tracks with compatible BPMs ($\le 6\%$ delta or octave multiples) use `DJ_BLEND`.
  - Tracks with incompatible tempi use `DJ_FILTER`.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/smart/TransitionPlanner.kt`
- **Class:** `TransitionPlanner`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** The decision tree in `TransitionPlanner.kt` contains zero platform-specific dependencies. It is pure functional logic that can be ported 1:1 to TypeScript.

---

## Evidence 2: Bass Swap Handover (`bassSwapFraction`)
- **Claim:** During `DJ_BLEND` transitions, low-frequency bass energy is swapped between outgoing and incoming tracks at a discrete transition point (`bassSwapFraction = 0.7`) rather than fading simultaneously, preventing chaotic low-end phasing and distortion.
- **Evidence:**
  - `TransitionPlanner.kt` lines 139–143 & `CrossfadeController.kt` lines 1466–1510 (`rideBassSwap`):
    - Cuts low-pass filter on outgoing track when progress reaches 70%.
    - Opens high-pass filter on incoming track to allow full bass through.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/smart/TransitionPlanner.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Native audio DSP filters (biquad LPF/HPF) must receive cutoff commands during transition progress.

---

## Evidence 3: Vocal Overlap Collision Avoidance
- **Claim:** The planner uses vocal activity curves from `VocalTracker` to compute `vocalOverlap`. If an overlap would cause two vocal lines to clash, it dynamically shifts the cue point or adds resonant filtering to suppress overlapping frequencies.
- **Evidence:**
  - `TransitionPlanner.kt` lines 144–159 (KDoc):
    > "How strongly the two tracks are expected to be singing over each other through this overlap, 0..1... two tempo-matched vocals sitting on the same grid is the case a blend handles worst, precisely because nothing about the arrangement is going to separate them."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/smart/TransitionPlanner.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Vocal masking ensures transitions sound polished and musical, elevating the app above standard crossfade players.
