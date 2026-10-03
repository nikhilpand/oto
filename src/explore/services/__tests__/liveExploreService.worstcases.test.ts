/**
 * liveExploreService.worstcases.test.ts — Hard Worst-Case & Invariant Tests
 *
 * Punishing suite testing:
 * - Empty, null, and corrupted response parsing
 * - Malformed nested grid renderers
 * - Hash collision & gradient stability
 * - Fallback resilience during complete network outage
 */

import {
  getMoodGradient,
  parseMoodAndGenresResponse,
  fetchLiveExploreSections,
  FALLBACK_FOR_YOU,
  FALLBACK_MOODS,
} from '../liveExploreService';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';

describe('liveExploreService Worst-Case Resilience', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getMoodGradient Stability', () => {
    it('handles empty string gracefully without throwing or NaN', () => {
      const gradient = getMoodGradient('');
      expect(gradient).toHaveLength(2);
      expect(gradient[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(gradient[1]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('handles exotic unicode, emojis, and RTL strings', () => {
      const titles = ['🔥 EDM Hype', 'हिंदी संगीत', 'الكترونك', '🎵🎶', 'Rock & Roll / Metal!'];
      for (const title of titles) {
        const gradient = getMoodGradient(title);
        expect(gradient).toHaveLength(2);
        expect(typeof gradient[0]).toBe('string');
        expect(typeof gradient[1]).toBe('string');
      }
    });

    it('is strictly deterministic for identical titles', () => {
      const g1 = getMoodGradient('Workout');
      const g2 = getMoodGradient('Workout');
      expect(g1).toEqual(g2);
    });
  });

  describe('parseMoodAndGenresResponse Hard Cases', () => {
    it('returns empty array on null, undefined, or primitive input', () => {
      expect(parseMoodAndGenresResponse(null)).toEqual([]);
      expect(parseMoodAndGenresResponse(undefined)).toEqual([]);
      expect(parseMoodAndGenresResponse('string-payload')).toEqual([]);
      expect(parseMoodAndGenresResponse(12345)).toEqual([]);
      expect(parseMoodAndGenresResponse({})).toEqual([]);
    });

    it('handles deeply corrupted grid renderers missing items, buttons, or browseIds', () => {
      const corrupted = {
        contents: {
          singleColumnBrowseResultsRenderer: {
            tabs: [
              {
                tabRenderer: {
                  content: {
                    sectionListRenderer: {
                      contents: [
                        {
                          gridRenderer: {
                            header: null,
                            items: [
                              null,
                              {},
                              { musicNavigationButtonRenderer: null },
                              {
                                musicNavigationButtonRenderer: {
                                  buttonText: { runs: [{ text: '' }] },
                                },
                              },
                              {
                                musicNavigationButtonRenderer: {
                                  buttonText: { runs: [{ text: 'Valid Title' }] },
                                  clickCommand: null,
                                },
                              },
                              {
                                musicNavigationButtonRenderer: {
                                  buttonText: { runs: [{ text: 'Valid Title' }] },
                                  clickCommand: {
                                    browseEndpoint: {
                                      browseId: 'FEmusic_genre_rock',
                                      params: 'ggMECgEA',
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      };

      const result = parseMoodAndGenresResponse(corrupted);
      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('Explore');
      expect(result[0]!.items).toHaveLength(1);
      expect(result[0]!.items[0]!.title).toBe('Valid Title');
      expect(result[0]!.items[0]!.browseId).toBe('FEmusic_genre_rock');
      expect(result[0]!.items[0]!.params).toBe('ggMECgEA');
    });
  });

  describe('fetchLiveExploreSections Network & Fallback Invariants', () => {
    it('falls back to curated moods and moments when network fails', async () => {
      jest.spyOn(innertubeClient, 'browse').mockRejectedValue(new Error('Network offline 503'));

      const sections = await fetchLiveExploreSections();
      expect(sections).toHaveLength(2);
      expect(sections[0]!.title).toBe('For you');
      expect(sections[0]!.items).toEqual(FALLBACK_FOR_YOU);
      expect(sections[1]!.title).toBe('Moods & moments');
      expect(sections[1]!.items).toEqual(FALLBACK_MOODS);
    });

    it('falls back gracefully when API returns empty payload', async () => {
      jest.spyOn(innertubeClient, 'browse').mockResolvedValue({});

      const sections = await fetchLiveExploreSections();
      expect(sections).toHaveLength(2);
      expect(sections[0]!.title).toBe('For you');
      expect(sections[1]!.title).toBe('Moods & moments');
    });

    it('returns parsed live sections when API responds successfully', async () => {
      const mockPayload = {
        contents: {
          singleColumnBrowseResultsRenderer: {
            tabs: [
              {
                tabRenderer: {
                  content: {
                    sectionListRenderer: {
                      contents: [
                        {
                          gridRenderer: {
                            header: {
                              gridHeaderRenderer: {
                                title: { runs: [{ text: 'Live Genres' }] },
                              },
                            },
                            items: [
                              {
                                musicNavigationButtonRenderer: {
                                  buttonText: { runs: [{ text: 'EDM / Dance' }] },
                                  clickCommand: {
                                    browseEndpoint: {
                                      browseId: 'FEmusic_genre_dance',
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      };

      jest.spyOn(innertubeClient, 'browse').mockResolvedValue(mockPayload);

      const sections = await fetchLiveExploreSections();
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe('Live Genres');
      expect(sections[0]!.items[0]!.title).toBe('EDM / Dance');
    });
  });
});
