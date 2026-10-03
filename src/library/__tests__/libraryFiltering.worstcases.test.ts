import type { LibraryFilter, LibrarySortOrder, LibraryItem } from '../types';

function applyFilter(items: LibraryItem[], filter: LibraryFilter, isOffline: boolean): LibraryItem[] {
  let result = items;
  if (isOffline || filter === 'downloads') {
    result = result.filter((i) => i.download.status === 'downloaded');
  }
  if (filter === 'all' || filter === 'downloads') {
    return result;
  }
  const kindMap: Record<string, LibraryItem['kind']> = {
    playlists: 'playlist',
    albums: 'album',
    artists: 'artist',
  };
  const kind = kindMap[filter];
  return kind ? result.filter((i) => i.kind === kind) : result;
}

function applySort(items: LibraryItem[], order: LibrarySortOrder): LibraryItem[] {
  const copy = [...items];
  if (order === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title));
  if (order === 'za') return copy.sort((a, b) => b.title.localeCompare(a.title));
  return copy.sort((a, b) => {
    const timeA = Number.isFinite(new Date(a.addedAt).getTime()) ? new Date(a.addedAt).getTime() : 0;
    const timeB = Number.isFinite(new Date(b.addedAt).getTime()) ? new Date(b.addedAt).getTime() : 0;
    return timeB - timeA;
  });
}

describe('Library Filtering & Sorting — Worst-Case Stress Tests', () => {
  const sampleItems: LibraryItem[] = [
    {
      id: 'item_1',
      kind: 'playlist',
      title: 'Workout Beats',
      subtitle: '50 tracks',
      artworkUrl: 'https://art.com/1.jpg',
      thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
      addedAt: '2026-03-01T10:00:00Z',
      download: { status: 'downloaded', progress: 1.0 },
    },
    {
      id: 'item_2',
      kind: 'playlist',
      title: 'Chill Vibes',
      subtitle: '30 tracks',
      artworkUrl: 'https://art.com/2.jpg',
      thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
      addedAt: '2026-02-15T10:00:00Z',
      download: { status: 'none', progress: 0 },
    },
    {
      id: 'item_3',
      kind: 'album',
      title: 'Starboy',
      subtitle: 'The Weeknd',
      artworkUrl: 'https://art.com/3.jpg',
      thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
      addedAt: '2026-01-10T10:00:00Z',
      download: { status: 'downloaded', progress: 1.0 },
    },
    {
      id: 'item_4',
      kind: 'artist',
      title: 'Dua Lipa',
      subtitle: 'Artist',
      artworkUrl: 'https://art.com/4.jpg',
      thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
      addedAt: '2026-03-10T10:00:00Z',
      download: { status: 'none', progress: 0 },
    },
  ];

  describe('Compound Offline & Kind Filtering', () => {
    test('when offline and user selects playlists, returns only downloaded playlists', () => {
      const result = applyFilter(sampleItems, 'playlists', true);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('item_1');
      expect(result[0]?.kind).toBe('playlist');
      expect(result[0]?.download.status).toBe('downloaded');
    });

    test('when offline and user selects all, returns all downloaded items of any kind', () => {
      const result = applyFilter(sampleItems, 'all', true);
      expect(result).toHaveLength(2); // item_1 (playlist) and item_3 (album)
      expect(result.every((i) => i.download.status === 'downloaded')).toBe(true);
    });

    test('when offline and user has zero downloaded items, returns empty array without throwing', () => {
      const noDownloads: LibraryItem[] = sampleItems.map((i) => ({
        ...i,
        download: { status: 'none', progress: 0 },
      }));

      const result = applyFilter(noDownloads, 'all', true);
      expect(result).toHaveLength(0);
    });
  });

  describe('Sorting Edge Cases (Corrupt Dates & Multilingual Titles)', () => {
    test('handles corrupt or empty addedAt dates in recent sort without NaN comparison breakdown', () => {
      const itemsWithCorruptedDates: LibraryItem[] = [
        { ...sampleItems[0]!, id: 'valid_old', addedAt: '2025-01-01T00:00:00Z' },
        { ...sampleItems[1]!, id: 'corrupt_date', addedAt: 'corrupted_string_not_a_date' },
        { ...sampleItems[2]!, id: 'valid_new', addedAt: '2026-10-01T00:00:00Z' },
      ];

      expect(() => {
        const sorted = applySort(itemsWithCorruptedDates, 'recent');
        expect(sorted[0]?.id).toBe('valid_new');
      }).not.toThrow();
    });

    test('sorts non-ASCII and emoji titles in alphabetical order cleanly', () => {
      const unicodeItems: LibraryItem[] = [
        { ...sampleItems[0]!, id: 'emoji', title: '🔥 Hottest Hits' },
        { ...sampleItems[1]!, id: 'hindi', title: 'केसरिया (Kesariya)' },
        { ...sampleItems[2]!, id: 'english', title: 'Abc' },
        { ...sampleItems[3]!, id: 'japanese', title: '初音ミク' },
      ];

      const sortedAz = applySort(unicodeItems, 'az');
      expect(sortedAz).toHaveLength(4);

      const sortedZa = applySort(unicodeItems, 'za');
      expect(sortedZa).toHaveLength(4);
      expect(sortedZa[0]?.title).toBe(sortedAz[3]?.title);
    });
  });

  describe('Scale & Stress (10,000 Library Items)', () => {
    test('filters and sorts 10,000 items in under 100ms', () => {
      const largeLibrary: LibraryItem[] = [];
      const kinds: LibraryItem['kind'][] = ['playlist', 'album', 'artist'];
      const statuses: LibraryItem['download']['status'][] = ['downloaded', 'none', 'queued'];

      for (let i = 0; i < 10_000; i++) {
        largeLibrary.push({
          id: `item_${i}`,
          kind: kinds[i % 3]!,
          title: `Item Title ${i}`,
          subtitle: `Subtitle ${i}`,
          artworkUrl: 'https://art.com/img.jpg',
          thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
          addedAt: new Date(1700000000000 + i * 1000).toISOString(),
          download: {
            status: statuses[i % 3]!,
            progress: i % 3 === 0 ? 1.0 : 0,
          },
        });
      }

      const start = Date.now();
      const filtered = applyFilter(largeLibrary, 'playlists', true);
      const sorted = applySort(filtered, 'recent');
      const durationMs = Date.now() - start;

      expect(filtered.length).toBeGreaterThan(0);
      expect(sorted.length).toBe(filtered.length);
      expect(durationMs).toBeLessThan(100);
    });
  });
});
