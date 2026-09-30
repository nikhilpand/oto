import type {
  DuetAgent,
  LyricBackgroundVocal,
  LyricLine,
  LyricWord,
  ParsedLyrics,
} from './types';
import { detectScript } from './scriptDetector';

/**
 * Parses diverse TTML time representations into milliseconds:
 * - Clock time: "01:02:03.4", "01:05.20", "27.395"
 * - Unit time: "1.5s", "250ms"
 */
export function parseTtmlTime(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  if (trimmed.endsWith('ms')) {
    const ms = parseFloat(trimmed.slice(0, -2));
    return isNaN(ms) ? null : Math.round(ms);
  }

  if (trimmed.endsWith('s')) {
    const s = parseFloat(trimmed.slice(0, -1));
    return isNaN(s) ? null : Math.round(s * 1000);
  }

  const parts = trimmed.split(':');
  if (parts.length === 1 && parts[0] !== undefined) {
    const sec = parseFloat(parts[0]);
    return isNaN(sec) ? null : Math.round(sec * 1000);
  }
  if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const min = parseInt(parts[0], 10);
    const sec = parseFloat(parts[1]);
    if (isNaN(min) || isNaN(sec)) return null;
    return Math.round(min * 60000 + sec * 1000);
  }
  if (
    parts.length === 3 &&
    parts[0] !== undefined &&
    parts[1] !== undefined &&
    parts[2] !== undefined
  ) {
    const hr = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);
    const sec = parseFloat(parts[2]);
    if (isNaN(hr) || isNaN(min) || isNaN(sec)) return null;
    return Math.round(hr * 3600000 + min * 60000 + sec * 1000);
  }

  return null;
}

interface RawSpan {
  text: string;
  startMs: number;
  endMs: number;
  isBackground: boolean;
  isTranslation: boolean;
  hasTrailingSpace: boolean;
}

/**
 * Clean-room parser for Apple Music / Spotify TTML Timed Text Markup Language.
 * Reverse-engineered from BitChord (BITCHORD_RE/09_LYRICS.md & 18_REUSABLE_CODE.md Candidate B.3).
 */
export function parseTtml(xmlContent: string): ParsedLyrics {
  const fallback: ParsedLyrics = {
    lines: [],
    isWordSynced: false,
    isLineSynced: false,
    hasDuet: false,
    script: 'latin',
  };

  if (!xmlContent || typeof xmlContent !== 'string') {
    return fallback;
  }

  // Safety check for unclosed / truncated XML
  if (!xmlContent.includes('<p') && !xmlContent.includes('<tt')) {
    return fallback;
  }

  try {
    const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
    const lines: LyricLine[] = [];
    const agentsEncountered = new Set<string>();

    let pMatch: RegExpExecArray | null;
    let lineIndex = 0;

    while ((pMatch = pRegex.exec(xmlContent)) !== null) {
      const attrsStr = pMatch[1] ?? '';
      const pInnerHtml = pMatch[2] ?? '';

      const beginMatch = attrsStr.match(/\bbegin=["']([^"']+)["']/i);
      const endMatch = attrsStr.match(/\bend=["']([^"']+)["']/i);
      const agentMatch = attrsStr.match(/\bttm:agent=["']([^"']+)["']/i);

      const pBeginMs = parseTtmlTime(beginMatch?.[1]) ?? 0;
      let pEndMs = parseTtmlTime(endMatch?.[1]) ?? pBeginMs + 4000;
      const rawAgent = agentMatch?.[1];

      if (rawAgent) {
        agentsEncountered.add(rawAgent);
      }

      // Check if p contains spans or is a plain line-synced line
      const hasSpans = /<span\b/i.test(pInnerHtml);

      if (!hasSpans) {
        // Plain line-synced TTML
        const cleanText = pInnerHtml.replace(/<[^>]+>/g, '').trim();
        if (cleanText) {
          lines.push({
            id: `ttml-line-${lineIndex++}`,
            timeMs: pBeginMs,
            endMs: pEndMs,
            text: cleanText,
            words: [],
            isWordSynced: false,
            alignment: 'start',
            agent: (rawAgent as DuetAgent) || undefined,
          });
        }
        continue;
      }

      // Extract spans
      const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
      let spanMatch: RegExpExecArray | null;
      const rawSpans: RawSpan[] = [];

      let lastIndex = 0;
      while ((spanMatch = spanRegex.exec(pInnerHtml)) !== null) {
        const spanAttrs = spanMatch[1] ?? '';
        let spanText = spanMatch[2] ?? '';

        // Check for nested spans (e.g. <span ttm:role="x-bg"><span>(ooh)</span></span>)
        const nestedSpanMatch = spanText.match(/<span\b[^>]*>([\s\S]*?)<\/span>/i);
        if (nestedSpanMatch && nestedSpanMatch[1] !== undefined) {
          spanText = nestedSpanMatch[1];
        }

        const roleMatch = spanAttrs.match(/\bttm:role=["']([^"']+)["']/i);
        const role = roleMatch?.[1]?.toLowerCase();
        const isTranslation = role === 'x-translation';
        const isBackground = role === 'x-bg';

        if (isTranslation) {
          continue;
        }

        const sBegin = parseTtmlTime(spanAttrs.match(/\bbegin=["']([^"']+)["']/i)?.[1]) ?? pBeginMs;
        const sEnd = parseTtmlTime(spanAttrs.match(/\bend=["']([^"']+)["']/i)?.[1]) ?? pEndMs;

        // Check whether span or surrounding text contains whitespace
        const interWhitespace = pInnerHtml.substring(lastIndex, spanMatch.index);
        const hasLeadingSpace = /\s+$/.test(interWhitespace);
        const hasTrailingSpace = /\s+$/.test(spanText);

        const cleanSpanText = spanText.replace(/<[^>]+>/g, '');

        rawSpans.push({
          text: cleanSpanText,
          startMs: sBegin,
          endMs: sEnd,
          isBackground,
          isTranslation: false,
          hasTrailingSpace: hasTrailingSpace || hasLeadingSpace,
        });

        lastIndex = spanRegex.lastIndex;
      }

      // Separate background vocal spans from lead vocal spans
      const leadSpans = rawSpans.filter((s) => !s.isBackground);
      const bgSpans = rawSpans.filter((s) => s.isBackground);

      // Merge lead syllable spans into words
      const leadWords: LyricWord[] = [];
      let currentWordText = '';
      let currentWordStart = 0;
      let currentWordEnd = 0;

      for (let i = 0; i < leadSpans.length; i++) {
        const span = leadSpans[i];
        if (!span) continue;
        const spanClean = span.text.trim();
        if (!spanClean) continue;

        if (!currentWordText) {
          currentWordText = spanClean;
          currentWordStart = span.startMs;
          currentWordEnd = span.endMs;
        } else {
          currentWordText += spanClean;
          currentWordEnd = span.endMs;
        }

        // A word boundary occurs if the span has a trailing space,
        // or if the next span text had leading space, or at the end of spans.
        const nextSpan = leadSpans[i + 1];
        const boundaryAhead = span.hasTrailingSpace || !nextSpan;

        if (boundaryAhead) {
          leadWords.push({
            text: currentWordText,
            startMs: currentWordStart,
            endMs: currentWordEnd,
          });
          currentWordText = '';
        }
      }

      const fullLineText = leadWords.map((w) => w.text).join(' ');

      // Background vocal handling
      let backgroundVocal: LyricBackgroundVocal | undefined;
      if (bgSpans.length > 0) {
        const bgWords: LyricWord[] = [];
        let curBgText = '';
        let curBgStart = 0;
        let curBgEnd = 0;

        for (let i = 0; i < bgSpans.length; i++) {
          const span = bgSpans[i];
          if (!span) continue;
          const spanClean = span.text.trim();
          if (!spanClean) continue;

          if (!curBgText) {
            curBgText = spanClean;
            curBgStart = span.startMs;
            curBgEnd = span.endMs;
          } else {
            curBgText += spanClean;
            curBgEnd = span.endMs;
          }

          const nextSpan = bgSpans[i + 1];
          if (span.hasTrailingSpace || !nextSpan) {
            bgWords.push({
              text: curBgText,
              startMs: curBgStart,
              endMs: curBgEnd,
            });
            curBgText = '';
          }
        }

        const bgText = bgWords.map((w) => w.text).join(' ');
        if (bgWords.length > 0) {
          const firstBg = bgWords[0];
          const lastBg = bgWords[bgWords.length - 1];
          if (firstBg && lastBg) {
            backgroundVocal = {
              timeMs: firstBg.startMs,
              endMs: lastBg.endMs,
              text: bgText,
              isWordSynced: bgWords.length > 0,
              words: bgWords,
            };
            if (lastBg.endMs > pEndMs) {
              pEndMs = lastBg.endMs;
            }
          }
        }
      }

      if (fullLineText || backgroundVocal) {
        lines.push({
          id: `ttml-line-${lineIndex++}`,
          timeMs: leadWords.length > 0 && leadWords[0] ? leadWords[0].startMs : pBeginMs,
          endMs: pEndMs,
          text: fullLineText,
          words: leadWords,
          isWordSynced: leadWords.length > 0,
          alignment: 'start',
          agent: (rawAgent as DuetAgent) || undefined,
          background: backgroundVocal,
        });
      }
    }

    // Determine Duet Alignment
    // Per BitChord WordSyncTest rules:
    // If only one voice exists (e.g. only 'v1' or only 'v2'), all lines stay start (left-aligned).
    // If two or more person voices trade lines ('v1' vs 'v2'), 'v2' aligns 'end' (right-aligned), 'v1' & group align 'start'.
    const personAgents = Array.from(agentsEncountered).filter(
      (a) => a === 'v1' || a === 'v2'
    );
    const hasDuet = personAgents.length >= 2;

    if (hasDuet) {
      for (const line of lines) {
        if (line.agent === 'v2') {
          line.alignment = 'end';
        } else {
          line.alignment = 'start';
        }
      }
    } else {
      for (const line of lines) {
        line.alignment = 'start';
      }
    }

    // Estimate endMs if not provided
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (!line.endMs || line.endMs <= line.timeMs) {
        const next = lines[i + 1];
        line.endMs = next ? next.timeMs : line.timeMs + 4000;
      }
    }

    const allText = lines.map((l) => l.text).join(' ');
    const detectedScript = detectScript(allText);

    return {
      lines,
      isWordSynced: lines.some((l) => l.isWordSynced),
      isLineSynced: lines.length > 0,
      hasDuet,
      script: detectedScript,
    };
  } catch {
    return fallback;
  }
}
