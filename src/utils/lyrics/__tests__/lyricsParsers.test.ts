import { parseLrc } from '../LrcParser';
import { parseTtml } from '../TtmlParser';
import { detectScript } from '../scriptDetector';

describe('LrcParser', () => {
  it('parses standard 2-digit centisecond timestamps', () => {
    const lrc = `
[00:12.50]First line
[00:15.80]Second line
[00:20.00]Third line
    `.trim();

    const result = parseLrc(lrc);
    expect(result).toHaveLength(3);

    expect(result[0]?.timeMs).toBe(12500);
    expect(result[0]?.text).toBe('First line');
    expect(result[0]?.endMs).toBe(15800);

    expect(result[1]?.timeMs).toBe(15800);
    expect(result[1]?.text).toBe('Second line');
    expect(result[1]?.endMs).toBe(20000);

    expect(result[2]?.timeMs).toBe(20000);
    expect(result[2]?.text).toBe('Third line');
  });

  it('parses 3-digit millisecond timestamps accurately', () => {
    const lrc = `
[01:05.123]Line with millisecond precision
[01:08.987]Next line
    `.trim();

    const result = parseLrc(lrc);
    expect(result).toHaveLength(2);

    expect(result[0]?.timeMs).toBe(65123);
    expect(result[0]?.text).toBe('Line with millisecond precision');
    expect(result[0]?.endMs).toBe(68987);

    expect(result[1]?.timeMs).toBe(68987);
    expect(result[1]?.text).toBe('Next line');
  });

  it('sorts out-of-order lines chronologically', () => {
    const lrc = `
[00:20.00]Line three
[00:05.00]Line one
[00:12.00]Line two
    `.trim();

    const result = parseLrc(lrc);
    expect(result.map((l) => l.text)).toEqual(['Line one', 'Line two', 'Line three']);
    expect(result.map((l) => l.timeMs)).toEqual([5000, 12000, 20000]);
  });

  it('ignores metadata headers and malformed lines gracefully', () => {
    const lrc = `
[ti:Midnight City]
[ar:M83]
[al:Hurry Up, We're Dreaming]
[by:OTO]
[00:10.00]Waiting in a car
Invalid timestamp line here
[99:99]Malformed
[00:15.50]Waiting for a ride in the dark
    `.trim();

    const result = parseLrc(lrc);
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe('Waiting in a car');
    expect(result[1]?.text).toBe('Waiting for a ride in the dark');
  });

  it('returns an empty array for empty or whitespace-only inputs', () => {
    expect(parseLrc('')).toEqual([]);
    expect(parseLrc('   \n\n  ')).toEqual([]);
  });
});

describe('TtmlParser', () => {
  const sampleTtml = `
<tt xmlns="http://www.w3.org/ns/ttml" itunes:timing="Word" xml:lang="en">
  <body dur="3:21.570">
    <div begin="27.395" end="32.529" itunes:songPart="Verse">
      <p begin="27.395" end="28.960" itunes:key="L1" ttm:agent="v1">
        <span begin="27.395" end="27.549">I </span><span begin="27.549" end="27.740">been </span><span begin="27.740" end="28.077">tryna </span><span begin="28.077" end="28.960">call</span>
      </p>
      <p begin="30.189" end="32.529" itunes:key="L2" ttm:agent="v1">
        <span begin="30.189" end="30.396">long </span><span begin="31.839" end="31.996">e</span><span begin="31.996" end="32.529">nough</span>
      </p>
    </div>
  </body>
</tt>
  `.trim();

  it('reads word timings out of Apple Music TTML', () => {
    const lyrics = parseTtml(sampleTtml);
    expect(lyrics.lines).toHaveLength(2);

    const first = lyrics.lines[0];
    expect(first).toBeDefined();
    if (!first) return;

    expect(first.text).toBe('I been tryna call');
    expect(first.timeMs).toBe(27395);
    expect(first.endMs).toBe(28960);
    expect(first.isWordSynced).toBe(true);
    expect(first.words.map((w) => w.text)).toEqual(['I', 'been', 'tryna', 'call']);
    expect(first.words[0]?.startMs).toBe(27395);
    expect(first.words[0]?.endMs).toBe(27549);
    expect(first.words[3]?.startMs).toBe(28077);
    expect(first.words[3]?.endMs).toBe(28960);
  });

  it('merges adjacent syllable spans with no space into a single word', () => {
    const lyrics = parseTtml(sampleTtml);
    const second = lyrics.lines[1];
    expect(second).toBeDefined();
    if (!second) return;

    expect(second.text).toBe('long enough');
    expect(second.words.map((w) => w.text)).toEqual(['long', 'enough']);

    const enough = second.words[1];
    expect(enough).toBeDefined();
    if (!enough) return;

    expect(enough.startMs).toBe(31839);
    expect(enough.endMs).toBe(32529);
  });

  it('lays a duet out on alternating sides according to ttm:agent', () => {
    const duetTtml = `
<tt xmlns="http://www.w3.org/ns/ttml">
  <head><metadata>
    <ttm:agent type="person" xml:id="v1"/>
    <ttm:agent type="person" xml:id="v2"/>
    <ttm:agent type="group" xml:id="v1000"/>
  </metadata></head>
  <body><div>
    <p begin="1.0" end="2.0" ttm:agent="v1">mine</p>
    <p begin="2.0" end="3.0" ttm:agent="v2">yours</p>
    <p begin="3.0" end="4.0" ttm:agent="v2">still yours</p>
    <p begin="4.0" end="5.0" ttm:agent="v1">mine again</p>
    <p begin="5.0" end="6.0" ttm:agent="v1000">both of us</p>
  </div></body>
</tt>
    `.trim();

    const lyrics = parseTtml(duetTtml);
    expect(lyrics.hasDuet).toBe(true);
    expect(lyrics.lines.map((l) => l.alignment)).toEqual([
      'start',
      'end',
      'end',
      'start',
      'start',
    ]);
  });

  it('keeps single voice songs all on start alignment even if labeled v2', () => {
    const singleVoice = `
<tt><head><metadata><ttm:agent type="other" xml:id="v2"/></metadata></head>
<body><div>
  <p begin="1.0" end="2.0" ttm:agent="v2">one</p>
  <p begin="2.0" end="3.0" ttm:agent="v2">two</p>
</div></body></tt>
    `.trim();

    const lyrics = parseTtml(singleVoice);
    expect(lyrics.hasDuet).toBe(false);
    expect(lyrics.lines.map((l) => l.alignment)).toEqual(['start', 'start']);
  });

  it('extracts background vocals from x-bg spans', () => {
    const bgTtml = `
<tt><body><div>
  <p begin="1.0" end="2.0">
    <span begin="1.0" end="2.0">hello</span>
    <span ttm:role="x-bg" begin="1.5" end="2.4"><span begin="1.5" end="2.4">(ooh)</span></span>
  </p>
</div></body></tt>
    `.trim();

    const lyrics = parseTtml(bgTtml);
    const line = lyrics.lines[0];
    expect(line).toBeDefined();
    if (!line) return;

    expect(line.text).toBe('hello');
    expect(line.background).toBeDefined();
    expect(line.background?.text).toBe('(ooh)');
    expect(line.background?.timeMs).toBe(1500);
    expect(line.background?.endMs).toBe(2400);
  });

  it('falls back to line-synced lyrics if no spans exist', () => {
    const lineSynced = `
<tt><body><div>
  <p begin="00:12.50">just a line</p>
  <p begin="00:16.00">second line</p>
</div></body></tt>
    `.trim();

    const lyrics = parseTtml(lineSynced);
    expect(lyrics.lines).toHaveLength(2);
    expect(lyrics.lines[0]?.text).toBe('just a line');
    expect(lyrics.lines[0]?.timeMs).toBe(12500);
    expect(lyrics.lines[0]?.isWordSynced).toBe(false);
    expect(lyrics.lines[0]?.words).toEqual([]);
  });

  it('handles clock formats (seconds, mm:ss.xx, hh:mm:ss.f, s, ms)', () => {
    const clockTtml = `
<tt><body><div>
  <p begin="27.395">point seconds</p>
  <p begin="1:05.20">minute second</p>
  <p begin="1:02:03.4">hour minute second</p>
  <p begin="1.5s">seconds unit</p>
  <p begin="250ms">millis unit</p>
</div></body></tt>
    `.trim();

    const lyrics = parseTtml(clockTtml);
    expect(lyrics.lines[0]?.timeMs).toBe(27395);
    expect(lyrics.lines[1]?.timeMs).toBe(65200);
    expect(lyrics.lines[2]?.timeMs).toBe(3723400);
    expect(lyrics.lines[3]?.timeMs).toBe(1500);
    expect(lyrics.lines[4]?.timeMs).toBe(250);
  });

  it('handles bad XML safely returning empty lines without throwing', () => {
    const bad = `<tt><body><p begin=`;
    expect(() => parseTtml(bad)).not.toThrow();
    expect(parseTtml(bad).lines).toEqual([]);
  });
});

describe('scriptDetector', () => {
  it('detects Latin script', () => {
    expect(detectScript('Hello world, I been tryna call')).toBe('latin');
  });

  it('detects Devanagari script for Hindi', () => {
    expect(detectScript('दिल जला के मुस्कुराने की जो आदत हुई है मुझे')).toBe('devanagari');
  });

  it('detects Arabic script', () => {
    expect(detectScript('حبيبي يا نور العين')).toBe('arabic');
  });

  it('detects CJK script for Chinese/Japanese/Korean', () => {
    expect(detectScript('夜に駆ける')).toBe('cjk');
    expect(detectScript('我的秘密')).toBe('cjk');
    expect(detectScript('사랑해')).toBe('cjk');
  });

  it('detects Cyrillic script', () => {
    expect(detectScript('Спокойная ночь')).toBe('cyrillic');
  });
});
