/**
 * HomeHeader — Editorial Greeting, Search Trigger & Profile Actions
 *
 * Implements the editorial header with time-aware greeting, profile avatar,
 * search pill trigger, and developer Storybook toggle.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { color, space, radius, touchTarget, spring, type } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOIconButton } from '@/design/components/OTOIconButton';
import { SearchIcon, LibraryIcon } from '@/design/components/OTOIcon';

export interface HomeHeaderProps {
  greeting: string;
  /** Optional time-aware subtitle. Defaults to a generic music message. */
  subtitle?: string;
  onSearchPress: () => void;
  onProfilePress?: () => void;
  onStorybookToggle?: () => void;
}

export function HomeHeader({
  greeting,
  subtitle = 'Soundtracks for your day',
  onSearchPress,
  onProfilePress,
  onStorybookToggle,
}: HomeHeaderProps): React.JSX.Element {
  const minTouch = Platform.select({
    ios: touchTarget.ios,
    default: touchTarget.android,
  });

  const pillScale = useSharedValue(1);
  const avatarScale = useSharedValue(1);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));
  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const handlePillPressIn = useCallback(() => {
    pillScale.value = withSpring(0.97, spring.spatial.fast);
  }, [pillScale]);
  const handlePillPressOut = useCallback(() => {
    pillScale.value = withSpring(1, spring.spatial.playful);
  }, [pillScale]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.greetingContainer}>
          <OTOText variant="headline" weight="bold">
            {greeting}
          </OTOText>
          <OTOText variant="caption" colorRole="secondary">
            {subtitle}
          </OTOText>
        </View>

        <View style={styles.actionsContainer}>
          {onStorybookToggle && (
            <OTOIconButton
              icon={<LibraryIcon size={20} color={color.text.secondary} />}
              accessibilityLabel="Open Storybook developer catalog"
              accessibilityHint="Switches to Storybook component view"
              onPress={onStorybookToggle}
              size={minTouch}
            />
          )}

          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="User profile settings"
            onPress={onProfilePress}
            onPressIn={() => { avatarScale.value = withSpring(0.9, spring.spatial.fast); }}
            onPressOut={() => { avatarScale.value = withSpring(1, spring.spatial.playful); }}
            style={[styles.avatarPressable, { minWidth: minTouch, minHeight: minTouch }]}
          >
            <Animated.View style={[styles.avatar, avatarStyle]}>
              <View style={styles.avatarInner}>
                <OTOText variant="caption" weight="bold" style={styles.avatarText}>
                  O
                </OTOText>
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Instant Search Entry Trigger Pill with spring press scale */}
      <Animated.View style={pillStyle}>
        <Pressable
          accessible
          accessibilityRole="search"
          accessibilityLabel="Search music catalog, artists, and songs"
          accessibilityHint="Opens search screen"
          onPress={onSearchPress}
          onPressIn={handlePillPressIn}
          onPressOut={handlePillPressOut}
          style={styles.searchPill}
        >
          <SearchIcon size={18} color={color.text.secondary} />
          <OTOText variant="body" colorRole="tertiary" style={styles.searchText}>
            What do you want to play?
          </OTOText>
          <View style={styles.searchShortcutBadge}>
            <OTOText variant="meta" colorRole="tertiary" style={styles.searchShortcutText}>
              Search
            </OTOText>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[3],
    paddingTop: space[2],
    paddingBottom: space[3],
    gap: space[3],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingContainer: {
    flex: 1,
    gap: space[0],
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    borderWidth: 1.5,
    borderColor: color.glass.highlight,
    borderTopColor: color.text.disabled,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.accent.signature,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.bg.s3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: color.accent.signature,
    fontSize: type.meta[0],
    fontWeight: '700',
  },
  searchPill: {
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: 1,
    borderColor: color.hairline,
    borderTopColor: color.glass.highlight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    gap: space[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  searchText: {
    flex: 1,
  },
  searchShortcutBadge: {
    backgroundColor: color.bg.s3,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  searchShortcutText: {
    fontSize: type.caption[0],
  },
  avatarPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
