/**
 * Library Module — Domain Types
 */

import { Track } from '@/domain/types';
import { SearchAlbum, SearchArtist, SearchPlaylist } from '@/search/types';

export type LibraryFilter = 'all' | 'playlists' | 'albums' | 'artists' | 'downloads';
export type LibrarySortOrder = 'recent' | 'az' | 'za';
export type LibraryViewMode = 'list' | 'grid';

export interface LibraryFilterChip {
  id: LibraryFilter;
  label: string;
}

export const LIBRARY_FILTER_CHIPS: LibraryFilterChip[] = [
  { id: 'all',       label: 'All' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums',    label: 'Albums' },
  { id: 'artists',   label: 'Artists' },
  { id: 'downloads', label: 'Downloads' },
];

export type DownloadStatus = 'downloaded' | 'downloading' | 'queued' | 'failed' | 'none';

export interface DownloadState {
  status: DownloadStatus;
  progress?: number; // 0–100, only when status === 'downloading'
}

export type LibraryItemKind = 'playlist' | 'album' | 'artist' | 'song';

export interface LibraryItem {
  id: string;
  kind: LibraryItemKind;
  title: string;
  subtitle: string;
  artworkUrl: string;
  thumbhash: string;
  download: DownloadState;
  addedAt: string;
  playlist?: SearchPlaylist;
  album?: SearchAlbum;
  artist?: SearchArtist;
}

export interface LikedSongsInfo {
  count: number;
  recentArtworkUrls: string[];
  tracks: Track[];
}
