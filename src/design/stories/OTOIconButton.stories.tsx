import { View, StyleSheet } from 'react-native';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { OTOText } from '@/design/components/OTOText';
import { space, color } from '@/design/tokens';
import { ReducedMotionProvider } from '@/design/hooks/useReducedMotion';

function DummyPlayIcon() {
  return <OTOText variant="track" colorRole="primary">▶</OTOText>;
}

function DummyPauseIcon() {
  return <OTOText variant="track" colorRole="primary">⏸</OTOText>;
}

export function OTOIconButtonStories() {
  return (
    <View style={styles.container}>
      <OTOText variant="headline" colorRole="accentLight" style={styles.sectionHeader}>
        OTOIconButton States
      </OTOText>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          1. Default State (Touch Target: 44x44pt iOS / 48x48dp Android)
        </OTOText>
        <View style={styles.row}>
          <OTOIconButton
            icon={<DummyPlayIcon />}
            accessibilityLabel="Play track"
          />
          <OTOIconButton
            icon={<DummyPauseIcon />}
            accessibilityLabel="Pause track"
          />
        </View>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">2. Disabled State</OTOText>
        <View style={styles.row}>
          <OTOIconButton
            icon={<DummyPlayIcon />}
            accessibilityLabel="Play track (disabled)"
            disabled
          />
        </View>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">3. Loading State</OTOText>
        <View style={styles.row}>
          <OTOIconButton
            icon={<DummyPlayIcon />}
            accessibilityLabel="Buffering track"
            loading
          />
        </View>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">4. Reduced Motion (Direct Tap)</OTOText>
        <ReducedMotionProvider reducedMotion={true}>
          <View style={styles.row}>
            <OTOIconButton
              icon={<DummyPlayIcon />}
              accessibilityLabel="Play track (reduced motion)"
            />
          </View>
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
    gap: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
});
