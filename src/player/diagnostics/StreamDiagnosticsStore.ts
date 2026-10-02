/**
 * StreamDiagnosticsStore — Real-Time Audiophile & Network Diagnostics
 *
 * Captures real-time stream resolution telemetry inspired by BitChord's
 * NerdStats.kt architecture. Tracks delivery source (Cache vs CDN vs Download),
 * active bitrate, codec, resolution latency, and circuit breaker health.
 *
 * @see docs/SPEC.md
 * @see BitChord/.ua knowledge graph (NerdStats.kt)
 */

import { create } from 'zustand';

export type DeliverySource =
  | 'stream_cache'
  | 'offline_download'
  | 'direct_saavn_cdn'
  | 'federated_fallback'
  | 'unknown';

export interface StreamDiagnostics {
  trackId: string;
  title: string;
  artist: string;
  deliverySource: DeliverySource;
  bitrateKbps: number;
  codec: string;
  resolutionLatencyMs: number;
  circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  resolvedAt: number;
  uri: string;
}

interface StreamDiagnosticsStore {
  current: StreamDiagnostics | null;
  isOpen: boolean;
  setDiagnostics: (diag: StreamDiagnostics) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useStreamDiagnosticsStore = create<StreamDiagnosticsStore>((set) => ({
  current: null,
  isOpen: false,

  setDiagnostics: (diag: StreamDiagnostics) => set({ current: diag }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
