/**
 * Editorial Mock Data for Home Screen
 *
 * Provides structured catalog feeds for all 6 home sections with distinct geometries.
 */

import mockCatalog from '@/mock/mockCatalog.json';
import { Track } from '@/domain/types';
import { color } from '@/design/tokens';
import {
  HomeFeedData,
  ContinueListeningItem,
  MadeForYouItem,
  NewReleaseItem,
  MoodGenreItem,
  getGreeting,
} from '../types';

const catalogTracks = mockCatalog.tracks as Track[];

export const mockContinueListening: ContinueListeningItem[] = [
  {
    track: catalogTracks[0]!,
    progressPercent: 68,
    lastPlayedAt: Date.now() - 1000 * 60 * 25,
  },
  {
    track: catalogTracks[1]!,
    progressPercent: 34,
    lastPlayedAt: Date.now() - 1000 * 60 * 120,
  },
  {
    track: catalogTracks[2]!,
    progressPercent: 88,
    lastPlayedAt: Date.now() - 1000 * 60 * 360,
  },
  {
    track: catalogTracks[3]!,
    progressPercent: 15,
    lastPlayedAt: Date.now() - 1000 * 60 * 1440,
  },
];

export const mockMadeForYou: MadeForYouItem[] = [
  {
    id: 'mfy-1',
    title: 'Daily Mix 1',
    subtitle: 'Neon Valleys, Solar Winds & Aether',
    artworkUrl: catalogTracks[0]!.artworkUrl,
    thumbhash: catalogTracks[0]!.thumbhash,
    trackCount: 25,
    tracks: [catalogTracks[0]!, catalogTracks[1]!, catalogTracks[3]!],
  },
  {
    id: 'mfy-2',
    title: 'Night Drive Essentials',
    subtitle: 'Synthesizers, dusk rhythms, and neon cityscapes',
    artworkUrl: catalogTracks[2]!.artworkUrl,
    thumbhash: catalogTracks[2]!.thumbhash,
    trackCount: 32,
    tracks: [catalogTracks[2]!, catalogTracks[4]!, catalogTracks[0]!],
  },
  {
    id: 'mfy-3',
    title: 'Deep Focus Ambient',
    subtitle: 'Minimal textures and floating soundscapes',
    artworkUrl: catalogTracks[3]!.artworkUrl,
    thumbhash: catalogTracks[3]!.thumbhash,
    trackCount: 40,
    tracks: [catalogTracks[3]!, catalogTracks[1]!, catalogTracks[4]!],
  },
  {
    id: 'mfy-4',
    title: 'Analog Warmth',
    subtitle: 'Tape saturation, rhodes keys, and soulful chords',
    artworkUrl: catalogTracks[4]!.artworkUrl,
    thumbhash: catalogTracks[4]!.thumbhash,
    trackCount: 28,
    tracks: [catalogTracks[4]!, catalogTracks[0]!, catalogTracks[2]!],
  },
];

export const mockNewReleases: NewReleaseItem[] = [
  {
    id: 'nr-1',
    title: 'Electric Horizons',
    artist: 'Neon Valleys',
    artworkUrl: catalogTracks[0]!.artworkUrl,
    thumbhash: catalogTracks[0]!.thumbhash,
    releaseBadge: 'NEW',
    tracks: [catalogTracks[0]!],
  },
  {
    id: 'nr-2',
    title: 'Amber Sessions',
    artist: 'Solar Winds',
    artworkUrl: catalogTracks[1]!.artworkUrl,
    thumbhash: catalogTracks[1]!.thumbhash,
    releaseBadge: 'SEP 28',
    tracks: [catalogTracks[1]!],
  },
  {
    id: 'nr-3',
    title: 'Floating Point',
    artist: 'Aether',
    artworkUrl: catalogTracks[3]!.artworkUrl,
    thumbhash: catalogTracks[3]!.thumbhash,
    releaseBadge: 'SEP 24',
    tracks: [catalogTracks[3]!],
  },
  {
    id: 'nr-4',
    title: 'City Lights Vol. 2',
    artist: 'Metro Pulse',
    artworkUrl: catalogTracks[2]!.artworkUrl,
    thumbhash: catalogTracks[2]!.thumbhash,
    releaseBadge: 'SEP 19',
    tracks: [catalogTracks[2]!],
  },
];

export const mockMoodsGenres: MoodGenreItem[] = [
  {
    id: 'mg-1',
    title: 'Deep Focus',
    description: 'Ambient textures and gentle electronic pulse',
    accentColor: '#38bdf8',
    gradientColors: [color.bg.s1, color.bg.s3],
    trackCount: 48,
  },
  {
    id: 'mg-2',
    title: 'Night Drive',
    description: 'Cinematic synths, retro drum machines, neon glows',
    accentColor: '#fb7185',
    gradientColors: [color.bg.base, color.bg.s2],
    trackCount: 54,
  },
  {
    id: 'mg-3',
    title: 'Acoustic Warmth',
    description: 'Intimate fingerstyle guitars and soft piano',
    accentColor: '#fbbf24',
    gradientColors: [color.bg.base, color.bg.s2],
    trackCount: 36,
  },
  {
    id: 'mg-4',
    title: 'Atmospheric Bass',
    description: 'Sub-heavy rhythms, UK garage, and broken beat',
    accentColor: '#a78bfa',
    gradientColors: [color.bg.s1, color.bg.s3],
    trackCount: 42,
  },
  {
    id: 'mg-5',
    title: 'Floating Point',
    description: 'Ethereal sound design, generative drones, calm',
    accentColor: '#34d399',
    gradientColors: [color.bg.base, color.bg.s2],
    trackCount: 60,
  },
  {
    id: 'mg-6',
    title: 'Golden Hour',
    description: 'Warm soul, neo-classical, and evening jazz',
    accentColor: '#f97316',
    gradientColors: [color.bg.base, color.bg.s1],
    trackCount: 39,
  },
];

export function getMockHomeFeed(): HomeFeedData {
  return {
    greeting: getGreeting(),
    heroTrack: catalogTracks[0]!,
    continueListening: mockContinueListening,
    madeForYou: mockMadeForYou,
    quickPicks: catalogTracks.slice(0, 6),
    newReleases: mockNewReleases,
    moodsGenres: mockMoodsGenres,
  };
}
