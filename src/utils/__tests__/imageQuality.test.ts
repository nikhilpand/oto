import { upgradeArtworkUrl } from '../imageQuality';

describe('upgradeArtworkUrl', () => {
  it('returns empty string for null, undefined, or empty inputs', () => {
    expect(upgradeArtworkUrl(null)).toBe('');
    expect(upgradeArtworkUrl(undefined)).toBe('');
    expect(upgradeArtworkUrl('')).toBe('');
  });

  it('upgrades Google user content and YouTube Music thumbnails to 800x800', () => {
    const lowRes1 =
      'https://lh3.googleusercontent.com/y8QvL320k=w120-h120-l90-rj';
    expect(upgradeArtworkUrl(lowRes1)).toBe(
      'https://lh3.googleusercontent.com/y8QvL320k=w800-h800-l90-rj'
    );

    const lowRes2 =
      'https://yt3.googleusercontent.com/abc=w60-h60-l90-rj';
    expect(upgradeArtworkUrl(lowRes2)).toBe(
      'https://yt3.googleusercontent.com/abc=w800-h800-l90-rj'
    );

    const avatarLowRes =
      'https://lh3.googleusercontent.com/a/photo=s88-c';
    expect(upgradeArtworkUrl(avatarLowRes)).toBe(
      'https://lh3.googleusercontent.com/a/photo=s800-c'
    );
  });

  it('upgrades JioSaavn compressed images to uncompressed 500x500', () => {
    const jio150 = 'https://c.saavncdn.com/123/track-150x150.jpg';
    expect(upgradeArtworkUrl(jio150)).toBe(
      'https://c.saavncdn.com/123/track-500x500.jpg'
    );

    const jio50 = 'https://c.saavncdn.com/123/track-50x50.jpg';
    expect(upgradeArtworkUrl(jio50)).toBe(
      'https://c.saavncdn.com/123/track-500x500.jpg'
    );
  });

  it('upgrades Spotify compressed image hashes to 640x640', () => {
    const spotify64 = 'https://i.scdn.co/image/ab67616d00004851test123';
    expect(upgradeArtworkUrl(spotify64)).toBe(
      'https://i.scdn.co/image/ab67616d0000b273test123'
    );
  });

  it('preserves other image URLs and converts http to https', () => {
    const httpUrl = 'http://example.com/artwork.jpg';
    expect(upgradeArtworkUrl(httpUrl)).toBe('https://example.com/artwork.jpg');
  });
});
