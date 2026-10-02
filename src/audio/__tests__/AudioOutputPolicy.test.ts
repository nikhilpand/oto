import {
  AudioOutputPolicy,
  OutputPcmMode,
  AudioRouteKind,
} from '../AudioOutputPolicy';

describe('AudioOutputPolicy (BitChord Reference AudioOutputPolicyTest)', () => {
  test('float requires preferred USB route and advertised support', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        isPreferredUsbRoute: true,
        advertisesPcmFloat: true,
      })
    ).toBe(true);
  });

  test('float falls back on speaker even when requested', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        isPreferredUsbRoute: false,
        advertisesPcmFloat: true,
      })
    ).toBe(false);
  });

  test('float falls back when USB does not advertise it', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        isPreferredUsbRoute: true,
        advertisesPcmFloat: false,
      })
    ).toBe(false);
  });

  test('pcm16 never requests float', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.PCM_16, {
        isPreferredUsbRoute: true,
        advertisesPcmFloat: true,
      })
    ).toBe(false);
  });

  test('route aware phone is always capped at 16-bit', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        routeKind: AudioRouteKind.PHONE,
        advertisesPcmFloat: true,
      })
    ).toBe(false);
  });

  test('route aware USB allows float when advertised', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        routeKind: AudioRouteKind.USB,
        advertisesPcmFloat: true,
      })
    ).toBe(true);

    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        routeKind: AudioRouteKind.USB,
        advertisesPcmFloat: false,
      })
    ).toBe(false);
  });

  test('route aware Bluetooth allows float only when advertised', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        routeKind: AudioRouteKind.BLUETOOTH,
        advertisesPcmFloat: true,
      })
    ).toBe(true);

    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.FLOAT_32, {
        routeKind: AudioRouteKind.BLUETOOTH,
        advertisesPcmFloat: false,
      })
    ).toBe(false);
  });

  test('route aware pcm16 always returns false', () => {
    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.PCM_16, {
        routeKind: AudioRouteKind.BLUETOOTH,
        advertisesPcmFloat: true,
      })
    ).toBe(false);

    expect(
      AudioOutputPolicy.shouldUseFloatOutput(OutputPcmMode.PCM_16, {
        routeKind: AudioRouteKind.USB,
        advertisesPcmFloat: true,
      })
    ).toBe(false);
  });

  test('samsung vendor FLAC decoder is blocked for float output', () => {
    expect(AudioOutputPolicy.isUnsafeFloatFlacDecoder('c2.sec.flac.decoder')).toBe(true);
    expect(AudioOutputPolicy.isUnsafeFloatFlacDecoder('OMX.SEC.FLAC.Decoder')).toBe(true);
    expect(AudioOutputPolicy.isUnsafeFloatFlacDecoder('c2.android.flac.decoder')).toBe(false);
  });
});
