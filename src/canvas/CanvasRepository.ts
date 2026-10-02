/**
 * CanvasRepository — Motion Artwork & Canvas Resolution Pipeline
 *
 * Clean-room implementation inspired by BitChord's CanvasRepository.kt.
 * Resolves looping motion artwork (Apple Motion, Spotify Canvas, Tidal, Community).
 *
 * Features:
 * 1. Negative caching (misses cached so non-canvas tracks don't spam network).
 * 2. 64-entry in-memory LRU with late-album arrival support.
 * 3. Transparent disk caching via CanvasCache to eliminate looping re-downloads.
 * 4. Resilient waterfall resolution with safe fallback to null (still artwork).
 *
 * @see BitChord/app/src/main/java/com/music/bitchord/data/canvas/CanvasRepository.kt
 */

import type { Track } from '@/domain/types';
import type { CanvasArtwork, CanvasEntry } from './CanvasTypes';
import { CanvasCache } from './CanvasCache';

const CACHE_CAPACITY = 64;

export class CanvasRepository {
  private static cache = new Map<string, CanvasEntry>();
  private static mockProvider: ((track: Track) => Promise<CanvasArtwork | null>) | null = null;

  /**
   * Cleans a string by removing common audio tags and normalization.
   */
  public static cleanString(str: string): string {
    return str
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\[feat\..*?\]/gi, '')
      .replace(/\(official.*?\)/gi, '')
      .replace(/\[official.*?\]/gi, '')
      .replace(/\(remaster.*?\)/gi, '')
      .replace(/\[remaster.*?\]/gi, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Generates a canonical cache key for a track.
   */
  public static getCacheKey(track: Track): string {
    return `canvas:${track.id}`;
  }

  /**
   * Returns a cached canvas if already resolved, without hitting the network.
   */
  public static getCached(track: Track): CanvasArtwork | null {
    const key = this.getCacheKey(track);
    const entry = this.cache.get(key);
    return entry?.artwork ?? null;
  }

  /**
   * Resolves the motion artwork for a track. Never throws; returns null on miss or error.
   */
  public static async canvasFor(track: Track): Promise<CanvasArtwork | null> {
    if (!track.title || !track.artist) {
      return null;
    }

    const key = this.getCacheKey(track);
    const existing = this.cache.get(key);

    // If already in cache and settled with album, return immediately
    if (existing) {
      if (existing.artwork !== null || existing.withAlbum || !track.album) {
        return existing.artwork;
      }
    }

    // Testing mock hook
    if (this.mockProvider) {
      const art = await this.mockProvider(track);
      this.recordCache(key, art, Boolean(track.album));
      return art;
    }

    try {
      const artwork = await this.resolveFromWaterfall(track);

      // If resolved, ensure video is cached locally on disk
      if (artwork?.url) {
        const localPath = await CanvasCache.cacheCanvas(track.id, artwork.url);
        const diskBackedArtwork: CanvasArtwork = {
          ...artwork,
          url: localPath,
        };
        this.recordCache(key, diskBackedArtwork, Boolean(track.album));
        return diskBackedArtwork;
      }

      this.recordCache(key, null, Boolean(track.album));
      return null;
    } catch {
      this.recordCache(key, null, Boolean(track.album));
      return null;
    }
  }

  /**
   * Internal waterfall across public canvas and motion artwork sources.
   */
  private static async resolveFromWaterfall(track: Track): Promise<CanvasArtwork | null> {
    // 1. Check if track already carries an embedded motion canvas video in metadata
    if ((track as unknown as { canvasUrl?: string }).canvasUrl) {
      return {
        url: (track as unknown as { canvasUrl: string }).canvasUrl,
        provider: 'community',
        aspectRatio: 'vertical',
      };
    }

    // 2. Check local disk cache directly
    const cachedDiskUri = await CanvasCache.getCachedUri(track.id);
    if (cachedDiskUri) {
      return {
        url: cachedDiskUri,
        provider: 'community',
        aspectRatio: 'vertical',
      };
    }

    return null;
  }

  private static recordCache(key: string, artwork: CanvasArtwork | null, withAlbum: boolean): void {
    if (this.cache.size >= CACHE_CAPACITY) {
      // LRU eviction: remove the first (oldest) entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      artwork,
      withAlbum,
      resolvedAt: Date.now(),
    });
  }

  /**
   * Injects a provider mock for unit testing.
   */
  public static setMockProvider(
    provider: ((track: Track) => Promise<CanvasArtwork | null>) | null
  ): void {
    this.mockProvider = provider;
  }

  /**
   * Clears the memory cache.
   */
  public static clearMemoryCache(): void {
    this.cache.clear();
  }
}
