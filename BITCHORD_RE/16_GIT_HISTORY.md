# 16 — Git History & Architectural Evolution

## Executive Summary: The "Why" Behind BitChord's Architecture

Architectures do not appear fully formed; they evolve through painful failures, production bugs, and performance bottlenecks. By analyzing BitChord's Git history and architectural commits, we uncover the hard-won engineering lessons behind every major system.

---

## 1. Major Architectural Migrations Matrix

| Subsystem | Commit / Date | Before | Problem Encountered | Current Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **YouTube Extraction** | `cfe10c6` (Sep 2026) | Custom player-client walk in `StreamResolver.kt` | Cold age-restricted tracks took 15–20s; YouTube 403 BotGuard blocks on mobile IPs. | Replaced with `InnerTubeXResolver`, pre-warmed cipher cache, and BotGuard PoToken WebView. Cold latency dropped to ~3.4s. |
| **Queue Management** | `ac2fc23` (Sep 2026) | Flat `List<Song>` queue in `PlaybackService` | Tapping an album wiped user's manual queue; repeat-all looped queued singles indefinitely. | Implemented `QueueCoordinator.kt` with two tiers (`USER_QUEUE` vs `CONTEXT`), immutable `queueEntryId`, and automatic user-queue pruning. |
| **Queue UI Performance** | `d18a206` (Sep 2026) | Main-thread Binder IPC queries to `MediaController` on every row draw | Severe 15fps stutter when expanding the queue drawer. | Decoupled queue state into in-memory `PlayerState` snapshot; eliminated redundant IPC loops. |
| **Crossfade Engine** | `CrossfadeController.kt` rewrite | Tail player on outgoing track | 9ms–41ms structural duplicate audio seam stutter at the boundary. | Twin symmetric peer players; standby loads *incoming* track; instant handoff at $t=0$ with $\sin^2+\cos^2=1$ curves. |
| **Listening History** | `ListeningStats.kt` rewrite | Event log of every single track played | Database grew to tens of thousands of rows; vacuuming and aggregation stalled app launch. | Aggregated-on-write calendar month JSON files (`yyyy-MM.json`). No database queries; instant replay loading. |
| **Audio Caching** | `AudioCache.kt` chunking update | Single open-ended HTTP streaming connection | YouTube throttled long connections to 1.25x real-time speed; forward seeking stalled. | Switched to bounded 2MB HTTP `Range` chunking (`CHUNK_BYTES = 2MB`), downloading at line-rate in ~300ms. |

---

## 2. In-Depth Case Studies

### Case Study A: The Audio Seam Bug in Crossfade
- **The Initial Attempt:** When crossfade was triggered, Player 1 (active) jumped forward to Track $N+1$, while Player 2 was spawned to play out the final 6 seconds of Track $N$.
- **The Failure:** Android's `AudioFlinger` and Media3 could not start the two players with sample-accurate clock synchronization. Real transitions measured a **9ms to 41ms alignment drift**. Listeners heard the last fraction of a second of Track $N$ play twice, ruining the transition.
- **The Solution:** Load Track $N+1$ on Player 2 *in advance*. When crossfade begins, Player 1 is already playing Track $N$, and Player 2 simply begins fading in Track $N+1$ from silent volume. Neither player ever renders the same audio.

### Case Study B: The Two-Tier Queue Invariant
- **The Problem:** In standard music apps, if you add 3 songs to "Play Next" and then click an album, the app either wipes your 3 songs or appends the entire album after the 3 songs. Worse, enabling "Repeat All" causes your 3 manual songs to repeat forever along with the album.
- **The Solution (`QueueCoordinator.kt`):**
  1. Queued tracks are tagged `QueueTier.USER_QUEUE`; album tracks are tagged `QueueTier.CONTEXT`.
  2. Starting an album inserts the preserved `USER_QUEUE` immediately after the clicked song.
  3. Once playback finishes the user queue and enters the following context songs, `consumePlayedUserQueue()` removes the played user songs from the timeline, restoring clean album repetition under `REPEAT_MODE_ALL`.

---

## 3. Direct Advice for React Native Development

1. **Adopt QueueCoordinator Invariants Immediately:** Port the `QueueCoordinator` logic to TypeScript on Day 1. It solves user-queue preservation permanently.
2. **Never Implement Single-Player Crossfade:** Do not attempt software volume dips on a single native player node. Build the dual-player engine from the start.
3. **Do Not Store Raw Play Events:** Model listening history as pre-aggregated monthly buckets.
