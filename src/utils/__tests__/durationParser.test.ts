import {
  parseDurationMillis,
  parseDurationSec,
  formatDuration,
} from '../durationParser';

describe('SongDuration (BitChord Reference SongDurationTest)', () => {
  const song = (durationText: string | null | undefined) => ({
    durationMillis: () => parseDurationMillis(durationText),
    durationSec: () => parseDurationSec(durationText),
  });

  test('minutes and seconds', () => {
    expect(song('3:45').durationMillis()).toBe(225_000);
    expect(song('3:45').durationSec()).toBe(225);
  });

  test('a single-digit minute field, which is how most rows arrive', () => {
    expect(song('1:02').durationMillis()).toBe(62_000);
    expect(song('1:02').durationSec()).toBe(62);
  });

  test('hours, minutes and seconds', () => {
    // The long-mix case. Older duration parsers return 0 here.
    expect(song('1:02:33').durationMillis()).toBe(3_753_000);
    expect(song('1:02:33').durationSec()).toBe(3753);
  });

  test('surrounding and interior whitespace is tolerated', () => {
    expect(song(' 3 : 45 ').durationMillis()).toBe(225_000);
  });

  test('a row with no duration is zero rather than null', () => {
    expect(song(null).durationMillis()).toBe(0);
    expect(song(undefined).durationMillis()).toBe(0);
  });

  test("anything that isn't a duration is zero", () => {
    expect(song('').durationMillis()).toBe(0);
    expect(song('LIVE').durationMillis()).toBe(0);
    expect(song('3:45:xx').durationMillis()).toBe(0);
    expect(song('225').durationMillis()).toBe(0);
    expect(song('1:2:3:4').durationMillis()).toBe(0);
  });

  test('a negative field cannot produce a negative duration', () => {
    // A caller's only check is <= 0, so the guard has to hold
    expect(song('-3:45').durationMillis()).toBe(0);
    expect(song('3:-45').durationMillis()).toBe(0);
  });

  test('formatDuration formats seconds and millis cleanly', () => {
    expect(formatDuration(225)).toBe('3:45');
    expect(formatDuration(62)).toBe('1:02');
    expect(formatDuration(3753)).toBe('1:02:33');
    expect(formatDuration(225_000, true)).toBe('3:45');
    expect(formatDuration(0)).toBe('0:00');
  });
});
