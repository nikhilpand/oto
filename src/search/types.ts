/**
 * Search Module — Domain Types
 *
 * Data contracts for search results, recent queries, and catalog entries.
 */

import { Track } from '@/domain/types';

// ─── Catalog Entities ─────────────────────────────────────────────────

export interface SearchArtist {
  id: string;
  name: string;
  artworkUrl: string;
  thumbhash: string;
  trackCount: number;
  isVerified: boolean;
}

export interface SearchAlbum {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  thumbhash: string;
  year: number;
  trackCount: number;
  tracks: Track[];
}

export interface SearchPlaylist {
  id: string;
  title: string;
  description: string;
  artworkUrl: string;
  thumbhash: string;
  trackCount: number;
  curated: boolean;
  tracks: Track[];
}

// ─── Search Result Groups ─────────────────────────────────────────────

export type TopResultKind = 'track' | 'artist' | 'album' | 'playlist';

export interface TopResult {
  kind: TopResultKind;
  score: number;
  track?: Track;
  artist?: SearchArtist;
  album?: SearchAlbum;
  playlist?: SearchPlaylist;
}

export interface SearchResults {
  query: string;
  topResult: TopResult | null;
  tracks: Track[];
  artists: SearchArtist[];
  albums: SearchAlbum[];
  playlists: SearchPlaylist[];
}

// ─── Recent Searches ──────────────────────────────────────────────────

export interface RecentQuery {
  query: string;
  timestamp: number;
}

// ─── Suggestion Chips ────────────────────────────────────────────────

export interface SearchSuggestion {
  id: string;
  label: string;
  accentColor: string;
}
