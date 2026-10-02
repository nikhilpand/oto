/**
 * TrackMatcher — 3-Phase Fuzzy Matching & Verification Engine
 *
 * Clean-room TypeScript reimplementation based on BitChord reverse engineering:
 * BITCHORD_RE/05_STREAM_RESOLUTION.md & docs/reverse_engineering/05_DATA_SOURCES_ADDONS_AND_REMOTES.md
 *
 * Prevents false-positive audio substitutions (e.g., matching a studio track to an acoustic take,
 * fan remix, live cut, or karaoke version).
 *
 * Enforces:
 * 1. Symmetrical Version Agreement (remix, live, acoustic, slowed, etc.)
 * 2. Packaging Metadata Stripping (film citations, official video tags, lyric markers)
 * 3. Duration Gating (hard 3000ms delta cutoff with steep penalty)
 * 4. Tokenized Artist Intersection
 */

import { parseDurationMillis } from '../../utils/durationParser';

export const VERSION_KEYWORDS = [
  'remix',
  'acoustic',
  'live',
  'instrumental',
  'slowed',
  'reverb',
  'edit',
  'deluxe',
  'unplugged',
  'orchestral',
  'sped up',
  'speed up',
  'lofi',
  'lo-fi',
  'dance mix',
  'club mix',
  'reprise',
  'cover',
  'demo',
] as const;

const PACKAGING_REGEX =
  /[\(\[](?:(?:official\s+)?(?:music\s+video|video|audio|visualizer|lyric\s+video|lyrics|remastered|remaster|hd|4k|explicit|clean)|from\s+.*?)[\)\]]|\s*(?:feat\.|ft\.|featuring)\s+[^()[\]]+/gi;

export interface MatchTarget {
  title: string;
  artist?: string;
  durationMs?: number;
}

export interface MatchCandidate {
  id: string;
  title: string;
  artist?: string;
  durationMs?: number;
  encryptedUrl?: string;
  source?: any;
}

/**
 * Unescapes HTML entities in title/artist strings.
 */
export function unescapeString(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '...')
    .trim();
}

/**
 * Extracts version modifiers (e.g. 'remix', 'acoustic', 'live') from a title.
 */
export function extractVersions(title: string): Set<string> {
  const norm = unescapeString(title).toLowerCase();
  const found = new Set<string>();

  for (const kw of VERSION_KEYWORDS) {
    const reg = new RegExp(`\\b${kw.replace('-', '[- ]')}\\b`, 'i');
    if (reg.test(norm)) {
      found.add(kw);
    }
  }

  return found;
}

/**
 * Strips packaging metadata, version brackets, and punctuation,
 * returning the canonical core title for linguistic comparison.
 */
export function cleanTitle(title: string): string {
  let cleaned = unescapeString(title).replace(PACKAGING_REGEX, '');

  for (const kw of VERSION_KEYWORDS) {
    const reg = new RegExp(
      `[\\(\\[\\{][^\\)\\]\\}]*?\\b${kw}\\b[^\\)\\]\\}]*?[\\)\\]\\}]`,
      'gi'
    );
    cleaned = cleaned.replace(reg, '');
  }

  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Levenshtein distance between two strings using dynamic programming.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const dp = new Array(s2.length + 1);
  for (let j = 0; j <= s2.length; j++) dp[j] = j;

  for (let i = 1; i <= s1.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= s2.length; j++) {
      const temp = dp[j];
      dp[j] =
        s1[i - 1] === s2[j - 1] ? prev : 1 + Math.min(dp[j - 1], dp[j], prev);
      prev = temp;
    }
  }

  return dp[s2.length];
}

/**
 * Calculates normalized string similarity in [0.0, 1.0].
 */
export function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1.0 - dist / maxLen);
}

/**
 * Computes composite match score S_match in [0.0, 1.0] following BitChord formulation.
 * Returns 0.0 on failed hard gates (version mismatch, excessive duration delta).
 */
export function scoreMatch(target: MatchTarget, candidate: MatchCandidate): number {
  // 1. Symmetric Version Gate: Mandatory agreement on version modifiers
  const targetVersions = extractVersions(target.title);
  const candVersions = extractVersions(candidate.title);

  if (targetVersions.size !== candVersions.size) {
    return 0.0;
  }
  for (const v of targetVersions) {
    if (!candVersions.has(v)) {
      return 0.0;
    }
  }

  // 2. Cleaned Core Title Similarity Gate
  const cleanTarget = cleanTitle(target.title);
  const cleanCand = cleanTitle(candidate.title);

  if (!cleanTarget || !cleanCand) {
    return 0.0;
  }

  const titleSim = stringSimilarity(cleanTarget, cleanCand);
  if (titleSim < 0.65) {
    return 0.0;
  }

  // 3. Artist Similarity (if available on both sides)
  let artistSim = 1.0;
  if (target.artist && candidate.artist) {
    const cleanTargetArtist = cleanTitle(target.artist);
    const cleanCandArtist = cleanTitle(candidate.artist);
    artistSim = stringSimilarity(cleanTargetArtist, cleanCandArtist);

    // If one artist is contained within the other (e.g. "Arijit Singh" in "Arijit Singh, Pritam")
    if (
      cleanCandArtist.includes(cleanTargetArtist) ||
      cleanTargetArtist.includes(cleanCandArtist)
    ) {
      artistSim = Math.max(artistSim, 0.9);
    }
  }

  // 4. Duration Delta Penalty (Steep piecewise function)
  let durPenalty = 0.0;
  if (
    typeof target.durationMs === 'number' &&
    target.durationMs > 0 &&
    typeof candidate.durationMs === 'number' &&
    candidate.durationMs > 0
  ) {
    const deltaMs = Math.abs(target.durationMs - candidate.durationMs);

    if (deltaMs <= 1500) {
      durPenalty = 0.0;
    } else if (deltaMs <= 3000) {
      durPenalty = ((deltaMs - 1500) / 1500) * 0.25;
    } else {
      // Hard cutoff: >3 seconds difference rejects immediately
      return 0.0;
    }
  }

  // BitChord composite formulation: 0.60 * title + 0.40 * artist - durPenalty
  const composite = 0.6 * titleSim + 0.4 * artistSim - durPenalty;
  return Math.max(0.0, Math.min(1.0, composite));
}

/**
 * Evaluates candidate tracks against the target and returns the best matching candidate.
 * Threshold is set to 0.70 minimum score.
 */
export function findBestMatch<T extends MatchCandidate>(
  target: MatchTarget,
  candidates: T[],
  threshold = 0.7
): T | null {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  let bestScore = -1;
  let bestCandidate: T | null = null;

  for (const cand of candidates) {
    const score = scoreMatch(target, cand);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  return bestCandidate;
}

// ─── Playback Identity Preservation & Duration Guard ──────────────────
// Reference: BitChord TrackIdentityMismatchTest.kt & QualityUpgrade.kt

/**
 * Past this threshold, two tracks sharing a title cannot share a recording.
 * Wide enough for a fade or trimmed intro, narrow enough to rule out
 * an extended cut, music video intro, or full-album upload.
 */
export const DURATION_LIMIT_SEC = 30;

/**
 * Within this many seconds is considered the same master recording (allowing for trimmed silence).
 */
export const UPGRADE_DRIFT_SEC = 2;

/**
 * Whether two runtimes differ by more than DURATION_LIMIT_SEC (30s), meaning
 * they cannot be the same recording. Used to detect when a cached or
 * live stream is a different edit from the requested catalogue track.
 *
 * @param expectedSec Authoritative catalogue duration in seconds
 * @param actualSec Runtime or cached decoder duration in seconds
 */
export function isSevereMismatch(
  expectedSec: number | null | undefined,
  actualSec: number | null | undefined
): boolean {
  if (expectedSec == null || actualSec == null) return false;
  return Math.abs(actualSec - expectedSec) > DURATION_LIMIT_SEC;
}

/**
 * Whether two runtimes are close enough (<= UPGRADE_DRIFT_SEC) to be the same recording,
 * for an audio upgrade swap into a track that is already playing.
 *
 * @param candidateSec Candidate stream duration in seconds
 * @param playingSec Currently playing / target duration in seconds
 */
export function sameRecordingAs(
  candidateSec: number | null | undefined,
  playingSec: number | null | undefined
): boolean {
  if (candidateSec == null || playingSec == null) return false;
  return Math.abs(candidateSec - playingSec) <= UPGRADE_DRIFT_SEC;
}

export interface DurationHolder {
  durationMs?: number;
  durationSec?: number;
  durationText?: string;
}

/**
 * Determines whether candidate duration is within toleranceSec of target.
 */
export function withinSeconds(
  candidate: DurationHolder | number,
  target: DurationHolder | number,
  toleranceSec = UPGRADE_DRIFT_SEC
): boolean {
  const getSec = (item: DurationHolder | number): number | null => {
    if (typeof item === 'number') return item;
    if (typeof item.durationSec === 'number') return item.durationSec;
    if (typeof item.durationMs === 'number') return Math.round(item.durationMs / 1000);
    if (typeof item.durationText === 'string') {
      const ms = parseDurationMillis(item.durationText);
      return Math.round(ms / 1000);
    }
    return null;
  };

  const cSec = getSec(candidate);
  const tSec = getSec(target);
  if (cSec == null || tSec == null) return false;
  return Math.abs(cSec - tSec) <= toleranceSec;
}

/**
 * Computes the effective target duration to match against during a quality upgrade.
 *
 * When runtime decoder duration differs severely from the known catalogue
 * duration (e.g. a 3:29 video edit playing for a 5:02 album track), the
 * authoritative catalogue duration is preserved so the correct recording can
 * be found without getting poisoned by the video edit runtime.
 *
 * @param expectedSec Authoritative catalogue duration in seconds
 * @param playingSec Current playback decoder duration in seconds
 * @returns Effective duration to search and match against
 */
export function effectiveTargetDuration(
  expectedSec: number | null | undefined,
  playingSec: number | null | undefined
): number | null {
  if (
    expectedSec != null &&
    playingSec != null &&
    isSevereMismatch(expectedSec, playingSec)
  ) {
    return expectedSec;
  }
  return playingSec ?? expectedSec ?? null;
}
