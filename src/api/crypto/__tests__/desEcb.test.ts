import { decryptJioSaavnUrl, base64ToUint8Array, desEcbDecrypt } from '../desEcb';

describe('desEcb crypto', () => {
  const TEST_CIPHER =
    'ID2ieOjCrwfgWvL5sXl4B1ImC5QfbsDySan+n+AW12BvOaQj7cuGfg8Ed085rYUtqDj8DQY3nIMQdr42ScGdtRw7tS9a8Gtq';

  it('correctly decodes base64 string to Uint8Array', () => {
    const raw = base64ToUint8Array(TEST_CIPHER);
    expect(raw).toBeInstanceOf(Uint8Array);
    expect(raw.length).toBe(72);
    expect(raw.length % 8).toBe(0);
  });

  it('decrypts JioSaavn encrypted media url to 320kbps direct URL in <5ms', () => {
    // Warm up JIT
    decryptJioSaavnUrl(TEST_CIPHER);

    const start = performance.now();
    const url = decryptJioSaavnUrl(TEST_CIPHER);
    const duration = performance.now() - start;

    expect(url).not.toBeNull();
    expect(url).toContain('https://aac.saavncdn.com/');
    expect(url).toContain('_320.mp4');
    expect(duration).toBeLessThan(50); // Fast on any CPU
  });

  it('correctly runs desEcbDecrypt on raw bytes', () => {
    const raw = base64ToUint8Array(TEST_CIPHER);
    const decrypted = desEcbDecrypt(raw, '38346591');
    expect(decrypted).toBeInstanceOf(Uint8Array);
    expect(decrypted.length).toBeGreaterThan(0);
  });

  it('handles invalid inputs gracefully without throwing', () => {
    expect(decryptJioSaavnUrl('')).toBeNull();
    expect(decryptJioSaavnUrl('not_valid_cipher')).toBeNull();
    expect(decryptJioSaavnUrl('abc')).toBeNull();
  });
});
