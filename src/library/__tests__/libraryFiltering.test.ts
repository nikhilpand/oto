/**
 * Library Filtering Unit Tests
 *
 * Tests: segmented filter, sort orders, offline invariant, download badges.
 */

import { MOCK_LIBRARY_ITEMS } from '../data/mockLibraryData';
import type { LibraryFilter, LibrarySortOrder, LibraryItem } from '../types';

// ─── Filter function (mirrors LibraryScreenContent logic) ─────────────

function filterItems(items: LibraryItem[], filter: LibraryFilter, isOffline = false): LibraryItem[] {
  let filtered = items;
  if (isOffline || filter === 'downloads') {
    filtered = filtered.filter((i) => i.download.status === 'downloaded');
  } else if (filter !== 'all') {
    filtered = filtered.filter((i) => i.kind === filter.slice(0, -1)); // 'playlists' → 'playlist'
  }
  return filtered;
}

// ─── Sort function ────────────────────────────────────────────────────

function sortItems(items: LibraryItem[], order: LibrarySortOrder): LibraryItem[] {
  const copy = [...items];
  if (order === 'az') copy.sort((a, b) => a.title.localeCompare(b.title));
  if (order === 'za') copy.sort((a, b) => b.title.localeCompare(a.title));
  if (order === 'recent') copy.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  return copy;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('libraryFiltering', () => {
  it('all filter returns all items', () => {
    const result = filterItems(MOCK_LIBRARY_ITEMS, 'all');
    expect(result).toHaveLength(MOCK_LIBRARY_ITEMS.length);
  });

  it('playlists filter returns only playlists', () => {
    const result = filterItems(MOCK_LIBRARY_ITEMS, 'playlists');
    expect(result.every((i) => i.kind === 'playlist')).toBe(true);
  });

  it('albums filter returns only albums', () => {
    const result = filterItems(MOCK_LIBRARY_ITEMS, 'albums');
    expect(result.every((i) => i.kind === 'album')).toBe(true);
  });

  it('artists filter returns only artists', () => {
    const result = filterItems(MOCK_LIBRARY_ITEMS, 'artists');
    expect(result.every((i) => i.kind === 'artist')).toBe(true);
  });

  it('downloads filter returns only downloaded items', () => {
    const result = filterItems(MOCK_LIBRARY_ITEMS, 'downloads');
    expect(result.every((i) => i.download.status === 'downloaded')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('offline mode returns only downloaded items regardless of filter', () => {
    const result = filterItems(MOCK_LIBRARY_ITEMS, 'all', true);
    expect(result.every((i) => i.download.status === 'downloaded')).toBe(true);
  });
});

describe('librarySorting', () => {
  it('az sort orders items alphabetically ascending', () => {
    const result = sortItems(MOCK_LIBRARY_ITEMS, 'az');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.title.localeCompare(result[i]!.title)).toBeLessThanOrEqual(0);
    }
  });

  it('za sort orders items alphabetically descending', () => {
    const result = sortItems(MOCK_LIBRARY_ITEMS, 'za');
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.title.localeCompare(result[i]!.title)).toBeGreaterThanOrEqual(0);
    }
  });

  it('recent sort orders by addedAt descending', () => {
    const result = sortItems(MOCK_LIBRARY_ITEMS, 'recent');
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1]!.addedAt).getTime();
      const curr = new Date(result[i]!.addedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});

describe('downloadStatus', () => {
  it('has items with each download status represented in mock data', () => {
    const statuses = MOCK_LIBRARY_ITEMS.map((i) => i.download.status);
    expect(statuses).toContain('downloaded');
    expect(statuses).toContain('downloading');
    expect(statuses).toContain('queued');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('none');
  });

  it('downloading items have a progress value between 0 and 100', () => {
    const downloading = MOCK_LIBRARY_ITEMS.filter((i) => i.download.status === 'downloading');
    for (const item of downloading) {
      expect(item.download.progress).toBeGreaterThanOrEqual(0);
      expect(item.download.progress).toBeLessThanOrEqual(100);
    }
  });
});
