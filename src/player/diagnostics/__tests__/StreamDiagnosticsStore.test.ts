import { useStreamDiagnosticsStore, type StreamDiagnostics } from '../StreamDiagnosticsStore';

describe('StreamDiagnosticsStore', () => {
  beforeEach(() => {
    useStreamDiagnosticsStore.setState({
      isOpen: false,
      current: null,
    });
  });

  it('initializes closed with no diagnostics', () => {
    const state = useStreamDiagnosticsStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.current).toBeNull();
  });

  it('opens and closes diagnostics sheet', () => {
    useStreamDiagnosticsStore.getState().open();
    expect(useStreamDiagnosticsStore.getState().isOpen).toBe(true);

    useStreamDiagnosticsStore.getState().close();
    expect(useStreamDiagnosticsStore.getState().isOpen).toBe(false);
  });

  it('toggles open state', () => {
    expect(useStreamDiagnosticsStore.getState().isOpen).toBe(false);
    useStreamDiagnosticsStore.getState().toggle();
    expect(useStreamDiagnosticsStore.getState().isOpen).toBe(true);
    useStreamDiagnosticsStore.getState().toggle();
    expect(useStreamDiagnosticsStore.getState().isOpen).toBe(false);
  });

  it('stores and updates active stream telemetry', () => {
    const mockDiag: StreamDiagnostics = {
      trackId: 'track-starboy-123',
      title: 'Starboy',
      artist: 'The Weeknd',
      deliverySource: 'stream_cache',
      bitrateKbps: 320,
      codec: 'AAC',
      resolutionLatencyMs: 28,
      circuitBreakerStatus: 'CLOSED',
      resolvedAt: 1700000000000,
      uri: 'file:///cache/oto_stream_cache/track-starboy-123.m4a',
    };

    useStreamDiagnosticsStore.getState().setDiagnostics(mockDiag);
    const state = useStreamDiagnosticsStore.getState();

    expect(state.current).toEqual(mockDiag);
    expect(state.current?.deliverySource).toBe('stream_cache');
    expect(state.current?.bitrateKbps).toBe(320);
    expect(state.current?.circuitBreakerStatus).toBe('CLOSED');
  });
});
