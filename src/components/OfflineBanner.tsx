/**
 * OfflineBanner — Real network-aware offline notification banner
 *
 * Displayed at the top of content when device is offline.
 * Fades in/out using Reanimated on the UI thread — no bridge updates per frame.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useNetworkState } from '../downloads/useNetworkState';
import { color, duration, space, radius, type } from '@/design/tokens';

export function OfflineBanner(): React.ReactElement | null {
  const { isOnline, isChecking } = useNetworkState();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isChecking) {
      opacity.value = withTiming(isOnline ? 0 : 1, { duration: duration.standard });
    }
  }, [isOnline, isChecking, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * -8 }],
  }));

  // Render even when online so the animation can fade out gracefully
  return (
    <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
      <View style={styles.pill}>
        <Text style={styles.text}>Offline — Showing downloads only</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingTop: space[3],
    paddingHorizontal: space[4],
  },
  pill: {
    backgroundColor: color.bg.s3,
    borderRadius: radius.full,
    paddingVertical: space[2],
    paddingHorizontal: space[5],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  text: {
    color: color.text.secondary,
    fontSize: type.meta[0],
    lineHeight: type.meta[1],
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
