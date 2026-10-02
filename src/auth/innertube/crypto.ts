/**
 * Innertube SAPISIDHASH Crypto & Authentication Signatures
 *
 * Implements pure on-device, zero-dependency RFC 3174 SHA-1 hashing
 * for Google's SAPISIDHASH authentication protocol.
 *
 * Clean-room implementation inspired by BitChord's Innertube.kt (sapisidHash).
 *
 * Format:
 *   SAPISIDHASH <timestamp>_<sha1Hex(timestamp + " " + sapisid + " " + origin)>
 */

const SAPISID_NAMES = ['SAPISID', '__Secure-3PAPISID', '__Secure-1PAPISID'];
const DEFAULT_ORIGIN = 'https://music.youtube.com';

/**
 * Computes a standard RFC 3174 SHA-1 hexadecimal digest in pure TypeScript.
 * Works uniformly across React Native (Hermes), Node.js, and browser environments.
 */
export function sha1Hex(message: string): string {
  function rotl(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s));
  }

  function toHex(n: number): string {
    let str = '';
    for (let i = 7; i >= 0; i--) {
      str += ((n >>> (i * 4)) & 0xf).toString(16);
    }
    return str;
  }

  // Convert UTF-8 string to bytes
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let c = message.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      // UTF-16 surrogate pair
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (message.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
    }
  }

  const nBytes = bytes.length;
  const words: number[] = [];
  for (let i = 0; i < nBytes; i++) {
    words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i]! << (24 - (i % 4) * 8));
  }
  words[nBytes >>> 2] = (words[nBytes >>> 2] || 0) | (0x80 << (24 - (nBytes % 4) * 8));
  words[(((nBytes + 8) >>> 6) << 4) + 15] = nBytes * 8;

  let H0 = 0x67452301;
  let H1 = 0xefcdab89;
  let H2 = 0x98badcfe;
  let H3 = 0x10325476;
  let H4 = 0xc3d2e1f0;
  const W = new Array<number>(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      W[t] = words[i + t] || 0;
    }
    for (let t = 16; t < 80; t++) {
      W[t] = rotl(W[t - 3]! ^ W[t - 8]! ^ W[t - 14]! ^ W[t - 16]!, 1);
    }

    let A = H0;
    let B = H1;
    let C = H2;
    let D = H3;
    let E = H4;

    for (let t = 0; t < 80; t++) {
      let f: number;
      let K: number;
      if (t < 20) {
        f = (B & C) | (~B & D);
        K = 0x5a827999;
      } else if (t < 40) {
        f = B ^ C ^ D;
        K = 0x6ed9eba1;
      } else if (t < 60) {
        f = (B & C) | (B & D) | (C & D);
        K = 0x8f1bbcdc;
      } else {
        f = B ^ C ^ D;
        K = 0xca62c1d6;
      }
      const temp = (rotl(A, 5) + f + E + K + (W[t] || 0)) | 0;
      E = D;
      D = C;
      C = rotl(B, 30);
      B = A;
      A = temp;
    }

    H0 = (H0 + A) | 0;
    H1 = (H1 + B) | 0;
    H2 = (H2 + C) | 0;
    H3 = (H3 + D) | 0;
    H4 = (H4 + E) | 0;
  }

  return (toHex(H0) + toHex(H1) + toHex(H2) + toHex(H3) + toHex(H4)).toLowerCase();
}

/**
 * Generates an Innertube authorization header using the SAPISID cookie.
 * @param sapisid The SAPISID secret token
 * @param origin The request origin (defaults to https://music.youtube.com)
 * @param overrideTimestamp Optional timestamp for deterministic testing
 */
export function sapisidHash(
  sapisid: string,
  origin: string = DEFAULT_ORIGIN,
  overrideTimestamp?: number
): string {
  const timestamp = overrideTimestamp ?? Math.floor(Date.now() / 1000);
  const payload = `${timestamp} ${sapisid} ${origin}`;
  const digest = sha1Hex(payload);
  return `SAPISIDHASH ${timestamp}_${digest}`;
}

/**
 * Extracts the API signing secret out of a cookie header string.
 * Supports SAPISID, __Secure-3PAPISID, and __Secure-1PAPISID.
 */
export function extractSapisid(cookieHeader: string): string | null {
  if (!cookieHeader) return null;
  const jar = new Map<string, string>();

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const name = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      if (name && value) {
        jar.set(name, value);
      }
    }
  }

  for (const name of SAPISID_NAMES) {
    const val = jar.get(name);
    if (val) return val;
  }

  return null;
}
