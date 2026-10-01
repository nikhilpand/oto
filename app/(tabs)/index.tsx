import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreenContent } from '@/home/screens/HomeScreenContent';
import { StorybookViewer } from '@/design/stories/StorybookViewer';
import { OTOText } from '@/design/components/OTOText';
import { color, space } from '@/design/tokens';

/**
 * Main Home Tab View
 *
 * Defaults to the editorial Home Screen Content (P8) with varied densities:
 * Hero, Continue Listening, Made For You, Quick Picks, New Releases, Moods & Genres.
 *
 * Includes an immediate toggle to StorybookViewer for component and primitive inspection.
 */
export default function HomeScreen(): React.JSX.Element {
  const [showStorybook, setShowStorybook] = useState(false);

  if (showStorybook) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.returnBar}>
          <Pressable
            onPress={() => setShowStorybook(false)}
            style={styles.returnButton}
            accessibilityRole="button"
            accessibilityLabel="Return to Live Home Feed"
          >
            <OTOText
              variant="caption"
              weight="semibold"
              customColor={color.accent.signature}
            >
              Back to Live Home Feed
            </OTOText>
          </Pressable>
        </SafeAreaView>
        <StorybookViewer />
      </View>
    );
  }

  return (
    <HomeScreenContent
      onStorybookToggle={() => setShowStorybook(true)}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  returnBar: {
    backgroundColor: color.bg.s1,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  returnButton: {
    paddingVertical: space[1],
  },
});
