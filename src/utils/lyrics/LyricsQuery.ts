/**
 * LyricsQuery — Lyrics Search Query Builder
 *
 * Normalizes track metadata into a search query for lyrics providers.
 * Handles common title noise (feat., brackets, parenthetical remixes)
 * and artist name normalization for best fuzzy-match results.
 *
 * @classification ALGORITHM_PORT
 * @priority P1
 * @portedFrom BitChord: data/lyrics/LyricsQuery.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Algorithm port — title/artist normalization for lyrics lookup.
 */

import { Track } from '@/domain/types';

// ─── Types ────────────────────────────────────────────────────────────

export interface LyricsQueryParams {
  /** Normalized track title for search */
  title: string;
  /** Normalized primary artist name */
  artist: string;
  /** Album name (optional, used as tiebreaker) */
  album?: string;
  /** Track duration in ms (used for verification, ±3s tolerance) */
  durationMs: number;
  /** Original un-normalized title for display */
  originalTitle: string;
  /** Original un-normalized artist for display */
  originalArtist: string;
}

// ─── Normalization Helpers ────────────────────────────────────────────

/** Patterns stripped from titles before lyrics search */
const TITLE_NOISE_PATTERNS: RegExp[] = [
  /\s*\(feat\.?\s+[^)]*\)/gi,
  /\s*\[feat\.?\s+[^[\]]*\]/gi,
  /\s*ft\.?\s+.+$/gi,
  /\s*\(with\s+[^)]*\)/gi,
  /\s*\[with\s+[^[\]]*\]/gi,
  /\s*-\s*\d{4}\s*(remaster(ed)?|edition)/gi,
  /\s*\(remaster(ed)?\s*(\d{4})?\)/gi,
  /\s*\[remaster(ed)?\s*(\d{4})?\]/gi,
];

/** Version markers that should be PRESERVED (they identify different tracks) */
const VERSION_MARKERS = /\((remix|acoustic|live|demo|radio edit|unplugged|instrumental|karaoke)\)/gi;

/**
 * Normalize a track title for lyrics search.
 * Strips featuring credits, remaster tags, and year suffixes,
 * but preserves version markers (Remix, Acoustic, Live, etc.).
 */
export function normalizeTitle(raw: string): string {
  // Extract version markers before stripping noise
  const markers: string[] = [];
  let cleaned = raw;

  const markerMatch = cleaned.match(VERSION_MARKERS);
  if (markerMatch) {
    markers.push(...markerMatch);
  }

  // Strip noise patterns
  for (const pattern of TITLE_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Re-append version markers if they were stripped
  for (const marker of markers) {
    if (!cleaned.includes(marker)) {
      cleaned = `${cleaned} ${marker}`;
    }
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize an artist name for lyrics search.
 * Takes only the primary artist (before commas, &, "and").
 */
export function normalizeArtist(raw: string): string {
  // Split on common delimiters, take first
  const primary = raw.split(/[,&]|(?:\s+and\s+)/i)[0] ?? raw;
  return primary.replace(/\s+/g, ' ').trim();
}

// ─── Public API ───────────────────────────────────────────────────────

export const LyricsQuery = {
  /**
   * Build a normalized lyrics query from a Track.
   */
  fromTrack(track: Track): LyricsQueryParams {
    return {
      title: normalizeTitle(track.title),
      artist: normalizeArtist(track.artist),
      album: track.album || undefined,
      durationMs: track.durationMs,
      originalTitle: track.title,
      originalArtist: track.artist,
    };
  },

  /**
   * Build a query from raw strings (for manual search).
   */
  fromRaw(params: {
    title: string;
    artist: string;
    album?: string;
    durationMs: number;
  }): LyricsQueryParams {
    return {
      title: normalizeTitle(params.title),
      artist: normalizeArtist(params.artist),
      album: params.album,
      durationMs: params.durationMs,
      originalTitle: params.title,
      originalArtist: params.artist,
    };
  },

  /**
   * Check if a candidate lyrics result duration is within acceptable tolerance.
   * Gate: |candidate − query| ≤ 3000ms (3 seconds).
   */
  isDurationMatch(queryDurationMs: number, candidateDurationMs: number): boolean {
    return Math.abs(queryDurationMs - candidateDurationMs) <= 3000;
  },
} as const;
