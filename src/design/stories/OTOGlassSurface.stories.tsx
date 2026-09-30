import { View, StyleSheet } from 'react-native';
import { OTOGlassSurface } from '@/design/components/OTOGlassSurface';
import { OTOText } from '@/design/components/OTOText';
import { space, color, radius, QualityTier } from '@/design/tokens';
import { QualityTierProvider } from '@/design/hooks/useQualityTier';

export function OTOGlassSurfaceStories() {
  return (
    <View style={styles.container}>
      <OTOText variant="headline" colorRole="accentLight" style={styles.sectionHeader}>
        OTOGlassSurface States
      </OTOText>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          1. Default Active Surface (Liquid Glass on iOS 26+, Solid on Android)
        </OTOText>
        <OTOGlassSurface style={styles.surface}>
          <OTOText variant="body" colorRole="primary">
            Active Glass Surface
          </OTOText>
          <OTOText variant="caption" colorRole="secondary">
            Notice hairline border and 1px top highlight
          </OTOText>
        </OTOGlassSurface>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          2. Forced Solid Fallback (Intentional Android & Low Tier Recipe)
        </OTOText>
        <OTOGlassSurface forceSolidFallback style={styles.surface}>
          <OTOText variant="body" colorRole="primary">
            Verified Android Solid Fallback
          </OTOText>
          <OTOText variant="caption" colorRole="secondary">
            Opaque dark tint (color.glass.solidFallback)
          </OTOText>
        </OTOGlassSurface>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          3. Tier 0 (Minimal Quality — Forced Solid Tint)
        </OTOText>
        <QualityTierProvider initialTier={QualityTier.Minimal}>
          <OTOGlassSurface style={styles.surface}>
            <OTOText variant="body" colorRole="primary">
              Tier 0 Surface (Flat & Crisp)
            </OTOText>
            <OTOText variant="caption" colorRole="tertiary">
              Zero blur shader overhead
            </OTOText>
          </OTOGlassSurface>
        </QualityTierProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space[4],
    backgroundColor: color.bg.base,
  },
  sectionHeader: {
    marginBottom: space[3],
  },
  group: {
    marginBottom: space[5],
    gap: space[2],
  },
  surface: {
    padding: space[4],
    borderRadius: radius.lg,
  },
});
