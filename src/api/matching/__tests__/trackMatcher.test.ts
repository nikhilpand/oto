import {
  extractVersions,
  cleanTitle,
  levenshteinDistance,
  stringSimilarity,
  scoreMatch,
  findBestMatch,
  MatchCandidate,
  isSevereMismatch,
  sameRecordingAs,
  withinSeconds,
  effectiveTargetDuration,
} from '../trackMatcher';

describe('TrackMatcher', () => {
  describe('extractVersions', () => {
    it('extracts version keywords correctly', () => {
      expect(Array.from(extractVersions('Kesariya (Dance Mix)'))).toEqual(['dance mix']);
      expect(Array.from(extractVersions('Levitating (feat. DaBaby) [Don Diablo Remix]'))).toEqual(['remix']);
      expect(Array.from(extractVersions('Hotel California (Live On MTV)'))).toEqual(['live']);
      expect(Array.from(extractVersions('Someone Like You (Acoustic)'))).toEqual(['acoustic']);
      expect(Array.from(extractVersions('Shape of You'))).toEqual([]);
    });
  });

  describe('cleanTitle', () => {
    it('strips packaging brackets and version tags', () => {
      expect(cleanTitle('Kesariya (From "Brahmastra")')).toBe('kesariya');
      expect(cleanTitle('Blinding Lights [Official Audio]')).toBe('blinding lights');
      expect(cleanTitle('Stay (feat. Justin Bieber) [Lyric Video]')).toBe('stay');
      expect(cleanTitle('Starboy (Remix)')).toBe('starboy');
    });
  });

  describe('levenshteinDistance and stringSimilarity', () => {
    it('computes exact distance and similarity', () => {
      expect(levenshteinDistance('kesariya', 'kesariya')).toBe(0);
      expect(stringSimilarity('kesariya', 'kesariya')).toBe(1.0);
      expect(stringSimilarity('kesariya', 'kesari')).toBeGreaterThan(0.7);
      expect(stringSimilarity('apple', 'banana')).toBeLessThan(0.3);
    });
  });

  describe('scoreMatch and findBestMatch', () => {
    const candidates: MatchCandidate[] = [
      {
        id: 'c1',
        title: 'Kesariya',
        artist: 'Arijit Singh, Pritam',
        durationMs: 268000,
      },
      {
        id: 'c2',
        title: 'Kesariya (Lofi Flip)',
        artist: 'Arijit Singh',
        durationMs: 240000,
      },
      {
        id: 'c3',
        title: 'Kesariya (Dance Mix)',
        artist: 'Arijit Singh, Shashwat Sachdev',
        durationMs: 197000,
      },
      {
        id: 'c4',
        title: 'Kesariya (Slowed & Reverb)',
        artist: 'Arijit Singh',
        durationMs: 284000,
      },
      {
        id: 'c5',
        title: 'Kesariya (From "Brahmastra")',
        artist: 'Arijit Singh, Amitabh Bhattacharya',
        durationMs: 268000,
      },
    ];

    it('rejects version mismatches immediately', () => {
      // Target is dance mix: only candidate 3 should match
      const targetDanceMix = {
        title: 'Kesariya (Dance Mix)',
        artist: 'Arijit Singh',
        durationMs: 197000,
      };

      expect(scoreMatch(targetDanceMix, candidates[0]!)).toBe(0.0); // original
      expect(scoreMatch(targetDanceMix, candidates[1]!)).toBe(0.0); // lofi
      expect(scoreMatch(targetDanceMix, candidates[2]!)).toBeGreaterThan(0.8); // dance mix
      expect(scoreMatch(targetDanceMix, candidates[3]!)).toBe(0.0); // slowed

      const best = findBestMatch(targetDanceMix, candidates);
      expect(best?.id).toBe('c3');
    });

    it('picks the studio cut when no version tag is requested', () => {
      const targetStudio = {
        title: 'Kesariya',
        artist: 'Arijit Singh',
        durationMs: 268000,
      };

      const best = findBestMatch(targetStudio, candidates);
      expect(best).not.toBeNull();
      // Should match c1 or c5 (both studio cuts)
      expect(['c1', 'c5']).toContain(best?.id);
    });

    it('rejects candidates with duration delta > 3000ms', () => {
      const target = {
        title: 'Kesariya',
        artist: 'Arijit Singh',
        durationMs: 268000,
      };

      const longCandidate: MatchCandidate = {
        id: 'long',
        title: 'Kesariya',
        artist: 'Arijit Singh',
        durationMs: 310000, // 42 seconds difference
      };

      expect(scoreMatch(target, longCandidate)).toBe(0.0);
    });
  });

  describe('TrackIdentityMismatch (BitChord Reference TrackIdentityMismatchTest)', () => {
    test('Test 1 - catalogue target 302s + runtime 209s preserves catalogue duration', () => {
      const catalogueDuration = 302;
      const runtimeDuration = 209;

      const effectiveDuration = effectiveTargetDuration(
        catalogueDuration,
        runtimeDuration
      );

      expect(effectiveDuration).toBe(302);
    });

    test('Test 2 - catalogue target 302s + candidate 302s accepted', () => {
      const catalogueDuration = 302;
      const candidateDuration = 302;

      expect(sameRecordingAs(candidateDuration, catalogueDuration)).toBe(true);

      const target = {
        title: 'São Paulo',
        artist: 'The Weeknd',
        durationSec: catalogueDuration,
        album: 'Hurry Up Tomorrow',
      };
      const jioSaavnTrack = {
        title: 'São Paulo',
        artist: 'The Weeknd',
        durationText: '5:02',
        album: 'Hurry Up Tomorrow',
      };

      expect(withinSeconds(jioSaavnTrack, target, 2)).toBe(true);
    });

    test('Test 3 - catalogue target 302s + cached rendition 209s detects severe mismatch', () => {
      const catalogueDuration = 302;
      const cachedRenditionDuration = 209;

      // 93s drift (> 30s limit) must be flagged as severe mismatch
      expect(isSevereMismatch(catalogueDuration, cachedRenditionDuration)).toBe(true);
    });

    test('Test 4 - small legitimate duration difference retains existing runtime behavior', () => {
      const catalogueDuration = 302;
      const runtimeDuration = 300; // 2s drift, common between audio masters

      expect(isSevereMismatch(catalogueDuration, runtimeDuration)).toBe(false);

      const effectiveDuration = effectiveTargetDuration(
        catalogueDuration,
        runtimeDuration
      );
      expect(effectiveDuration).toBe(300);

      // 14s drift (typical intro/outro pad)
      const runtime14sDrift = 288;
      expect(isSevereMismatch(catalogueDuration, runtime14sDrift)).toBe(false);
      expect(effectiveTargetDuration(catalogueDuration, runtime14sDrift)).toBe(288);
    });

    test('Test 5 - catalogue duration null retains existing runtime behavior', () => {
      const runtimeDuration = 209;

      expect(isSevereMismatch(null, runtimeDuration)).toBe(false);

      const effectiveWithNullCatalogue = effectiveTargetDuration(
        null,
        runtimeDuration
      );
      expect(effectiveWithNullCatalogue).toBe(209);

      const effectiveWithNullRuntime = effectiveTargetDuration(302, null);
      expect(effectiveWithNullRuntime).toBe(302);
    });

    test('Test 6 - full Sao Paulo regression scenario', () => {
      const catalogueTarget = {
        title: 'São Paulo',
        artist: 'The Weeknd, Anitta',
        durationSec: 302,
        album: 'Hurry Up Tomorrow',
      };

      const youtubeVideoRuntime = 209; // 3:29 music video
      const jioSaavnCandidateDuration = 302; // 5:02 album stream

      // 1. Cached rendition mismatch detection
      expect(
        isSevereMismatch(catalogueTarget.durationSec, youtubeVideoRuntime)
      ).toBe(true);

      // 2. Target duration calculation in effectiveTargetDuration
      const effectiveDuration = effectiveTargetDuration(
        catalogueTarget.durationSec,
        youtubeVideoRuntime
      );
      expect(effectiveDuration).toBe(302);

      // 3. Confirm regression behavior without fix: raw runtime comparison fails
      expect(
        sameRecordingAs(jioSaavnCandidateDuration, youtubeVideoRuntime)
      ).toBe(false);

      // 4. Confirm fixed behavior: comparison against effective duration accepts genuine stream
      expect(
        sameRecordingAs(jioSaavnCandidateDuration, effectiveDuration)
      ).toBe(true);

      const jioSaavnSong = {
        title: 'São Paulo',
        artist: 'The Weeknd, Anitta',
        durationText: '5:02',
        album: 'Hurry Up Tomorrow',
      };
      const effectiveTarget = {
        ...catalogueTarget,
        durationSec: effectiveDuration!,
      };

      expect(withinSeconds(jioSaavnSong, effectiveTarget, 2)).toBe(true);
    });
  });
});
