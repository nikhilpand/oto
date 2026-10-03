/**
 * AppSettings — Typed MMKV-Backed Settings Store
 *
 * Provides a type-safe settings interface with MMKV persistence.
 * Settings are validated on read with default fallbacks, ensuring
 * the app never crashes from corrupt stored values.
 *
 * @classification ARCHITECTURE_PORT
 * @priority P1
 * @portedFrom BitChord: data/settings/AppSettings.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Architecture port — typed MMKV store with Zod validation.
 */

import { z } from 'zod';

// ─── Schema ───────────────────────────────────────────────────────────

export const AppSettingsSchema = z.object({
  /** Audio quality preference */
  audioQuality: z.enum(['low', 'normal', 'high', 'lossless']).default('high'),
  /** Whether to use mobile data for streaming */
  streamOnMobileData: z.boolean().default(true),
  /** Whether to download on mobile data */
  downloadOnMobileData: z.boolean().default(false),
  /** Audio normalization (ReplayGain-style) */
  normalizeAudio: z.boolean().default(true),
  /** Crossfade duration in ms (0 = disabled) */
  crossfadeDurationMs: z.number().min(0).max(12000).default(0),
  /** Gapless playback */
  gaplessPlayback: z.boolean().default(true),
  /** Skip silence in tracks */
  skipSilence: z.boolean().default(false),
  /** Autoplay when queue ends */
  autoplay: z.boolean().default(true),
  /** Allow explicit content */
  allowExplicit: z.boolean().default(true),
  /** Lyrics font size multiplier (1.0 = default) */
  lyricsFontScale: z.number().min(0.5).max(2.0).default(1.0),
  /** Show romanization for non-Latin lyrics */
  showRomanization: z.boolean().default(false),
  /** Show translations for foreign lyrics */
  showTranslation: z.boolean().default(false),
  /** Quality tier override (null = auto) */
  qualityTierOverride: z.number().int().min(0).max(3).nullable().default(null),
  /** Sleep timer minutes (0 = disabled) */
  sleepTimerMinutes: z.number().min(0).default(0),
  /** Downloads storage path override */
  downloadPath: z.string().nullable().default(null),
  /** Preferred lyrics provider order */
  lyricsProviderOrder: z.array(z.string()).default(['apple', 'lrclib', 'musixmatch']),
  /** Whether listening history recording is enabled */
  recordListeningHistory: z.boolean().default(true),
  /** Cache limit in MB */
  cacheLimitMb: z.number().min(50).max(10000).default(500),
  /** Theme preference */
  theme: z.enum(['system', 'light', 'dark']).default('dark'),
  /** Output precision */
  outputPrecision: z.enum(['16bit', '32bit_float']).default('32bit_float'),
  /** Reduce animation / freeze gradients */
  reduceAnimation: z.boolean().default(false),
  /** Reduce dynamic blur / solid fallback */
  reduceDynamicBlur: z.boolean().default(false),
  /** Liquid glass refracting effects */
  liquidGlass: z.boolean().default(true),
  /** Full screen cover art */
  fullScreenCoverArt: z.boolean().default(true),
  /** Prefer music-only version over music video */
  preferMusicOnly: z.boolean().default(false),
  /** Prefer USB DAC bit-perfect output */
  preferUsbDac: z.boolean().default(false),
  /** Dolby Atmos immersive audio */
  dolbyAtmos: z.boolean().default(true),
  /** Smart audio alignment */
  smartAudioAlignment: z.boolean().default(true),
  /** Show stats for nerds */
  statsForNerds: z.boolean().default(false),
  /** Synced lyrics highlighting */
  syncedLyrics: z.boolean().default(true),
  /** Blur unfocused lyric lines */
  blurUnfocusedLyrics: z.boolean().default(true),
  /** High performance mode */
  highPerformanceMode: z.boolean().default(false),
  /** Filter non-music audio files */
  filterNonMusicAudio: z.boolean().default(true),
});

export type AppSettingsData = z.infer<typeof AppSettingsSchema>;

// ─── Storage ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'oto:app_settings';

interface KVStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

let store: KVStore | null | undefined;

/** Lazily open MMKV; null when unavailable (Jest/web). */
function getStore(): KVStore | null {
  if (store !== undefined) return store;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    store = new MMKV({ id: 'oto.settings' }) as KVStore;
  } catch {
    store = null;
  }
  return store;
}

// ─── State ────────────────────────────────────────────────────────────

let cachedSettings: AppSettingsData | null = null;
const listeners = new Set<(settings: AppSettingsData) => void>();

function notifyListeners(settings: AppSettingsData): void {
  for (const listener of listeners) {
    try {
      listener(settings);
    } catch {}
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function loadFromStorage(): AppSettingsData {
  try {
    const raw = getStore()?.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate with Zod — invalid fields get defaults
      return AppSettingsSchema.parse(parsed);
    }
  } catch {
    // Corrupt data: return defaults
  }
  return AppSettingsSchema.parse({});
}

function writeToStorage(settings: AppSettingsData): void {
  try {
    getStore()?.set(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Non-critical persistence failure
  }
}

// ─── Public API ───────────────────────────────────────────────────────

export const AppSettings = {
  /**
   * Get the full settings object.
   * Lazily loads from MMKV on first access.
   */
  getAll(): AppSettingsData {
    if (!cachedSettings) {
      cachedSettings = loadFromStorage();
    }
    return cachedSettings;
  },

  /**
   * Get a single setting value.
   */
  get<K extends keyof AppSettingsData>(key: K): AppSettingsData[K] {
    return AppSettings.getAll()[key];
  },

  /**
   * Update one or more settings.
   * Merges with existing values and persists to MMKV.
   */
  set(partial: Partial<AppSettingsData>): void {
    const current = AppSettings.getAll();
    const merged = { ...current, ...partial };
    // Validate merged result
    cachedSettings = AppSettingsSchema.parse(merged);
    writeToStorage(cachedSettings);
    notifyListeners(cachedSettings);
  },

  /**
   * Reset all settings to defaults.
   */
  reset(): void {
    cachedSettings = AppSettingsSchema.parse({});
    writeToStorage(cachedSettings);
    notifyListeners(cachedSettings);
  },

  /**
   * Subscribe to setting changes.
   */
  subscribe(listener: (settings: AppSettingsData) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Clear the cache (for testing).
   */
  _clearCache(): void {
    cachedSettings = null;
  },
} as const;
