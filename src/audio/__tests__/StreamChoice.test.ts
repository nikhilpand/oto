import { StreamChoice, CachedStreamChoice } from '../StreamChoice';

describe('StreamChoice (BitChord Reference StreamChoiceTest)', () => {
  const stream = (host: string): CachedStreamChoice => ({
    url: `https://${host}/track.mp4`,
    format: { codec: 'mp4', kbps: 320 },
  });

  beforeEach(() => {
    StreamChoice.clear();
  });

  afterEach(() => {
    StreamChoice.clear();
  });

  test('a remembered choice is handed back', () => {
    StreamChoice.remember('track-1', stream('aac.saavncdn.com'), true);
    expect(StreamChoice.of('track-1')?.url).toBe('https://aac.saavncdn.com/track.mp4');
  });

  test('a track nothing has chosen for is free to resolve', () => {
    expect(StreamChoice.of('track-2')).toBeNull();
  });

  test('remembers whether the copy came from a substitute', () => {
    StreamChoice.remember('track-3', stream('aac.saavncdn.com'), true);
    StreamChoice.remember('track-4', stream('googlevideo.com'), false);
    expect(StreamChoice.isSubstitute('track-3')).toBe(true);
    expect(StreamChoice.isSubstitute('track-4')).toBe(false);
  });

  test('overflow drops the oldest choice rather than all of them', () => {
    // 40 writes into a 32-capacity registry
    for (let i = 0; i < 40; i++) {
      StreamChoice.remember(`track-${i}`, stream(`host-${i}.example`), true);
    }

    // The newest write is always honoured under either policy
    expect(StreamChoice.of('track-39')).not.toBeNull();
    expect(StreamChoice.of('track-39')?.url).toBe('https://host-39.example/track.mp4');

    // track-20 is one of the 20 most recent writes, so a bounded LRU still holds it
    // (A blunt clear() on overflow would have emptied it wholesale)
    expect(StreamChoice.of('track-20')).not.toBeNull();
    expect(StreamChoice.of('track-20')?.url).toBe('https://host-20.example/track.mp4');

    // Oldest entries (e.g. track-0 through track-7) should have been evicted
    expect(StreamChoice.of('track-0')).toBeNull();
  });

  test('forgetting a choice reopens the question', () => {
    StreamChoice.remember('track-5', stream('aac.saavncdn.com'), true);
    StreamChoice.forget('track-5');
    expect(StreamChoice.of('track-5')).toBeNull();
  });

  test('substitutes refusal cooldown operates correctly', () => {
    expect(StreamChoice.substitutesRefused('track-6')).toBe(false);
    StreamChoice.refuseSubstitutes('track-6');
    expect(StreamChoice.substitutesRefused('track-6')).toBe(true);
  });
});
