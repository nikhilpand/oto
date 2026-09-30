import type { SupportedScript } from './types';

/**
 * Detects the predominant script of a given text string.
 * Used for applying appropriate typography, line-height, and writing directions.
 */
export function detectScript(text: string): SupportedScript {
  if (!text || text.trim().length === 0) {
    return 'latin';
  }

  // Unicode block regex tests
  const devanagariRegex = /[\u0900-\u097F]/;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const cjkRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
  const cyrillicRegex = /[\u0400-\u04FF]/;

  if (devanagariRegex.test(text)) return 'devanagari';
  if (arabicRegex.test(text)) return 'arabic';
  if (cjkRegex.test(text)) return 'cjk';
  if (cyrillicRegex.test(text)) return 'cyrillic';

  return 'latin';
}
