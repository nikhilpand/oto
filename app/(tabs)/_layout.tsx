import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { color, space } from '@/design/tokens';
import { HomeIcon, SearchIcon, LibraryIcon } from '@/design/components/OTOIcon';

/**
 * Tab layout — Home, Search, Library.
 *
 * Uses Expo Router's native tabs engine with dark-first styling,
 * solid glass-ready fallback, and pure-vector geometric icons.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: color.accent.signature,
        tabBarInactiveTintColor: color.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon size={22} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search tab',
          tabBarIcon: ({ color, focused }) => (
            <SearchIcon size={22} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Library tab',
          tabBarIcon: ({ color, focused }) => (
            <LibraryIcon size={22} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: color.glass.solidFallback,
    borderTopColor: color.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: space[2],
    paddingTop: space[2],
    height: 56,
    // Glass surface will be applied in P2; this is the intentional
    // Android-first solid fallback per DESIGN.md §4.
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
