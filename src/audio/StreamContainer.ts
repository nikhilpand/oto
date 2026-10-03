/**
 * StreamContainer — Container Format Detection
 *
 * Detects audio container format from magic bytes (file signatures)
 * and MIME types. Used to select the correct demuxer path and to
 * validate CDN responses before handing to the audio pipeline.
 *
 * @classification ALGORITHM_PORT
 * @priority P1
 * @portedFrom BitChord: playback/StreamContainer.kt
 *
 * CLEAN-ROOM IMPLEMENTATION
 * Algorithm port — magic-byte sniffing + MIME mapping.
 */

// ─── Types ────────────────────────────────────────────────────────────

export type ContainerFormat =
  | 'mp4'    // MPEG-4 container (AAC, ALAC)
  | 'webm'   // WebM container (Opus, Vorbis)
  | 'ogg'    // Ogg container (Opus, Vorbis)
  | 'flac'   // Raw FLAC
  | 'mp3'    // MPEG Layer 3
  | 'wav'    // WAV/RIFF
  | 'unknown';

export type AudioCodec =
  | 'aac'
  | 'opus'
  | 'flac'
  | 'mp3'
  | 'vorbis'
  | 'alac'
  | 'pcm'
  | 'unknown';

export interface ContainerInfo {
  /** Detected container format */
  container: ContainerFormat;
  /** Best-guess codec (may need deeper parsing for certainty) */
  codec: AudioCodec;
  /** Whether this format supports seeking without full download */
  supportsRangeSeeking: boolean;
  /** MIME type to use for playback */
  mimeType: string;
}

// ─── Magic Byte Signatures ────────────────────────────────────────────

interface MagicSignature {
  /** Byte offset to check */
  offset: number;
  /** Expected bytes (as decimal values) */
  bytes: number[];
  /** Resulting container format */
  container: ContainerFormat;
  /** Default codec for this container */
  codec: AudioCodec;
}

const SIGNATURES: MagicSignature[] = [
  // fLaC — FLAC
  { offset: 0, bytes: [0x66, 0x4C, 0x61, 0x43], container: 'flac', codec: 'flac' },
  // OggS — Ogg container
  { offset: 0, bytes: [0x4F, 0x67, 0x67, 0x53], container: 'ogg', codec: 'vorbis' },
  // ID3 — MP3 with ID3 tag
  { offset: 0, bytes: [0x49, 0x44, 0x33], container: 'mp3', codec: 'mp3' },
  // 0xFF 0xFB — MP3 sync word
  { offset: 0, bytes: [0xFF, 0xFB], container: 'mp3', codec: 'mp3' },
  // 0xFF 0xF3 — MP3 sync word (MPEG 2.5)
  { offset: 0, bytes: [0xFF, 0xF3], container: 'mp3', codec: 'mp3' },
  // RIFF — WAV
  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], container: 'wav', codec: 'pcm' },
  // 1A 45 DF A3 — WebM/Matroska EBML header
  { offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3], container: 'webm', codec: 'opus' },
];

// MP4: look for 'ftyp' at offset 4
const FTYP_BYTES = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'

// ─── MIME Mapping ─────────────────────────────────────────────────────

const MIME_MAP: Record<string, { container: ContainerFormat; codec: AudioCodec }> = {
  'audio/mp4': { container: 'mp4', codec: 'aac' },
  'audio/aac': { container: 'mp4', codec: 'aac' },
  'audio/mpeg': { container: 'mp3', codec: 'mp3' },
  'audio/mp3': { container: 'mp3', codec: 'mp3' },
  'audio/ogg': { container: 'ogg', codec: 'vorbis' },
  'audio/opus': { container: 'ogg', codec: 'opus' },
  'audio/webm': { container: 'webm', codec: 'opus' },
  'audio/flac': { container: 'flac', codec: 'flac' },
  'audio/x-flac': { container: 'flac', codec: 'flac' },
  'audio/wav': { container: 'wav', codec: 'pcm' },
  'audio/x-wav': { container: 'wav', codec: 'pcm' },
  'video/webm': { container: 'webm', codec: 'opus' },
  'video/mp4': { container: 'mp4', codec: 'aac' },
};

const CONTAINER_MIME: Record<ContainerFormat, string> = {
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  unknown: 'application/octet-stream',
};

const SEEKABLE_CONTAINERS: Set<ContainerFormat> = new Set(['mp4', 'webm', 'ogg', 'flac']);

// ─── Public API ───────────────────────────────────────────────────────

export const StreamContainer = {
  /**
   * Detect container format from raw header bytes (first 12+ bytes of file).
   */
  fromBytes(header: Uint8Array): ContainerInfo {
    // Check MP4/ftyp at offset 4
    if (header.length >= 8) {
      const isFtyp = FTYP_BYTES.every((b, i) => header[4 + i] === b);
      if (isFtyp) {
        return buildInfo('mp4', 'aac');
      }
    }

    // Check other magic signatures
    for (const sig of SIGNATURES) {
      if (header.length >= sig.offset + sig.bytes.length) {
        const matches = sig.bytes.every((b, i) => header[sig.offset + i] === b);
        if (matches) {
          return buildInfo(sig.container, sig.codec);
        }
      }
    }

    return buildInfo('unknown', 'unknown');
  },

  /**
   * Detect container format from a MIME type string.
   */
  fromMime(mime: string): ContainerInfo {
    // Normalize: take only the type/subtype, strip params
    const normalized = mime.split(';')[0]?.trim().toLowerCase() ?? '';
    const mapped = MIME_MAP[normalized];
    if (mapped) {
      return buildInfo(mapped.container, mapped.codec);
    }
    return buildInfo('unknown', 'unknown');
  },

  /**
   * Detect from URL extension as a last resort.
   */
  fromUrl(url: string): ContainerInfo {
    const path = url.split('?')[0] ?? '';
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const extMap: Record<string, { container: ContainerFormat; codec: AudioCodec }> = {
      mp4: { container: 'mp4', codec: 'aac' },
      m4a: { container: 'mp4', codec: 'aac' },
      webm: { container: 'webm', codec: 'opus' },
      ogg: { container: 'ogg', codec: 'vorbis' },
      opus: { container: 'ogg', codec: 'opus' },
      flac: { container: 'flac', codec: 'flac' },
      mp3: { container: 'mp3', codec: 'mp3' },
      wav: { container: 'wav', codec: 'pcm' },
    };
    const mapped = extMap[ext];
    if (mapped) {
      return buildInfo(mapped.container, mapped.codec);
    }
    return buildInfo('unknown', 'unknown');
  },

  /**
   * Best-effort detection cascade: bytes → MIME → URL.
   */
  detect(params: {
    header?: Uint8Array;
    mime?: string;
    url?: string;
  }): ContainerInfo {
    if (params.header && params.header.length >= 4) {
      const result = StreamContainer.fromBytes(params.header);
      if (result.container !== 'unknown') return result;
    }
    if (params.mime) {
      const result = StreamContainer.fromMime(params.mime);
      if (result.container !== 'unknown') return result;
    }
    if (params.url) {
      return StreamContainer.fromUrl(params.url);
    }
    return buildInfo('unknown', 'unknown');
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────

function buildInfo(container: ContainerFormat, codec: AudioCodec): ContainerInfo {
  return {
    container,
    codec,
    supportsRangeSeeking: SEEKABLE_CONTAINERS.has(container),
    mimeType: CONTAINER_MIME[container],
  };
}
