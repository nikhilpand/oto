/**
 * Search Engine
 *
 * Debounced, tokenized fuzzy-match search with sequence-token cancellation.
 *
 * Protocol:
 *   User types → SearchInputBar (< 16ms state update)
 *              → 180ms debounce
 *              → query(text, sequenceId)
 *              → if sequenceId < currentToken: discard (cancelled)
 *              → score → group → return SearchResults
 */

import { Track } from '@/domain/types';
import {
  SearchArtist,
  SearchAlbum,
  SearchPlaylist,
  TopResult,
  SearchResults,
} from '../types';
import {
  CATALOG_TRACKS,
  CATALOG_ARTISTS,
  CATALOG_ALBUMS,
  CATALOG_PLAYLISTS,
} from '../data/searchCatalog';

// ─── Tokenizer ────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreString(candidate: string, queryTokens: string[]): number {
  if (!queryTokens.length) return 0;
  const lower = candidate.toLowerCase();
  let matched = 0;
  for (const token of queryTokens) {
    if (lower.includes(token)) matched++;
  }
  return matched / queryTokens.length;
}

// ─── Per-entity scoring ───────────────────────────────────────────────

function scoreTrack(track: Track, tokens: string[]): number {
  return Math.min(
    1,
    scoreString(track.title,  tokens) * 1.0 +
    scoreString(track.artist, tokens) * 0.7 +
    scoreString(track.album,  tokens) * 0.4,
  );
}

function scoreArtist(artist: SearchArtist, tokens: string[]): number {
  return scoreString(artist.name, tokens);
}

function scoreAlbum(album: SearchAlbum, tokens: string[]): number {
  return Math.min(1,
    scoreString(album.title,  tokens) * 0.9 +
    scoreString(album.artist, tokens) * 0.5,
  );
}

function scorePlaylist(playlist: SearchPlaylist, tokens: string[]): number {
  return Math.min(1,
    scoreString(playlist.title,       tokens) * 0.9 +
    scoreString(playlist.description, tokens) * 0.3,
  );
}

// ─── Cancellation Token ───────────────────────────────────────────────

let currentToken = 0;

export function nextSequenceToken(): number { return ++currentToken; }
export function isCurrentToken(token: number): boolean { return token === currentToken; }

// ─── Main Query ───────────────────────────────────────────────────────

const THRESHOLD = 0.15;

export function query(text: string, sequenceToken: number): SearchResults | null {
  if (!isCurrentToken(sequenceToken)) return null;

  const trimmed = text.trim();
  if (!trimmed) {
    return { query: '', topResult: null, tracks: [], artists: [], albums: [], playlists: [] };
  }

  const tokens = tokenize(trimmed);

  const scoredTracks = CATALOG_TRACKS
    .map((t) => ({ entity: t, score: scoreTrack(t, tokens) }))
    .filter((x) => x.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const scoredArtists = CATALOG_ARTISTS
    .map((a) => ({ entity: a, score: scoreArtist(a, tokens) }))
    .filter((x) => x.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const scoredAlbums = CATALOG_ALBUMS
    .map((a) => ({ entity: a, score: scoreAlbum(a, tokens) }))
    .filter((x) => x.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const scoredPlaylists = CATALOG_PLAYLISTS
    .map((p) => ({ entity: p, score: scorePlaylist(p, tokens) }))
    .filter((x) => x.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (!isCurrentToken(sequenceToken)) return null;

  const candidates: TopResult[] = [
    ...(scoredTracks[0]    ? [{ kind: 'track'    as const, score: scoredTracks[0].score    * 1.1, track:    scoredTracks[0].entity    }] : []),
    ...(scoredArtists[0]   ? [{ kind: 'artist'   as const, score: scoredArtists[0].score   * 1.2, artist:   scoredArtists[0].entity   }] : []),
    ...(scoredAlbums[0]    ? [{ kind: 'album'    as const, score: scoredAlbums[0].score    * 1.0, album:    scoredAlbums[0].entity    }] : []),
    ...(scoredPlaylists[0] ? [{ kind: 'playlist' as const, score: scoredPlaylists[0].score * 0.9, playlist: scoredPlaylists[0].entity }] : []),
  ].sort((a, b) => b.score - a.score);

  return {
    query: trimmed,
    topResult: candidates[0] ?? null,
    tracks:    scoredTracks.map((x) => x.entity),
    artists:   scoredArtists.map((x) => x.entity),
    albums:    scoredAlbums.map((x) => x.entity),
    playlists: scoredPlaylists.map((x) => x.entity),
  };
}
