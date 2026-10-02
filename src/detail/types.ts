/**
 * OTO Detail Screen Domain Types (P10)
 */
import type { Track } from '@/domain/types';

export interface Album {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  thumbhash: string;
  year: number;
  totalTracks: number;
  durationMs: number;
  tracks: Track[];
  isExplicit: boolean;
  genre?: string;
}

export type DiscographyFilter = 'Albums' | 'EPs' | 'Singles';

export interface RelatedArtist {
  id: string;
  name: string;
  artworkUrl: string;
  thumbhash: string;
}

export interface ArtistAlbum {
  id: string;
  title: string;
  artworkUrl: string;
  thumbhash: string;
  year: number;
  type: 'Album' | 'EP' | 'Single';
  trackCount: number;
}

export interface Artist {
  id: string;
  name: string;
  artworkUrl: string;
  thumbhash: string;
  bio?: string;
  monthlyListeners: number;
  popularTracks: Track[];
  discography: ArtistAlbum[];
  related: RelatedArtist[];
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  artworkUrl: string;
  thumbhash: string;
  owner: string;
  totalTracks: number;
  durationMs: number;
  tracks: Track[];
}

export type ContextAction =
  | 'play_next'
  | 'add_to_queue'
  | 'add_to_playlist'
  | 'like'
  | 'download'
  | 'share';
