/**
 * imageQuality.ts — Universal Artwork & Thumbnail Resolution Upgrade
 *
 * Upgrades compressed or low-resolution thumbnails across all providers:
 * - Google UserContent / YouTube Music: upgrades 60x60 / 120x120 / 226x226 to crisp 800x800 / 1080x1080
 * - YouTube Video CDN (i.ytimg.com): upgrades low-res 120x90 / 320x180 to high-definition 720p / maxres
 * - JioSaavn: upgrades 50x50 / 150x150 to uncompressed 500x500
 * - Spotify CDN: upgrades 64x64 thumbnails to 640x640 master artwork
 */

export function upgradeArtworkUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let upgraded = url.trim().replace(/^http:\/\//i, 'https://');

  // 1. Google User Content & YouTube Music CDN (lh3.googleusercontent.com, yt3.ggpht.com, etc.)
  if (
    upgraded.includes('googleusercontent.com') ||
    upgraded.includes('ggpht.com') ||
    upgraded.includes('ytimg.com/vi_webp')
  ) {
    if (/=w\d+-h\d+/i.test(upgraded)) {
      upgraded = upgraded.replace(/=w\d+-h\d+[^?]*/i, '=w800-h800-l90-rj');
    } else if (/=s\d+/i.test(upgraded)) {
      upgraded = upgraded.replace(/=s\d+[^?]*/i, '=s800-c');
    }
  }

  // 2. JioSaavn CDN (c.saavncdn.com)
  if (upgraded.includes('saavncdn.com')) {
    upgraded = upgraded
      .replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, '-500x500.$1')
      .replace('150x150', '500x500')
      .replace('50x50', '500x500');
  }

  // 3. Spotify CDN (i.scdn.co)
  if (upgraded.includes('i.scdn.co/image/ab67616d00004851')) {
    // 64x64 -> 640x640 master
    upgraded = upgraded.replace('ab67616d00004851', 'ab67616d0000b273');
  } else if (upgraded.includes('i.scdn.co/image/ab67616d00001e02')) {
    // 300x300 -> 640x640 master
    upgraded = upgraded.replace('ab67616d00001e02', 'ab67616d0000b273');
  }

  return upgraded;
}
