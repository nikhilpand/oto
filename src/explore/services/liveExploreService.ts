/**
 * liveExploreService — Live YouTube Music Explore & Moods Engine
 *
 * Clean-room implementation based on BitChord's YtMusicRepository.kt:
 * - Queries Innertube 'FEmusic_moods_and_genres' to extract categorized mood/genre tiles
 * - Assigns deterministic high-vibrancy gradients matching BitChord's hash formula
 * - Supports fallback to curated high-fidelity categories when offline
 */

import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { collectRenderers, runsText } from '@/auth/innertube/innertubeParsers';
import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import type { ExploreCardItem } from '../data/exploreData';

export interface LiveExploreSection {
  readonly title: string;
  readonly items: ExploreCardItem[];
}

/**
 * Deterministic color pair matching BitChord's moodColor() algorithm.
 */
export function getMoodGradient(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % 8;
  const basePalette: [string, string][] = [
    ['#E64A19', '#9C3211'],
    ['#EC0B65', '#A00745'],
    ['#8664AC', '#5B4475'],
    ['#6B4EFF', '#4835AD'],
    ['#BE6100', '#814200'],
    ['#233C78', '#182952'],
    ['#4D97E5', '#34669C'],
    ['#AA267E', '#731A55'],
  ];
  return basePalette[idx] ?? ['#6B4EFF', '#4835AD'];
}

export const FALLBACK_FOR_YOU: ExploreCardItem[] = [
  { id: 'energize', title: 'Energize', gradientColors: ['#FF5E3A', '#FF2A68'], query: 'Energize EDM High Energy' },
  { id: 'gaming', title: 'Gaming', gradientColors: ['#8E2DE2', '#4A00E0'], query: 'Gaming synthwave electronic' },
  { id: 'punjabi', title: 'Punjabi', gradientColors: ['#F7971E', '#FFD200'], query: 'Punjabi hits' },
  { id: 'workout', title: 'Workout', gradientColors: ['#ED213A', '#93291E'], query: 'Workout motivation gym' },
  { id: 'rock', title: 'Rock', gradientColors: ['#2C3E50', '#000000'], query: 'Rock classics' },
  { id: 'chill', title: 'Chill', gradientColors: ['#3A1C71', '#D76D77'], query: 'Chill lo-fi acoustic' },
];

export const FALLBACK_MOODS: ExploreCardItem[] = [
  { id: 'focus', title: 'Focus', gradientColors: ['#4776E6', '#8E54E9'], query: 'Deep focus ambient study' },
  { id: 'party', title: 'Party', gradientColors: ['#F12711', '#F5AF19'], query: 'Party club dance' },
  { id: 'sleep', title: 'Sleep', gradientColors: ['#0F2027', '#203A43'], query: 'Sleep calm rain sounds' },
  { id: 'romance', title: 'Romance', gradientColors: ['#E55D87', '#5FC3E4'], query: 'Romantic love songs' },
];

/**
 * Parses raw InnerTube 'FEmusic_moods_and_genres' JSON into typed sections.
 */
export function parseMoodAndGenresResponse(root: any): LiveExploreSection[] {
  if (!root) return [];
  const sections: LiveExploreSection[] = [];
  const grids = collectRenderers(root, 'gridRenderer');

  for (const grid of grids) {
    const title = runsText(grid.header?.gridHeaderRenderer?.title) || 'Explore';
    const items: ExploreCardItem[] = [];
    const rawItems = Array.isArray(grid.items) ? grid.items : [];

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const button = raw.musicNavigationButtonRenderer;
      if (!button) continue;
      const endpoint =
        button.clickCommand?.browseEndpoint ?? button.navigationEndpoint?.browseEndpoint;
      const browseId = endpoint?.browseId;
      const params = endpoint?.params;
      const label = runsText(button.buttonText);
      if (!label || !browseId) continue;

      items.push({
        id: `${browseId}_${params ?? ''}`,
        title: label,
        browseId,
        params,
        gradientColors: getMoodGradient(label),
        query: label,
      });
    }

    if (title && items.length > 0) {
      sections.push({ title, items });
    }
  }

  return sections;
}

/**
 * Fetches live explore sections from YouTube Music, falling back to curated data.
 */
export async function fetchLiveExploreSections(): Promise<LiveExploreSection[]> {
  try {
    const session = GoogleAuthStore.toInnertubeSession();
    const raw = await innertubeClient.browse('FEmusic_moods_and_genres', undefined, session);
    const parsed = parseMoodAndGenresResponse(raw);

    if (parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[liveExploreService] Failed to fetch live moods/genres, using fallback:', err);
  }

  return [
    { title: 'For you', items: FALLBACK_FOR_YOU },
    { title: 'Moods & moments', items: FALLBACK_MOODS },
  ];
}
