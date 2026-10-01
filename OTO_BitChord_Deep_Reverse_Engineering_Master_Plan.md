# OTO — BitChord Reverse-Engineering & Implementation Master Plan
## Evidence-driven repository investigation using `repo-inspect` + `git-review-skill`

**Target reference:** `kushagrasinghx/BitChord`  
**Target product:** OTO — React Native music application  
**Purpose:** Understand BitChord deeply enough to independently reproduce its important engineering behavior, architecture, playback reliability, data flows, and performance characteristics without blindly copying its source.

---

## 0. Executive Summary

This document replaces a simple "read the BitChord repo" approach with a **staged, evidence-driven reverse-engineering workflow**.

Two skills are especially useful:

### `repo-inspect`

`repo-inspect` is designed specifically for surgical open-source reverse engineering. Instead of dumping an entire repository into an AI context, it supports:

- `overview`
- `find-how`
- `trace`
- `entries`
- `patterns`
- `data`
- `hotspots`

It can work against a local repository or a remote GitHub repository and writes compact inspection results under `.inspect/`. Its design explicitly favors targeted questions over loading the whole repository. [Source: `gjczone/repo-inspect`]

### `git-review-skill`

`git-review-skill` is useful for the **history side** of the investigation. Its workflow locks the exact base/head revisions, builds a change map, inspects surrounding callers/types/configuration/tests/history, and requires evidence before reporting a defect or material risk. [Source: `salarkb/git-review-skill`]

### Combined strategy

Use them for different jobs:

```text
                 BitChord
                    |
          +---------+---------+
          |                   |
          v                   v
    repo-inspect        git-review-skill
          |                   |
    WHAT exists          WHY it changed
    WHERE it lives       WHEN it changed
    HOW it connects      WHAT problem it fixed
          |                   |
          +---------+---------+
                    |
                    v
              OTO Design
                    |
                    v
          Independent implementation
```

Do **not** ask an agent:

> "Read the entire BitChord repo and copy the architecture."

Instead ask:

> "Trace exactly how BitChord resolves a playable stream, including callers, fallback paths, validation, caching, and the commits that introduced each layer."

That produces dramatically better engineering information.

---

# 1. Important licensing boundary

BitChord is GPLv3.

This plan is intended to extract:

- architecture
- behavior
- algorithms
- design patterns
- failure modes
- engineering lessons
- interface concepts
- subsystem boundaries

It is **not** a recommendation to copy BitChord source into a proprietary OTO application.

Use:

```text
study
  ↓
understand
  ↓
document
  ↓
independently design
  ↓
independently implement
```

If OTO ever incorporates BitChord source directly, perform a licensing review first.

---

# 2. Investigation philosophy

Every BitChord finding should be classified as one of:

### A. Verified behavior

We found the implementation and can point to:

- file
- symbol
- call path
- configuration
- test
- commit

### B. Historical reason

We found a commit that explains:

- what changed
- why it changed
- what failure motivated it

### C. Current architecture

The behavior exists in the current head.

### D. Historical/deprecated architecture

The behavior existed previously but has since been replaced.

### E. OTO recommendation

Our independent design decision based on the evidence.

Never mix these categories.

Example:

```text
FACT:
BitChord has a two-player crossfade mechanism.

HISTORY:
A previous implementation produced audible holes.

OTO DECISION:
Implement a native dual-player abstraction.

NOT FACT:
"OTO must use exactly BitChord's implementation."
```

---

# 3. The staged investigation workflow

## Stage 0 — Repository identity

Before inspecting anything:

Record:

```text
repository:
kushagrasinghx/BitChord

default branch:
main

current HEAD:
<full SHA>

license:
GPLv3

inspection date:
<date>
```

Never silently review a moving branch as though it were immutable.

For historical questions, record exact commit SHAs.

---

# 4. Stage 1 — Repository spine

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord overview --output md
```

Capture:

```text
languages
dependencies
major directories
entry points
high-centrality files
architecture
module boundaries
```

Then:

```bash
repo-inspect --repo kushagrasinghx/BitChord entries --output md
repo-inspect --repo kushagrasinghx/BitChord patterns --output md
repo-inspect --repo kushagrasinghx/BitChord data --output md
repo-inspect --repo kushagrasinghx/BitChord hotspots --output md
```

Expected outputs:

```text
.inspect/
├── overview.md
├── entries.md
├── patterns.md
├── data.md
└── hotspots.md
```

### Why this matters

Do this before reading individual files.

It prevents the agent from assuming that:

```text
PlaybackService = entire playback system
```

when the actual architecture may be:

```text
UI
 ↓
state
 ↓
service
 ↓
resolver
 ↓
source
 ↓
native player
 ↓
cache
```

---

# 5. Stage 2 — Build the subsystem map

Create this inventory:

```text
[ ] App startup
[ ] Navigation
[ ] Authentication
[ ] YouTube Music metadata
[ ] Search
[ ] Track matching
[ ] Stream resolution
[ ] Stream validation
[ ] Playback
[ ] Crossfade
[ ] Queue
[ ] AutoPlay
[ ] Shuffle
[ ] Cache
[ ] Artwork
[ ] Lyrics
[ ] Downloads
[ ] Local library
[ ] Recommendations
[ ] Audio analysis
[ ] Automix
[ ] Scrobbling
[ ] Equalizer
[ ] Android Auto
[ ] Listen Together
[ ] Backend
[ ] Deployment
[ ] CI
```

Every subsystem gets:

```text
current implementation
important symbols
entry points
dependencies
data structures
failure modes
tests
historical commits
OTO decision
```

---

# 6. Stage 3 — Surgical `repo-inspect` queries

Do NOT run one giant query.

Use a set of focused investigations.

---

## 6.1 Playback

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "playback service player queue transition crossfade" \
  --depth 3 --output md
```

Then trace the important symbols discovered.

Example:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  trace PlaybackService --output md
```

Then:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "ghost player secondary player crossfade equal power" \
  --depth 3 --output md
```

Record:

```text
main player
secondary player
audio session
media session
transition controller
state machine
fade calculation
seek synchronization
error recovery
```

---

# 7. Stage 4 — Stream resolution

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "stream resolver stream URL player response 403 bot check validation" \
  --depth 3 --output md
```

Then:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "range request byte range bounded request" \
  --depth 3 --output md
```

Then:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "quality selection network Wi-Fi mobile stream choice" \
  --depth 3 --output md
```

Document:

```text
resolution order
candidate sources
client selection
validation
403 handling
bot-check handling
retry policy
quality selection
range requests
cache
URL expiry
```

---

# 8. Stage 5 — Track matching

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "TrackMatcher title artist album duration recording matching" \
  --depth 3 --output md
```

Determine:

```text
identity fields
normalization
duration tolerance
version/remix handling
artist matching
album matching
confidence
fallback
```

OTO should eventually have:

```ts
type MatchResult = {
  candidateId: string;
  score: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
};
```

---

# 9. Stage 6 — Source/module architecture

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "MusicSource ModuleSource SourceRegistry SourceResolver source health" \
  --depth 3 --output md
```

Then:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  patterns --output md
```

Document:

```text
source interface
source registry
module loading
source health
source fallback
source-specific metadata
source-specific streams
source capabilities
```

OTO target:

```text
MusicSource
 ├── YouTubeMusicSource
 ├── LosslessSource
 ├── LocalSource
 └── FutureSource
```

---

# 10. Stage 7 — Lyrics

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "lyrics LyricsRepository LRC TTML synced lyrics word timing" \
  --depth 3 --output md
```

Record:

```text
providers
matching
formats
timing parser
translation
romanization
fallback
cache
UI synchronization
```

OTO model:

```ts
type LyricLine = {
  startMs: number;
  endMs?: number;
  text: string;
  words?: {
    startMs: number;
    endMs: number;
    text: string;
  }[];
};
```

---

# 11. Stage 8 — Artwork and Canvas

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "artwork palette dynamic theme canvas visualizer image cache" \
  --depth 3 --output md
```

Determine:

```text
image fetch
image caching
palette extraction
theme generation
canvas provider
video/image playback
preloading
rendering
memory control
```

OTO should separate:

```text
ArtworkRepository
PaletteExtractor
ThemeEngine
CanvasRepository
CanvasRenderer
```

---

# 12. Stage 9 — Automix and native analysis

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "TrackAnalyzer TransitionPlanner beat tracker vocal analyzer Automix" \
  --depth 3 --output md
```

Then:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "C++ JNI CMake ONNX analyzer audio analysis" \
  --depth 3 --output md
```

Record:

```text
analysis input
analysis output
model
BPM
beat positions
vocal activity
energy
storage
JNI boundary
threading
memory
transition planner
```

OTO should eventually use:

```text
React Native
    |
native bridge
    |
C++ analyzer
    |
ONNX / DSP
    |
AnalysisStore
```

Never perform heavy analysis in the JS render path.

---

# 13. Stage 10 — Queue/autoplay

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "queue shuffle autoplay play next repeat queue insertion" \
  --depth 3 --output md
```

Create a formal state model:

```text
UserQueue
AutoPlayQueue
PlaybackQueue
PlaybackCursor
ShuffleState
RepeatMode
```

The key OTO invariant:

> The list shown to the user and the sequence actually played must never silently diverge.

---

# 14. Stage 11 — Cache

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "SimpleCache LRU DynamicLruCacheEvictor back buffer cache eviction" \
  --depth 3 --output md
```

Separate:

```text
stream cache
metadata cache
artwork cache
lyrics cache
analysis cache
canvas cache
```

Do not copy cache constants without measurement.

---

# 15. Stage 12 — Downloads and local music

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "download offline local library media metadata cover art" \
  --depth 3 --output md
```

Document:

```text
download queue
storage path
resume
pause
cancel
metadata
artwork
offline lookup
local scanner
duplicate handling
```

---

# 16. Stage 13 — Recommendations

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "recommendation autoplay radio related tracks home discovery" \
  --depth 3 --output md
```

Separate:

```text
provider recommendations
local recommendation logic
autoplay generation
radio
history
taste signals
```

OTO should eventually own a recommendation layer rather than simply proxying provider recommendations.

---

# 17. Stage 14 — Authentication and account state

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "authentication login Google YouTube Music account session cookies OAuth" \
  --depth 3 --output md
```

Document:

```text
login flow
credential handling
session storage
account selection
channel selection
multi-account
logout
refresh
```

Never implement:

```text
OTO password form
    ↓
Google password
```

Use supported Google-hosted authentication/token flows.

---

# 18. Stage 15 — Listen Together

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "Listen Together party WebSocket room host member synchronization" \
  --depth 3 --output md
```

Document:

```text
room creation
host authority
participant state
queue sync
track sync
position sync
reconnect
presence
heartbeat
```

OTO model:

```text
Room
 ├── host
 ├── participants
 ├── queue
 ├── currentTrack
 ├── position
 └── playbackState
```

Never send audio through the synchronization server.

---

# 19. Stage 16 — Backend/deployment

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord \
  find-how "backend API deployment Oracle Caddy CI GitHub Actions WebSocket" \
  --depth 3 --output md
```

Record:

```text
API
WebSocket
deployment
reverse proxy
process management
health checks
CI
secrets
environment
```

OTO initial target:

```text
FastAPI
PostgreSQL
Redis
worker
WebSocket
Caddy
Docker Compose
GitHub Actions
```

Avoid premature microservices.

---

# 20. Git history investigation

This is where `git-review-skill` becomes valuable.

The skill's review contract emphasizes:

1. Lock exact target revisions.
2. Build a complete change map.
3. Inspect callers, types, configuration, tests, and history.
4. Challenge behavior across correctness, security, data integrity, compatibility, concurrency, performance, observability and tests.
5. Require a reachable trigger and concrete consequence before calling something a defect. [Source: `salarkb/git-review-skill`]

For reverse engineering, adapt that method from:

```text
"Is this commit correct?"
```

to:

```text
"What engineering problem did this commit solve?"
```

---

# 21. Commit investigation template

For every important BitChord commit:

```text
Commit:
SHA:

Date:

Message:

Parent:

Files changed:

Subsystem:

Problem before:

Behavior before:

Behavior after:

Why the old behavior failed:

New mechanism:

Important symbols:

Important constants:

Tests added:

Tests modified:

Related commits:

Current status:
[ ] still present
[ ] modified
[ ] replaced
[ ] removed

OTO implication:

Confidence:
HIGH / MEDIUM / LOW
```

---

# 22. Never trust commit messages alone

A commit message may say:

```text
Fix playback issue
```

That is not enough.

Inspect:

```text
commit diff
caller
callee
configuration
tests
previous implementation
following commits
issues/PR discussion when available
```

The question is:

> What exact failure path existed before and what exact invariant does the new code establish?

---

# 23. Historical clustering

Do not read 500 commits as 500 unrelated events.

Cluster them.

Recommended clusters:

```text
A. Foundation
B. Playback
C. Stream resolution
D. Source modules
E. Matching
F. Lyrics
G. Artwork
H. Queue
I. Downloads
J. Local library
K. Automix
L. Audio engine
M. Scrobbling
N. Multi-account
O. Android Auto
P. Listen Together
Q. Backend
R. Deployment
S. Performance
T. Bug fixes
```

Then construct:

```text
commit → subsystem → problem → solution → OTO lesson
```

---

# 24. High-value historical commits

Prioritize commits that contain words such as:

```text
fix
rewrite
refactor
rework
replace
fallback
recovery
crash
403
bot
stream
buffer
cache
crossfade
gapless
lyrics
queue
shuffle
autoplay
memory
performance
native
C++
JNI
ONNX
lossless
DAC
Bluetooth
Android Auto
WebSocket
Listen Together
```

These are more valuable than cosmetic commits.

---

# 25. Hotspot analysis

Run:

```bash
repo-inspect --repo kushagrasinghx/BitChord hotspots --output md
```

Then cross-reference hotspots with Git history.

A file that is:

```text
highly changed
+
highly central
+
many bug-fix commits
```

is an architectural hotspot.

These deserve the deepest investigation.

Typical examples to investigate:

```text
PlaybackService
CrossfadeController
stream resolver
source registry
queue manager
lyrics repository
analysis store
backend party server
```

Do not assume the names above are exact current paths until verified.

---

# 26. OTO evidence matrix

Maintain:

| BitChord subsystem | Current implementation | Historical reason | OTO design | Confidence |
|---|---|---|---|---|
| Playback | TBD | TBD | Native dual player | TBD |
| Streams | TBD | TBD | Resolver + validator | TBD |
| Matching | TBD | TBD | TrackMatcher | TBD |
| Sources | TBD | TBD | MusicSource | TBD |
| Lyrics | TBD | TBD | LyricsRepository | TBD |
| Artwork | TBD | TBD | ArtworkRepository | TBD |
| Queue | TBD | TBD | Queue projection | TBD |
| Cache | TBD | TBD | Separate caches | TBD |
| Automix | TBD | TBD | Native analyzer | TBD |
| Recommendations | TBD | TBD | OTO ranker | TBD |
| Downloads | TBD | TBD | DownloadManager | TBD |
| Local | TBD | TBD | LocalMusicRepository | TBD |
| Accounts | TBD | TBD | AccountManager | TBD |
| Listen Together | TBD | TBD | WebSocket room | TBD |

Never mark a row complete merely because the README mentions the feature.

---

# 27. OTO target architecture

```text
                         OTO
                          |
                 React Native UI
                          |
             View / State / Navigation
                          |
       +------------------+------------------+
       |                                     |
 Music Domain                          Playback Domain
       |                                     |
       |                              PlaybackController
       |                                     |
       |                              Native Playback
       |                               /            \
       |                           Android          iOS
       |                           Media3       AVFoundation
       |                               \            /
       |                                Crossfade
       |
 Repository Layer
       |
 +-----+----------+----------+
 |                |          |
YouTube        Lossless     Local
Music          Provider     Files
 |
SourceResolver
 |
TrackMatcher
 |
StreamResolver
 |
StreamValidator
 |
QualitySelector
 |
Cache
 |
Native Player


Parallel systems:

Artwork → Palette → Skia
Lyrics → Sync Engine
Track → Analyzer → Automix
Events → Taste Model → Recommendations
Client ↔ WebSocket ↔ Listen Together
```

---

# 28. OTO provider interface

```ts
interface MusicSource {
  id: string;
  name: string;

  capabilities: SourceCapabilities;

  search(query: string): Promise<Track[]>;
  getTrack(id: string): Promise<Track>;
  getAlbum(id: string): Promise<Album>;
  getArtist(id: string): Promise<Artist>;
  getPlaylist(id: string): Promise<Playlist>;

  resolveStream(track: Track): Promise<StreamCandidate[]>;

  getRecommendations?(
    context: RecommendationContext
  ): Promise<Track[]>;
}
```

Capabilities should be explicit:

```ts
type SourceCapabilities = {
  streaming: boolean;
  lossless: boolean;
  hiRes: boolean;
  lyrics: boolean;
  syncedLyrics: boolean;
  playlists: boolean;
  likes: boolean;
  downloads: boolean;
};
```

---

# 29. Stream architecture

```text
Track
  ↓
SourceResolver
  ↓
candidate sources
  ↓
TrackMatcher
  ↓
StreamResolver
  ↓
candidate streams
  ↓
StreamValidator
  ↓
QualitySelector
  ↓
Cache / range reader
  ↓
Native Playback
```

Recovery:

```text
Stream A
  ↓ 403
re-resolve
  ↓
Stream B
  ↓ invalid
alternate client
  ↓
Stream C
  ↓
play
```

Never make the UI responsible for recovery.

---

# 30. Playback architecture

```text
PlaybackController
       |
       +-- Player A
       |
       +-- Player B
       |
       +-- CrossfadeController
       |
       +-- QueueController
       |
       +-- AudioSession
       |
       +-- PlaybackRecovery
       |
       +-- MediaSession
```

Crossfade state:

```text
IDLE
 ↓
ARMING
 ↓
PREPARING
 ↓
SYNCING
 ↓
LAPPING
 ↓
FADING
 ↓
COMPLETED
```

Emergency:

```text
ANY STATE
 ↓
BAILING
 ↓
RECOVER MAIN PLAYER
```

Equal-power concept:

```text
A = cos(t)
B = sin(t)
```

Do not assume this exact formula is sufficient for every format/device. Measure perceived behavior.

---

# 31. Queue architecture

Use:

```text
UserQueue
AutoPlayQueue
PlaybackProjection
```

Example:

```text
UserQueue:
A B C D

AutoPlayQueue:
E F G

PlaybackProjection:
A B C D E F G
```

Shuffle should operate on the projection according to explicit semantics.

Autoplay must never silently mutate the user's manually curated queue.

---

# 32. Lyrics architecture

```text
LyricsRepository
      |
 +----+--------+--------+
 |             |        |
LRCLIB     Provider B  Provider C
      |
Normalization
      |
LyricsModel
      |
Sync Engine
      |
Animated lyrics UI
```

The animation layer must not perform expensive parsing or network work per frame.

---

# 33. Recommendation architecture

```text
ListeningEvent
      |
      +-- play
      +-- complete
      +-- skip
      +-- like
      +-- dislike
      +-- repeat
      +-- search
      +-- playlist add
      +-- queue add
      |
      v
TasteModel
      |
CandidateGenerator
      |
Ranker
      |
Diversity
      |
Recommendation
```

Provider recommendations become candidate sources, not the entire OTO algorithm.

---

# 34. Native performance architecture

React Native is responsible for:

```text
screens
navigation
business presentation
user interaction
```

Native/JSI/Reanimated/Skia should handle:

```text
animation-critical values
audio timing
heavy image work
audio analysis
DSP
playback
background execution
```

Avoid:

```text
React state update every frame
Context update every frame
JS-based waveform rendering
JS audio clock driving 120 FPS
```

For 120 Hz:

```text
frame budget ≈ 8.33 ms
```

The architecture must leave the JS thread out of the critical rendering path.

---

# 35. Caching policy

Use independent cache namespaces:

```text
metadata/
artwork/
lyrics/
streams/
analysis/
canvas/
```

Prioritize:

```text
current track
next track
visible content
near-visible content
background
```

Eviction should be based on:

```text
size
recency
cost to refetch
network conditions
offline importance
```

Do not blindly reproduce historical BitChord cache numbers.

---

# 36. Quality model

Represent actual media properties:

```ts
type AudioFormat = {
  codec: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  lossless: boolean;
};
```

Never do:

```text
user selected LOSSLESS
→ display LOSSLESS
```

Instead:

```text
resolved stream
→ inspect actual properties
→ display verified quality
```

---

# 37. YouTube Music architecture

Recommended:

```text
React Native
    |
OTO API
    |
YouTubeMusicProvider
    |
ytmusicapi / equivalent
    |
YouTube Music
```

Provider data must be normalized before reaching the app:

```text
provider response
      ↓
normalizer
      ↓
Track / Album / Artist / Playlist
```

Do not expose raw provider schemas throughout OTO.

---

# 38. Authentication boundary

Never:

```text
OTO login form
  ↓
Google password
```

Prefer:

```text
OTO
 ↓
Google-hosted auth
 ↓
supported authorization
 ↓
secure token/session
 ↓
backend/provider
```

Token storage must use platform secure storage.

---

# 39. Security review

Use the evidence-based review mindset from `git-review-skill`.

Check:

```text
credentials
tokens
cookies
Google sessions
download URLs
stream URLs
WebSocket auth
API auth
local database
logs
analytics
crash reports
```

Do not put:

```text
Google cookies
provider session headers
refresh tokens
private stream URLs
```

into ordinary logs.

---

# 40. Performance review

For every subsystem ask:

### CPU

```text
Does this run on JS?
Can it run native?
Is it repeated?
```

### Memory

```text
What is cached?
How large can it grow?
What gets evicted?
```

### Network

```text
Can it be cached?
Can it be batched?
Can it be prefetched?
```

### Rendering

```text
Does it trigger React renders?
Can it use Shared Values?
Can it use Skia?
```

### Battery

```text
Does it poll?
Does it wake the device?
Does it analyze audio continuously?
```

---

# 41. Failure-mode matrix

OTO must test:

```text
stream 403
stream expiry
bot check
bad MIME
network loss
Wi-Fi → mobile
mobile → Wi-Fi
slow network
seek while buffering
seek during crossfade
skip during crossfade
skip during Automix
player crash
background suspension
Bluetooth disconnect
headphone unplug
audio focus loss
queue mutation
lyrics missing
lyrics mismatch
artwork unavailable
provider unavailable
authentication expiry
WebSocket reconnect
```

Every failure should have:

```text
trigger
state transition
recovery
user-visible behavior
telemetry
test
```

---

# 42. Testing strategy

## Unit

```text
TrackMatcher
Queue
Shuffle
Lyrics parser
Crossfade math
Recommendation scoring
Cache policy
```

## Integration

```text
Search → metadata
Metadata → stream
Stream → player
Player → queue
Lyrics → player clock
Download → local library
```

## Native

```text
Media3
AVFoundation
MediaSession
audio focus
background playback
```

## E2E

```text
login
search
play
pause
seek
skip
crossfade
background
lock screen
Bluetooth
download
offline
```

---

# 43. Commit-history report format

For each subsystem produce:

```markdown
# Playback History

## Current implementation

...

## Timeline

### Commit <SHA>
Date:
Problem:
Change:
Why:
Files:
Tests:
Impact:

### Commit <SHA>
...

## Architectural evolution

Before:
...

After:
...

## Rejected/removed approaches

...

## OTO decision

...

## Evidence

- file:line
- commit SHA
- test
- issue/PR
```

---

# 44. Final BitChord → OTO translation table

| BitChord concept | OTO implementation |
|---|---|
| Playback service | Native `PlaybackEngine` |
| Media3 | Android Media3 |
| Native audio | Android Media3 + iOS AVFoundation |
| Ghost player | Secondary native player |
| Crossfade controller | OTO `CrossfadeController` |
| Equal-power fade | Native transition math |
| Track matcher | OTO `TrackMatcher` |
| Source registry | OTO `SourceRegistry` |
| Source modules | OTO provider adapters |
| Stream validation | OTO `StreamValidator` |
| Quality upgrade | OTO `QualitySelector` |
| Dynamic cache | OTO cache manager |
| Lyrics repository | OTO `LyricsRepository` |
| Canvas | OTO `CanvasRepository` |
| Analyzer | C++/native analysis |
| Automix | OTO `TransitionPlanner` |
| Downloads | OTO `DownloadManager` |
| Local library | OTO `LocalMusicRepository` |
| Scrobbling | OTO adapter service |
| Android Auto | OTO MediaSession integration |
| Listen Together | OTO WebSocket room |
| Backend | FastAPI/Postgres/Redis |
| CI/CD | GitHub Actions |
| UI | React Native + Reanimated + Skia |

---

# 45. Exact OTO build order

## Phase 1 — Foundation

```text
monorepo
TypeScript
lint
format
tests
CI
domain package
```

## Phase 2 — Music domain

```text
Track
Artist
Album
Playlist
Lyrics
Stream
Source
User
```

## Phase 3 — YouTube Music provider

```text
authentication
search
metadata
library
playlists
home
recommendations
```

## Phase 4 — Source abstraction

```text
MusicSource
SourceRegistry
SourceResolver
SourceHealth
```

## Phase 5 — Stream system

```text
TrackMatcher
StreamResolver
StreamValidator
QualitySelector
Recovery
```

## Phase 6 — Native playback

```text
Android Media3
iOS AVFoundation
MediaSession
background audio
```

## Phase 7 — Dual-player playback

```text
Player A
Player B
gapless
crossfade
equal-power transition
```

## Phase 8 — Queue

```text
user queue
autoplay
shuffle
repeat
playback projection
```

## Phase 9 — Cache

```text
metadata
artwork
lyrics
streams
```

## Phase 10 — Artwork

```text
palette
dynamic theme
Skia
canvas
```

## Phase 11 — Lyrics

```text
LRC
Enhanced LRC
TTML
word timing
translation
```

## Phase 12 — Downloads/local

```text
download manager
offline
local scanner
metadata
artwork
```

## Phase 13 — Recommendations

```text
events
taste model
candidate generation
ranking
diversity
```

## Phase 14 — Native analysis

```text
C++
ONNX
BPM
beats
vocal activity
```

## Phase 15 — Automix

```text
transition planner
transition policy
mixing
```

## Phase 16 — Scrobbling

```text
Last.fm
ListenBrainz
```

## Phase 17 — Android Auto

```text
MediaSession
browse
search
queue
```

## Phase 18 — Listen Together

```text
WebSocket
room
presence
sync
reconnect
```

## Phase 19 — Performance

```text
120 Hz
memory
battery
startup
artwork latency
rebuffer rate
```

---

# 46. Antigravity master investigation prompt

Paste this into Antigravity after installing both skills:

```text
You are reverse-engineering BitChord for an independent React Native music app named OTO.

Reference:
https://github.com/kushagrasinghx/BitChord

Primary objectives:
1. Understand the CURRENT BitChord architecture.
2. Understand HOW important systems work.
3. Understand WHY major implementation changes happened.
4. Trace important call chains.
5. Identify failure modes and recovery strategies.
6. Identify performance-sensitive paths.
7. Translate findings into an independent OTO architecture.
8. Never copy BitChord source into OTO.
9. Never assume README claims describe the current implementation.
10. Every important claim must have evidence.

Use repo-inspect for surgical source inspection.

Use git-review methodology for historical analysis:
- lock exact commits
- inspect full diffs
- inspect callers/callees
- inspect tests
- inspect configuration
- inspect surrounding history
- distinguish introduced behavior from pre-existing behavior
- require evidence before claiming a defect or architectural fact

DO NOT dump the whole repository into context.

FIRST:
1. Run repository overview.
2. Run entries.
3. Run patterns.
4. Run data.
5. Run hotspots.
6. Build a subsystem inventory.

THEN investigate each subsystem separately:

Playback
Stream resolution
Stream validation
Track matching
Source system
Authentication
Queue
Autoplay
Shuffle
Caching
Lyrics
Artwork
Canvas
Downloads
Local library
Recommendations
Audio analysis
Automix
Scrobbling
Multi-account
Android Auto
Listen Together
Backend
Deployment
CI

For every subsystem produce:

- current implementation
- entry points
- key files
- key symbols
- call chain
- data flow
- state machine
- dependencies
- caching
- error handling
- tests
- historical evolution
- important commits
- old implementation
- reason for change
- current implementation
- OTO recommendation
- confidence

For important historical commits:

- full SHA
- parent
- date
- message
- changed files
- before behavior
- after behavior
- reason
- tests
- downstream effects
- whether the mechanism still exists

Prioritize commits involving:

fix
rewrite
refactor
replace
recovery
403
bot
stream
buffer
cache
crossfade
gapless
lyrics
queue
shuffle
autoplay
memory
performance
native
C++
JNI
ONNX
lossless
DAC
Bluetooth
Android Auto
WebSocket
Listen Together

Create a final document:

docs/BITCHORD_REVERSE_ENGINEERING.md

It must contain:

1. Executive summary
2. Repository map
3. Architecture diagram
4. Subsystem map
5. Playback deep dive
6. Stream-resolution deep dive
7. Source architecture
8. Track matching
9. Authentication
10. Queue/autoplay
11. Cache
12. Lyrics
13. Artwork/canvas
14. Downloads/local
15. Recommendations
16. Analyzer/Automix
17. Scrobbling
18. Android Auto
19. Listen Together
20. Backend
21. Deployment
22. CI
23. Performance
24. Failure modes
25. Security
26. Testing
27. Commit timeline
28. Important commits by subsystem
29. Deprecated approaches
30. OTO architecture translation
31. OTO implementation phases
32. Licensing boundary
33. Evidence index
34. Unknowns / unresolved questions

Do not report something as fact unless you can point to code, a commit, a test, configuration, or other repository evidence.

If evidence is missing, explicitly write:
UNKNOWN — NEEDS VERIFICATION

Do not fill gaps with guesses.

At the end create:

docs/OTO_IMPLEMENTATION_ROADMAP.md

with concrete implementation phases and acceptance criteria.

Before completing:
- verify every subsystem was investigated
- list all unreviewed areas
- distinguish current vs historical behavior
- distinguish BitChord facts vs OTO recommendations
- identify anything that requires legal/API-policy verification
```

---

# 47. Antigravity implementation prompt after investigation

Once the reverse-engineering document exists:

```text
Read:

docs/BITCHORD_REVERSE_ENGINEERING.md
docs/OTO_IMPLEMENTATION_ROADMAP.md

You are now implementing OTO independently.

Do NOT copy BitChord source.

For the requested phase:

1. inspect the existing OTO repository
2. inspect the relevant architecture documents
3. identify contracts and invariants
4. make a minimal implementation plan
5. implement only the requested phase
6. preserve future architecture boundaries
7. avoid unrelated refactors
8. add targeted tests
9. run type checking
10. run lint
11. run relevant tests
12. report files changed
13. report architectural decisions
14. report unresolved risks

For playback-related phases:

- native implementation first
- React Native wrapper second
- JS must not own the audio clock
- no per-frame React state updates
- support recovery
- test background playback
- test network transitions
- test queue transitions
- test crossfade

For provider-related phases:

- provider-specific code stays behind adapters
- normalize data into OTO domain types
- do not leak provider schemas
- do not store credentials in logs
- do not assume provider behavior is permanent

Do not implement later phases unless required by the current phase.
```

---

# 48. Definition of done for the investigation

The investigation is complete only when:

- [ ] current HEAD recorded
- [ ] repository structure mapped
- [ ] entries mapped
- [ ] dependencies mapped
- [ ] hotspots mapped
- [ ] playback traced
- [ ] stream resolution traced
- [ ] stream validation traced
- [ ] TrackMatcher traced
- [ ] source architecture traced
- [ ] authentication traced
- [ ] queue traced
- [ ] autoplay traced
- [ ] cache traced
- [ ] lyrics traced
- [ ] artwork traced
- [ ] downloads traced
- [ ] local library traced
- [ ] recommendations traced
- [ ] analyzer traced
- [ ] Automix traced
- [ ] scrobbling traced
- [ ] Android Auto traced
- [ ] Listen Together traced
- [ ] backend traced
- [ ] deployment traced
- [ ] CI traced
- [ ] important historical commits identified
- [ ] current vs historical behavior separated
- [ ] deprecated mechanisms documented
- [ ] OTO translations documented
- [ ] licensing boundary documented
- [ ] unknowns explicitly listed

---

# 49. Definition of done for OTO core

OTO's core is ready only when:

```text
search
  ↓
correct track
  ↓
stream resolution
  ↓
validation
  ↓
native playback
  ↓
queue
  ↓
next track
  ↓
gapless/crossfade
```

works reliably.

Then:

```text
lyrics
artwork
downloads
recommendations
automix
scrobbling
social listening
```

can be layered on top.

---

# 50. Most important engineering lessons

The deepest lesson from BitChord is not a particular library.

It is the pattern:

```text
real failure
    ↓
measure
    ↓
trace
    ↓
fix
    ↓
test
    ↓
refactor architecture
```

Examples to investigate deeply:

```text
wrong recording
    → TrackMatcher

dead stream
    → StreamValidator + recovery

403/bot issue
    → resolver/client fallback

crossfade hole
    → dual-player architecture

cache starvation
    → cache/back-buffer redesign

analysis memory
    → native processing

queue inconsistency
    → explicit queue model

source instability
    → source registry/health

real-time sync
    → dedicated WebSocket backend
```

That engineering loop is what OTO should inherit.

---

# 51. Final rule

Do not ask:

> "How do I copy BitChord?"

Ask:

> "What invariant, failure mode, or architectural problem caused BitChord to evolve this way, and what is the cleanest independent implementation for OTO?"

That question produces a much better app.
