/**
 * Home Screen Domain Types & Feed Models
 *
 * Defines the editorial data contracts for the 6 varied visual density sections:
 * 1. Hero Section
 * 2. Continue Listening (compact with progress)
 * 3. Made For You (large rounded carousel)
 * 4. Quick Picks (dense borderless rows)
 * 5. New Releases (scroller with date badges)
 * 6. Moods & Genres (typographic chips)
 */

import { Track } from '@/domain/types';

export interface ContinueListeningItem {
  track: Track;
  progressPercent: number; // 0 - 100
  lastPlayedAt: number;
}

export interface MadeForYouItem {
  id: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  thumbhash: string;
  trackCount: number;
  tracks: Track[];
}

export interface NewReleaseItem {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  thumbhash: string;
  releaseBadge: string;
  tracks: Track[];
}

export interface MoodGenreItem {
  id: string;
  title: string;
  description: string;
  accentColor: string;
  gradientColors: [string, string];
  trackCount: number;
}

export interface HomeFeedData {
  greeting: string;
  /** Primary featured track (legacy single-hero fallback). */
  heroTrack: Track;
  /**
   * Up to 5 tracks for the SpotlightFlowSection snap carousel.
   * Falls back to [heroTrack] when not present.
   */
  spotlightTracks?: Track[];
  continueListening: ContinueListeningItem[];
  madeForYou: MadeForYouItem[];
  quickPicks: Track[];
  newReleases: NewReleaseItem[];
  moodsGenres: MoodGenreItem[];
}

/**
 * Returns a time-aware editorial greeting string.
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  if (hour >= 17 && hour < 22) {
    return 'Good evening';
  }
  return 'Late night';
}
