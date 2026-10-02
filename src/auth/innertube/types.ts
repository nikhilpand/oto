/**
 * YouTube Music Innertube Domain & Protocol Types
 *
 * Clean-room TypeScript definitions aligned with BitChord's Innertube models.
 */

export interface InnertubeAccount {
  name: string;
  email?: string;
  handle?: string;
  avatarUrl?: string;
  channelId?: string;
  pageId?: string;
  dataSyncId?: string;
}

export interface InnertubeSong {
  videoId: string;
  title: string;
  artist: string;
  artistId?: string;
  albumId?: string;
  albumName?: string;
  durationText?: string;
  thumbnailUrl?: string;
  isExplicit?: boolean;
  isVideo?: boolean;
}

export interface InnertubePlaylist {
  playlistId: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  isOwned?: boolean;
}

export interface InnertubeSession {
  cookie: string;
  sapisid: string;
  account?: InnertubeAccount;
  visitorData?: string;
  clientVersion?: string;
  dataSyncId?: string;
  pageId?: string;
  authUser?: string;
}

export interface InnertubeBrowseResult<T> {
  items: T[];
  continuation?: string;
}
