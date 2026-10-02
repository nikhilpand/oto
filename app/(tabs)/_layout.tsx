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
import { StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, TAB_BAR_HEIGHT, type } from '@/design/tokens';
import { HomeIcon, SearchIcon, LibraryIcon, DownloadIcon } from '@/design/components/OTOIcon';
import { useScrollOffset } from '@/design/context/ScrollOffsetContext';

const HIDE_THRESHOLD = 12;
const REVEAL_THRESHOLD = 4;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const barHeight = TAB_BAR_HEIGHT + insets.bottom;

  const { scrollY } = useScrollOffset();
  const tabBarTranslation = useSharedValue(0);

  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      'worklet';
      const prev = previous ?? current;
      const delta = current - prev;

      if (delta > 0 && current > HIDE_THRESHOLD) {
        tabBarTranslation.value = withTiming(barHeight, { duration: 220 });
      } else if (delta < -REVEAL_THRESHOLD || current < HIDE_THRESHOLD) {
        tabBarTranslation.value = withTiming(0, { duration: 220 });
      }
    },
    [barHeight]
  );

  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslation.value }],
  }));

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
          <Animated.View style={[StyleSheet.absoluteFill, styles.glass, tabBarAnimStyle]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color: c, focused }) => (
            <Animated.View entering={FadeIn.duration(200)}>
              <HomeIcon size={22} color={c} focused={focused} />
            </Animated.View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarAccessibilityLabel: 'Search tab',
          tabBarIcon: ({ color: c, focused }) => (
            <Animated.View entering={FadeIn.duration(200)}>
              <SearchIcon size={22} color={c} focused={focused} />
            </Animated.View>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Library tab',
          tabBarIcon: ({ color: c, focused }) => (
            <Animated.View entering={FadeIn.duration(200)}>
              <LibraryIcon size={22} color={c} focused={focused} />
            </Animated.View>
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarAccessibilityLabel: 'Downloads tab',
          tabBarIcon: ({ color: c, focused }) => (
            <Animated.View entering={FadeIn.duration(200)}>
              <DownloadIcon size={22} color={focused ? c : c} />
            </Animated.View>
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
