/**
 * Mock data for P10 detail screens.
 * Reuses mock catalog tracks; artwork URLs are royalty-free placeholders.
 */
import mockCatalog from '@/mock/mockCatalog.json';
import type { Track } from '@/domain/types';
import type { Album, Artist, ArtistAlbum, Playlist, RelatedArtist } from './types';

const tracks = mockCatalog.tracks as Track[];

const PLACEHOLDER = 'https://picsum.photos/seed/oto/400/400';
const THUMB = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

export const MOCK_ALBUM: Album = {
  id: 'album-1',
  title: 'Midnight Architecture',
  artist: 'Neon Drift',
  artworkUrl: PLACEHOLDER,
  thumbhash: THUMB,
  year: 2024,
  totalTracks: tracks.length,
  durationMs: tracks.reduce((s, t) => s + t.durationMs, 0),
  tracks,
  isExplicit: false,
  genre: 'Electronic',
};

const artistAlbums: ArtistAlbum[] = [
  { id: 'album-1', title: 'Midnight Architecture', artworkUrl: PLACEHOLDER, thumbhash: THUMB, year: 2024, type: 'Album', trackCount: 12 },
  { id: 'ep-1', title: 'Signal EP', artworkUrl: 'https://picsum.photos/seed/ep1/400/400', thumbhash: THUMB, year: 2023, type: 'EP', trackCount: 4 },
  { id: 'single-1', title: 'Neon Drift (Single)', artworkUrl: 'https://picsum.photos/seed/sg1/400/400', thumbhash: THUMB, year: 2022, type: 'Single', trackCount: 1 },
];

const related: RelatedArtist[] = [
  { id: 'r1', name: 'Solar Winds', artworkUrl: 'https://picsum.photos/seed/r1/200/200', thumbhash: THUMB },
  { id: 'r2', name: 'Echo Protocol', artworkUrl: 'https://picsum.photos/seed/r2/200/200', thumbhash: THUMB },
  { id: 'r3', name: 'Pulse Theory', artworkUrl: 'https://picsum.photos/seed/r3/200/200', thumbhash: THUMB },
];

export const MOCK_ARTIST: Artist = {
  id: 'artist-1',
  name: 'Neon Drift',
  artworkUrl: 'https://picsum.photos/seed/artist1/800/400',
  thumbhash: THUMB,
  bio: 'Pioneering the atmospheric electronic sound since 2018.',
  monthlyListeners: 4_200_000,
  popularTracks: tracks.slice(0, 5),
  discography: artistAlbums,
  related,
};

export const MOCK_PLAYLIST: Playlist = {
  id: 'playlist-1',
  title: 'Deep Focus',
  description: 'Music to help you concentrate and get in the zone.',
  artworkUrl: 'https://picsum.photos/seed/playlist1/400/400',
  thumbhash: THUMB,
  owner: 'OTO Editorial',
  totalTracks: tracks.length,
  durationMs: tracks.reduce((s, t) => s + t.durationMs, 0),
  tracks,
};
