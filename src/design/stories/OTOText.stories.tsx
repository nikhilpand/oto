import { View, StyleSheet } from 'react-native';
import { OTOText } from '@/design/components/OTOText';
import { space, color } from '@/design/tokens';

export function OTOTextStories() {
  return (
    <View style={styles.container}>
      <OTOText variant="headline" colorRole="accentLight" style={styles.sectionHeader}>
        OTOText States & Variants
      </OTOText>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">1. Default Variants</OTOText>
        <OTOText variant="display">Display [34/40]</OTOText>
        <OTOText variant="title">Title [28/34]</OTOText>
        <OTOText variant="headline">Headline [22/28]</OTOText>
        <OTOText variant="section">Section [20/26]</OTOText>
        <OTOText variant="track">Track Title [17/24]</OTOText>
        <OTOText variant="body">Body Copy [15/22]</OTOText>
        <OTOText variant="artist">Artist Subtitle [15/20]</OTOText>
        <OTOText variant="meta">Metadata [13/18]</OTOText>
        <OTOText variant="caption">Caption [11/14]</OTOText>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">2. Color Roles (WCAG AA)</OTOText>
        <OTOText variant="body" colorRole="primary">Primary Text (0.94)</OTOText>
        <OTOText variant="body" colorRole="secondary">Secondary Text (0.64)</OTOText>
        <OTOText variant="body" colorRole="tertiary">Tertiary Text (0.44)</OTOText>
        <OTOText variant="body" colorRole="disabled">Disabled State (0.32)</OTOText>
        <OTOText variant="body" colorRole="accent">Accent Signature</OTOText>
        <OTOText variant="body" colorRole="accentLight">Accent Clamped Light</OTOText>
        <OTOText variant="body" colorRole="error">Error Semantic</OTOText>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">3. Dynamic Type Clamping (maxFontSizeMultiplier=1.8)</OTOText>
        <OTOText variant="body" numberOfLines={2}>
          Long body description verifying that text wrapping and spacing remains intentional and clean under Dynamic Type.
        </OTOText>
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
});
