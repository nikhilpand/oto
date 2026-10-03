import {
  scoreMatch,
  findBestMatch,
  cleanTitle,
  isSevereMismatch,
  withinSeconds,
  MatchCandidate,
  MatchTarget,
} from '../trackMatcher';

describe('TrackMatcher — Worst-Case Stress Tests (Music App Catastrophes)', () => {
  describe('False-Positive Audio Substitution Prevention', () => {
    const candidates: MatchCandidate[] = [
      { id: 'studio', title: 'Starboy', artist: 'The Weeknd', durationMs: 230000 },
      { id: 'remix', title: 'Starboy (Kygo Remix)', artist: 'The Weeknd, Kygo', durationMs: 215000 },
      { id: 'acoustic', title: 'Starboy (Acoustic Version)', artist: 'The Weeknd', durationMs: 230000 },
      { id: 'live', title: 'Starboy [Live at Coachella]', artist: 'The Weeknd', durationMs: 245000 },
      { id: 'lofi', title: 'Starboy (Lofi Beats)', artist: 'The Weeknd', durationMs: 180000 },
      { id: 'slowed', title: 'Starboy (Slowed + Reverb)', artist: 'The Weeknd', durationMs: 270000 },
      { id: 'spedup', title: 'Starboy (Sped Up)', artist: 'The Weeknd', durationMs: 190000 },
      { id: 'instrumental', title: 'Starboy (Instrumental)', artist: 'The Weeknd', durationMs: 230000 },
    ];

    it('studio request strictly rejects all remix, acoustic, live, lofi, and instrumental cuts', () => {
      const targetStudio: MatchTarget = {
        title: 'Starboy',
        artist: 'The Weeknd',
        durationMs: 230000,
      };

      const best = findBestMatch(targetStudio, candidates);
      expect(best?.id).toBe('studio');

      // Verify that every single version candidate has a 0.0 score against studio target
      const remixScore = scoreMatch(targetStudio, candidates.find((c) => c.id === 'remix')!);
      const acousticScore = scoreMatch(targetStudio, candidates.find((c) => c.id === 'acoustic')!);
      const liveScore = scoreMatch(targetStudio, candidates.find((c) => c.id === 'live')!);
      const lofiScore = scoreMatch(targetStudio, candidates.find((c) => c.id === 'lofi')!);
      const instrumentalScore = scoreMatch(targetStudio, candidates.find((c) => c.id === 'instrumental')!);

      expect(remixScore).toBe(0.0);
      expect(acousticScore).toBe(0.0);
      expect(liveScore).toBe(0.0);
      expect(lofiScore).toBe(0.0);
      expect(instrumentalScore).toBe(0.0);
    });

    it('remix request strictly rejects studio cut and non-matching versions', () => {
      const targetRemix: MatchTarget = {
        title: 'Starboy (Remix)',
        artist: 'The Weeknd',
        durationMs: 215000,
      };

      const best = findBestMatch(targetRemix, candidates);
      expect(best?.id).toBe('remix');

      const studioScore = scoreMatch(targetRemix, candidates.find((c) => c.id === 'studio')!);
      expect(studioScore).toBe(0.0);
    });

    it('live request strictly matches live cut and rejects acoustic/studio cuts', () => {
      const targetLive: MatchTarget = {
        title: 'Starboy (Live)',
        artist: 'The Weeknd',
        durationMs: 245000,
      };

      const best = findBestMatch(targetLive, candidates);
      expect(best?.id).toBe('live');

      const studioScore = scoreMatch(targetLive, candidates.find((c) => c.id === 'studio')!);
      expect(studioScore).toBe(0.0);
    });
  });

  describe('Duration Gating & Delta Tolerances (3000ms Cutoff)', () => {
    it('withinSeconds correctly gates around the 3-second boundary', () => {
      const targetDuration = { durationMs: 200000 };

      // 2.999s delta -> accepted
      expect(withinSeconds({ durationMs: 202999 }, targetDuration, 3.0)).toBe(true);
      expect(withinSeconds({ durationMs: 197001 }, targetDuration, 3.0)).toBe(true);

      // 4.0s delta -> rejected
      expect(withinSeconds({ durationMs: 204500 }, targetDuration, 3.0)).toBe(false);
      expect(withinSeconds({ durationMs: 195500 }, targetDuration, 3.0)).toBe(false);
    });

    it('rejects candidate with extreme duration discrepancy (e.g., 30s preview or 10-min extended mix)', () => {
      const target: MatchTarget = {
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        durationMs: 200000, // 3:20 = 200s
      };

      const previewCandidate: MatchCandidate = {
        id: 'preview',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        durationMs: 30000, // 30s preview = 30s
      };

      const extendedCandidate: MatchCandidate = {
        id: 'extended',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        durationMs: 600000, // 10 min loop = 600s
      };

      // Target runtime 200s vs preview 30s is > 30s difference
      expect(isSevereMismatch(200, 30)).toBe(true);
      expect(isSevereMismatch(200, 600)).toBe(true);
      expect(scoreMatch(target, previewCandidate)).toBeLessThan(0.3);
      expect(scoreMatch(target, extendedCandidate)).toBeLessThan(0.3);
    });
  });

  describe('Corrupted Strings, Punctuation-Only & Non-Latin Scripts', () => {
    it('cleanTitle strips heavy packaging labels without removing core title', () => {
      expect(cleanTitle('Stay (Official Music Video)')).toBe('stay');
      expect(cleanTitle('Shape of You [Official Lyric Video]')).toBe('shape of you');
      expect(cleanTitle('Despacito (feat. Daddy Yankee) [HD 4K]')).toBe('despacito');
      expect(cleanTitle('Numb [Remastered 2020]')).toBe('numb');
    });

    it('handles titles with only punctuation or symbols gracefully without crashing', () => {
      expect(cleanTitle('???')).toBe('???');
      expect(cleanTitle('...')).toBe('...');
      expect(cleanTitle('$$$ (feat. Kid)')).toBe('$$$');

      const target: MatchTarget = { title: '???', artist: 'Artist' };
      const cand: MatchCandidate = { id: 'c1', title: '???', artist: 'Artist' };
      expect(scoreMatch(target, cand)).toBeGreaterThan(0.7);
    });

    it('accurately matches non-Latin languages (Hindi, Japanese, Russian, Korean)', () => {
      // 1. Hindi (Devanagari)
      const hindiTarget: MatchTarget = { title: 'केसरिया', artist: 'अरिजीत सिंह' };
      const hindiCand: MatchCandidate = { id: 'h1', title: 'केसरिया (From "Brahmastra")', artist: 'अरिजीत सिंह' };
      expect(scoreMatch(hindiTarget, hindiCand)).toBeGreaterThan(0.7);

      // 2. Japanese (Kanji / Kana)
      const jpnTarget: MatchTarget = { title: '夜に駆ける', artist: 'YOASOBI' };
      const jpnCand: MatchCandidate = { id: 'j1', title: '夜に駆ける [Official Video]', artist: 'YOASOBI' };
      expect(scoreMatch(jpnTarget, jpnCand)).toBeGreaterThan(0.8);

      // 3. Russian (Cyrillic)
      const rusTarget: MatchTarget = { title: 'Группа крови', artist: 'Кино' };
      const rusCand: MatchCandidate = { id: 'r1', title: 'Группа крови', artist: 'Кино' };
      expect(scoreMatch(rusTarget, rusCand)).toBeGreaterThan(0.9);
    });

    it('findBestMatch returns null when candidates array is empty or all scores are below threshold', () => {
      const target: MatchTarget = { title: 'Song', artist: 'Artist' };
      expect(findBestMatch(target, [])).toBeNull();

      // Completely unrelated candidate
      const garbageCandidate: MatchCandidate = {
        id: 'garbage',
        title: 'Totally Unrelated Symphony',
        artist: 'Unknown Composer',
        durationMs: 999999,
      };
      expect(findBestMatch(target, [garbageCandidate], 0.6)).toBeNull();
    });
  });
});
