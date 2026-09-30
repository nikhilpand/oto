import { View, Text, StyleSheet } from 'react-native';
import { color, space, type as typeScale } from '@/design/tokens';

/**
 * Search tab — placeholder screen for P0.
 * Full search implementation arrives in P5.
 */
export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <Text style={styles.subtitle}>Coming in P5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space[5],
  },
  title: {
    color: color.text.primary,
    fontSize: typeScale.headline[0],
    lineHeight: typeScale.headline[1],
    fontWeight: '600',
  },
  subtitle: {
    color: color.text.tertiary,
    fontSize: typeScale.meta[0],
    lineHeight: typeScale.meta[1],
    marginTop: space[2],
  },
});
