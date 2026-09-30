import { View, StyleSheet } from 'react-native';
import { OTOButton } from '@/design/components/OTOButton';
import { OTOText } from '@/design/components/OTOText';
import { space, color } from '@/design/tokens';
import { ReducedMotionProvider } from '@/design/hooks/useReducedMotion';

export function OTOButtonStories() {
  return (
    <View style={styles.container}>
      <OTOText variant="headline" colorRole="accentLight" style={styles.sectionHeader}>
        OTOButton States
      </OTOText>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">1. Default Variants</OTOText>
        <OTOButton label="Primary Button" variant="primary" />
        <OTOButton label="Secondary Button" variant="secondary" />
        <OTOButton label="Ghost Button" variant="ghost" />
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">2. Sizes</OTOText>
        <OTOButton label="Large Button" size="lg" variant="primary" />
        <OTOButton label="Medium Button" size="md" variant="primary" />
        <OTOButton label="Small Button" size="sm" variant="secondary" />
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">3. Disabled State</OTOText>
        <OTOButton label="Disabled Primary" variant="primary" disabled />
        <OTOButton label="Disabled Secondary" variant="secondary" disabled />
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">4. Loading State</OTOText>
        <OTOButton label="Loading..." variant="primary" loading />
        <OTOButton label="Loading..." variant="secondary" loading />
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">5. Reduced Motion (No Spring Bounce)</OTOText>
        <ReducedMotionProvider reducedMotion={true}>
          <OTOButton label="Reduced Motion Button" variant="primary" />
        </ReducedMotionProvider>
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
    gap: space[3],
  },
});
