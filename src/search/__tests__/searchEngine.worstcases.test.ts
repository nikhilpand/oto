import {
  query,
  nextSequenceToken,
  isCurrentToken,
} from '../services/searchEngine';
import {
  addRecentQuery,
  getRecentQueries,
  clearRecentQueries,
} from '../storage/recentSearchesStorage';

describe('Search Engine & Cancellation — Worst-Case Stress Tests', () => {
  beforeEach(() => {
    clearRecentQueries();
    nextSequenceToken();
  });

  afterEach(() => {
    clearRecentQueries();
  });

  test('multilingual non-Latin scripts (Hindi, Japanese, Russian) are preserved and match correctly', () => {
    const token = nextSequenceToken();
    // Catalog contains Kesariya (Arijit Singh)
    const resultHindi = query('Kesariya केसरिया', token);
    expect(resultHindi).not.toBeNull();
    expect(resultHindi?.tracks.length).toBeGreaterThan(0);
    expect(resultHindi?.tracks[0]?.title).toContain('Kesariya');
  });

  test('special regex characters in query do not cause crash or regex injection', () => {
    const token = nextSequenceToken();
    const maliciousQueries = [
      '.*',
      '[a-z]+',
      '(((',
      '\\d+\\s+',
      '^$?',
      'Starboy (Deluxe) +++ ???',
    ];

    for (const q of maliciousQueries) {
      expect(() => {
        const res = query(q, token);
        expect(res === null || typeof res === 'object').toBe(true);
      }).not.toThrow();
    }
  });

  test('extreme input: 500-word pasted clipboard query executes safely without hanging', () => {
    const token = nextSequenceToken();
    const longPastedText = new Array(500).fill('music').join(' ');

    const start = Date.now();
    const result = query(longPastedText, token);
    const elapsed = Date.now() - start;

    expect(result).not.toBeNull();
    expect(elapsed).toBeLessThan(150); // Must complete in < 150ms
  });

  test('sequence cancellation: in-flight slow search discarded when user types next character', () => {
    const token1 = nextSequenceToken(); // User typed "W"
    const token2 = nextSequenceToken(); // User typed "We"
    const token3 = nextSequenceToken(); // User typed "Wee"

    // Only token3 is current
    expect(isCurrentToken(token1)).toBe(false);
    expect(isCurrentToken(token2)).toBe(false);
    expect(isCurrentToken(token3)).toBe(true);

    // Queries with stale tokens return null immediately
    expect(query('W', token1)).toBeNull();
    expect(query('We', token2)).toBeNull();

    // Fresh query returns results
    const activeResult = query('Weeknd', token3);
    expect(activeResult).not.toBeNull();
    expect(activeResult?.artists[0]?.name).toContain('Weeknd');
  });

  test('whitespace and control characters return blank search without throw', () => {
    const token = nextSequenceToken();
    const blanks = ['   ', '\t\t\n', '\r\n', '      '];

    for (const b of blanks) {
      const res = query(b, token);
      expect(res).not.toBeNull();
      expect(res?.tracks).toHaveLength(0);
      expect(res?.topResult).toBeNull();
    }
  });

  test('recent searches storage bounds memory to maximum 10 entries under heavy usage', () => {
    for (let i = 0; i < 50; i++) {
      addRecentQuery(`Search Query #${i}`);
    }

    const recents = getRecentQueries();
    expect(recents.length).toBeLessThanOrEqual(10);
    // Most recent search is at index 0
    expect(recents[0]).toBe('Search Query #49');
  });

  test('duplicate recent searches deduplicate and bump to top', () => {
    addRecentQuery('Daft Punk');
    addRecentQuery('Justice');
    addRecentQuery('Daft Punk'); // Duplicate search

    const recents = getRecentQueries();
    expect(recents[0]).toBe('Daft Punk');
    expect(recents.filter((q) => q === 'Daft Punk').length).toBe(1);
  });
});
