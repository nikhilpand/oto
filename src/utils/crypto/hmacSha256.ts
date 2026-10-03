/**
 * Pure TypeScript SHA-256 and HMAC-SHA256 implementation.
 *
 * Implements FIPS 180-4 standard specification.
 * Zero external native dependencies, runs in all JavaScript/React Native engines.
 */

function utf8Encode(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      bytes.push(charcode);
    } else if (charcode < 0x800) {
      bytes.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      bytes.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      // surrogate pair
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = i + 1 < len ? (bytes[i + 1] ?? 0) : 0;
    const b2 = i + 2 < len ? (bytes[i + 2] ?? 0) : 0;

    const n = (b0 << 16) | (b1 << 8) | b2;

    result += chars.charAt((n >> 18) & 63);
    result += chars.charAt((n >> 12) & 63);
    result += i + 1 < len ? chars.charAt((n >> 6) & 63) : '=';
    result += i + 2 < len ? chars.charAt(n & 63) : '=';
  }
  return result;
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

export function sha256(data: Uint8Array): Uint8Array {
  const dataLen = data.length;
  const bitLen = dataLen * 8;
  const newLen = (((dataLen + 8) >> 6) + 1) << 6;
  const words = new Uint32Array(newLen >> 2);

  for (let i = 0; i < dataLen; i++) {
    const val = data[i] ?? 0;
    const idx = i >> 2;
    words[idx] = (words[idx] ?? 0) | (val << (24 - (i % 4) * 8));
  }
  const endIdx = dataLen >> 2;
  words[endIdx] = (words[endIdx] ?? 0) | (0x80 << (24 - (dataLen % 4) * 8));
  if (words.length >= 2) {
    words[words.length - 1] = bitLen & 0xffffffff;
    words[words.length - 2] = Math.floor(bitLen / 0x100000000);
  }

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t] ?? 0;
    }
    for (let t = 16; t < 64; t++) {
      const wt15 = w[t - 15] ?? 0;
      const s0 = rotr(wt15, 7) ^ rotr(wt15, 18) ^ (wt15 >>> 3);
      const wt2 = w[t - 2] ?? 0;
      const s1 = rotr(wt2, 17) ^ rotr(wt2, 19) ^ (wt2 >>> 10);
      w[t] = (((w[t - 16] ?? 0) + s0) | 0) + ((((w[t - 7] ?? 0) + s1) | 0) | 0);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = ((((((h + s1) | 0) + ch) | 0) + (K[t] ?? 0)) | 0) + (w[t] ?? 0);
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const hs = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    const val = hs[i] ?? 0;
    result[i * 4] = (val >>> 24) & 0xff;
    result[i * 4 + 1] = (val >>> 16) & 0xff;
    result[i * 4 + 2] = (val >>> 8) & 0xff;
    result[i * 4 + 3] = val & 0xff;
  }
  return result;
}

/**
 * Computes HMAC-SHA256 of message with secret key.
 * Returns Base64-encoded string.
 */
export function hmacSha256Base64(message: string, key: string): string {
  let keyBytes = utf8Encode(key);
  const blockSize = 64; // SHA-256 block size is 64 bytes

  if (keyBytes.length > blockSize) {
    keyBytes = sha256(keyBytes);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oPad = new Uint8Array(blockSize);
  const iPad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    oPad[i] = (paddedKey[i] ?? 0) ^ 0x5c;
    iPad[i] = (paddedKey[i] ?? 0) ^ 0x36;
  }

  const msgBytes = utf8Encode(message);
  const inner = new Uint8Array(blockSize + msgBytes.length);
  inner.set(iPad);
  inner.set(msgBytes, blockSize);

  const innerHash = sha256(inner);

  const outer = new Uint8Array(blockSize + 32);
  outer.set(oPad);
  outer.set(innerHash, blockSize);

  const outerHash = sha256(outer);
  return bytesToBase64(outerHash);
}
