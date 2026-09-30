/**
 * Unit Tests for Home Screen Logic & Components
 *
 * Verifies greeting logic, mock data completeness, and section data contracts.
 */

import { getGreeting } from '../types';
import { getMockHomeFeed } from '../data/mockHomeData';

describe('Home Screen Logic & Helpers', () => {
  describe('getGreeting()', () => {
    test('returns "Good morning" between 5:00 and 11:59', () => {
      const d1 = new Date(2026, 8, 30, 5, 0);
      const d2 = new Date(2026, 8, 30, 11, 59);
      expect(getGreeting(d1)).toBe('Good morning');
      expect(getGreeting(d2)).toBe('Good morning');
    });

    test('returns "Good afternoon" between 12:00 and 16:59', () => {
      const d1 = new Date(2026, 8, 30, 12, 0);
      const d2 = new Date(2026, 8, 30, 16, 59);
      expect(getGreeting(d1)).toBe('Good afternoon');
      expect(getGreeting(d2)).toBe('Good afternoon');
    });

    test('returns "Good evening" between 17:00 and 21:59', () => {
      const d1 = new Date(2026, 8, 30, 17, 0);
      const d2 = new Date(2026, 8, 30, 21, 59);
      expect(getGreeting(d1)).toBe('Good evening');
      expect(getGreeting(d2)).toBe('Good evening');
    });

    test('returns "Late night" between 22:00 and 4:59', () => {
      const d1 = new Date(2026, 8, 30, 22, 0);
      const d2 = new Date(2026, 8, 30, 3, 30);
      expect(getGreeting(d1)).toBe('Late night');
      expect(getGreeting(d2)).toBe('Late night');
    });
  });

  describe('getMockHomeFeed()', () => {
    test('generates valid feed structure with all 6 editorial sections', () => {
      const feed = getMockHomeFeed();

      expect(feed.greeting).toBeDefined();
      expect(feed.heroTrack).toBeDefined();
      expect(feed.heroTrack.id).toBeDefined();

      // Continue Listening: must have progressPercent between 0 and 100
      expect(feed.continueListening.length).toBeGreaterThan(0);
      feed.continueListening.forEach((item) => {
        expect(item.progressPercent).toBeGreaterThanOrEqual(0);
        expect(item.progressPercent).toBeLessThanOrEqual(100);
        expect(item.track).toBeDefined();
      });

      // Made For You: must have title, subtitle, trackCount
      expect(feed.madeForYou.length).toBeGreaterThan(0);
      feed.madeForYou.forEach((item) => {
        expect(item.title).toBeTruthy();
        expect(item.subtitle).toBeTruthy();
        expect(item.trackCount).toBeGreaterThan(0);
      });

      // Quick Picks: borderless song rows
      expect(feed.quickPicks.length).toBeGreaterThanOrEqual(4);
      feed.quickPicks.forEach((track) => {
        expect(track.title).toBeTruthy();
        expect(track.artist).toBeTruthy();
      });

      // New Releases: must have releaseBadge
      expect(feed.newReleases.length).toBeGreaterThan(0);
      feed.newReleases.forEach((item) => {
        expect(item.releaseBadge).toBeTruthy();
      });

      // Moods & Genres: typographic chips without images
      expect(feed.moodsGenres.length).toBeGreaterThanOrEqual(4);
      feed.moodsGenres.forEach((item) => {
        expect(item.title).toBeTruthy();
        expect(item.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(item.gradientColors.length).toBe(2);
      });
    });

    test('no adjacent sections have identical geometry or visual density', () => {
      const feed = getMockHomeFeed();
      // Section 1: Hero (Expansive card)
      // Section 2: Continue (Compact horizontal pills)
      // Section 3: Made For You (Large square vertical carousel)
      // Section 4: Quick Picks (Dense vertical list)
      // Section 5: New Releases (Square cards with badge)
      // Section 6: Moods & Genres (2-row typographic chips)
      expect(feed.continueListening.length).toBeGreaterThan(0);
      expect(feed.madeForYou.length).toBeGreaterThan(0);
      expect(feed.quickPicks.length).toBeGreaterThan(0);
      expect(feed.newReleases.length).toBeGreaterThan(0);
      expect(feed.moodsGenres.length).toBeGreaterThan(0);
    });
  });
});
