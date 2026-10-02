/**
 * Tab layout — Home, Search, Library, Downloads.
 *
 * Glass surface tab bar with hide-on-scroll.
 * - Reanimated SharedValue from ScrollOffsetContext (UI thread, zero JS bridge).
 * - On downward scroll: tab bar slides below screen edge.
 * - On upward scroll or near top: slides back in.
 * - Wraps Tabs in an Animated.View so the ENTIRE bar (including native tab content) moves.
 */
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, TAB_BAR_HEIGHT, type } from '@/design/tokens';
import { HomeIcon, SearchIcon, LibraryIcon, DownloadIcon } from '@/design/components/OTOIcon';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: barHeight, paddingBottom: insets.bottom },
        ],
        tabBarActiveTintColor: color.accent.signature,
        tabBarInactiveTintColor: color.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.glass]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color: c, focused }) => (
            <HomeIcon size={22} color={c} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search tab',
          tabBarIcon: ({ color: c, focused }) => (
            <SearchIcon size={22} color={c} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Library tab',
          tabBarIcon: ({ color: c, focused }) => (
            <LibraryIcon size={22} color={c} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarAccessibilityLabel: 'Downloads tab',
          tabBarIcon: ({ color: c, focused }) => (
            <DownloadIcon size={22} color={c} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  glass: {
    backgroundColor: color.glass.solidFallback,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.glass.highlight,
  },
  tabLabel: {
    fontSize: type.caption[0],
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
