/**
 * OTO Canvas — Looping Motion Artwork Types
 *
 * Clean-room architecture inspired by BitChord's CanvasRepository.kt.
 * Defines looping video artwork models (Apple Motion, Spotify Canvas, Tidal).
 */

export type CanvasProvider = 'apple' | 'spotify' | 'tidal' | 'community';
export type CanvasAspectRatio = 'square' | 'vertical'; // 1:1 or 9:16

export interface CanvasArtwork {
  readonly url: string;
  readonly provider: CanvasProvider;
  readonly aspectRatio: CanvasAspectRatio;
  readonly durationMs?: number;
  readonly width?: number;
  readonly height?: number;
}

export interface CanvasEntry {
  readonly artwork: CanvasArtwork | null;
  readonly withAlbum: boolean;
  readonly resolvedAt: number;
}
