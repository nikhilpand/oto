/**
 * Search Engine Unit Tests
 *
 * Tests: tokenization, scoring, grouping, cancellation, recents CRUD.
 */

import {
  query,
  nextSequenceToken,
  isCurrentToken,
} from '../services/searchEngine';
import {
  addRecentQuery,
  getRecentQueries,
  removeRecentQuery,
  clearRecentQueries,
} from '../storage/recentSearchesStorage';

// ─── searchEngine ─────────────────────────────────────────────────────

describe('searchEngine.query', () => {
  beforeEach(() => nextSequenceToken()); // advance to invalidate previous

  it('returns empty result for blank query', () => {
    const token = nextSequenceToken();
    const result = query('', token);
    expect(result).not.toBeNull();
    expect(result!.tracks).toHaveLength(0);
    expect(result!.topResult).toBeNull();
  });

  it('finds tracks by title', () => {
    const token = nextSequenceToken();
    const result = query('Blinding', token);
    expect(result).not.toBeNull();
    expect(result!.tracks.length).toBeGreaterThan(0);
    expect(result!.tracks[0]!.title).toContain('Blinding');
  });

  it('finds artists by name', () => {
    const token = nextSequenceToken();
    const result = query('Weeknd', token);
    expect(result).not.toBeNull();
    expect(result!.artists.length).toBeGreaterThan(0);
    expect(result!.artists[0]!.name).toContain('Weeknd');
  });

  it('finds albums by title', () => {
    const token = nextSequenceToken();
    const result = query('Future Nostalgia', token);
    expect(result).not.toBeNull();
    expect(result!.albums.length).toBeGreaterThan(0);
    expect(result!.albums[0]!.title).toContain('Future Nostalgia');
  });

  it('returns null when token is stale (cancelled)', () => {
    const token = nextSequenceToken();
    nextSequenceToken(); // advance — makes token stale
    const result = query('Weeknd', token);
    expect(result).toBeNull();
  });

  it('populates topResult from highest-score entity', () => {
    const token = nextSequenceToken();
    const result = query('Taylor Swift', token);
    expect(result).not.toBeNull();
    expect(result!.topResult).not.toBeNull();
    // Artist should win (name-exact match at 1.2× boost)
    expect(result!.topResult!.kind).toBe('artist');
  });

  it('case-insensitive matching', () => {
    const token = nextSequenceToken();
    const r1 = query('BILLIE EILISH', token);
    expect(r1).not.toBeNull();

    const token2 = nextSequenceToken();
    const r2 = query('billie eilish', token2);
    expect(r2).not.toBeNull();
    expect(r1!.artists.length).toBe(r2!.artists.length);
  });
});

describe('isCurrentToken', () => {
  it('returns true for the most recent token', () => {
    const t = nextSequenceToken();
    expect(isCurrentToken(t)).toBe(true);
  });

  it('returns false for stale tokens', () => {
    const t = nextSequenceToken();
    nextSequenceToken();
    expect(isCurrentToken(t)).toBe(false);
  });
});

// ─── recentSearchesStorage ────────────────────────────────────────────

describe('recentSearchesStorage', () => {
  beforeEach(() => clearRecentQueries());

  it('starts empty', () => {
    expect(getRecentQueries()).toEqual([]);
  });

  it('adds queries (most recent first)', () => {
    addRecentQuery('weeknd');
    addRecentQuery('dua lipa');
    const q = getRecentQueries();
    expect(q[0]).toBe('dua lipa');
    expect(q[1]).toBe('weeknd');
  });

  it('deduplicates: moves existing query to front', () => {
    addRecentQuery('weeknd');
    addRecentQuery('dua lipa');
    addRecentQuery('weeknd');
    const q = getRecentQueries();
    expect(q[0]).toBe('weeknd');
    expect(q.filter((x) => x === 'weeknd')).toHaveLength(1);
  });

  it('caps at 10 queries', () => {
    for (let i = 0; i < 15; i++) addRecentQuery(`query-${i}`);
    expect(getRecentQueries()).toHaveLength(10);
  });

  it('removes a specific query', () => {
    addRecentQuery('weeknd');
    addRecentQuery('dua lipa');
    removeRecentQuery('weeknd');
    const q = getRecentQueries();
    expect(q).not.toContain('weeknd');
    expect(q).toContain('dua lipa');
  });

  it('ignores blank queries', () => {
    addRecentQuery('  ');
    expect(getRecentQueries()).toHaveLength(0);
  });

  it('clears all queries', () => {
    addRecentQuery('weeknd');
    clearRecentQueries();
    expect(getRecentQueries()).toHaveLength(0);
  });
});
