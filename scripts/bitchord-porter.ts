/**
 * BitChord → OTO Converter Script
 *
 * Analyzes the BitChord Kotlin/Android codebase and generates clean-room
 * TypeScript stubs + migration plan for the OTO React Native app.
 *
 * LEGAL: BitChord is GPLv3/AGPLv3. This script extracts ALGORITHMS and
 * INTERFACES only — never raw Kotlin code tokens. All generated stubs
 * are clean-room implementations.
 *
 * Usage: npx tsx scripts/bitchord-porter.ts [--dry-run] [--domain <domain>]
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ───────────────────────────────────────────────────────────

const BITCHORD_ROOT = path.resolve(__dirname, '..', 'BitChord', 'app', 'src', 'main', 'java', 'com', 'music', 'bitchord');
const OTO_SRC = path.resolve(__dirname, '..', 'src');
const REPORT_DIR = path.resolve(__dirname, '..', 'docs', 'migration');

// ─── Domain Mapping ──────────────────────────────────────────────────────────
// Maps BitChord package paths → OTO target domains with portability metadata

interface ComponentMapping {
  /** BitChord subdirectory relative to com.music.bitchord */
  bitchordPath: string;
  /** OTO target directory relative to src/ */
  otoTarget: string;
  /** Portability classification per BITCHORD_RE/17_FEATURE_MATRIX.md */
  classification: 'DIRECT_PORT' | 'ALGORITHM_PORT' | 'ARCHITECTURE_PORT' | 'REIMPLEMENT' | 'PLATFORM_SPECIFIC' | 'DO_NOT_USE';
  /** Priority: P0 (critical) through P3 (deferred) */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  /** Human-readable description of what this component does */
  description: string;
  /** Files that already exist in OTO covering this domain */
  existingOtoFiles?: string[];
  /** Clean-room implementation notes */
  portingNotes: string;
}

const COMPONENT_MAP: ComponentMapping[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYBACK CORE (P0)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'playback/CrossfadeController.kt',
    otoTarget: 'audio/crossfade',
    classification: 'ALGORITHM_PORT',
    priority: 'P0',
    description: 'Dual-player equal-power crossfade (sin²+cos²=1), arming window, t=0 handoff',
    existingOtoFiles: ['audio/AudioEngine.ts', 'audio/RealAudioEngine.ts'],
    portingNotes: 'Port math (sin²/cos² curves, arming threshold) to CrossfadeEngine.ts. Decouple from ExoPlayer.'
  },
  {
    bitchordPath: 'playback/PlaybackService.kt',
    otoTarget: 'audio/service',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Android foreground service, MediaSession, notification, audio focus',
    existingOtoFiles: ['audio/AudioEngine.ts'],
    portingNotes: 'Architecture only: Android MediaSessionService + iOS AVAudioSession via TurboModules.'
  },
  {
    bitchordPath: 'playback/PlayerConnection.kt',
    otoTarget: 'audio/connection',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Binds UI to playback service, exposes player state to composables',
    existingOtoFiles: ['audio/AudioContext.tsx', 'store/usePlaybackStore.ts'],
    portingNotes: 'Already covered by AudioContext + Zustand store. Verify event parity.'
  },
  {
    bitchordPath: 'playback/QueueCoordinator.kt',
    otoTarget: 'domain/queue',
    classification: 'ALGORITHM_PORT',
    priority: 'P0',
    description: 'Two-tier queue: priority (play next) + standard. Shuffle preservation.',
    existingOtoFiles: ['domain/queue/QueueCoordinator.ts', 'domain/queue/types.ts', 'store/useQueueStore.ts'],
    portingNotes: 'ALREADY PORTED. Verify parity with BitChord edge cases.'
  },
  {
    bitchordPath: 'playback/QueueBuilder.kt',
    otoTarget: 'domain/queue',
    classification: 'ALGORITHM_PORT',
    priority: 'P0',
    description: 'Builds initial queue from album/playlist context',
    existingOtoFiles: ['domain/queue/QueueCoordinator.ts'],
    portingNotes: 'Extend QueueCoordinator with buildFromContext() method.'
  },
  {
    bitchordPath: 'playback/QueueHistory.kt',
    otoTarget: 'domain/queue',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Maintains un-shuffled history for shuffle toggle restore',
    existingOtoFiles: ['domain/queue/QueueCoordinator.ts'],
    portingNotes: 'Add history stack to QueueCoordinator. Store pre-shuffle order.'
  },
  {
    bitchordPath: 'playback/QueueShuffle.kt',
    otoTarget: 'domain/queue',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Fisher-Yates shuffle with current-track pinning',
    existingOtoFiles: ['domain/queue/QueueCoordinator.ts'],
    portingNotes: 'Implement Fisher-Yates in QueueCoordinator.shuffle().'
  },
  {
    bitchordPath: 'playback/StreamChoice.kt',
    otoTarget: 'audio',
    classification: 'ALGORITHM_PORT',
    priority: 'P0',
    description: 'Selects best stream format/bitrate from available options',
    existingOtoFiles: ['audio/StreamChoice.ts'],
    portingNotes: 'ALREADY PORTED. Verify format preference order.'
  },
  {
    bitchordPath: 'playback/StreamContainer.kt',
    otoTarget: 'audio',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Container format detection (MP4/WebM/FLAC/Opus)',
    existingOtoFiles: [],
    portingNotes: 'Port container sniffing logic to StreamContainer.ts.'
  },
  {
    bitchordPath: 'playback/AudioCache.kt',
    otoTarget: 'audio/cache',
    classification: 'REIMPLEMENT',
    priority: 'P0',
    description: '2MB bounded range chunk cache with canonical URL keying',
    existingOtoFiles: ['audio/cache/StreamCache.ts'],
    portingNotes: 'ALREADY PORTED. Verify 2MB chunk boundary and canonical key generation.'
  },
  {
    bitchordPath: 'playback/DynamicLruCacheEvictor.kt',
    otoTarget: 'audio/cache',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Dynamic LRU eviction monitoring filesystem free space',
    existingOtoFiles: ['audio/cache/StreamCache.ts'],
    portingNotes: 'Add dynamic disk budget monitor to StreamCache.'
  },
  {
    bitchordPath: 'playback/ChunkedDataSource.kt',
    otoTarget: 'audio/cache',
    classification: 'REIMPLEMENT',
    priority: 'P1',
    description: 'HTTP range request data source with 2MB chunk boundaries',
    existingOtoFiles: [],
    portingNotes: 'Native implementation: Android Media3 CacheDataSource, iOS AVAssetResourceLoaderDelegate.'
  },
  {
    bitchordPath: 'playback/Autoplay.kt',
    otoTarget: 'domain/queue',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Auto-generates next tracks when queue runs out',
    existingOtoFiles: [],
    portingNotes: 'Port autoplay recommendation logic. Uses related tracks API.'
  },
  {
    bitchordPath: 'playback/LastPlayed.kt',
    otoTarget: 'store',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Persists last played track/position for cold start resume',
    existingOtoFiles: [],
    portingNotes: 'MMKV persist: {trackId, positionMs, queueSnapshot}. Hydrate on app launch.'
  },
  {
    bitchordPath: 'playback/SleepTimer.kt',
    otoTarget: 'audio',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Sleep timer with fade-out and end-of-track modes',
    existingOtoFiles: ['audio/SleepTimer.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'playback/AudioOutputPolicy.kt',
    otoTarget: 'audio',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Audio routing policy (speaker/headphone/bluetooth/USB DAC)',
    existingOtoFiles: ['audio/AudioOutputPolicy.ts', 'audio/OutputNegotiator.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'playback/MusicLink.kt',
    otoTarget: 'domain/deeplink',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Deep link parser for music:// and share URLs',
    existingOtoFiles: [],
    portingNotes: 'Port URL pattern matching to DeepLinkResolver.ts.'
  },
  {
    bitchordPath: 'playback/PlaybackFallback.kt',
    otoTarget: 'audio/resilience',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Fallback logic when primary stream fails mid-playback',
    existingOtoFiles: [],
    portingNotes: 'Retry with next source from StreamResolver waterfall.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART PLAYBACK / AUTOMIX (P2-P3)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'playback/smart/TrackAnalyzer.kt',
    otoTarget: 'domain/analysis',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'DSP feature extraction: BPM, key, beat grid from audio',
    existingOtoFiles: [],
    portingNotes: 'C++ TurboModule using KissFFT. Interface in TrackAnalyzer.ts.'
  },
  {
    bitchordPath: 'playback/smart/TransitionPlanner.kt',
    otoTarget: 'domain/analysis',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Picks transition style (gapless/crossfade/DJ blend) based on BPM + key',
    existingOtoFiles: [],
    portingNotes: 'Pure TS: Camelot wheel + BPM delta -> transition config.'
  },
  {
    bitchordPath: 'playback/smart/BeatTracker.kt',
    otoTarget: 'domain/analysis',
    classification: 'REIMPLEMENT',
    priority: 'P3',
    description: 'ONNX neural beat tracking',
    existingOtoFiles: [],
    portingNotes: 'Deferred. Requires react-native-onnxruntime or server-side.'
  },
  {
    bitchordPath: 'playback/smart/VocalTracker.kt',
    otoTarget: 'domain/analysis',
    classification: 'REIMPLEMENT',
    priority: 'P3',
    description: 'ONNX vocal energy detection',
    existingOtoFiles: [],
    portingNotes: 'Deferred. Same as BeatTracker.'
  },
  {
    bitchordPath: 'playback/smart/AnalysisStore.kt',
    otoTarget: 'domain/analysis',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P2',
    description: 'Cached BPM/key/beat grid store',
    existingOtoFiles: [],
    portingNotes: 'MMKV key-value store for analysis results.'
  },
  {
    bitchordPath: 'playback/smart/MelSpectrogram.kt',
    otoTarget: 'domain/analysis',
    classification: 'ALGORITHM_PORT',
    priority: 'P3',
    description: 'Mel spectrogram computation for audio features',
    existingOtoFiles: [],
    portingNotes: 'C++ DSP module. Port FFT + mel filterbank math.'
  },
  {
    bitchordPath: 'playback/smart/TransitionPolicy.kt',
    otoTarget: 'domain/analysis',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Policy rules for when to use each transition type',
    existingOtoFiles: [],
    portingNotes: 'Pure TS policy config object.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO HARDWARE / DSP (P1-P3)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'playback/EqualizerProcessor.kt',
    otoTarget: 'audio/equalizer',
    classification: 'REIMPLEMENT',
    priority: 'P2',
    description: '10-band parametric EQ using Biquad filters',
    existingOtoFiles: [],
    portingNotes: 'C++ Biquad filter engine exposed via JSI. Shared Android+iOS.'
  },
  {
    bitchordPath: 'playback/EqualizerPreset.kt',
    otoTarget: 'audio/equalizer',
    classification: 'DIRECT_PORT',
    priority: 'P2',
    description: 'Named EQ presets (Rock, Pop, Classical, etc.)',
    existingOtoFiles: [],
    portingNotes: 'Static data: {name, bands: number[]}. Direct TS object.'
  },
  {
    bitchordPath: 'playback/EqualizerCurve.kt',
    otoTarget: 'audio/equalizer',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Interpolation curve for smooth EQ band transitions',
    existingOtoFiles: [],
    portingNotes: 'Math: cubic interpolation between frequency points.'
  },
  {
    bitchordPath: 'playback/SpatialAudioProcessor.kt',
    otoTarget: 'audio/spatial',
    classification: 'REIMPLEMENT',
    priority: 'P3',
    description: 'Spatial audio / virtualizer effect',
    existingOtoFiles: [],
    portingNotes: 'Deferred. Platform-specific APIs.'
  },
  {
    bitchordPath: 'playback/audio/PrecisionAudioSink.kt',
    otoTarget: 'audio/native',
    classification: 'PLATFORM_SPECIFIC',
    priority: 'P3',
    description: 'Float32 PCM pipeline, direct USB DAC, sample rate matching',
    existingOtoFiles: [],
    portingNotes: 'Native TurboModule: Android AAudio/Oboe, iOS CoreAudio.'
  },
  {
    bitchordPath: 'playback/audio/DspChain.kt',
    otoTarget: 'audio/dsp',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Chains DSP processors (EQ -> spatial -> crossfade -> output)',
    existingOtoFiles: [],
    portingNotes: 'C++ processor chain pattern. Interface in DspChain.ts.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA / SOURCES (P0-P1)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/sources/SourceRegistry.kt',
    otoTarget: 'sources',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'Dynamic registration of music sources with priority + health tracking',
    existingOtoFiles: ['sources/SourceRegistry.ts', 'sources/SourceTypes.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/sources/SourceResolver.kt',
    otoTarget: 'sources',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Waterfall source resolution with circuit breaker fallbacks',
    existingOtoFiles: ['api/resilience/circuitBreaker.ts'],
    portingNotes: 'Extend SourceRegistry with waterfall resolve() method.'
  },
  {
    bitchordPath: 'data/sources/TrackMatcher.kt',
    otoTarget: 'api/matching',
    classification: 'ALGORITHM_PORT',
    priority: 'P0',
    description: '3-phase fuzzy matching: normalization -> version parity -> duration gate',
    existingOtoFiles: ['api/matching/trackMatcher.ts'],
    portingNotes: 'ALREADY PORTED. Verify edge cases.'
  },
  {
    bitchordPath: 'data/sources/YouTubeSource.kt',
    otoTarget: 'auth/innertube',
    classification: 'REIMPLEMENT',
    priority: 'P0',
    description: 'InnerTube API integration for YouTube Music streaming',
    existingOtoFiles: ['auth/innertube/InnertubeClient.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/sources/JioSaavnSource.kt',
    otoTarget: 'api',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'JioSaavn 320kbps AAC extraction with DES-ECB key',
    existingOtoFiles: ['api/directJioSaavn.ts', 'api/crypto/desEcb.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/sources/MusicSource.kt',
    otoTarget: 'sources',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'Base interface for pluggable music source providers',
    existingOtoFiles: ['sources/SourceTypes.ts'],
    portingNotes: 'ALREADY PORTED as StreamProvider interface.'
  },
  {
    bitchordPath: 'data/sources/SourceKind.kt',
    otoTarget: 'sources',
    classification: 'DIRECT_PORT',
    priority: 'P1',
    description: 'Enum of source types (YouTube, JioSaavn, Local, etc.)',
    existingOtoFiles: ['sources/SourceTypes.ts'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LYRICS (P1)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/lyrics/LyricsRepository.kt',
    otoTarget: 'utils/lyrics',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: '16-provider waterfall lyrics fetcher with caching',
    existingOtoFiles: ['api/directLyrics.ts'],
    portingNotes: 'Extend directLyrics.ts into full LyricsRepository with provider chain.'
  },
  {
    bitchordPath: 'data/lyrics/LyricsSource.kt',
    otoTarget: 'utils/lyrics',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'Base interface for lyrics providers',
    existingOtoFiles: ['utils/lyrics/types.ts'],
    portingNotes: 'Add LyricsProvider interface to types.ts.'
  },
  {
    bitchordPath: 'data/lyrics/LyricLine.kt',
    otoTarget: 'utils/lyrics',
    classification: 'DIRECT_PORT',
    priority: 'P1',
    description: 'Lyric line data model with timing',
    existingOtoFiles: ['utils/lyrics/types.ts'],
    portingNotes: 'ALREADY PORTED as LyricLine interface.'
  },
  {
    bitchordPath: 'data/lyrics/Musixmatch.kt',
    otoTarget: 'utils/lyrics/providers',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Musixmatch HMAC-SHA256 token gen + synced lyrics fetch',
    existingOtoFiles: [],
    portingNotes: 'Port HMAC signing. Use standard crypto API.'
  },
  {
    bitchordPath: 'data/lyrics/LyricsQuery.kt',
    otoTarget: 'utils/lyrics',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Query builder for lyrics search across providers',
    existingOtoFiles: [],
    portingNotes: 'Build LyricsQuery type with title/artist/duration params.'
  },
  {
    bitchordPath: 'data/lyrics/LyricsTranslation.kt',
    otoTarget: 'utils/lyrics',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Lyrics translation via external APIs',
    existingOtoFiles: [],
    portingNotes: 'Port translation request/response handling.'
  },
  {
    bitchordPath: 'data/lyrics/TtmlLyrics.kt',
    otoTarget: 'utils/lyrics',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'TTML rich lyrics parsing (Apple Music/Spotify)',
    existingOtoFiles: ['utils/lyrics/TtmlParser.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/lyrics/EnhancedLrc.kt',
    otoTarget: 'utils/lyrics',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Enhanced LRC with word-level timestamps',
    existingOtoFiles: ['utils/lyrics/EnhancedLrcParser.ts'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INNERTUBE / AUTH (P0)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/innertube/Innertube.kt',
    otoTarget: 'auth/innertube',
    classification: 'REIMPLEMENT',
    priority: 'P0',
    description: 'Core InnerTube API client with visitor data + session tokens',
    existingOtoFiles: ['auth/innertube/InnertubeClient.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/innertube/InnertubeParser.kt',
    otoTarget: 'auth/innertube',
    classification: 'ALGORITHM_PORT',
    priority: 'P0',
    description: 'Response parser for InnerTube browse/search/next endpoints',
    existingOtoFiles: ['auth/innertube/innertubeParsers.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/innertube/InnerTubeXResolver.kt',
    otoTarget: 'auth/innertube',
    classification: 'REIMPLEMENT',
    priority: 'P0',
    description: 'Cipher/signature solving for stream URLs',
    existingOtoFiles: ['auth/innertube/crypto.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/innertube/potoken',
    otoTarget: 'auth/innertube/potoken',
    classification: 'REIMPLEMENT',
    priority: 'P1',
    description: 'PoToken generation for YouTube playback authorization',
    existingOtoFiles: [],
    portingNotes: 'Port PoToken WebView approach or use bundled JS module.'
  },
  {
    bitchordPath: 'auth/AuthStore.kt',
    otoTarget: 'auth',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Auth state management with encrypted token storage',
    existingOtoFiles: ['auth/GoogleAuthStore.ts'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CANVAS / ARTWORK (P1-P2)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/canvas/CanvasRepository.kt',
    otoTarget: 'canvas',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Fetches animated canvas artwork (Spotify/Apple/Tidal)',
    existingOtoFiles: ['canvas/CanvasRepository.ts', 'canvas/CanvasCache.ts'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOADS (P2)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'download/Downloader.kt',
    otoTarget: 'downloads',
    classification: 'REIMPLEMENT',
    priority: 'P2',
    description: 'Multi-worker background download engine',
    existingOtoFiles: ['downloads/DownloadEngine.ts', 'downloads/DownloadStore.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'download/MediaTagger.kt',
    otoTarget: 'downloads/tagger',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'Embeds metadata tags into downloaded audio files',
    existingOtoFiles: [],
    portingNotes: 'C++ TurboModule for MP4/FLAC/WebM container tagging.'
  },
  {
    bitchordPath: 'download/FlacTagger.kt',
    otoTarget: 'downloads/tagger',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'FLAC Vorbis comment writer',
    existingOtoFiles: [],
    portingNotes: 'Port Vorbis comment insertion algorithm.'
  },
  {
    bitchordPath: 'download/Mp4Tagger.kt',
    otoTarget: 'downloads/tagger',
    classification: 'ALGORITHM_PORT',
    priority: 'P2',
    description: 'MP4 atom writer for metadata',
    existingOtoFiles: [],
    portingNotes: 'Port MP4 moov/udta atom manipulation.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS / ANALYTICS (P1)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/stats/ListeningStats.kt',
    otoTarget: 'analytics',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'Monthly partitioned JSON listening stats (zero-database)',
    existingOtoFiles: ['analytics/ListeningRecorder.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/stats/ListeningRecorder.kt',
    otoTarget: 'analytics',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: '30-second listen threshold recorder',
    existingOtoFiles: ['analytics/ListeningRecorder.ts'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'data/scrobbling/ScrobbleManager.kt',
    otoTarget: 'analytics/scrobbling',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Last.fm / ListenBrainz scrobble dispatch',
    existingOtoFiles: ['analytics/scrobbling/ScrobbleManager.ts'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UI COMPONENTS (P1-P2) — Architecture influence only
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'ui/player/NowPlayingScreen.kt',
    otoTarget: 'player/components',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Full-screen now playing with artwork, controls, lyrics toggle',
    existingOtoFiles: ['player/components/OTONowPlayingContent.tsx', 'player/components/OTONowPlayingShell.tsx'],
    portingNotes: 'ALREADY PORTED. Compare feature parity.'
  },
  {
    bitchordPath: 'ui/components/MiniPlayer.kt',
    otoTarget: 'player/components',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Collapsed mini player with gesture expand',
    existingOtoFiles: ['player/components/OTOMiniPlayer.tsx'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'ui/player/PlayerQueue.kt',
    otoTarget: 'queue/components',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'Queue drawer with drag-to-reorder',
    existingOtoFiles: ['queue/components/OTOQueue.tsx', 'queue/components/OTOQueueItem.tsx'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'ui/player/PlayerLyrics.kt',
    otoTarget: 'lyrics/components',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'Synchronized lyrics display with word-level glow',
    existingOtoFiles: ['lyrics/components/OTOLyrics.tsx', 'lyrics/components/OTOLyricLine.tsx'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'ui/screens/HomeScreen.kt',
    otoTarget: 'home/screens',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Home screen with personalized sections',
    existingOtoFiles: ['home/screens/HomeScreenContent.tsx'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'ui/screens/SearchScreen.kt',
    otoTarget: 'search/screens',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Search with categorized results',
    existingOtoFiles: ['search/screens/SearchScreenContent.tsx'],
    portingNotes: 'ALREADY PORTED.'
  },
  {
    bitchordPath: 'ui/screens/LibraryScreen.kt',
    otoTarget: 'library/screens',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P0',
    description: 'Library with playlists, albums, artists',
    existingOtoFiles: ['library/screens/LibraryScreenContent.tsx'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA MODELS (P0)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/model/Models.kt',
    otoTarget: 'domain',
    classification: 'DIRECT_PORT',
    priority: 'P0',
    description: 'Core domain models: Song, Album, Artist, Playlist',
    existingOtoFiles: ['domain/types.ts'],
    portingNotes: 'ALREADY PORTED. Verify all fields match.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS (P1)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/settings/AppSettings.kt',
    otoTarget: 'store/settings',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P1',
    description: 'App settings with MMKV persistence',
    existingOtoFiles: [],
    portingNotes: 'Create SettingsStore.ts with MMKV. Port setting keys.'
  },
  {
    bitchordPath: 'data/settings/SearchHistory.kt',
    otoTarget: 'search/storage',
    classification: 'ALGORITHM_PORT',
    priority: 'P1',
    description: 'Persistent search history with dedup and LRU eviction',
    existingOtoFiles: ['search/storage/recentSearchesStorage.ts'],
    portingNotes: 'ALREADY PORTED.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTEN TOGETHER / PARTY (P2-P3)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/listentogether/ListenTogether.kt',
    otoTarget: 'domain/party',
    classification: 'ARCHITECTURE_PORT',
    priority: 'P3',
    description: 'Listen Together real-time sync protocol',
    existingOtoFiles: [],
    portingNotes: 'Deferred. NTP-style clock sync + WebSocket. See RE doc 07.'
  },
  {
    bitchordPath: 'playback/PartySync.kt',
    otoTarget: 'domain/party',
    classification: 'ALGORITHM_PORT',
    priority: 'P3',
    description: 'Party mode playback synchronization',
    existingOtoFiles: [],
    portingNotes: 'Deferred. Dynamic pitch-preserving tempo adjustment.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DISCORD RPC (P3)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/discord/DiscordRPC.kt',
    otoTarget: 'integrations/discord',
    classification: 'REIMPLEMENT',
    priority: 'P3',
    description: 'Discord Rich Presence integration',
    existingOtoFiles: [],
    portingNotes: 'Deferred. WebSocket-based Discord Gateway.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WIDGET (P2)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'widget/MediaWidget.kt',
    otoTarget: 'widget',
    classification: 'PLATFORM_SPECIFIC',
    priority: 'P2',
    description: 'Android Glance widget showing now playing',
    existingOtoFiles: [],
    portingNotes: 'Android: Jetpack Glance widget. iOS: WidgetKit.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DO NOT USE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    bitchordPath: 'data/sources/module/QuickJsExecutor.kt',
    otoTarget: '',
    classification: 'DO_NOT_USE',
    priority: 'P3',
    description: 'Sandboxed QuickJS scraper engine',
    existingOtoFiles: [],
    portingNotes: 'DO NOT USE: RN already has Hermes. Use worker threads instead.'
  },
  {
    bitchordPath: 'data/smb',
    otoTarget: '',
    classification: 'DO_NOT_USE',
    priority: 'P3',
    description: 'SMB/CIFS network share support',
    existingOtoFiles: [],
    portingNotes: 'DO NOT USE: Niche feature, heavy native deps.'
  },
  {
    bitchordPath: 'data/webdav',
    otoTarget: '',
    classification: 'DO_NOT_USE',
    priority: 'P3',
    description: 'WebDAV cloud storage support',
    existingOtoFiles: [],
    portingNotes: 'DO NOT USE: Niche feature, unnecessary complexity.'
  },
];

// ─── Analysis Engine ─────────────────────────────────────────────────────────

interface AnalysisResult {
  totalBitchordFiles: number;
  mappedComponents: number;
  alreadyPorted: ComponentMapping[];
  needsPorting: ComponentMapping[];
  doNotUse: ComponentMapping[];
  unmappedFiles: string[];
  byPriority: Record<string, ComponentMapping[]>;
  byClassification: Record<string, ComponentMapping[]>;
}

function getAllKotlinFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllKotlinFiles(fullPath));
    } else if (entry.name.endsWith('.kt')) {
      results.push(path.relative(BITCHORD_ROOT, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

function analyze(): AnalysisResult {
  const allKtFiles = getAllKotlinFiles(BITCHORD_ROOT);

  const mappedPaths = new Set<string>();
  for (const mapping of COMPONENT_MAP) {
    for (const ktFile of allKtFiles) {
      if (ktFile === mapping.bitchordPath || ktFile.startsWith(mapping.bitchordPath.replace('.kt', '') + '/')) {
        mappedPaths.add(ktFile);
      }
      if (!mapping.bitchordPath.endsWith('.kt') && ktFile.startsWith(mapping.bitchordPath + '/')) {
        mappedPaths.add(ktFile);
      }
    }
  }

  const alreadyPorted = COMPONENT_MAP.filter(m =>
    m.existingOtoFiles && m.existingOtoFiles.length > 0 &&
    m.classification !== 'DO_NOT_USE'
  );

  const needsPorting = COMPONENT_MAP.filter(m =>
    (!m.existingOtoFiles || m.existingOtoFiles.length === 0) &&
    m.classification !== 'DO_NOT_USE'
  );

  const doNotUse = COMPONENT_MAP.filter(m => m.classification === 'DO_NOT_USE');

  const unmappedFiles = allKtFiles.filter(f => !mappedPaths.has(f));

  const byPriority: Record<string, ComponentMapping[]> = {};
  const byClassification: Record<string, ComponentMapping[]> = {};

  for (const mapping of COMPONENT_MAP) {
    (byPriority[mapping.priority] ??= []).push(mapping);
    (byClassification[mapping.classification] ??= []).push(mapping);
  }

  return {
    totalBitchordFiles: allKtFiles.length,
    mappedComponents: COMPONENT_MAP.length,
    alreadyPorted,
    needsPorting,
    doNotUse,
    unmappedFiles,
    byPriority,
    byClassification,
  };
}

// ─── Stub Generator ──────────────────────────────────────────────────────────

interface StubTemplate {
  filePath: string;
  content: string;
}

function generateStubs(needsPorting: ComponentMapping[]): StubTemplate[] {
  const stubs: StubTemplate[] = [];

  for (const mapping of needsPorting) {
    if (!mapping.otoTarget) continue;

    const baseName = path.basename(mapping.bitchordPath, '.kt');
    const targetDir = path.join(OTO_SRC, mapping.otoTarget);
    const targetFile = path.join(targetDir, `${baseName}.ts`);

    if (fs.existsSync(targetFile)) continue;

    const stub = generateStubContent(mapping, baseName);
    stubs.push({ filePath: targetFile, content: stub });
  }

  return stubs;
}

function generateStubContent(mapping: ComponentMapping, baseName: string): string {
  const classificationComment: Record<string, string> = {
    DIRECT_PORT: 'Direct port - adapt syntax only, algorithm is standard/public domain.',
    ALGORITHM_PORT: 'Algorithm port - reimplement the mathematical/procedural logic in TypeScript.',
    ARCHITECTURE_PORT: 'Architecture port - reproduce the design pattern, not the implementation.',
    REIMPLEMENT: 'Reimplement - build from scratch using React Native paradigms.',
    PLATFORM_SPECIFIC: 'Platform-specific - separate Android (Kotlin TurboModule) and iOS (Swift TurboModule).',
    DO_NOT_USE: 'DO NOT USE - excluded from migration.',
  };

  return `/**
 * ${baseName}
 *
 * ${mapping.description}
 *
 * @classification ${mapping.classification}
 * @priority ${mapping.priority}
 * @portedFrom BitChord: ${mapping.bitchordPath}
 *
 * CLEAN-ROOM IMPLEMENTATION
 * ${classificationComment[mapping.classification]}
 *
 * Porting notes:
 * ${mapping.portingNotes}
 *
 * @see BITCHORD_RE/17_FEATURE_MATRIX.md
 * @see BITCHORD_RE/18_REUSABLE_CODE.md
 */

// TODO: Implement clean-room ${baseName}
// Reference: BitChord ${mapping.bitchordPath}
// Target: ${mapping.otoTarget}/${baseName}.ts

export {};
`;
}

// ─── Report Generator ────────────────────────────────────────────────────────

function generateReport(analysis: AnalysisResult): string {
  const now = new Date().toISOString().split('T')[0];

  let report = `# BitChord -> OTO Migration Report

Generated: ${now}

## Executive Summary

| Metric | Count |
|--------|-------|
| Total BitChord Kotlin files | ${analysis.totalBitchordFiles} |
| Mapped components | ${analysis.mappedComponents} |
| Already ported to OTO | ${analysis.alreadyPorted.length} |
| Needs porting | ${analysis.needsPorting.length} |
| Excluded (DO NOT USE) | ${analysis.doNotUse.length} |
| Unmapped files | ${analysis.unmappedFiles.length} |

---

## Already Ported (${analysis.alreadyPorted.length} components)

These components already exist in OTO. Verify feature parity with BitChord.

| Component | BitChord Source | OTO File(s) | Priority |
|-----------|----------------|-------------|----------|
`;

  for (const m of analysis.alreadyPorted.sort((a, b) => a.priority.localeCompare(b.priority))) {
    const otoFiles = m.existingOtoFiles?.map(f => '`' + f + '`').join(', ') || '';
    report += `| ${m.description.substring(0, 60)} | \`${m.bitchordPath}\` | ${otoFiles} | ${m.priority} |\n`;
  }

  report += `
---

## Needs Porting (${analysis.needsPorting.length} components)

These components need clean-room implementation in OTO.

### By Priority

`;

  for (const priority of ['P0', 'P1', 'P2', 'P3']) {
    const items = analysis.needsPorting.filter(m => m.priority === priority);
    if (items.length === 0) continue;

    report += `#### ${priority} (${items.length} components)\n\n`;
    report += `| Component | Classification | Target | Notes |\n`;
    report += `|-----------|---------------|--------|-------|\n`;

    for (const m of items) {
      report += `| ${m.description.substring(0, 50)} | ${m.classification} | \`${m.otoTarget}\` | ${m.portingNotes.substring(0, 60)} |\n`;
    }
    report += '\n';
  }

  report += `---

## Excluded (${analysis.doNotUse.length} components)

| Component | Reason |
|-----------|--------|
`;

  for (const m of analysis.doNotUse) {
    report += `| ${m.description} | ${m.portingNotes} |\n`;
  }

  report += `
---

## Unmapped BitChord Files (${analysis.unmappedFiles.length})

These files exist in BitChord but are not yet mapped in the converter.

\`\`\`
${analysis.unmappedFiles.join('\n')}
\`\`\`

---

## Classification Breakdown

| Classification | Count |
|---------------|-------|
`;

  for (const [cls, items] of Object.entries(analysis.byClassification)) {
    report += `| ${cls} | ${items.length} |\n`;
  }

  report += `
---

## Legal Notice

All code generated by this converter is clean-room implementation.
BitChord is licensed under GPLv3/AGPLv3. No raw Kotlin or C++ source
code tokens have been copied. Only algorithms, interfaces, and
architectural patterns have been extracted and reimplemented in
TypeScript and C++.

See: BITCHORD_RE/18_REUSABLE_CODE.md for detailed legal analysis.
`;

  return report;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const domainFilter = args.includes('--domain') ? args[args.indexOf('--domain') + 1] : undefined;

  console.log('===========================================================');
  console.log('  BitChord -> OTO Converter (Clean-Room Migration Tool)');
  console.log('===========================================================\n');

  // 1. Analyze
  console.log('Analyzing BitChord codebase...');
  const analysis = analyze();

  console.log(`   Total Kotlin files: ${analysis.totalBitchordFiles}`);
  console.log(`   Mapped components:  ${analysis.mappedComponents}`);
  console.log(`   Already ported:     ${analysis.alreadyPorted.length}`);
  console.log(`   Needs porting:      ${analysis.needsPorting.length}`);
  console.log(`   Excluded:           ${analysis.doNotUse.length}`);
  console.log(`   Unmapped files:     ${analysis.unmappedFiles.length}`);
  console.log();

  // 2. Generate stubs
  let porting = analysis.needsPorting;
  if (domainFilter) {
    porting = porting.filter(m => m.otoTarget.includes(domainFilter));
    console.log(`Filtered to domain "${domainFilter}": ${porting.length} components\n`);
  }

  const stubs = generateStubs(porting);
  console.log(`Generated ${stubs.length} stub files:\n`);

  for (const stub of stubs) {
    const relPath = path.relative(OTO_SRC, stub.filePath);
    if (dryRun) {
      console.log(`   [DRY RUN] Would create: src/${relPath}`);
    } else {
      const dir = path.dirname(stub.filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(stub.filePath, stub.content, 'utf-8');
      console.log(`   Created: src/${relPath}`);
    }
  }

  // 3. Generate migration report
  console.log('\nGenerating migration report...');
  const report = generateReport(analysis);

  const reportPath = path.join(REPORT_DIR, 'migration-report.md');
  if (dryRun) {
    console.log(`   [DRY RUN] Would write report to: ${reportPath}`);
  } else {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`   Report saved to: ${reportPath}`);
  }

  // 4. Summary
  console.log('\n===========================================================');
  console.log('Migration Priority Roadmap:');
  console.log('-----------------------------------------------------------');

  for (const priority of ['P0', 'P1', 'P2', 'P3']) {
    const total = analysis.byPriority[priority]?.length || 0;
    const ported = analysis.byPriority[priority]?.filter(m =>
      m.existingOtoFiles && m.existingOtoFiles.length > 0
    ).length || 0;
    const remaining = total - ported;
    const pct = total > 0 ? Math.round((ported / total) * 100) : 0;
    console.log(`  ${priority}: ${'#'.repeat(ported)}${'.'.repeat(remaining)} ${ported}/${total} (${pct}%)`);
  }

  console.log('-----------------------------------------------------------');
  console.log(`\nNext steps:`);
  console.log(`  1. Review: docs/migration/migration-report.md`);
  console.log(`  2. Fill P0 stubs first (critical path)`);
  console.log(`  3. Run: npx tsx scripts/bitchord-porter.ts --domain <domain>`);
  console.log(`     to generate stubs for a specific domain\n`);
}

main();
