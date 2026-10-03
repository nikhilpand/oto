/**
 * Tab layout — Home, Explore, Library, Search.
 *
 * Floating capsule navigation bar matching BitChord.
 */
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { OTOFloatingTabBar } from '@/design/components/OTOFloatingTabBar';
import { HomeIcon, ExploreIcon, LibraryIcon, SearchIcon } from '@/design/components/OTOIcon';
import { color } from '@/design/tokens';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <OTOFloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: color.text.primary,
        tabBarInactiveTintColor: color.text.tertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ focused }) => (
            <HomeIcon size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarAccessibilityLabel: 'Explore tab',
          tabBarIcon: ({ focused }) => (
            <ExploreIcon size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Library tab',
          tabBarIcon: ({ focused }) => (
            <LibraryIcon size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search tab',
          tabBarIcon: ({ focused }) => (
            <SearchIcon size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          href: null, // Hidden from floating bar, managed inside Library
          title: 'Downloads',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
});

