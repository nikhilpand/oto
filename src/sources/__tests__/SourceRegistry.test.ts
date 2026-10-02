import {
  SourceRegistry,
  SourceStorageBackend,
} from '../SourceRegistry';
import type { PluggableMusicSource, SourceHealthResult } from '../SourceTypes';
import type { Track, ResolvedStream } from '@/domain/types';

class MemoryStorage implements SourceStorageBackend {
  private map = new Map<string, string>();
  getString(key: string): string | undefined {
    return this.map.get(key);
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  delete(key: string): void {
    this.map.delete(key);
  }
}

describe('SourceRegistry', () => {
  let storage: MemoryStorage;

  const mockTrack: Track = {
    id: 'track-starboy',
    title: 'Starboy',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'Starboy',
    durationMs: 230000,
    artworkUrl: 'https://example.com/art.jpg',
    thumbhash: 'hash',
    isExplicit: false,
  };

  const createMockSource = (
    id: string,
    priority: number,
    streamResult: ResolvedStream | null = null,
    healthResult: SourceHealthResult = { healthy: true, latencyMs: 35 }
  ): PluggableMusicSource => ({
    id,
    config: {
      id,
      kind: 'custom',
      label: `Mock Source ${id}`,
      enabled: true,
      priority,
    },
    healthCheck: async () => healthResult,
    resolveStream: async () => streamResult,
  });

  beforeEach(() => {
    storage = new MemoryStorage();
    SourceRegistry.setStorageForTesting(storage);
    SourceRegistry.resetForTesting();
  });

  it('loads default source configs on cold start', () => {
    const configs = SourceRegistry.getConfigs();
    expect(configs).toHaveLength(3);
    expect(configs[0]?.id).toBe('source-saavn');
    expect(configs[1]?.id).toBe('source-youtube');
    expect(configs[2]?.id).toBe('source-piped');
  });

  it('registers custom pluggable source and performs health check', async () => {
    const source = createMockSource('source-custom-1', 5, null, {
      healthy: true,
      latencyMs: 42,
    });

    SourceRegistry.registerSource(source);

    const configs = SourceRegistry.getConfigs();
    expect(configs.find((c) => c.id === 'source-custom-1')).toBeDefined();

    const health = await SourceRegistry.testSource('source-custom-1');
    expect(health.healthy).toBe(true);
    expect(health.latencyMs).toBe(42);
  });

  it('waterfalls through sources in priority order', async () => {
    const streamTarget: ResolvedStream = {
      streamUrl: 'https://cdn.example.com/stream.m4a',
      sourceId: 'saavn',
      bitrate: 320,
      format: 'aac',
      expiresAt: Date.now() + 3600000,
      is2MbChunked: true,
    };

    // Source A (priority 10) fails
    const sourceA = createMockSource('source-a', 10, null);
    // Source B (priority 20) succeeds
    const sourceB = createMockSource('source-b', 20, streamTarget);

    SourceRegistry.registerSource(sourceA);
    SourceRegistry.registerSource(sourceB);

    const resolved = await SourceRegistry.resolveStream(mockTrack);
    expect(resolved).not.toBeNull();
    expect(resolved?.streamUrl).toBe('https://cdn.example.com/stream.m4a');
  });

  it('skips disabled sources during resolution', async () => {
    const streamTarget: ResolvedStream = {
      streamUrl: 'https://cdn.example.com/disabled.m4a',
      sourceId: 'saavn',
      bitrate: 320,
      format: 'aac',
      expiresAt: Date.now() + 3600000,
      is2MbChunked: true,
    };

    const sourceA = createMockSource('source-disabled', 10, streamTarget);
    SourceRegistry.registerSource(sourceA);

    // Disable sourceA
    SourceRegistry.toggleSource('source-disabled', false);

    const resolved = await SourceRegistry.resolveStream(mockTrack);
    // Should be null because the only source that resolves it was disabled
    expect(resolved).toBeNull();
  });

  it('reorders source priorities correctly', () => {
    const sourceA = createMockSource('source-a', 10);
    const sourceB = createMockSource('source-b', 20);

    SourceRegistry.registerSource(sourceA);
    SourceRegistry.registerSource(sourceB);

    // Invert order: B first, then A
    SourceRegistry.reorderSources(['source-b', 'source-a']);

    const configs = SourceRegistry.getConfigs();
    const posB = configs.findIndex((c) => c.id === 'source-b');
    const posA = configs.findIndex((c) => c.id === 'source-a');
    expect(posB).toBeLessThan(posA);
  });
});
