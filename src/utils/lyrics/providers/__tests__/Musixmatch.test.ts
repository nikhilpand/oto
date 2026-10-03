import {
  buildMusixmatchUrl,
  fetchMusixmatchLyrics,
  parseMusixmatchResponse,
} from '../Musixmatch';

describe('Musixmatch provider', () => {
  it('parses a success payload into lyric lines', () => {
    const lines = parseMusixmatchResponse({
      message: {
        header: { status_code: 200 },
        body: { subtitle: { subtitle_body: '[00:01.00] one\n[00:02.50] two' } },
      },
    });
    expect(lines).toEqual([
      { timeMs: 1000, durationMs: 1500, text: 'one' },
      { timeMs: 2500, durationMs: 4000, text: 'two' },
    ]);
  });

  it('returns null on error status or empty-array body', () => {
    expect(
      parseMusixmatchResponse({ message: { header: { status_code: 404 }, body: [] } }),
    ).toBeNull();
  });

  it('returns null on malformed payload', () => {
    expect(parseMusixmatchResponse({ nope: true })).toBeNull();
  });

  it('builds URL with duration gate', () => {
    const url = buildMusixmatchUrl({
      title: 'A',
      artist: 'B',
      durationMs: 200000,
      apiKey: 'k',
    });
    expect(url).toContain('f_subtitle_length=200');
    expect(url).toContain('f_subtitle_length_max_deviation=3');
    expect(url).toContain('subtitle_format=lrc');
  });

  it('is disabled without an API key and makes no request', async () => {
    const spy = jest.spyOn(globalThis, 'fetch');
    await expect(fetchMusixmatchLyrics({ title: 'A', artist: 'B' })).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
