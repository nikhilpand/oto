# Prompt Slice P3: Audio Engine Interface & Fake Engine

## Required Skills to Activate
- `react-native-architecture`: Clean audio abstraction contract (`AudioEngine` interface), platform independence.
- `reverse-engineer`: Clean-room adaptation of BitChord `03_PLAYBACK.md` & `04_CROSSFADE.md` algorithms.
- `performance-engineer`: 120Hz UI-thread playhead interpolation via worklets; zero React re-renders during playback.
- `react-state-management`: Zustand store for discrete playback states only (status, track, mode; never ticks).
- `test-driven-development`: Unit testing interpolation math, timer latency simulation, and seek behavior.

```text
Read AGENTS.md, docs/SPEC.md, and docs/DESIGN.md. Then execute the task below. Post a plan before editing.

Task:
1. Define the platform-agnostic `AudioEngine` TypeScript interface in `src/audio/AudioEngine.ts` (adapted from BITCHORD_RE/03_PLAYBACK.md):
   ```typescript
   export type PlaybackStatus = 'idle' | 'loading' | 'buffering' | 'ready' | 'playing' | 'paused' | 'error';
   export type RepeatMode = 'off' | 'all' | 'one';

   export interface AudioEngine {
     load(track: Track, autoplay: boolean): Promise<void>;
     play(): Promise<void>;
     pause(): Promise<void>;
     seekTo(positionMs: number): Promise<void>;
     skipToNext(): Promise<void>;
     skipToPrevious(): Promise<void>;
     setPlaybackRate(rate: number): Promise<void>;
     setRepeatMode(mode: RepeatMode): Promise<void>;
     setShuffle(enabled: boolean): Promise<void>;
     setCrossfadeDuration(ms: number): Promise<void>;
     
     // Discrete event subscriptions
     onStatusChange(callback: (status: PlaybackStatus) => void): () => void;
     onTrackChange(callback: (track: Track | null) => void): () => void;
     onPositionTick(callback: (positionMs: number, timestampMs: number, rate: number) => void): () => void;
     onError(callback: (error: Error) => void): () => void;
   }
   ```
2. Implement `FakeAudioEngine` in `src/audio/FakeAudioEngine.ts`:
   - Simulates realistic audio playback using a 250ms periodic timer.
   - Emits position ticks at ~4 Hz `(lastPositionMs, lastTimestampMs, playbackRate)` mimicking native ExoPlayer/AVAudioEngine emission.
   - Simulates buffer latency and track completion.
3. Implement `usePlaybackStore` (Zustand in `src/store/usePlaybackStore.ts`):
   - Stores discrete state only: `currentTrack`, `status`, `isPlaying`, `repeatMode`, `isShuffled`, `queueIds`.
   - Never stores continuous playhead ticks.
4. Implement UI-Thread Playhead Interpolation (`usePlayheadProgress.ts`):
   - Maintains a Reanimated `SharedValue<number>` on the UI thread.
   - Employs a Reanimated frame worklet:
     `position = lastPositionMs + (currentTimeMs - lastTimestampMs) * playbackRate`
   - Drives UI components (scrubber, lyrics) at a fluid 120Hz without React re-renders.

Constraints:
- UI code must NEVER import an audio library directly; strictly use `useAudioEngine()`.
- Playhead position must NEVER enter React state.

Acceptance Criteria:
- Unit tests verify accurate interpolation during playback, pause, and seek.
- React Profiler confirms zero component re-renders during 10 seconds of active playback ticking.
```
