import {
  color,
  space,
  radius,
  type,
  spring,
  duration,
  touchTarget,
  QualityTier,
} from '@/design/tokens';

describe('Design Tokens Integrity', () => {
  test('color tokens contain all required dark-first surfaces and text roles', () => {
    expect(color.bg.base).toBe('#0A0A0B');
    expect(color.bg.s1).toBe('#111113');
    expect(color.bg.s2).toBe('#17171A');
    expect(color.bg.s3).toBe('#1E1E22');

    expect(color.text.primary).toBe('rgba(255, 255, 255, 0.94)');
    expect(color.text.secondary).toBe('rgba(255, 255, 255, 0.64)');
    expect(color.text.tertiary).toBe('rgba(255, 255, 255, 0.44)');
    expect(color.text.disabled).toBe('rgba(255, 255, 255, 0.32)');

    expect(color.accent.signature).toBe('#E5A93C');
    expect(color.accent.signatureLight).toBe('#F3C46B');

    expect(color.glass.tint).toBe('rgba(10, 10, 12, 0.55)');
    expect(color.glass.solidFallback).toBe('rgba(18, 18, 20, 0.94)');
  });

  test('space scale follows 4-pt grid', () => {
    expect(space).toEqual([0, 4, 8, 12, 16, 20, 24, 32, 48]);
    space.forEach((val) => {
      expect(val % 4).toBe(0);
    });
  });

  test('border radius tokens match DESIGN.md', () => {
    expect(radius.sm).toBe(8);
    expect(radius.md).toBe(12);
    expect(radius.lg).toBe(20);
    expect(radius.xl).toBe(28);
    expect(radius.full).toBe(999);
  });

  test('typography scale defines [fontSize, lineHeight] for all 9 variants', () => {
    const variants = [
      'display',
      'title',
      'headline',
      'section',
      'track',
      'body',
      'artist',
      'meta',
      'caption',
    ] as const;

    variants.forEach((v) => {
      const [fontSize, lineHeight] = type[v];
      expect(fontSize).toBeGreaterThan(0);
      expect(lineHeight).toBeGreaterThan(fontSize);
    });

    expect(type.display).toEqual([34, 40]);
    expect(type.title).toEqual([28, 34]);
    expect(type.headline).toEqual([22, 28]);
    expect(type.caption).toEqual([11, 14]);
  });

  test('spring physics defines spatial and critically damped effects', () => {
    expect(spring.spatial.default).toBeDefined();
    expect(spring.spatial.playful).toBeDefined();
    expect(spring.effects.default).toBeDefined();
    // Effects are critically damped
    expect(spring.effects.default.damping).toBe(40);
  });

  test('duration tokens are defined', () => {
    expect(duration.micro).toBe(140);
    expect(duration.standard).toBe(280);
    expect(duration.large).toBe(480);
    expect(duration.environment).toBe(800);
  });

  test('touch targets meet platform accessibility minimums', () => {
    expect(touchTarget.ios).toBe(44);
    expect(touchTarget.android).toBe(48);
  });

  test('quality tiers define 4 levels from 0 to 3', () => {
    expect(QualityTier.Minimal).toBe(0);
    expect(QualityTier.Lite).toBe(1);
    expect(QualityTier.Balanced).toBe(2);
    expect(QualityTier.Full).toBe(3);
  });
});




