/**
 * OutputNegotiator — 6-Layer Audio Pipeline Precision Negotiator
 *
 * Clean-room TypeScript implementation referencing BitChord OutputNegotiator.kt.
 *
 * Establishes the authoritative snapshot of the 6-layer audio pipeline:
 * Source -> Decoder -> DSP -> Route -> Output -> System.
 *
 * Selection priority:
 * 1. Phone speaker safety: always PCM_16BIT, no exception.
 * 2. Direct USB userspace streaming when viable and authorized.
 * 3. Android AUDIO_TRACK_DIRECT: Float32 > PCM24 > PCM16 (API 33+).
 * 4. Normal AudioTrack advertised: Float32 > PCM24.
 * 5. 16-bit PCM fallback with authoritative diagnostic reason.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/playback/audio/OutputNegotiator.kt
 */

import {
  AudioOutputPolicy,
  AudioRouteKind,
  OutputPcmMode,
} from './AudioOutputPolicy';

// ─── Transport ───────────────────────────────────────────────────────────────

export type TransportType =
  | 'AUDIO_TRACK'
  | 'AUDIO_TRACK_DIRECT'
  | 'DIRECT_USB';

// ─── Fallback ─────────────────────────────────────────────────────────────────

export type FallbackReason =
  | 'NONE'
  | 'UNSUPPORTED_FORMAT'
  | 'ROUTE_LIMITATION'
  | 'OS_LIMITATION'
  | 'DIRECT_USB_UNAVAILABLE'
  | 'DECODER_LIMITATION';

// ─── PCM encoding ─────────────────────────────────────────────────────────────

export type PcmEncoding =
  | 'PCM_16BIT'
  | 'PCM_FLOAT'
  | 'PCM_24BIT_PACKED';

// Android AudioFormat encoding constants
export const ANDROID_ENCODING_PCM_16BIT = 2;
export const ANDROID_ENCODING_PCM_FLOAT = 4;
export const ANDROID_ENCODING_PCM_24BIT_PACKED = 21;

// ─── Layer descriptors ────────────────────────────────────────────────────────

export interface SourceDescriptor {
  readonly encoding: string;
  readonly sampleRateHz: number;
  readonly channelCount: number;
  readonly bitDepth?: number | null;
}

export interface DecoderDescriptor {
  readonly name: string | null;
  readonly encoding: string;
  readonly sampleRateHz: number;
  readonly channelCount: number;
}

export interface DspDescriptor {
  readonly format: string;
  readonly sampleRateHz: number;
  readonly channelCount: number;
}

export interface RouteDescriptor {
  readonly kind: AudioRouteKind;
  readonly deviceName: string;
  readonly isDirectUsbCapable: boolean;
  readonly advertisedEncodings: readonly number[];
  readonly advertisedSampleRates: readonly number[];
  readonly directSupport: DirectSupport;
}

export interface OutputDescriptor {
  readonly transport: TransportType;
  readonly encoding: PcmEncoding;
  readonly sampleRateHz: number;
  readonly channelCount: number;
  readonly isDirect: boolean;
  readonly systemMixerRateHz: number | null;
  readonly fallbackReason: FallbackReason;
  readonly fallbackDetail: string | null;
}

// ─── Direct audio probe ───────────────────────────────────────────────────────

export interface DirectSupport {
  readonly isDirectSupported: boolean;
  readonly isOffloadSupported: boolean;
  readonly supportsFloat: boolean;
  readonly supportsPcm24: boolean;
  readonly supportsPcm16: boolean;
  readonly description: string;
}

export const DIRECT_SUPPORT_NONE: DirectSupport = {
  isDirectSupported: false,
  isOffloadSupported: false,
  supportsFloat: false,
  supportsPcm24: false,
  supportsPcm16: false,
  description: 'Direct playback not supported or API < 33',
};

// ─── USB probe ────────────────────────────────────────────────────────────────

export interface DirectUsbProbeResult {
  readonly isViable: boolean;
  readonly productName: string;
  readonly vendorId: number;
  readonly productId: number;
  readonly hasPermission: boolean;
  readonly diagnosticReason?: string | null;
}

// ─── Bluetooth telemetry (subset for fallback detail) ─────────────────────────

export interface BluetoothTelemetry {
  readonly isConnected: boolean;
  readonly deviceName: string;
  readonly codecName?: string | null;
  readonly sampleRateHz?: number | null;
  readonly bitDepth?: number | null;
}

// ─── Negotiation result ───────────────────────────────────────────────────────

export interface OutputNegotiationResult {
  readonly source: SourceDescriptor;
  readonly decoder: DecoderDescriptor;
  readonly dsp: DspDescriptor;
  readonly route: RouteDescriptor;
  readonly output: OutputDescriptor;
  /** True when sample rate flows end-to-end without OS mixer resampling. */
  readonly isSampleRatePreserved: boolean;
}

// ─── Negotiation params ───────────────────────────────────────────────────────

export interface NegotiationParams {
  readonly source: SourceDescriptor;
  readonly decoderName?: string | null;
  readonly decoderEncoding?: string;
  readonly sampleRateHz: number;
  readonly channelCount: number;
  readonly routeKind: AudioRouteKind;
  readonly deviceName: string;
  readonly advertisedEncodings?: readonly number[];
  readonly advertisedSampleRates?: readonly number[];
  readonly requestedMode: OutputPcmMode;
  readonly directUsbProbe?: DirectUsbProbeResult | null;
  readonly directSupport?: DirectSupport;
  readonly bluetoothTelemetry?: BluetoothTelemetry | null;
  readonly delegateSupportsFloat?: boolean;
  readonly delegateSupportsPcm24?: boolean;
  readonly knownSystemMixerRateHz?: number | null;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class OutputNegotiatorEngine {
  negotiate(params: NegotiationParams): OutputNegotiationResult {
    const {
      source,
      decoderName = null,
      decoderEncoding = 'Float32',
      sampleRateHz,
      channelCount,
      routeKind,
      deviceName,
      advertisedEncodings = [],
      advertisedSampleRates = [],
      requestedMode,
      directUsbProbe = null,
      directSupport = DIRECT_SUPPORT_NONE,
      bluetoothTelemetry = null,
      delegateSupportsFloat = true,
      delegateSupportsPcm24 = true,
      knownSystemMixerRateHz = null,
    } = params;

    const decoder: DecoderDescriptor = {
      name: decoderName ?? null,
      encoding: decoderEncoding,
      sampleRateHz,
      channelCount,
    };

    // DSP is always canonical Float32 — prevents quantization noise and dynamic
    // range loss across the internal processing graph.
    const dsp: DspDescriptor = {
      format: 'Float32',
      sampleRateHz,
      channelCount,
    };

    const route: RouteDescriptor = {
      kind: routeKind,
      deviceName,
      isDirectUsbCapable: directUsbProbe?.isViable === true,
      advertisedEncodings,
      advertisedSampleRates,
      directSupport,
    };

    const output = this._selectBestOutput({
      source,
      sampleRateHz,
      channelCount,
      routeKind,
      advertisedEncodings,
      requestedMode,
      directUsbProbe,
      directSupport,
      bluetoothTelemetry,
      delegateSupportsFloat,
      delegateSupportsPcm24,
      knownSystemMixerRateHz,
    });

    const isSampleRatePreserved =
      output.isDirect ||
      output.systemMixerRateHz == null ||
      output.sampleRateHz === output.systemMixerRateHz;

    return { source, decoder, dsp, route, output, isSampleRatePreserved };
  }

  private _selectBestOutput(ctx: {
    source: SourceDescriptor;
    sampleRateHz: number;
    channelCount: number;
    routeKind: AudioRouteKind;
    advertisedEncodings: readonly number[];
    requestedMode: OutputPcmMode;
    directUsbProbe: DirectUsbProbeResult | null;
    directSupport: DirectSupport;
    bluetoothTelemetry: BluetoothTelemetry | null;
    delegateSupportsFloat: boolean;
    delegateSupportsPcm24: boolean;
    knownSystemMixerRateHz: number | null;
  }): OutputDescriptor {
    const {
      source,
      sampleRateHz,
      channelCount,
      routeKind,
      advertisedEncodings,
      requestedMode,
      directUsbProbe,
      directSupport,
      bluetoothTelemetry,
      delegateSupportsFloat,
      delegateSupportsPcm24,
      knownSystemMixerRateHz,
    } = ctx;

    const advertisesFloat = advertisedEncodings.includes(ANDROID_ENCODING_PCM_FLOAT);
    const advertisesPcm24 = advertisedEncodings.includes(ANDROID_ENCODING_PCM_24BIT_PACKED);
    const isSourceHighRes = (source.bitDepth ?? 16) > 16;

    // ── Priority 1: Phone speaker safety — always PCM_16BIT ─────────────────
    if (routeKind === AudioRouteKind.PHONE) {
      const isDowngrade = requestedMode === OutputPcmMode.FLOAT_32;
      return {
        transport: 'AUDIO_TRACK',
        encoding: 'PCM_16BIT',
        sampleRateHz,
        channelCount,
        isDirect: false,
        systemMixerRateHz: knownSystemMixerRateHz,
        fallbackReason: isDowngrade ? 'ROUTE_LIMITATION' : 'NONE',
        fallbackDetail: isDowngrade
          ? 'Speaker output capped at 16-bit PCM to prevent OEM mixer distortion'
          : null,
      };
    }

    // ── Priority 2: Direct USB userspace streaming ───────────────────────────
    if (routeKind === AudioRouteKind.USB && directUsbProbe?.isViable === true) {
      return {
        transport: 'DIRECT_USB',
        encoding: 'PCM_FLOAT',
        sampleRateHz,
        channelCount,
        isDirect: true,
        systemMixerRateHz: null, // Bypasses AudioFlinger entirely
        fallbackReason: 'NONE',
        fallbackDetail: null,
      };
    }

    // ── Priority 3: Android AUDIO_TRACK_DIRECT (API 33+) ────────────────────

    // 3A: Direct Float32
    if (
      requestedMode === OutputPcmMode.FLOAT_32 &&
      directSupport.supportsFloat &&
      delegateSupportsFloat
    ) {
      return {
        transport: 'AUDIO_TRACK_DIRECT',
        encoding: 'PCM_FLOAT',
        sampleRateHz,
        channelCount,
        isDirect: true,
        systemMixerRateHz: null,
        fallbackReason: 'NONE',
        fallbackDetail: null,
      };
    }

    // 3B: Direct PCM24 (high-res source + route exposes 24-bit direct)
    if (
      requestedMode !== OutputPcmMode.PCM_16 &&
      isSourceHighRes &&
      directSupport.supportsPcm24 &&
      delegateSupportsPcm24
    ) {
      const floatDowngrade =
        requestedMode === OutputPcmMode.FLOAT_32 && !directSupport.supportsFloat;
      return {
        transport: 'AUDIO_TRACK_DIRECT',
        encoding: 'PCM_24BIT_PACKED',
        sampleRateHz,
        channelCount,
        isDirect: true,
        systemMixerRateHz: null,
        fallbackReason: floatDowngrade ? 'ROUTE_LIMITATION' : 'NONE',
        fallbackDetail: floatDowngrade
          ? 'Route exposes direct 24-bit PCM (Float32 converted to packed 24-bit)'
          : null,
      };
    }

    // 3C: Direct PCM16
    if (directSupport.supportsPcm16) {
      let reason: FallbackReason = 'NONE';
      let detail: string | null = null;
      if (requestedMode === OutputPcmMode.FLOAT_32) {
        reason = 'ROUTE_LIMITATION';
        detail = 'Route does not expose direct Float32 or 24-bit PCM (using direct 16-bit PCM)';
      } else if (isSourceHighRes) {
        reason = 'ROUTE_LIMITATION';
        detail = 'Route does not expose direct 24-bit PCM (using direct 16-bit PCM)';
      }
      return {
        transport: 'AUDIO_TRACK_DIRECT',
        encoding: 'PCM_16BIT',
        sampleRateHz,
        channelCount,
        isDirect: true,
        systemMixerRateHz: null,
        fallbackReason: reason,
        fallbackDetail: detail,
      };
    }

    // ── Priority 4: Normal AudioTrack — advertised encodings ─────────────────

    // 4A: Advertised Float32
    const canUseFloat =
      AudioOutputPolicy.shouldUseFloatOutput(requestedMode, {
        routeKind,
        advertisesPcmFloat: advertisesFloat,
      }) && delegateSupportsFloat;

    if (canUseFloat) {
      return {
        transport: 'AUDIO_TRACK',
        encoding: 'PCM_FLOAT',
        sampleRateHz,
        channelCount,
        isDirect: false,
        systemMixerRateHz: knownSystemMixerRateHz,
        fallbackReason: 'NONE',
        fallbackDetail: null,
      };
    }

    // 4B: Advertised PCM24 (high-res source)
    if (
      requestedMode !== OutputPcmMode.PCM_16 &&
      isSourceHighRes &&
      advertisesPcm24 &&
      delegateSupportsPcm24
    ) {
      const floatDowngrade = requestedMode === OutputPcmMode.FLOAT_32;
      return {
        transport: 'AUDIO_TRACK',
        encoding: 'PCM_24BIT_PACKED',
        sampleRateHz,
        channelCount,
        isDirect: false,
        systemMixerRateHz: knownSystemMixerRateHz,
        fallbackReason: floatDowngrade ? 'ROUTE_LIMITATION' : 'NONE',
        fallbackDetail: floatDowngrade
          ? `${routeKind} route advertises 24-bit PCM (Float32 converted to packed 24-bit)`
          : null,
      };
    }

    // ── Priority 5: PCM_16BIT safe fallback ──────────────────────────────────
    let reason: FallbackReason = 'NONE';
    let detail: string | null = null;

    if (routeKind === AudioRouteKind.USB) {
      reason =
        directUsbProbe?.isViable === false
          ? 'DIRECT_USB_UNAVAILABLE'
          : 'ROUTE_LIMITATION';
      detail =
        directUsbProbe?.diagnosticReason ?? 'USB device advertises 16-bit PCM only';
    } else if (routeKind === AudioRouteKind.BLUETOOTH) {
      const btSuffix = bluetoothTelemetry?.codecName
        ? ` (${bluetoothTelemetry.codecName})`
        : '';
      reason = 'ROUTE_LIMITATION';
      detail = `Bluetooth route${btSuffix} advertises 16-bit PCM only`;
    } else if (requestedMode === OutputPcmMode.FLOAT_32) {
      reason = 'ROUTE_LIMITATION';
      detail = `${routeKind} route advertises 16-bit PCM only`;
    } else if (isSourceHighRes && requestedMode !== OutputPcmMode.PCM_16) {
      reason = 'ROUTE_LIMITATION';
      detail = `${routeKind} route does not expose high-res output`;
    }

    return {
      transport: 'AUDIO_TRACK',
      encoding: 'PCM_16BIT',
      sampleRateHz,
      channelCount,
      isDirect: false,
      systemMixerRateHz: knownSystemMixerRateHz,
      fallbackReason: reason,
      fallbackDetail: detail,
    };
  }
}

export const OutputNegotiator = new OutputNegotiatorEngine();
