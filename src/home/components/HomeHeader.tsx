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
import { SearchIcon, LibraryIcon } from '@/design/components/OTOIcon';

export interface HomeHeaderProps {
  greeting: string;
  onSearchPress: () => void;
  onProfilePress?: () => void;
  onStorybookToggle?: () => void;
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
            style={({ pressed }) => [
              styles.avatarButton,
              { minWidth: minTouch, minHeight: minTouch },
              pressed && styles.avatarPressed,
            ]}
          >
            <View style={styles.avatar}>
              <View style={styles.avatarInner}>
                <OTOText variant="caption" weight="bold" style={styles.avatarText}>
                  O
                </OTOText>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Instant Search Entry Trigger Pill with Glass Specular Rim */}
      <Pressable
        accessible
        accessibilityRole="search"
        accessibilityLabel="Search music catalog, artists, and songs"
        accessibilityHint="Opens search screen"
        onPress={onSearchPress}
        style={({ pressed }) => [
          styles.searchPill,
          pressed && styles.searchPillPressed,
        ]}
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
  avatarPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: color.bg.s3,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.32)',
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
    backgroundColor: 'rgba(229, 169, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: color.accent.signature,
    fontSize: 13,
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
  searchPillPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
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
    fontSize: 11,
  },
});
