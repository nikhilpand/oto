# Crossfade & Transition Evidence Log — BitChord Reverse-Engineering

This document records verified facts, state machine transitions, volume formulas, and error recovery mechanisms from `CrossfadeController.kt`.

---

## Evidence 1: Standby Player Role Assignment
- **Claim:** The standby player loads the *incoming* track, NOT the outgoing track. This structurally prevents the 9ms–41ms audio seam duplicate glitch that occurs when a single player seeks across tracks.
- **Evidence:**
  - `CrossfadeController.kt` lines 50–75 (KDoc):
    > "An earlier version of this class put the outgoing track on the second player: the session player jumped ahead to the next song and the second player carried the old song's tail. That works, but it forces a moment where both players render the same audio, and two ExoPlayers cannot be started sample-accurately against each other... Loading the incoming track on the standby removes it outright."
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/CrossfadeController.kt`
- **Class:** `CrossfadeController`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** React Native crossfade implementations must initialize Player B with Track $N+1$ rather than trying to detach and fade Track $N$.

---

## Evidence 2: Finite State Machine Phases
- **Claim:** `CrossfadeController` operates as a strict finite state machine with 5 discrete phases: `IDLE`, `ARMING`, `FADING`, `SLEEP_FADE`, and `BAILING`.
- **Evidence:**
  - `CrossfadeController.kt` lines 340–355 defines:
    ```kotlin
    private enum class Phase {
        IDLE,
        ARMING,
        FADING,
        SLEEP_FADE,
        BAILING,
    }
    ```
  - State Transitions:
    - `IDLE` -> `ARMING`: Playhead enters arming window ($T_{remain} \le T_{fade} + T_{lead}$).
    - `ARMING` -> `FADING`: Standby player reaches `STATE_READY` and playhead crosses trigger timestamp. Calls `onHandoff()`.
    - `FADING` -> `IDLE`: Crossfade timer elapses ($t \ge T_{fade}$). Calls `finish()` and `retire(outgoing)`.
    - Any phase -> `BAILING`: User skips track, seeks position, or decoder encounters `PlaybackException`. Calls `bail()`.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/CrossfadeController.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** The state machine can be represented in pure TypeScript / native C++ state machines with identical phase guarantees.

---

## Evidence 3: Equal-Power Trigonometric Curves
- **Claim:** Volume fading uses equal-power trigonometric curves ($\sin / \cos$) satisfying $\sin^2(\theta) + \cos^2(\theta) = 1$ to preserve constant acoustic power without a center volume dip.
- **Evidence:**
  - `CrossfadeController.kt` lines 1537–1541:
    ```kotlin
    private fun riseGain(progress: Float): Float =
        sin(progress.toDouble() * (PI / 2.0)).toFloat()

    private fun fallGain(progress: Float): Float =
        cos(progress.toDouble() * (PI / 2.0)).toFloat()
    ```
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/CrossfadeController.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Must use $\sin(\frac{\pi}{2} \cdot p)$ and $\cos(\frac{\pi}{2} \cdot p)$ curves rather than linear volume interpolation ($1 - p$ and $p$), which causes a perceptible 3dB acoustic power drop at the midpoint.

---

## Evidence 4: Immediate Handoff at Start of Fade ($t=0$)
- **Claim:** `onHandoff` is invoked at the very first moment of the fade ($t=0$) rather than at the end of the blend.
- **Evidence:**
  - `CrossfadeController.kt` lines 80–91 (KDoc) & 982–1010 (`startFade`):
    ```kotlin
    private fun startFade() {
        // ...
        onHandoff(outPlayer, inPlayer)
        phase = Phase.FADING
    }
    ```
    UI, MediaSession, notifications, and metadata immediately reflect the new track, while the outgoing track fades out silently on the spare player in the background.
- **File:** `BitChord/app/src/main/java/com/music/bitchord/playback/CrossfadeController.kt`
- **Confidence:** `VERIFIED FROM SOURCE`
- **Implication for React Native:** Lock screen / Control Center controls and now-playing metadata on iOS (`MPNowPlayingInfoCenter`) and Android (`MediaSession`) immediately show the incoming track at the start of crossfade.
