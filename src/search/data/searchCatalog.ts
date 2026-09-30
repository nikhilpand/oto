/**
 * Search Catalog — Mock Dataset
 *
 * Comprehensive in-memory catalog for offline and simulated search.
 */

import { Track } from '@/domain/types';
import { SearchArtist, SearchAlbum, SearchPlaylist, SearchSuggestion } from '../types';

const THUMB = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

const t = (id: string, title: string, artist: string, album: string, durationMs: number): Track => ({
  id,
  title,
  artist,
  artists: [artist],
  album,
  durationMs,
  artworkUrl: `https://picsum.photos/seed/${id}/400/400`,
  thumbhash: THUMB,
  isExplicit: false,
  audioFormat: 'aac',
  bitrate: 320,
});

export const CATALOG_TRACKS: Track[] = [
  t('t1',  'Blinding Lights',    'The Weeknd',     'After Hours',                200040),
  t('t2',  'Save Your Tears',    'The Weeknd',     'After Hours',                215640),
  t('t3',  'Starboy',            'The Weeknd',     'Starboy',                    230400),
  t('t4',  'As It Was',          'Harry Styles',   "Harry's House",              167360),
  t('t5',  'Watermelon Sugar',   'Harry Styles',   'Fine Line',                  174000),
  t('t6',  'Levitating',         'Dua Lipa',       'Future Nostalgia',           203064),
  t('t7',  "Don't Start Now",    'Dua Lipa',       'Future Nostalgia',           183960),
  t('t8',  'Bad Guy',            'Billie Eilish',  'When We All Fall Asleep',    194088),
  t('t9',  'Happier Than Ever',  'Billie Eilish',  'Happier Than Ever',          295000),
  t('t10', 'Peaches',            'Justin Bieber',  'Justice',                    198240),
  t('t11', 'Stay',               'Justin Bieber',  'Justice',                    141000),
  t('t12', 'drivers license',    'Olivia Rodrigo', 'SOUR',                       242360),
  t('t13', 'good 4 u',           'Olivia Rodrigo', 'SOUR',                       178560),
  t('t14', 'Anti-Hero',          'Taylor Swift',   'Midnights',                  200696),
  t('t15', 'Cruel Summer',       'Taylor Swift',   'Lover',                      178427),
  t('t16', 'Flowers',            'Miley Cyrus',    'Endless Summer Vacation',    200280),
  t('t17', 'Unholy',             'Sam Smith',      'Gloria',                     156995),
  t('t18', 'Escapism',           'RAYE',           'My 21st Century Blues',      219000),
  t('t19', 'Calm Down',          'Rema',           'Rave & Roses Ultra',         238000),
  t('t20', 'SNAP',               'Rosa Linn',      'SNAP',                       188000),
];

export const CATALOG_ARTISTS: SearchArtist[] = [
  { id: 'a1', name: 'The Weeknd',     artworkUrl: 'https://picsum.photos/seed/a1/400/400', thumbhash: THUMB, trackCount: 42, isVerified: true },
  { id: 'a2', name: 'Harry Styles',   artworkUrl: 'https://picsum.photos/seed/a2/400/400', thumbhash: THUMB, trackCount: 31, isVerified: true },
  { id: 'a3', name: 'Dua Lipa',       artworkUrl: 'https://picsum.photos/seed/a3/400/400', thumbhash: THUMB, trackCount: 38, isVerified: true },
  { id: 'a4', name: 'Billie Eilish',  artworkUrl: 'https://picsum.photos/seed/a4/400/400', thumbhash: THUMB, trackCount: 29, isVerified: true },
  { id: 'a5', name: 'Taylor Swift',   artworkUrl: 'https://picsum.photos/seed/a5/400/400', thumbhash: THUMB, trackCount: 89, isVerified: true },
  { id: 'a6', name: 'Olivia Rodrigo', artworkUrl: 'https://picsum.photos/seed/a6/400/400', thumbhash: THUMB, trackCount: 24, isVerified: true },
];

export const CATALOG_ALBUMS: SearchAlbum[] = [
  { id: 'al1', title: 'After Hours',      artist: 'The Weeknd',     artworkUrl: 'https://picsum.photos/seed/al1/400/400', thumbhash: THUMB, year: 2020, trackCount: 14, tracks: [CATALOG_TRACKS[0]!, CATALOG_TRACKS[1]!] },
  { id: 'al2', title: 'Future Nostalgia', artist: 'Dua Lipa',       artworkUrl: 'https://picsum.photos/seed/al2/400/400', thumbhash: THUMB, year: 2020, trackCount: 11, tracks: [CATALOG_TRACKS[5]!, CATALOG_TRACKS[6]!] },
  { id: 'al3', title: "Harry's House",    artist: 'Harry Styles',   artworkUrl: 'https://picsum.photos/seed/al3/400/400', thumbhash: THUMB, year: 2022, trackCount: 13, tracks: [CATALOG_TRACKS[3]!] },
  { id: 'al4', title: 'SOUR',             artist: 'Olivia Rodrigo', artworkUrl: 'https://picsum.photos/seed/al4/400/400', thumbhash: THUMB, year: 2021, trackCount: 11, tracks: [CATALOG_TRACKS[11]!, CATALOG_TRACKS[12]!] },
  { id: 'al5', title: 'Midnights',        artist: 'Taylor Swift',   artworkUrl: 'https://picsum.photos/seed/al5/400/400', thumbhash: THUMB, year: 2022, trackCount: 13, tracks: [CATALOG_TRACKS[13]!, CATALOG_TRACKS[14]!] },
];

export const CATALOG_PLAYLISTS: SearchPlaylist[] = [
  { id: 'pl1', title: 'Pop Hits 2024',    description: 'The biggest pop tracks right now', artworkUrl: 'https://picsum.photos/seed/pl1/400/400', thumbhash: THUMB, trackCount: 50, curated: true,  tracks: CATALOG_TRACKS.slice(0, 5) },
  { id: 'pl2', title: 'Chill Vibes',      description: 'Laid-back beats for any time',    artworkUrl: 'https://picsum.photos/seed/pl2/400/400', thumbhash: THUMB, trackCount: 40, curated: true,  tracks: CATALOG_TRACKS.slice(5, 10) },
  { id: 'pl3', title: 'Late Night Drive', description: 'Atmospheric slow burners',         artworkUrl: 'https://picsum.photos/seed/pl3/400/400', thumbhash: THUMB, trackCount: 35, curated: false, tracks: CATALOG_TRACKS.slice(10, 15) },
  { id: 'pl4', title: 'Workout Energy',   description: 'High-BPM fuel for your session',  artworkUrl: 'https://picsum.photos/seed/pl4/400/400', thumbhash: THUMB, trackCount: 45, curated: true,  tracks: CATALOG_TRACKS.slice(0, 8) },
  { id: 'pl5', title: 'Morning Coffee',   description: 'Gentle acoustic wakeup call',     artworkUrl: 'https://picsum.photos/seed/pl5/400/400', thumbhash: THUMB, trackCount: 30, curated: false, tracks: CATALOG_TRACKS.slice(3, 7) },
];

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { id: 'sg1',  label: 'Pop',        accentColor: '#E5A93C' },
  { id: 'sg2',  label: 'Hip-Hop',    accentColor: '#9B59B6' },
  { id: 'sg3',  label: 'R&B',        accentColor: '#E91E63' },
  { id: 'sg4',  label: 'Electronic', accentColor: '#00BCD4' },
  { id: 'sg5',  label: 'Rock',       accentColor: '#FF5722' },
  { id: 'sg6',  label: 'Indie',      accentColor: '#8BC34A' },
  { id: 'sg7',  label: 'Chill',      accentColor: '#5C6BC0' },
  { id: 'sg8',  label: 'Workout',    accentColor: '#F44336' },
  { id: 'sg9',  label: 'Late Night', accentColor: '#1A237E' },
  { id: 'sg10', label: 'Afrobeats',  accentColor: '#FF8F00' },
];
