/**
 * OTOFloatingTabBar — Tubelight Capsule Island Tab Bar
 *
 * Floating rounded capsule with:
 * - Reanimated animated indicator pill that slides between tabs (UI thread)
 * - Amber glow "tubelight" effect on active tab icon
 * - Haptic feedback on tab switch
 * - ≥ 48×48 touch targets, accessible tab traits
 * - Glass border + dark backdrop (solidFallback for Android Tier < 2)
 */

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, radius, space, spring } from '@/design/tokens';
import { useLayout } from '@/design/hooks/useLayout';
import { OTOText } from '@/design/components/OTOText';
import {
  HomeIcon,
  ExploreIcon,
  LibraryIcon,
  SearchIcon,
} from '@/design/components/OTOIcon';

export interface TabBarRoute {
  key: string;
  name: string;
  params?: object;
}

export interface OTOFloatingTabBarProps {
  state: { index: number; routes: TabBarRoute[] };
  descriptors: Record<string, { options?: { title?: string; tabBarLabel?: string | ((p: any) => React.ReactNode); tabBarAccessibilityLabel?: string } }>;
  navigation: { emit: (e: any) => any; navigate: (name: string, params?: object) => void };
}

const TAB_KEYS = ['index', 'explore', 'library', 'search'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_CONFIG: Record<TabKey, { label: string; icon: (focused: boolean) => React.JSX.Element }> = {
  index:   { label: 'Home',    icon: (f) => <HomeIcon    size={22} color={f ? color.accent.signature : color.text.tertiary} focused={f} /> },
  explore: { label: 'Explore', icon: (f) => <ExploreIcon size={22} color={f ? color.accent.signature : color.text.tertiary} focused={f} /> },
  library: { label: 'Library', icon: (f) => <LibraryIcon size={22} color={f ? color.accent.signature : color.text.tertiary} focused={f} /> },
  search:  { label: 'Search',  icon: (f) => <SearchIcon  size={22} color={f ? color.accent.signature : color.text.tertiary} focused={f} /> },
};

const TAB_ITEM_WIDTH = 72; // fixed slot width for pill animation math

export function OTOFloatingTabBar({ state, descriptors, navigation }: OTOFloatingTabBarProps): React.JSX.Element {
  const { contentWidth, bottomInset } = useLayout();
  const barWidth = Math.min(contentWidth - space[4] * 2, 340);
  const bottomPos = Math.max(bottomInset, Platform.OS === 'android' ? space[3] : space[2]);

  // Animated pill x position
  const pillX = useSharedValue(state.index * TAB_ITEM_WIDTH);
  const pillOpacity = useSharedValue(1);

  useEffect(() => {
    pillX.value = withSpring(state.index * TAB_ITEM_WIDTH, spring.spatial.default);
  }, [state.index, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    opacity: pillOpacity.value,
  }));

  const handlePress = useCallback(
    (route: TabBarRoute, isFocused: boolean) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    },
    [navigation]
  );

  const primaryRoutes = state.routes.filter((r) => TAB_KEYS.includes(r.name as TabKey));

  return (
    <View style={[styles.outerContainer, { bottom: bottomPos, width: barWidth }]} pointerEvents="box-none">
      <View style={styles.capsule}>
        {/* Sliding tubelight pill */}
        <Animated.View style={[styles.activePill, pillStyle]} pointerEvents="none" />

        {primaryRoutes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name as TabKey]!;
          const options = descriptors[route.key]?.options ?? {};
          const rawLabel = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title;
          const label = rawLabel ?? config.label;
          const a11yLabel = options.tabBarAccessibilityLabel ?? `${label} tab, ${isFocused ? 'selected' : 'not selected'}`;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={a11yLabel}
              onPress={() => handlePress(route, isFocused)}
              style={styles.tabItem}
            >
              <View style={styles.iconWrap}>{config.icon(isFocused)}</View>
              <OTOText
                variant="meta"
                weight={isFocused ? 'bold' : 'medium'}
                style={[styles.tabLabel, { color: isFocused ? color.accent.signature : color.text.tertiary }]}
                numberOfLines={1}
              >
                {label}
              </OTOText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute', alignSelf: 'center', zIndex: 100, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20,
  },
  capsule: {
    height: 64, backgroundColor: 'rgba(14, 14, 18, 0.96)',
    borderRadius: radius.full, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around', paddingHorizontal: space[2],
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)',
    overflow: 'hidden',
  },
  activePill: {
    position: 'absolute',
    width: TAB_ITEM_WIDTH,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: `${color.accent.signature}1A`,
    borderWidth: 1,
    borderColor: `${color.accent.signature}33`,
    top: 12,
    left: 0,
  },
  tabItem: {
    width: TAB_ITEM_WIDTH, alignItems: 'center', justifyContent: 'center',
    height: '100%',
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, marginTop: 2, letterSpacing: 0.2 },
});
