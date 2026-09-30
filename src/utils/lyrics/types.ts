export type DuetAgent = 'v1' | 'v2' | 'group' | 'other';
export type LyricAlignment = 'start' | 'end';
export type SupportedScript = 'latin' | 'devanagari' | 'arabic' | 'cjk' | 'cyrillic';

export interface LyricWord {
  startMs: number;
  endMs: number;
  text: string;
}

export interface LyricBackgroundVocal {
  timeMs: number;
  endMs: number;
  text: string;
  isWordSynced: boolean;
  words?: LyricWord[];
}

export interface LyricLine {
  id: string;
  timeMs: number;
  endMs: number;
  text: string;
  words: LyricWord[];
  isWordSynced: boolean;
  alignment: LyricAlignment;
  agent?: DuetAgent;
  background?: LyricBackgroundVocal;
  isGap?: boolean;
}

export interface ParsedLyrics {
  lines: LyricLine[];
  isWordSynced: boolean;
  isLineSynced: boolean;
  hasDuet: boolean;
  script: SupportedScript;
}
