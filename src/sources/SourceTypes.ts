/**
 * SourceTypes — Pluggable Audio Source Architectures & Protocols
 *
 * Clean-room architecture inspired by BitChord's SourceRegistry.kt & MusicSource.kt.
 *
 * Enables pluggable sources (JioSaavn, YouTube Music / Innertube, Piped, Custom Addons)
 * with health-check pings, priority ordering, and circuit breaker resilience.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/data/sources/SourceRegistry.kt
 */

import type { Track, ResolvedStream } from '@/domain/types';

export type SourceKind = 'jiosaavn' | 'youtube' | 'piped' | 'addon' | 'custom';

export interface SourceConfig {
  readonly id: string;
  readonly kind: SourceKind;
  readonly label: string;
  readonly baseUrl?: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly requiresAuth?: boolean;
}

export interface SourceHealthResult {
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface PluggableMusicSource {
  readonly id: string;
  readonly config: SourceConfig;
  healthCheck(): Promise<SourceHealthResult>;
  resolveStream(track: Track): Promise<ResolvedStream | null>;
}
