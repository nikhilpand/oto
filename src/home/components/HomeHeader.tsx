/**
 * HomeHeader — Editorial Greeting, Search Trigger & Profile Actions
 *
 * Implements the editorial header with time-aware greeting, profile avatar,
 * search pill trigger, and developer Storybook toggle.
 */

import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOIconButton } from '@/design/components/OTOIconButton';

export interface HomeHeaderProps {
  greeting: string;
  onSearchPress: () => void;
  onProfilePress?: () => void;
  onStorybookToggle?: () => void;
}

function SearchIcon({ color: iconColor = color.text.secondary }: { color?: string }) {
  return (
    <View style={styles.searchIconWrapper}>
      <View
        style={[
          styles.searchIconCircle,
          { borderColor: iconColor },
        ]}
      />
      <View
        style={[
          styles.searchIconHandle,
          { backgroundColor: iconColor },
        ]}
      />
    </View>
  );
}

function BookIcon({ color: iconColor = color.text.tertiary }: { color?: string }) {
  return (
    <View style={styles.bookIconWrapper}>
      <View style={[styles.bookSpine, { backgroundColor: iconColor }]} />
      <View style={[styles.bookCover, { borderColor: iconColor }]} />
    </View>
  );
}

export function HomeHeader({
  greeting,
  onSearchPress,
  onProfilePress,
  onStorybookToggle,
}: HomeHeaderProps): React.JSX.Element {
  const minTouch = Platform.select({
    ios: touchTarget.ios,
    default: touchTarget.android,
  });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.greetingContainer}>
          <OTOText variant="headline" weight="bold">
            {greeting}
          </OTOText>
          <OTOText variant="caption" colorRole="secondary">
            Soundtracks for your evening
          </OTOText>
        </View>

        <View style={styles.actionsContainer}>
          {onStorybookToggle && (
            <OTOIconButton
              icon={<BookIcon />}
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
            style={[styles.avatarButton, { minWidth: minTouch, minHeight: minTouch }]}
          >
            <View style={styles.avatar}>
              <OTOText variant="caption" weight="bold" colorRole="primary">
                O
              </OTOText>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Instant Search Entry Trigger Pill */}
      <Pressable
        accessible
        accessibilityRole="search"
        accessibilityLabel="Search music catalog, artists, and songs"
        accessibilityHint="Opens search screen"
        onPress={onSearchPress}
        style={styles.searchPill}
      >
        <SearchIcon color={color.text.secondary} />
        <OTOText variant="body" colorRole="tertiary" style={styles.searchText}>
          What do you want to play?
        </OTOText>
      </Pressable>
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
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    borderWidth: 1.5,
    borderColor: color.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: 1,
    borderColor: color.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    gap: space[2],
  },
  searchText: {
    flex: 1,
  },
  searchIconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconCircle: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1.8,
    position: 'absolute',
    top: 1,
    left: 1,
  },
  searchIconHandle: {
    width: 6,
    height: 1.8,
    position: 'absolute',
    bottom: 2,
    right: 1,
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
  bookIconWrapper: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookSpine: {
    width: 2,
    height: 14,
    borderRadius: 1,
    position: 'absolute',
    left: 2,
  },
  bookCover: {
    width: 12,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    position: 'absolute',
    left: 4,
  },
});
