import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { color, radius, type, fontFamily } from '@/design/tokens';

interface SettingSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  accessibilityLabel: string;
}

export function SettingSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: SettingSwitchProps): React.ReactElement {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={[styles.switchTrack, value ? styles.switchTrackOn : styles.switchTrackOff]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.switchThumb, value ? styles.switchThumbOn : styles.switchThumbOff]} />
    </TouchableOpacity>
  );
}

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  selectedValue: T;
  onSelect: (val: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onSelect,
}: SegmentedControlProps<T>): React.ReactElement {
  return (
    <View style={styles.segmentContainer}>
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[styles.segmentTab, isSelected && styles.segmentTabActive]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#ffffff',
  },
  switchTrackOff: {
    backgroundColor: '#2c2c2e',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  switchThumbOn: {
    backgroundColor: '#000000',
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    backgroundColor: '#636366',
    alignSelf: 'flex-start',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: radius.md,
    padding: 3,
    width: '100%',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.medium,
    color: color.text.tertiary,
  },
  segmentTextActive: {
    color: '#000000',
    fontFamily: fontFamily.bold,
  },
});
