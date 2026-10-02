/**
 * Pure TypeScript DES-ECB Decryptor for JioSaavn Encrypted Media URLs
 *
 * Implements FIPS PUB 46-3 Data Encryption Standard (DES) in Electronic Codebook (ECB) mode
 * with PKCS#5 / PKCS#7 unpadding and automatic 320kbps AAC bitrate upgrading.
 *
 * Runs natively inside React Native Hermes without Node.js `crypto` or native C++ dependencies.
 * Clean-room implementation adhering strictly to OTO architectural principles.
 */

// Initial Permutation (IP)
const IP = [
  58, 50, 42, 34, 26, 18, 10, 2,
  60, 52, 44, 36, 28, 20, 12, 4,
  62, 54, 46, 38, 30, 22, 14, 6,
  64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1,
  59, 51, 43, 35, 27, 19, 11, 3,
  61, 53, 45, 37, 29, 21, 13, 5,
  63, 55, 47, 39, 31, 23, 15, 7,
];

// Final Permutation (FP)
const FP = [
  40, 8, 48, 16, 56, 24, 64, 32,
  39, 7, 47, 15, 55, 23, 63, 31,
  38, 6, 46, 14, 54, 22, 62, 30,
  37, 5, 45, 13, 53, 21, 61, 29,
  36, 4, 44, 12, 52, 20, 60, 28,
  35, 3, 43, 11, 51, 19, 59, 27,
  34, 2, 42, 10, 50, 18, 58, 26,
  33, 1, 41, 9, 49, 17, 57, 25,
];

// Permuted Choice 1 (PC1)
const PC1 = [
  57, 49, 41, 33, 25, 17, 9,
  1, 58, 50, 42, 34, 26, 18,
  10, 2, 59, 51, 43, 35, 27,
  19, 11, 3, 60, 52, 44, 36,
  63, 55, 47, 39, 31, 23, 15,
  7, 62, 54, 46, 38, 30, 22,
  14, 6, 61, 53, 45, 37, 29,
  21, 13, 5, 28, 20, 12, 4,
];

// Permuted Choice 2 (PC2)
const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28,
  15, 6, 21, 10, 23, 19, 12, 4,
  26, 8, 16, 7, 27, 20, 13, 2,
  41, 52, 31, 37, 47, 55, 30, 40,
  51, 45, 33, 48, 44, 49, 39, 56,
  34, 53, 46, 42, 50, 36, 29, 32,
];

const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

// Expansion Table (E)
const E = [
  32, 1, 2, 3, 4, 5, 4, 5,
  6, 7, 8, 9, 8, 9, 10, 11,
  12, 13, 12, 13, 14, 15, 16, 17,
  16, 17, 18, 19, 20, 21, 20, 21,
  22, 23, 24, 25, 24, 25, 26, 27,
  28, 29, 28, 29, 30, 31, 32, 1,
];

// Permutation Table (P)
const P = [
  16, 7, 20, 21, 29, 12, 28, 17,
  1, 15, 23, 26, 5, 18, 31, 10,
  2, 8, 24, 14, 32, 27, 3, 9,
  19, 13, 30, 6, 22, 11, 4, 25,
];

// Substitution Boxes (SBOX 1..8)
const SBOX: number[][][] = [
  [
    [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
    [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
    [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
    [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
  ],
  [
    [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
    [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
    [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
    [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
  ],
  [
    [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
    [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
    [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
    [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
  ],
  [
    [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
    [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
    [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
    [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
  ],
  [
    [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
    [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
    [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
    [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
  ],
  [
    [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
    [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
    [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
    [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
  ],
  [
    [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
    [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
    [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
    [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
  ],
  [
    [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
    [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
    [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
    [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
  ],
];

function permute(block: bigint, table: number[], inLen: number): bigint {
  let res = 0n;
  for (let i = 0; i < table.length; i++) {
    const pos = table[i]!;
    const bit = (block >> BigInt(inLen - pos)) & 1n;
    res = (res << 1n) | bit;
  }
  return res;
}

function generateSubkeys(keyBytes: Uint8Array): bigint[] {
  let keyInt = 0n;
  for (let i = 0; i < 8; i++) {
    keyInt = (keyInt << 8n) | BigInt(keyBytes[i] || 0);
  }
  const permuted = permute(keyInt, PC1, 64);
  let c = permuted >> 28n;
  let d = permuted & 0x0fffffffn;
  const subkeys: bigint[] = [];

  for (let i = 0; i < SHIFTS.length; i++) {
    const shift = BigInt(SHIFTS[i]!);
    c = (((c << shift) & 0x0fffffffn) | (c >> (28n - shift))) & 0x0fffffffn;
    d = (((d << shift) & 0x0fffffffn) | (d >> (28n - shift))) & 0x0fffffffn;
    const cd = (c << 28n) | d;
    subkeys.push(permute(cd, PC2, 56));
  }
  return subkeys;
}

function desBlock(blockBytes: Uint8Array, subkeys: bigint[]): Uint8Array {
  let blockInt = 0n;
  for (let i = 0; i < 8; i++) {
    blockInt = (blockInt << 8n) | BigInt(blockBytes[i] || 0);
  }
  const permuted = permute(blockInt, IP, 64);
  let l = permuted >> 32n;
  let r = permuted & 0xffffffffn;

  for (let round = 0; round < subkeys.length; round++) {
    const k = subkeys[round]!;
    const expanded = permute(r, E, 32);
    const xored = expanded ^ k;
    let sOut = 0n;
    for (let i = 0; i < 8; i++) {
      const chunk = Number((xored >> BigInt(42 - i * 6)) & 0x3fn);
      const row = ((chunk >> 5) << 1) | (chunk & 1);
      const col = (chunk >> 1) & 0x0f;
      sOut = (sOut << 4n) | BigInt(SBOX[i]![row]![col]!);
    }
    const fRes = permute(sOut, P, 32);
    const newR = (l ^ fRes) & 0xffffffffn;
    l = r;
    r = newR;
  }

  const combined = (r << 32n) | l;
  const finalInt = permute(combined, FP, 64);
  const out = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    out[i] = Number((finalInt >> BigInt((7 - i) * 8)) & 0xffn);
  }
  return out;
}

/**
 * Pure TypeScript Base64 to Uint8Array converter.
 * Completely independent of Node.js Buffer, window.atob, or browser environments.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  let pad = 0;
  if (clean.endsWith('==')) pad = 2;
  else if (clean.endsWith('=')) pad = 1;

  const byteLen = Math.max(0, Math.floor((len * 3) / 4) - pad);
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const enc1 = chars.indexOf(clean.charAt(i));
    const enc2 = chars.indexOf(clean.charAt(i + 1));
    const enc3 = chars.indexOf(clean.charAt(i + 2));
    const enc4 = chars.indexOf(clean.charAt(i + 3));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    if (p < byteLen) bytes[p++] = chr1;
    if (enc3 !== 64 && enc3 !== -1 && p < byteLen) bytes[p++] = chr2;
    if (enc4 !== 64 && enc4 !== -1 && p < byteLen) bytes[p++] = chr3;
  }
  return bytes;
}

/**
 * Standard DES-ECB decryption with PKCS#5 unpadding.
 */
export function desEcbDecrypt(
  ciphertext: Uint8Array,
  key: string = '38346591'
): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  const subkeys = generateSubkeys(keyBytes);
  const reversedSubkeys = [...subkeys].reverse();

  const blocks: Uint8Array[] = [];
  for (let i = 0; i < ciphertext.length; i += 8) {
    const slice = ciphertext.subarray(i, i + 8);
    if (slice.length === 8) {
      blocks.push(desBlock(slice, reversedSubkeys));
    }
  }

  const totalLen = blocks.reduce((acc, b) => acc + b.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    merged.set(b, offset);
    offset += b.length;
  }

  // Strip PKCS#5 / PKCS#7 padding
  if (merged.length > 0) {
    const padLen = merged[merged.length - 1]!;
    if (padLen >= 1 && padLen <= 8) {
      let isPad = true;
      for (let i = merged.length - padLen; i < merged.length; i++) {
        if (merged[i] !== padLen) {
          isPad = false;
          break;
        }
      }
      if (isPad) {
        return merged.subarray(0, merged.length - padLen);
      }
    }
  }

  return merged;
}

/**
 * Decrypts a JioSaavn encrypted media URL and upgrades the stream quality to 320kbps.
 *
 * @param encryptedBase64 Raw Base64 string from JioSaavn API (`more_info.encrypted_media_url`)
 * @param key Static 8-byte ASCII key ('38346591')
 * @returns Direct playable CDN audio URL (e.g. `https://aac.saavncdn.com/..._320.mp4`) or null
 */
export function decryptJioSaavnUrl(
  encryptedBase64: string,
  key: string = '38346591',
  targetBitrate: 320 | 160 | 96 = 320
): string | null {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    return null;
  }

  try {
    const rawCipher = base64ToUint8Array(encryptedBase64.trim());
    if (rawCipher.length === 0 || rawCipher.length % 8 !== 0) {
      return null;
    }

    const decryptedBytes = desEcbDecrypt(rawCipher, key);
    const directUrl = new TextDecoder().decode(decryptedBytes).trim();

    if (!directUrl.startsWith('http')) {
      return null;
    }

    // Replace bitrate suffix according to targetBitrate
    const suffix = `_${targetBitrate}`;
    return directUrl
      .replace(/_(?:96|160|320)\.mp4/g, `${suffix}.mp4`)
      .replace(/_(?:96|160|320)\.m4a/g, `${suffix}.m4a`);
  } catch (err) {
    console.warn('[desEcb] Decryption error:', err);
    return null;
  }
}

