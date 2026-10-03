import { SourceRegistry, type SourceStorageBackend } from '@/sources/SourceRegistry';
import type { PluggableMusicSource } from '@/sources/SourceTypes';
import type { Track, ResolvedStream } from '@/domain/types';

describe('SourceRegistry & Waterfall Stream Resolution — Worst-Case Stress Tests', () => {
  let mockStorageData = new Map<string, string>();

  const fakeStorage: SourceStorageBackend = {
    getString: (key: string) => mockStorageData.get(key),
    set: (key: string, value: string) => {
      mockStorageData.set(key, value);
    },
    delete: (key: string) => {
      mockStorageData.delete(key);
    },
  };

  const sampleTrack: Track = {
    id: 'test_track_1',
    title: 'Starboy',
    artist: 'The Weeknd',
    artists: ['The Weeknd'],
    album: 'Starboy',
    durationMs: 230_000,
    artworkUrl: 'https://art.com/1.jpg',
    thumbhash: '3OcRJYB4d3h/iIeHeEh3eIh4h4iH',
    isExplicit: false,
  };

  beforeEach(() => {
    mockStorageData.clear();
    SourceRegistry.setStorageForTesting(fakeStorage);
    SourceRegistry.resetForTesting();
  });

  afterEach(() => {
    SourceRegistry.resetForTesting();
  });

  test('waterfall resolution: when primary source throws network error, falls back to secondary source seamlessly', async () => {
    const primarySource: PluggableMusicSource = {
      id: 'source-saavn',
      config: {
        id: 'source-saavn',
        kind: 'jiosaavn',
        label: 'Primary JioSaavn',
        enabled: true,
        priority: 10,
      },
      healthCheck: jest.fn().mockResolvedValue({ healthy: false, latencyMs: 500, error: '504 Gateway Timeout' }),
      resolveStream: jest.fn().mockRejectedValue(new Error('504 Gateway Timeout')),
    };

    const secondaryStream: ResolvedStream = {
      streamUrl: 'https://youtube-audio.cdn.com/stream.opus',
      sourceId: 'innertube',
      bitrate: 160,
      format: 'opus',
      expiresAt: Date.now() + 3600_000,
      is2MbChunked: true,
    };

    const secondarySource: PluggableMusicSource = {
      id: 'source-youtube',
      config: {
        id: 'source-youtube',
        kind: 'youtube',
        label: 'Secondary YouTube',
        enabled: true,
        priority: 20,
      },
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, latencyMs: 120 }),
      resolveStream: jest.fn().mockResolvedValue(secondaryStream),
    };

    SourceRegistry.registerSource(primarySource);
    SourceRegistry.registerSource(secondarySource);

    const resolved = await SourceRegistry.resolveStream(sampleTrack);

    expect(resolved).not.toBeNull();
    expect(resolved?.streamUrl).toBe('https://youtube-audio.cdn.com/stream.opus');
    expect(primarySource.resolveStream).toHaveBeenCalledWith(sampleTrack);
    expect(secondarySource.resolveStream).toHaveBeenCalledWith(sampleTrack);
  });

  test('circuit breaker fast-fail: skips primary source in 0ms after 3 consecutive failures without trying network', async () => {
    const failingPrimary: PluggableMusicSource = {
      id: 'source-saavn',
      config: {
        id: 'source-saavn',
        kind: 'jiosaavn',
        label: 'Primary JioSaavn',
        enabled: true,
        priority: 10,
      },
      healthCheck: jest.fn().mockResolvedValue({ healthy: false, latencyMs: 0 }),
      resolveStream: jest.fn().mockRejectedValue(new Error('CDN Rate Limited 429')),
    };

    const secondaryStream: ResolvedStream = {
      streamUrl: 'https://backup-stream.aac',
      sourceId: 'saavn',
      bitrate: 320,
      format: 'aac',
      expiresAt: Date.now() + 3600_000,
      is2MbChunked: true,
    };

    const secondarySource: PluggableMusicSource = {
      id: 'source-youtube',
      config: {
        id: 'source-youtube',
        kind: 'youtube',
        label: 'Secondary YouTube',
        enabled: true,
        priority: 20,
      },
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, latencyMs: 50 }),
      resolveStream: jest.fn().mockResolvedValue(secondaryStream),
    };

    SourceRegistry.registerSource(failingPrimary);
    SourceRegistry.registerSource(secondarySource);

    // Fail 3 times to trip primary circuit breaker to OPEN
    await SourceRegistry.resolveStream(sampleTrack);
    await SourceRegistry.resolveStream(sampleTrack);
    await SourceRegistry.resolveStream(sampleTrack);

    expect(failingPrimary.resolveStream).toHaveBeenCalledTimes(3);

    // 4th request: failingPrimary circuit is OPEN -> MUST NOT be called!
    (failingPrimary.resolveStream as jest.Mock).mockClear();
    const result = await SourceRegistry.resolveStream(sampleTrack);

    expect(result?.streamUrl).toBe('https://backup-stream.aac');
    expect(failingPrimary.resolveStream).not.toHaveBeenCalled();
  });

  test('complete blackout: returns null gracefully without crash when all registered sources fail', async () => {
    const deadSource1: PluggableMusicSource = {
      id: 'source-1',
      config: { id: 'source-1', kind: 'custom', label: 'Dead 1', enabled: true, priority: 10 },
      healthCheck: jest.fn().mockRejectedValue(new Error('Socket Closed')),
      resolveStream: jest.fn().mockRejectedValue(new Error('Socket Closed')),
    };

    const deadSource2: PluggableMusicSource = {
      id: 'source-2',
      config: { id: 'source-2', kind: 'custom', label: 'Dead 2', enabled: true, priority: 20 },
      healthCheck: jest.fn().mockResolvedValue({ healthy: false, latencyMs: 0 }),
      resolveStream: jest.fn().mockResolvedValue(null),
    };

    SourceRegistry.registerSource(deadSource1);
    SourceRegistry.registerSource(deadSource2);

    const result = await SourceRegistry.resolveStream(sampleTrack);
    expect(result).toBeNull();
  });

  test('corrupted storage payload: handles malformed JSON in MMKV without crashing', () => {
    mockStorageData.set('oto.sources.configs', 'corrupted_json_<<<>>>');
    const configs = SourceRegistry.getConfigs();

    expect(configs).toBeDefined();
    expect(configs.length).toBeGreaterThan(0);
    expect(configs[0]?.id).toBe('source-saavn');
  });

  test('reordering handles partial and unknown IDs without dropping existing sources', () => {
    SourceRegistry.reorderSources(['source-youtube']); // Only 1 ID provided
    const configs = SourceRegistry.getConfigs();

    expect(configs.some((c) => c.id === 'source-youtube')).toBe(true);
    expect(configs.some((c) => c.id === 'source-saavn')).toBe(true);
  });

  test('disabling all sources returns null immediately without attempting resolution', async () => {
    SourceRegistry.toggleSource('source-saavn', false);
    SourceRegistry.toggleSource('source-youtube', false);
    SourceRegistry.toggleSource('source-piped', false);

    const result = await SourceRegistry.resolveStream(sampleTrack);
    expect(result).toBeNull();
  });
});
