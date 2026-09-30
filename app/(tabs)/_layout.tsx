import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { color, space } from '@/design/tokens';

/**
 * Tab layout — Home, Search, Library.
 *
 * Uses Expo Router's native tabs engine (no @react-navigation imports).
 * Tab bar is styled to match OTO's dark-first design with glass-ready
 * structure (solid fallback for now, glass surface applied in P2).
 *
 * Icons are placeholder text for P0 — replaced with proper SF Symbols /
 * Material Icons in P1.
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
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search tab',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Library tab',
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
