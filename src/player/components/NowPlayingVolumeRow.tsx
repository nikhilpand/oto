import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color, space, radius } from '@/design/tokens';
import { DeviceIcon } from '@/design/components';

export function NowPlayingVolumeRow(): React.JSX.Element {
  return (
    <View style={styles.volumeRow}>
      <DeviceIcon size={16} color={color.text.tertiary} />
      <View style={styles.volumeTrack}>
        <View style={styles.volumeFill} />
      </View>
      <DeviceIcon size={20} color={color.text.tertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[1],
    marginTop: space[3],
    marginBottom: space[1],
  },
  volumeTrack: {
    flex: 1,
    height: 4,
    backgroundColor: color.glass.tint,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  volumeFill: {
    width: '70%',
    height: '100%',
    backgroundColor: color.text.secondary,
    borderRadius: radius.full,
  },
});
