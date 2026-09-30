import { View, StyleSheet } from 'react-native';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { OTOText } from '@/design/components/OTOText';
import { space, color, radius } from '@/design/tokens';

export function OTOArtworkStories() {
  const sampleArtwork = 'https://picsum.photos/300/300';
  const sampleThumbhash = '1QcSHQRnh493V4dIh4eXh1h4kJYp';

  return (
    <View style={styles.container}>
      <OTOText variant="headline" colorRole="accentLight" style={styles.sectionHeader}>
        OTOArtwork States
      </OTOText>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          1. Default Loaded Artwork (with Thumbhash)
        </OTOText>
        <View style={styles.row}>
          <OTOArtwork
            uri={sampleArtwork}
            thumbhash={sampleThumbhash}
            size={80}
            borderRadius={radius.md}
          />
          <OTOArtwork
            uri={sampleArtwork}
            thumbhash={sampleThumbhash}
            size={56}
            borderRadius={radius.sm}
          />
        </View>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          2. Rounded Radii (Circular / Full Radius)
        </OTOText>
        <View style={styles.row}>
          <OTOArtwork
            uri={sampleArtwork}
            size={64}
            borderRadius={radius.full}
            alt="Artist Avatar"
          />
        </View>
      </View>

      <View style={styles.group}>
        <OTOText variant="caption" colorRole="tertiary">
          3. Missing / Error State (Fallback Glyph & Border)
        </OTOText>
        <View style={styles.row}>
          <OTOArtwork
            uri={null}
            size={64}
            borderRadius={radius.md}
            alt="Missing track artwork"
          />
          <OTOArtwork
            uri="https://invalid-domain-for-error-testing.xyz/404.jpg"
            size={64}
            borderRadius={radius.md}
            alt="Error track artwork"
          />
        </View>
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
