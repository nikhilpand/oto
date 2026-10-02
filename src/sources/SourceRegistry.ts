/**
 * SourceRegistry — Pluggable Audio Sources & Waterfall Stream Resolution
 *
 * Clean-room implementation inspired by BitChord's SourceRegistry.kt.
 *
 * Provides:
 * 1. Pluggable source registration (JioSaavn, YouTube, Piped, Custom Addons).
 * 2. Real-time health checking and edge latency measurement.
 * 3. Priority-based waterfall stream resolution with circuit-breaker guarding.
 * 4. Durable persistence of source configurations in MMKV.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/data/sources/SourceRegistry.kt
 */

import type { Track, ResolvedStream } from '@/domain/types';
import type {
  SourceConfig,
  SourceHealthResult,
  PluggableMusicSource,
} from './SourceTypes';
import { CircuitBreaker } from '@/api/resilience/circuitBreaker';

export interface SourceStorageBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

class MMKVSourceStorage implements SourceStorageBackend {
  private mmkv: {
    getString: (k: string) => string | undefined;
    set: (k: string, v: string) => void;
    delete: (k: string) => void;
  } | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MMKV } = require('react-native-mmkv');
      this.mmkv = new MMKV({ id: 'oto.sources' });
    } catch {
      this.mmkv = null;
    }
  }

  getString(key: string): string | undefined {
    return this.mmkv?.getString(key);
  }
  set(key: string, value: string): void {
    this.mmkv?.set(key, value);
  }
  delete(key: string): void {
    this.mmkv?.delete(key);
  }
}

const STORAGE_KEY = 'oto.sources.configs';

const DEFAULT_CONFIGS: SourceConfig[] = [
  {
    id: 'source-saavn',
    kind: 'jiosaavn',
    label: 'JioSaavn Edge CDN (320kbps AAC)',
    enabled: true,
    priority: 10,
  },
  {
    id: 'source-youtube',
    kind: 'youtube',
    label: 'YouTube Music / Innertube (Opus)',
    enabled: true,
    priority: 20,
  },
  {
    id: 'source-piped',
    kind: 'piped',
    label: 'Federated Piped API Fallback',
    enabled: true,
    priority: 30,
  },
];

export class SourceRegistry {
  private static storage: SourceStorageBackend = new MMKVSourceStorage();
  private static instances = new Map<string, PluggableMusicSource>();
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  public static setStorageForTesting(custom: SourceStorageBackend): void {
    this.storage = custom;
  }

  /**
   * Retrieves all source configurations sorted by priority.
   */
  public static getConfigs(): SourceConfig[] {
    const raw = this.storage.getString(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_CONFIGS];
    }
    try {
      const parsed = JSON.parse(raw) as SourceConfig[];
      return parsed.sort((a, b) => a.priority - b.priority);
    } catch {
      return [...DEFAULT_CONFIGS];
    }
  }

  /**
   * Persists updated source configurations.
   */
  public static saveConfigs(configs: SourceConfig[]): void {
    this.storage.set(STORAGE_KEY, JSON.stringify(configs));
  }

  /**
   * Registers a pluggable source instance.
   */
  public static registerSource(source: PluggableMusicSource): void {
    this.instances.set(source.id, source);

    if (!this.circuitBreakers.has(source.id)) {
      this.circuitBreakers.set(
        source.id,
        new CircuitBreaker(source.id, { failureThreshold: 3, resetTimeoutMs: 15_000 })
      );
    }

    const configs = this.getConfigs();
    const existing = configs.find((c) => c.id === source.id);
    if (!existing) {
      configs.push(source.config);
      this.saveConfigs(configs);
    }
  }

  /**
   * Unregisters a source instance.
   */
  public static unregisterSource(sourceId: string): void {
    this.instances.delete(sourceId);
    this.circuitBreakers.delete(sourceId);
    const configs = this.getConfigs().filter((c) => c.id !== sourceId);
    this.saveConfigs(configs);
  }

  /**
   * Toggles a source on or off.
   */
  public static toggleSource(sourceId: string, enabled?: boolean): void {
    const configs = this.getConfigs().map((c) => {
      if (c.id === sourceId) {
        return { ...c, enabled: enabled ?? !c.enabled };
      }
      return c;
    });
    this.saveConfigs(configs);
  }

  /**
   * Updates priority ordering of sources.
   */
  public static reorderSources(orderedIds: string[]): void {
    const configs = this.getConfigs();
    const updated = configs.map((c) => {
      const idx = orderedIds.indexOf(c.id);
      return {
        ...c,
        priority: idx >= 0 ? (idx + 1) * 10 : c.priority,
      };
    });
    this.saveConfigs(updated);
  }

  /**
   * Tests the latency and health of a specific registered source.
   */
  public static async testSource(sourceId: string): Promise<SourceHealthResult> {
    const source = this.instances.get(sourceId);
    if (!source) {
      return { healthy: false, latencyMs: 0, error: `Source ${sourceId} not registered` };
    }

    try {
      const result = await source.healthCheck();
      const cb = this.circuitBreakers.get(sourceId);
      if (result.healthy) {
        cb?.recordSuccess();
      } else {
        cb?.recordFailure();
      }
      return result;
    } catch (err) {
      this.circuitBreakers.get(sourceId)?.recordFailure();
      return {
        healthy: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Resolves an audio stream by waterfalling through enabled sources in priority order.
   * Skips sources currently in an OPEN circuit breaker state.
   */
  public static async resolveStream(track: Track): Promise<ResolvedStream | null> {
    const configs = this.getConfigs().filter((c) => c.enabled);

    for (const config of configs) {
      const source = this.instances.get(config.id);
      if (!source) continue;

      const cb = this.circuitBreakers.get(config.id);
      if (cb && cb.getState() === 'OPEN') {
        // Fast-fail: skip source while circuit is open
        continue;
      }

      try {
        const stream = await source.resolveStream(track);
        if (stream && stream.streamUrl) {
          cb?.recordSuccess();
          return stream;
        }
        cb?.recordFailure();
      } catch {
        cb?.recordFailure();
      }
    }

    return null;
  }

  /**
   * Resets registry state (for testing).
   */
  public static resetForTesting(): void {
    this.instances.clear();
    this.circuitBreakers.clear();
    this.storage.delete(STORAGE_KEY);
  }
}
