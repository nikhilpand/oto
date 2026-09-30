import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { OTOText } from '@/design/components/OTOText';
import { OTOGlassSurface } from '@/design/components/OTOGlassSurface';
import { OTOButton } from '@/design/components/OTOButton';
import { space, color, radius } from '@/design/tokens';
import { PixelRgb, PaletteResult } from '@/design/color/types';
import { extractPaletteFromPixels, getFallbackPalette } from '@/design/color/extract';
import { wcagLuminance, wcagContrast, hexToRgb } from '@/design/color/oklch';
import { usePalette } from '@/design/context/PaletteContext';

interface TestArtworkCase {
  id: string;
  name: string;
  description: string;
  generatePixels: () => PixelRgb[];
}

function makeSolid(r: number, g: number, b: number): PixelRgb[] {
  const arr: PixelRgb[] = new Array(64 * 64);
  for (let i = 0; i < 64 * 64; i++) {
    arr[i] = [r, g, b];
  }
  return arr;
}

const TEST_CASES: TestArtworkCase[] = [
  {
    id: 'greyscale',
    name: '1. Greyscale',
    description: 'Monochromatic medium grey (128, 128, 128)',
    generatePixels: () => makeSolid(128, 128, 128),
  },
  {
    id: 'pitch_black',
    name: '2. Pitch Black',
    description: 'Total darkness (0, 0, 0)',
    generatePixels: () => makeSolid(0, 0, 0),
  },
  {
    id: 'pure_white',
    name: '3. Pure White',
    description: 'Maximum brightness (255, 255, 255)',
    generatePixels: () => makeSolid(255, 255, 255),
  },
  {
    id: 'dot_on_white',
    name: '4. Red Dot on White',
    description: '1 red pixel on pure white canvas',
    generatePixels: () => {
      const p = makeSolid(255, 255, 255);
      p[0] = [255, 0, 0];
      return p;
    },
  },
  {
    id: 'dot_on_black',
    name: '5. Teal Dot on Black',
    description: '1 teal pixel on pitch black canvas',
    generatePixels: () => {
      const p = makeSolid(0, 0, 0);
      p[0] = [0, 220, 180];
      return p;
    },
  },
  {
    id: 'split_bw',
    name: '6. High Contrast Split',
    description: '50% black and 50% white',
    generatePixels: () => {
      const p = makeSolid(0, 0, 0);
      for (let i = 2048; i < 4096; i++) p[i] = [255, 255, 255];
      return p;
    },
  },
  {
    id: 'pastel',
    name: '7. Soft Pastel',
    description: 'Low saturation lavender (240, 230, 235)',
    generatePixels: () => makeSolid(240, 230, 235),
  },
  {
    id: 'neon',
    name: '8. Ultra Neon Green',
    description: 'Maximum saturation neon (0, 255, 128)',
    generatePixels: () => makeSolid(0, 255, 128),
  },
  {
    id: 'warm_sepia',
    name: '9. Warm Sepia/Red',
    description: 'Monochromatic warm crimson (140, 40, 20)',
    generatePixels: () => makeSolid(140, 40, 20),
  },
  {
    id: 'cool_navy',
    name: '10. Cool Deep Navy',
    description: 'Monochromatic dark blue (15, 25, 70)',
    generatePixels: () => makeSolid(15, 25, 70),
  },
  {
    id: 'subtle_texture',
    name: '11. Subtle Texture',
    description: 'Micro-variations across dark grey',
    generatePixels: () => {
      const p: PixelRgb[] = new Array(4096);
      for (let i = 0; i < 4096; i++) {
        const v = 45 + (i % 8);
        p[i] = [v, v + 2, v + 3];
      }
      return p;
    },
  },
  {
    id: 'missing_fallback',
    name: '12. Missing / Fallback',
    description: 'Empty pixel buffer (zero artwork data)',
    generatePixels: () => [],
  },
];

const DEFAULT_TEST_CASE: TestArtworkCase = TEST_CASES[0] ?? {
  id: 'greyscale',
  name: '1. Greyscale',
  description: 'Monochromatic medium grey (128, 128, 128)',
  generatePixels: () => makeSolid(128, 128, 128),
};

export function ColorHarnessStories() {
  const { extractAndApplyPalette } = usePalette();
  const [selectedCaseId, setSelectedCaseId] = useState<string>(DEFAULT_TEST_CASE.id);

  const selectedCase = useMemo(
    () => TEST_CASES.find((c) => c.id === selectedCaseId) ?? DEFAULT_TEST_CASE,
    [selectedCaseId]
  );

  const extractedPalette: PaletteResult = useMemo(() => {
    const pixels = selectedCase.generatePixels();
    return pixels.length > 0 ? extractPaletteFromPixels(pixels) : getFallbackPalette();
  }, [selectedCase]);

  // Compute contrast of accent against base background
  const contrastInfo = useMemo(() => {
    const bgRgb = hexToRgb(color.bg.base);
    const bgLum = wcagLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    const accentRgb = hexToRgb(extractedPalette.accent);
    const accentLum = wcagLuminance(accentRgb[0], accentRgb[1], accentRgb[2]);
    const ratio = wcagContrast(accentLum, bgLum);
    return {
      ratio: ratio.toFixed(2),
      passesLarge: ratio >= 3.0,
      passesBody: ratio >= 4.5,
    };
  }, [extractedPalette]);

  const handleApplyToEnvironment = () => {
    const pixels = selectedCase.generatePixels();
    extractAndApplyPalette(selectedCase.id, pixels);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <OTOText variant="headline" colorRole="accentLight" style={styles.header}>
        12-Artwork Color Pipeline Test Harness
      </OTOText>

      <OTOText variant="caption" colorRole="secondary" style={styles.subhead}>
        Select an edge case artwork to test OKLCH quantization, 5-role assignment, and WCAG AA contrast clamping.
      </OTOText>

      {/* Case Selector Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
        {TEST_CASES.map((tc) => {
          const isSelected = tc.id === selectedCaseId;
          return (
            <Pressable
              key={tc.id}
              onPress={() => setSelectedCaseId(tc.id)}
              style={[
                styles.pill,
                isSelected && {
                  backgroundColor: color.accent.signature,
                  borderColor: color.accent.signatureLight,
                },
              ]}
            >
              <OTOText
                variant="caption"
                weight={isSelected ? 'bold' : 'regular'}
                customColor={isSelected ? color.bg.base : color.text.primary}
              >
                {tc.name}
              </OTOText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected Case Detail Card */}
      <OTOGlassSurface style={styles.card}>
        <OTOText variant="track" weight="semibold">
          {selectedCase.name}
        </OTOText>
        <OTOText variant="caption" colorRole="secondary">
          {selectedCase.description}
        </OTOText>

        {/* Contrast Badge */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: contrastInfo.passesLarge ? '#1A3826' : '#451717',
                borderColor: contrastInfo.passesLarge ? '#4ADE80' : '#EF4444',
              },
            ]}
          >
            <OTOText
              variant="caption"
              weight="bold"
              customColor={contrastInfo.passesLarge ? '#4ADE80' : '#EF4444'}
            >
              Accent Contrast: {contrastInfo.ratio}:1 {contrastInfo.passesLarge ? '✓ PASS' : '✗ FAIL'}
            </OTOText>
          </View>
        </View>

        {/* 5 Swatches Display */}
        <View style={styles.swatchesRow}>
          {(['dominant', 'secondary', 'accent', 'shadow', 'highlight'] as const).map(
            (role) => {
              const hex = extractedPalette[role];
              return (
                <View key={role} style={styles.swatchColumn}>
                  <View style={[styles.swatchBox, { backgroundColor: hex }]} />
                  <OTOText variant="caption" colorRole="tertiary" style={styles.swatchLabel}>
                    {role}
                  </OTOText>
                  <OTOText variant="caption" colorRole="primary" style={styles.swatchHex}>
                    {hex}
                  </OTOText>
                </View>
              );
            }
          )}
        </View>

        {/* Live Preview Card */}
        <View
          style={[
            styles.previewBox,
            {
              backgroundColor: extractedPalette.shadow,
              borderColor: extractedPalette.secondary,
            },
          ]}
        >
          <View style={styles.previewHeader}>
            <View
              style={[
                styles.previewPill,
                { backgroundColor: extractedPalette.accent },
              ]}
            >
              <OTOText variant="caption" weight="bold" customColor="#0A0A0B">
                ACCENT
              </OTOText>
            </View>
            <OTOText variant="caption" customColor={extractedPalette.highlight}>
              Highlight Glow
            </OTOText>
          </View>
          <OTOText variant="body" weight="medium" customColor={color.text.primary}>
            Atmosphere Primary Wash
          </OTOText>
          <OTOText variant="caption" customColor={extractedPalette.dominant}>
            Dominant Tint: {extractedPalette.dominant}
          </OTOText>
        </View>

        <OTOButton
          label="Morph Environment (800ms)"
          variant="primary"
          onPress={handleApplyToEnvironment}
          style={styles.actionButton}
        />
      </OTOGlassSurface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: space[4],
    paddingBottom: space[8],
  },
  header: {
    marginBottom: space[1],
  },
  subhead: {
    marginBottom: space[4],
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: space[4],
  },
  pill: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    marginRight: space[2],
  },
  card: {
    padding: space[4],
    borderRadius: radius.lg,
    gap: space[3],
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: space[1],
  },
  badge: {
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: space[2],
  },
  swatchColumn: {
    alignItems: 'center',
    flex: 1,
  },
  swatchBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: space[1],
  },
  swatchLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  swatchHex: {
    fontSize: 10,
    fontWeight: '600',
  },
  previewBox: {
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: space[2],
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  previewPill: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  actionButton: {
    marginTop: space[2],
  },
});
