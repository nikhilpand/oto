/**
 * OTO Core Domain Types
 *
 * Canonical data models for the entire application.
 * All external data is validated (via Zod) at the boundary
 * before being cast to these types.
 *
 * @see docs/SPEC.md §3 for schema rationale.
 */

/** A track in the OTO catalog. */
export interface Track {
  /** Canonical track ID */
  id: string;
  /** Cleaned display title (e.g. "Blinding Lights") */
  title: string;
  /** Primary artist name */
  artist: string;
  /** All participating artists */
  artists: string[];
  /** Album title */
  album: string;
  /** Track duration in milliseconds */
  durationMs: number;
  /** Hi-res artwork CDN URL */
  artworkUrl: string;
  /** Thumbhash placeholder string for instant artwork preview */
  thumbhash: string;
  /** Content advisory flag */
  isExplicit: boolean;
  /** Audio codec format */
  audioFormat?: 'flac' | 'aac' | 'opus';
  /** Bitrate in kbps (e.g. 320) */
  bitrate?: number;
  /** Synced lyrics reference key */
  lyricsId?: string;
  /** Camelot / Automix analysis tempo (BPM) */
  bpm?: number;
  /** Musical key in Camelot notation (e.g. "8B") */
  camelotKey?: string;
}

/** A resolved audio stream ready for playback. */
export interface ResolvedStream {
  /** Audio stream URL (CDN or local cache) */
  streamUrl: string;
  /** Source that resolved this stream */
  sourceId: 'cache' | 'lossless' | 'saavn' | 'innertube' | 'piped';
  /** Bitrate in kbps */
  bitrate: number;
  /** Audio codec format */
  format: 'flac' | 'aac' | 'opus';
  /** Millisecond timestamp when CDN token expires */
  expiresAt: number;
  /** Custom HTTP headers required for stream access */
  headers?: Record<string, string>;
  /** Whether 2MB range chunking is active (BitChord pattern) */
  is2MbChunked: boolean;
}

/** A single word/syllable span within a lyric line (for TTML-style sync). */
export interface WordSpan {
  /** Word start time in ms from track beginning */
  startMs: number;
  /** Word end time in ms from track beginning */
  endMs: number;
  /** Display text */
  text: string;
  /** Secondary/backing vocal indicator */
  isBackground?: boolean;
  /** Duet performer assignment */
  agent?: 'v1' | 'v2';
}

/** A single lyric line with optional word-level granularity. */
export interface LyricLine {
  /** Line start time in ms from track beginning */
  timeMs: number;
  /** Line duration in ms */
  durationMs: number;
  /** Full line text */
  text: string;
  /** Word-level spans for rich sync playback */
  words?: WordSpan[];
  /** Optional localized translation */
  translation?: string;
  /** Optional phonetic romanization */
  romanization?: string;
}

/** Dynamic palette extracted from artwork. */
export interface ArtworkPalette {
  /** Primary atmospheric wash color (hex) */
  dominant: string;
  /** Gradient complement color (hex) */
  secondary: string;
  /** Transport highlights, scrubber fill, active pills (hex) */
  accent: string;
  /** Deepest ambient color, blended with bg.base (hex) */
  shadow: string;
  /** Luminescent glow, particles, waveform peak accents (hex) */
  highlight: string;
}
