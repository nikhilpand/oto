import type { ParsedLyrics } from '@/utils/lyrics/types';
import { parseTtml } from '@/utils/lyrics/TtmlParser';
import { parseLrc } from '@/utils/lyrics/LrcParser';

export const mockDuetTtml = `
<tt xmlns="http://www.w3.org/ns/ttml" itunes:timing="Word" xml:lang="en">
  <body dur="3:21.570">
    <div begin="0.000" end="45.000">
      <p begin="0.500" end="3.200" ttm:agent="v1">
        <span begin="0.500" end="0.900">I </span><span begin="0.900" end="1.400">been </span><span begin="1.400" end="2.100">tryna </span><span begin="2.100" end="3.200">call</span>
      </p>
      <p begin="3.800" end="7.500" ttm:agent="v1">
        <span begin="3.800" end="4.200">I </span><span begin="4.200" end="4.800">been </span><span begin="4.800" end="5.400">on </span><span begin="5.400" end="6.100">my </span><span begin="6.100" end="7.500">own </span>
        <span ttm:role="x-bg" begin="6.800" end="7.900"><span begin="6.800" end="7.900">(for long enough)</span></span>
      </p>
      <p begin="8.200" end="11.800" ttm:agent="v2">
        <span begin="8.200" end="8.900">Maybe </span><span begin="8.900" end="9.500">you </span><span begin="9.500" end="10.200">can </span><span begin="10.200" end="10.700">show </span><span begin="10.700" end="11.800">me</span>
      </p>
      <p begin="12.200" end="15.800" ttm:agent="v2">
        <span begin="12.200" end="12.900">How </span><span begin="12.900" end="13.500">to </span><span begin="13.500" end="14.300">love, </span><span begin="14.300" end="15.800">maybe</span>
      </p>
      <p begin="16.500" end="21.000" ttm:agent="v1">
        <span begin="16.500" end="17.200">I'm </span><span begin="17.200" end="18.000">going </span><span begin="18.000" end="18.800">through </span><span begin="18.800" end="21.000">withdrawals</span>
      </p>
      <p begin="21.500" end="26.200" ttm:agent="v2">
        <span begin="21.500" end="22.200">You </span><span begin="22.200" end="22.900">don't </span><span begin="22.900" end="23.600">even </span><span begin="23.600" end="24.400">have </span><span begin="24.400" end="25.000">to </span><span begin="25.000" end="26.200">do </span><span begin="26.200" end="27.000">too </span><span begin="27.000" end="28.200">much</span>
      </p>
      <p begin="28.800" end="34.000" ttm:agent="v1">
        <span begin="28.800" end="29.500">You </span><span begin="29.500" end="30.200">can </span><span begin="30.200" end="31.000">turn </span><span begin="31.000" end="32.000">me </span><span begin="32.000" end="34.000">on</span>
      </p>
      <p begin="34.500" end="40.000" ttm:agent="v2">
        <span begin="34.500" end="35.500">With </span><span begin="35.500" end="37.000">just </span><span begin="37.000" end="38.500">a </span><span begin="38.500" end="40.000">touch</span>
      </p>
    </div>
  </body>
</tt>
`.trim();

export const mockLrcContent = `
[00:00.50]Waiting in a car
[00:04.20]Waiting for a ride in the dark
[00:08.50]The night city grows
[00:12.80]Look and see her eyes, they glow
[00:17.20]Waiting in a car
[00:21.00]Waiting for a ride in the dark
[00:25.50]The night city grows
[00:29.80]Look and see her eyes, they glow
[00:34.20]Waiting in a car
[00:38.50]Waiting for a ride in the dark
`.trim();

export const mockHindiLrcContent = `
[00:02.00]दिल जला के मुस्कुराने की जो आदत हुई है मुझे
[00:07.50]लग रहा है, क़ायदे से अब मोहब्बत हुई है मुझे
[00:13.20]मेरी तुम्हीं से है जवाब-दारी
[00:18.80]तुम्हीं से मेरी शाम ओ सहर संवारी
[00:24.50]तेरी ख़ामोशी भी सब बयाँ करती है
[00:30.00]ये रुत हवाओं में महकती है
`.trim();

export const mockArabicLrcContent = `
[00:02.00]حبيبي يا نور العين يا ساكن خيالي
[00:07.00]عاشق بقالي سنين ولا غيرك في بالي
[00:13.00]أجمل عيون بالكون أنا شفتها
[00:18.50]الله عليك يا سيدي على جمالها
[00:24.00]قلبك نداني وقال بتحبني
[00:29.50]الله عليك لما العيون تندهني
`.trim();

export const mockCjkLrcContent = `
[00:01.50]沈むように溶けてゆくように
[00:06.00]二人だけの空が広がる夜に
[00:11.50]さよならだけだった
[00:15.80]その一言で全てが分かった
[00:20.50]日が沈み出した空と君の姿
[00:25.20]フェンス越しに重なっていた
`.trim();

export const mockCyrillicLrcContent = `
[00:02.00]Крыши домов дрожат под тяжестью дней
[00:07.00]Небесный пастух пасет облака
[00:12.50]Город стреляет в ночь дробью огней
[00:17.80]Но ночь сильней, ее власть велика
[00:23.00]Тем, кто ложится спать — спокойного сна
[00:28.50]Спокойная ночь
`.trim();

export const mockPlainLyricsText = `
Take a walk into the midnight rain
Echoes of a summer fading away
Nothing ever stays the same
In the shadows of our yesterday
Colors morph under neon lights
Drifting through the quiet starry nights
`.trim();

export const mockParsedDuetLyrics: ParsedLyrics = parseTtml(mockDuetTtml);

export const mockParsedLrcLyrics: ParsedLyrics = {
  lines: parseLrc(mockLrcContent),
  isWordSynced: false,
  isLineSynced: true,
  hasDuet: false,
  script: 'latin',
};

export const mockParsedHindiLyrics: ParsedLyrics = {
  lines: parseLrc(mockHindiLrcContent),
  isWordSynced: false,
  isLineSynced: true,
  hasDuet: false,
  script: 'devanagari',
};

export const mockParsedArabicLyrics: ParsedLyrics = {
  lines: parseLrc(mockArabicLrcContent),
  isWordSynced: false,
  isLineSynced: true,
  hasDuet: false,
  script: 'arabic',
};

export const mockParsedCjkLyrics: ParsedLyrics = {
  lines: parseLrc(mockCjkLrcContent),
  isWordSynced: false,
  isLineSynced: true,
  hasDuet: false,
  script: 'cjk',
};

export const mockParsedCyrillicLyrics: ParsedLyrics = {
  lines: parseLrc(mockCyrillicLrcContent),
  isWordSynced: false,
  isLineSynced: true,
  hasDuet: false,
  script: 'cyrillic',
};
