/**
 * AudioOutputPolicy — Precision Audio Output & Route Negotiation
 *
 * Clean-room TypeScript implementation referencing BitChord AudioOutputPolicy.kt.
 *
 * Decides whether the audio engine may open a 32-bit PCM-float AudioTrack or sink.
 *
 * Float output is not a quality switch that is safe on every route or device:
 * - Built-in phone speakers (PHONE) must remain capped at 16-bit to prevent OEM mixer
 *   clipping and severe distortion on affected devices.
 * - External routes (USB, Bluetooth, Wired DAC) are allowed to use Float32 output
 *   if requested and actively advertised by the destination device's hardware encodings.
 * - Samsung's vendor hardware FLAC decoder (c2.sec.flac.decoder / OMX.SEC.FLAC.Decoder)
 *   emits invalid timestamps or crashes with PCM float, so it must be blocked.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/playback/AudioOutputPolicy.kt
 */

export enum OutputPcmMode {
  PCM_16 = 'PCM_16',
  FLOAT_32 = 'FLOAT_32',
}

export enum AudioRouteKind {
  PHONE = 'PHONE',
  USB = 'USB',
  BLUETOOTH = 'BLUETOOTH',
  WIRED = 'WIRED',
  HDMI = 'HDMI',
}

export interface AudioOutputOptions {
  readonly isPreferredUsbRoute?: boolean;
  readonly routeKind?: AudioRouteKind;
  readonly advertisesPcmFloat?: boolean;
}

export class AudioOutputPolicyEngine {
  /**
   * Decides whether float output may be used based on requested mode, route,
   * and hardware-advertised support.
   *
   * Accepts either the options-bag form (used internally by OutputNegotiator)
   * or the flat positional form (routeKind, advertisesFloat) matching the
   * Kotlin call-site signature.
   */
  shouldUseFloatOutput(
    requestedMode: OutputPcmMode | string,
    optionsOrRouteKind: AudioOutputOptions | AudioRouteKind = {},
    advertisesFloat?: boolean,
  ): boolean {
    if (requestedMode !== OutputPcmMode.FLOAT_32) return false;

    // Flat positional call: (mode, routeKind, advertisesFloat)
    if (typeof optionsOrRouteKind === 'string') {
      const routeKind = optionsOrRouteKind as AudioRouteKind;
      if (routeKind === AudioRouteKind.PHONE) return false;
      return advertisesFloat === true;
    }

    // Options-bag call: (mode, { routeKind?, advertisesPcmFloat?, isPreferredUsbRoute? })
    const options = optionsOrRouteKind;
    const floatAdvertised = options.advertisesPcmFloat === true;

    if (options.routeKind !== undefined) {
      if (options.routeKind === AudioRouteKind.PHONE) return false;
      return floatAdvertised;
    }

    if (options.isPreferredUsbRoute !== undefined) {
      return options.isPreferredUsbRoute && floatAdvertised;
    }

    return false;
  }

  /**
   * Samsung's vendor hardware FLAC decoder emits invalid timestamps with PCM float.
   * Block it from float output to prevent silent corruption and crash loops.
   */
  isUnsafeFloatFlacDecoder(name: string): boolean {
    if (!name) return false;
    const n = name.toLowerCase();
    return n === 'c2.sec.flac.decoder' || (n.startsWith('omx.sec.') && n.includes('flac'));
  }
}

export const AudioOutputPolicy = new AudioOutputPolicyEngine();
