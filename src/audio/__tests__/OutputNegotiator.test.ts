import {
  OutputNegotiator,
  ANDROID_ENCODING_PCM_16BIT,
  ANDROID_ENCODING_PCM_FLOAT,
  ANDROID_ENCODING_PCM_24BIT_PACKED,
  DIRECT_SUPPORT_NONE,
  SourceDescriptor,
  DirectSupport,
} from '../OutputNegotiator';
import { OutputPcmMode, AudioRouteKind } from '../AudioOutputPolicy';

describe('OutputNegotiator (BitChord Reference OutputNegotiatorTest)', () => {
  const flac96kHz24BitSource: SourceDescriptor = {
    encoding: 'FLAC',
    sampleRateHz: 96000,
    channelCount: 2,
    bitDepth: 24,
  };

  // ─── DSP invariants ────────────────────────────────────────────────────────

  test('internal DSP is always Float32 regardless of route or output', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.PHONE,
      deviceName: 'Built-in speaker',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      advertisedSampleRates: [48000],
      requestedMode: OutputPcmMode.FLOAT_32,
    });

    expect(result.dsp.format).toBe('Float32');
    expect(result.dsp.sampleRateHz).toBe(96000);
    expect(result.dsp.channelCount).toBe(2);
    expect(result.output.encoding).toBe('PCM_16BIT');
  });

  // ─── Priority 1: Phone speaker ─────────────────────────────────────────────

  test('phone speaker strictly caps output at 16-bit with route limitation', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.PHONE,
      deviceName: 'Built-in speaker',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT, ANDROID_ENCODING_PCM_FLOAT],
      advertisedSampleRates: [48000],
      requestedMode: OutputPcmMode.FLOAT_32,
    });

    expect(result.output.encoding).toBe('PCM_16BIT');
    expect(result.output.fallbackReason).toBe('ROUTE_LIMITATION');
    expect(result.output.fallbackDetail).toContain('Speaker output capped at 16-bit');
  });

  test('phone speaker with PCM_16 requested has no fallback reason', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.PHONE,
      deviceName: 'Built-in speaker',
      requestedMode: OutputPcmMode.PCM_16,
    });

    expect(result.output.encoding).toBe('PCM_16BIT');
    expect(result.output.fallbackReason).toBe('NONE');
    expect(result.output.fallbackDetail).toBeNull();
  });

  // ─── Priority 2: Direct USB ────────────────────────────────────────────────

  test('viable direct USB uses DIRECT_USB transport and PCM_FLOAT encoding', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'HiFi UAC2 DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      advertisedSampleRates: [48000],
      requestedMode: OutputPcmMode.FLOAT_32,
      directUsbProbe: { isViable: true, productName: 'HiFi UAC2 DAC', vendorId: 0x1234, productId: 0x5678, hasPermission: true },
    });

    expect(result.output.transport).toBe('DIRECT_USB');
    expect(result.output.encoding).toBe('PCM_FLOAT');
    expect(result.output.isDirect).toBe(true);
    expect(result.output.fallbackReason).toBe('NONE');
    expect(result.isSampleRatePreserved).toBe(true);
  });

  test('usb direct probe failure provides authoritative diagnostic fallback reason', () => {
    const directProbe = {
      isViable: false,
      productName: 'Portronics iKonnect C Pro',
      vendorId: 0x001f,
      productId: 0x0b21,
      hasPermission: false,
      diagnosticReason:
        "Direct USB requires USB host permission for 'Portronics iKonnect C Pro' (managed by Android ALSA driver)",
    };

    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'Portronics iKonnect C Pro',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      requestedMode: OutputPcmMode.FLOAT_32,
      directUsbProbe: directProbe,
      knownSystemMixerRateHz: 48000,
    });

    expect(result.output.transport).toBe('AUDIO_TRACK');
    expect(result.output.encoding).toBe('PCM_16BIT');
    expect(result.output.fallbackReason).toBe('DIRECT_USB_UNAVAILABLE');
    expect(result.output.fallbackDetail).toContain('requires USB host permission');
    expect(result.isSampleRatePreserved).toBe(false);
  });

  // ─── Priority 3: AUDIO_TRACK_DIRECT ───────────────────────────────────────

  test('direct Float32 selected when direct audio supported and delegate allows', () => {
    const directSupport: DirectSupport = {
      isDirectSupported: true,
      isOffloadSupported: false,
      supportsFloat: true,
      supportsPcm24: true,
      supportsPcm16: true,
      description: 'Direct PCM supported: Float32/24-bit/16-bit @ 96000 Hz',
    };

    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'Direct AudioTrack DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      advertisedSampleRates: [96000],
      requestedMode: OutputPcmMode.FLOAT_32,
      directSupport,
    });

    expect(result.output.transport).toBe('AUDIO_TRACK_DIRECT');
    expect(result.output.encoding).toBe('PCM_FLOAT');
    expect(result.output.isDirect).toBe(true);
    expect(result.output.fallbackReason).toBe('NONE');
    expect(result.isSampleRatePreserved).toBe(true);
  });

  test('direct PCM24 selected when direct audio exposes PCM24 only', () => {
    const directSupport: DirectSupport = {
      isDirectSupported: true,
      isOffloadSupported: false,
      supportsFloat: false,
      supportsPcm24: true,
      supportsPcm16: true,
      description: 'Direct PCM supported: 24-bit/16-bit @ 96000 Hz',
    };

    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'Direct PCM24 DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      advertisedSampleRates: [96000],
      requestedMode: OutputPcmMode.FLOAT_32,
      directSupport,
    });

    expect(result.output.transport).toBe('AUDIO_TRACK_DIRECT');
    expect(result.output.encoding).toBe('PCM_24BIT_PACKED');
    expect(result.output.isDirect).toBe(true);
    expect(result.output.fallbackReason).toBe('ROUTE_LIMITATION');
    expect(result.isSampleRatePreserved).toBe(true);
  });

  // ─── Priority 4: Normal AudioTrack advertised ──────────────────────────────

  test('bluetooth negotiates float only when advertised', () => {
    const btWithFloat = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.BLUETOOTH,
      deviceName: 'Sony WH-1000XM4 (LDAC)',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT, ANDROID_ENCODING_PCM_FLOAT],
      advertisedSampleRates: [44100, 48000, 96000],
      requestedMode: OutputPcmMode.FLOAT_32,
    });

    expect(btWithFloat.output.encoding).toBe('PCM_FLOAT');
    expect(btWithFloat.output.fallbackReason).toBe('NONE');

    const btPcm16Only = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.BLUETOOTH,
      deviceName: 'SBC Headset',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      advertisedSampleRates: [44100, 48000],
      requestedMode: OutputPcmMode.FLOAT_32,
    });

    expect(btPcm16Only.output.encoding).toBe('PCM_16BIT');
    expect(btPcm16Only.output.fallbackReason).toBe('ROUTE_LIMITATION');
  });

  test('external route advertised PCM24 selected when source is high-res', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.WIRED,
      deviceName: 'Hi-Res Wired Headphone Out',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT, ANDROID_ENCODING_PCM_24BIT_PACKED],
      advertisedSampleRates: [96000],
      requestedMode: OutputPcmMode.FLOAT_32,
    });

    expect(result.output.transport).toBe('AUDIO_TRACK');
    expect(result.output.encoding).toBe('PCM_24BIT_PACKED');
    expect(result.output.fallbackReason).toBe('ROUTE_LIMITATION');
  });

  test('float32 on supported route produces float32 AudioTrack', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'High-End USB DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT, ANDROID_ENCODING_PCM_FLOAT],
      advertisedSampleRates: [96000],
      requestedMode: OutputPcmMode.FLOAT_32,
      delegateSupportsFloat: true,
    });

    expect(result.dsp.format).toBe('Float32');
    expect(result.output.encoding).toBe('PCM_FLOAT');
    expect(result.output.fallbackReason).toBe('NONE');
  });

  test('float32 on unsupported route falls back to PCM16 via delegate gate', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'Basic USB Dongle',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      advertisedSampleRates: [48000],
      requestedMode: OutputPcmMode.FLOAT_32,
      delegateSupportsFloat: false,
    });

    expect(result.dsp.format).toBe('Float32');
    expect(result.output.encoding).toBe('PCM_16BIT');
    expect(result.output.fallbackReason).toBe('ROUTE_LIMITATION');
  });

  // ─── PCM_16 strict honour ──────────────────────────────────────────────────

  test('PCM_16 requested on high-res source strictly honours PCM16 preference', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.WIRED,
      deviceName: 'Hi-Res Wired Headphone Out',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT, ANDROID_ENCODING_PCM_24BIT_PACKED],
      advertisedSampleRates: [96000],
      requestedMode: OutputPcmMode.PCM_16,
    });

    expect(result.dsp.format).toBe('Float32');
    expect(result.output.transport).toBe('AUDIO_TRACK');
    expect(result.output.encoding).toBe('PCM_16BIT');
    expect(result.output.fallbackReason).toBe('NONE');
  });

  // ─── DSP stays Float32 across mode transitions ─────────────────────────────

  test('transitions between PCM16 and Float32 keep DSP as Float32', () => {
    const base = {
      source: flac96kHz24BitSource,
      decoderName: 'c2.android.flac.decoder',
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'Capable USB DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT, ANDROID_ENCODING_PCM_FLOAT],
      advertisedSampleRates: [96000],
    };

    const pcm16Result = OutputNegotiator.negotiate({
      ...base,
      requestedMode: OutputPcmMode.PCM_16,
      delegateSupportsFloat: false,
    });
    expect(pcm16Result.dsp.format).toBe('Float32');
    expect(pcm16Result.output.encoding).toBe('PCM_16BIT');

    const floatResult = OutputNegotiator.negotiate({
      ...base,
      requestedMode: OutputPcmMode.FLOAT_32,
      delegateSupportsFloat: true,
    });
    expect(floatResult.dsp.format).toBe('Float32');
    expect(floatResult.output.encoding).toBe('PCM_FLOAT');
  });

  // ─── isSampleRatePreserved ────────────────────────────────────────────────

  test('isSampleRatePreserved is false when system mixer rate differs', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.BLUETOOTH,
      deviceName: 'SBC Headset',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      requestedMode: OutputPcmMode.PCM_16,
      knownSystemMixerRateHz: 48000,
    });

    expect(result.isSampleRatePreserved).toBe(false);
  });

  test('isSampleRatePreserved is true when output is direct', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'HiFi UAC2 DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      requestedMode: OutputPcmMode.FLOAT_32,
      directUsbProbe: { isViable: true, productName: 'HiFi UAC2 DAC', vendorId: 0x1234, productId: 0x5678, hasPermission: true },
      knownSystemMixerRateHz: 48000, // irrelevant for direct
    });

    expect(result.output.isDirect).toBe(true);
    expect(result.isSampleRatePreserved).toBe(true);
  });

  // ─── RouteDescriptor ──────────────────────────────────────────────────────

  test('route descriptor reflects USB probe viability', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.USB,
      deviceName: 'HiFi UAC2 DAC',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      requestedMode: OutputPcmMode.FLOAT_32,
      directUsbProbe: { isViable: true, productName: 'HiFi UAC2 DAC', vendorId: 0x1234, productId: 0x5678, hasPermission: true },
    });

    expect(result.route.kind).toBe(AudioRouteKind.USB);
    expect(result.route.isDirectUsbCapable).toBe(true);
    expect(result.route.directSupport).toBe(DIRECT_SUPPORT_NONE);
  });

  // ─── Bluetooth telemetry fallback detail ──────────────────────────────────

  test('bluetooth fallback detail includes codec name from telemetry', () => {
    const result = OutputNegotiator.negotiate({
      source: flac96kHz24BitSource,
      sampleRateHz: 96000,
      channelCount: 2,
      routeKind: AudioRouteKind.BLUETOOTH,
      deviceName: 'Sony WH-1000XM5',
      advertisedEncodings: [ANDROID_ENCODING_PCM_16BIT],
      requestedMode: OutputPcmMode.FLOAT_32,
      bluetoothTelemetry: { isConnected: true, deviceName: 'Sony WH-1000XM5', codecName: 'LDAC' },
    });

    expect(result.output.encoding).toBe('PCM_16BIT');
    expect(result.output.fallbackDetail).toContain('LDAC');
  });
});
