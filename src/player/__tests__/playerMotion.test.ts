import {
  calculateProgressFromTranslation,
  determineSnapTarget,
  interpolateArtworkBounds,
  type Rect,
} from '@/player/motionMath';

describe('Player Motion Mathematics (P4 Shell)', () => {
  const SCREEN_HEIGHT = 800;

  describe('calculateProgressFromTranslation', () => {
    test('translates upward drag (negative Y) from mini (0) toward full (1)', () => {
      // Dragging up by 400px on an 800px screen = +0.5 progress
      const progress = calculateProgressFromTranslation(-400, SCREEN_HEIGHT, 0);
      expect(progress).toBeCloseTo(0.5, 3);
    });

    test('translates downward drag (positive Y) from full (1) toward mini (0)', () => {
      // Dragging down by 400px from progress 1.0 = 0.5 progress
      const progress = calculateProgressFromTranslation(400, SCREEN_HEIGHT, 1.0);
      expect(progress).toBeCloseTo(0.5, 3);
    });

    test('clamps strictly between 0 and 1 to prevent out-of-bounds overshoot', () => {
      // Over-dragging down from 0
      const belowZero = calculateProgressFromTranslation(200, SCREEN_HEIGHT, 0);
      expect(belowZero).toBe(0);

      // Over-dragging up past full screen
      const aboveOne = calculateProgressFromTranslation(-1000, SCREEN_HEIGHT, 0);
      expect(aboveOne).toBe(1);
    });
  });

  describe('determineSnapTarget (Velocity & Threshold)', () => {
    test('flings upward (>1200 dp/s) immediately snap to full (1) even below 0.5 progress', () => {
      const target = determineSnapTarget(0.2, -1500, 1200);
      expect(target).toBe(1);
    });

    test('flings downward (>1200 dp/s) immediately snap to mini (0) even above 0.5 progress', () => {
      const target = determineSnapTarget(0.8, 1500, 1200);
      expect(target).toBe(0);
    });

    test('low velocity settles to 1 if progress > 0.5', () => {
      const target = determineSnapTarget(0.51, 100, 1200);
      expect(target).toBe(1);
    });

    test('low velocity settles to 0 if progress <= 0.5', () => {
      const target = determineSnapTarget(0.49, -100, 1200);
      expect(target).toBe(0);
    });
  });

  describe('interpolateArtworkBounds (Continuous Rect Travel)', () => {
    const miniRect: Rect = { x: 16, y: 720, width: 44, height: 44 };
    const fullRect: Rect = { x: 24, y: 120, width: 342, height: 342 };

    test('returns exact miniRect at progress = 0', () => {
      const rect = interpolateArtworkBounds(0, miniRect, fullRect);
      expect(rect).toEqual(miniRect);
    });

    test('returns exact fullRect at progress = 1', () => {
      const rect = interpolateArtworkBounds(1, miniRect, fullRect);
      expect(rect).toEqual(fullRect);
    });

    test('interpolates mid-way coordinates smoothly at progress = 0.5 without snapping', () => {
      const rect = interpolateArtworkBounds(0.5, miniRect, fullRect);
      expect(rect.x).toBeCloseTo(20, 2);
      expect(rect.y).toBeCloseTo(420, 2);
      expect(rect.width).toBeCloseTo(193, 2);
      expect(rect.height).toBeCloseTo(193, 2);
    });
  });
});
