import { QualityTier } from '@/design/tokens';

describe('Quality Tier Logic', () => {
  test('QualityTier enum values are ordered 0 to 3', () => {
    expect(QualityTier.Minimal).toBe(0);
    expect(QualityTier.Lite).toBe(1);
    expect(QualityTier.Balanced).toBe(2);
    expect(QualityTier.Full).toBe(3);
  });

  test('autoDowngrade logic drops tier step by step down to Minimal', () => {
    let tier: QualityTier = QualityTier.Full;

    const autoDowngrade = () => {
      if (tier > QualityTier.Minimal) {
        tier = (tier - 1) as QualityTier;
      }
    };

    autoDowngrade();
    expect(tier).toBe(QualityTier.Balanced);
    autoDowngrade();
    expect(tier).toBe(QualityTier.Lite);
    autoDowngrade();
    expect(tier).toBe(QualityTier.Minimal);
    autoDowngrade();
    expect(tier).toBe(QualityTier.Minimal); // does not drop below 0
  });
});
