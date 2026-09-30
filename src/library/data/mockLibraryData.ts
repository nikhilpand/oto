/**
 * Library Mock Data
 */

import { CATALOG_TRACKS, CATALOG_ALBUMS, CATALOG_ARTISTS, CATALOG_PLAYLISTS } from '@/search/data/searchCatalog';
import { LibraryItem, LikedSongsInfo } from '../types';

const THUMB = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export const MOCK_LIBRARY_ITEMS: LibraryItem[] = [
  { id: 'li1', kind: 'playlist', title: 'Pop Hits 2024',    subtitle: '50 songs',             artworkUrl: 'https://picsum.photos/seed/pl1/400/400', thumbhash: THUMB, download: { status: 'downloaded' },              addedAt: '2024-08-10T12:00:00Z', playlist: CATALOG_PLAYLISTS[0] },
  { id: 'li2', kind: 'album',    title: 'Future Nostalgia', subtitle: 'Dua Lipa · 2020',      artworkUrl: 'https://picsum.photos/seed/al2/400/400', thumbhash: THUMB, download: { status: 'downloading', progress: 67 }, addedAt: '2024-09-01T08:30:00Z', album:    CATALOG_ALBUMS[1] },
  { id: 'li3', kind: 'artist',   title: 'The Weeknd',       subtitle: '42 songs',             artworkUrl: 'https://picsum.photos/seed/a1/400/400',  thumbhash: THUMB, download: { status: 'none' },                   addedAt: '2024-07-15T20:00:00Z', artist:   CATALOG_ARTISTS[0] },
  { id: 'li4', kind: 'album',    title: 'After Hours',      subtitle: 'The Weeknd · 2020',    artworkUrl: 'https://picsum.photos/seed/al1/400/400', thumbhash: THUMB, download: { status: 'queued' },                  addedAt: '2024-09-15T14:00:00Z', album:    CATALOG_ALBUMS[0] },
  { id: 'li5', kind: 'playlist', title: 'Late Night Drive', subtitle: '35 songs',             artworkUrl: 'https://picsum.photos/seed/pl3/400/400', thumbhash: THUMB, download: { status: 'failed' },                  addedAt: '2024-06-28T22:00:00Z', playlist: CATALOG_PLAYLISTS[2] },
  { id: 'li6', kind: 'album',    title: 'Midnights',        subtitle: 'Taylor Swift · 2022',  artworkUrl: 'https://picsum.photos/seed/al5/400/400', thumbhash: THUMB, download: { status: 'none' },                   addedAt: '2024-05-20T10:00:00Z', album:    CATALOG_ALBUMS[4] },
  { id: 'li7', kind: 'artist',   title: 'Billie Eilish',    subtitle: '29 songs',             artworkUrl: 'https://picsum.photos/seed/a4/400/400',  thumbhash: THUMB, download: { status: 'none' },                   addedAt: '2024-04-12T18:00:00Z', artist:   CATALOG_ARTISTS[3] },
  { id: 'li8', kind: 'album',    title: 'SOUR',             subtitle: 'Olivia Rodrigo · 2021',artworkUrl: 'https://picsum.photos/seed/al4/400/400', thumbhash: THUMB, download: { status: 'downloaded' },              addedAt: '2024-03-05T09:00:00Z', album:    CATALOG_ALBUMS[3] },
];

export const LIKED_SONGS_INFO: LikedSongsInfo = {
  count: 247,
  recentArtworkUrls: [
    'https://picsum.photos/seed/t14/400/400',
    'https://picsum.photos/seed/t1/400/400',
    'https://picsum.photos/seed/t6/400/400',
    'https://picsum.photos/seed/t8/400/400',
  ],
  tracks: CATALOG_TRACKS,
};
