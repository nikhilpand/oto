import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { HomeScreenContent } from '@/home/screens/HomeScreenContent';
import { OTOText } from '@/design/components/OTOText';
import { color, space, radius } from '@/design/tokens';

type StoryMode = 'live' | 'skeleton' | 'offline';

export function HomeStories(): React.JSX.Element {
  const [mode, setMode] = useState<StoryMode>('live');

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <OTOText variant="caption" colorRole="secondary">
          Home State:
        </OTOText>
        {(['live', 'skeleton', 'offline'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.chip, mode === m && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${m} view`}
          >
            <OTOText
              variant="caption"
              weight={mode === m ? 'semibold' : 'regular'}
              customColor={mode === m ? color.bg.base : color.text.secondary}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </OTOText>
          </Pressable>
        ))}
      </View>

      <View style={styles.screenHost}>
        <HomeScreenContent
          isLoading={mode === 'skeleton'}
          isOffline={mode === 'offline'}
          onStorybookToggle={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    backgroundColor: color.bg.s1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  chipActive: {
    backgroundColor: color.accent.signature,
    borderColor: color.accent.signature,
  },
  screenHost: {
    flex: 1,
    minHeight: 700,
  },
});
