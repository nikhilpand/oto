/**
 * CanvasCache — Disk Cache for Looping Motion Artwork Clips
 *
 * Clean-room implementation inspired by BitChord's CanvasCache.kt.
 *
 * Prevents catastrophic multi-megabyte data leaks where a 5-second video clip
 * loops 50 times over a 4-minute track, refetching the clip from the network
 * on every single loop iteration.
 *
 * Serves the first loop from the network while caching to disk, and all
 * subsequent loops directly from local storage.
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/data/canvas/CanvasCache.kt
 */

let FileSystem: typeof import('expo-file-system') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  FileSystem = require('expo-file-system');
} catch {
  FileSystem = null;
}

const CACHE_SUBDIR = 'oto_canvas/';

export class CanvasCache {
  private static memoryFallback = new Map<string, string>();

  private static getCacheDir(): string {
    const raw = (FileSystem as unknown as Record<string, string | null> | null)?.['cacheDirectory'];
    if (raw) {
      return `${raw}${CACHE_SUBDIR}`;
    }
    return `/tmp/${CACHE_SUBDIR}`;
  }

  /**
   * Sanitizes a remote canvas URL or ID to a safe local filename.
   */
  public static sanitizeFilename(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safe}.mp4`;
  }

  /**
   * Retrieves the local cached file URI if it exists on disk.
   */
  public static async getCachedUri(key: string): Promise<string | null> {
    if (!FileSystem) {
      return this.memoryFallback.get(key) ?? null;
    }

    try {
      const dir = this.getCacheDir();
      const filePath = `${dir}${this.sanitizeFilename(key)}`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists && !info.isDirectory) {
        return filePath;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Caches a canvas video clip locally in background and returns the local file path.
   */
  public static async cacheCanvas(key: string, remoteUrl: string): Promise<string> {
    if (!FileSystem) {
      this.memoryFallback.set(key, remoteUrl);
      return remoteUrl;
    }

    try {
      const dir = this.getCacheDir();
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      const destPath = `${dir}${this.sanitizeFilename(key)}`;
      const download = await FileSystem.downloadAsync(remoteUrl, destPath);
      return download.uri;
    } catch {
      // Fallback directly to remote URL on download or disk failure
      return remoteUrl;
    }
  }

  /**
   * Clears the entire canvas video disk cache.
   */
  public static async clearCache(): Promise<void> {
    this.memoryFallback.clear();
    if (!FileSystem) return;

    try {
      const dir = this.getCacheDir();
      const info = await FileSystem.getInfoAsync(dir);
      if (info.exists) {
        await FileSystem.deleteAsync(dir, { idempotent: true });
      }
    } catch {
      // Ignore cleanup error
    }
  }
}
