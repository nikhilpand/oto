import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import {
  PhoneIcon,
  CheckmarkIcon,
  WaveformIcon,
  SpeakerVolumeIcon,
  ChevronRightIcon,
} from '@/design/components/OTOIcon';

export interface AudioOutputSheetProps {
  visible: boolean;
  onClose: () => void;
  deviceName?: string;
  volume?: number;
  audioSpec?: string;
  onVolumeChange?: (vol: number) => void;
  onNavigatePipeline?: () => void;
}

export function AudioOutputSheet({
  visible,
  onClose,
  deviceName = "F²F's Phone",
  volume = 0.75,
  audioSpec = '32-bit float · 48 kHz',
  onVolumeChange,
  onNavigatePipeline,
}: AudioOutputSheetProps): React.JSX.Element | null {
  const [currentVol, setCurrentVol] = useState(volume);

  if (!visible) return null;

  const handleSliderPress = (e: GestureResponderEvent) => {
    const { locationX } = e.nativeEvent;
    // Assuming slider width ~ 240
    const clamped = Math.max(0, Math.min(1, locationX / 240));
    setCurrentVol(clamped);
    onVolumeChange?.(clamped);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close output sheet">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {/* Active Device Card matching BitChord 8.48.09 PM (2) */}
          <View
            style={styles.card}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Active device: ${deviceName}, Playing here`}
          >
            <View style={styles.cardIconBadge}>
              <PhoneIcon size={22} color={color.text.primary} />
            </View>
            <View style={styles.cardInfo}>
              <OTOText variant="body" weight="semibold" numberOfLines={1}>
                {deviceName}
              </OTOText>
              <OTOText variant="meta" customColor={color.semantic.success}>
                Playing here
              </OTOText>
            </View>
            <CheckmarkIcon size={20} color={color.semantic.success} />
          </View>

          {/* Volume Control Card */}
          <View style={styles.card}>
            <SpeakerVolumeIcon size={22} color={color.text.secondary} />
            <Pressable
              style={styles.volumeTrack}
              onPress={handleSliderPress}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Output volume slider"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(currentVol * 100) }}
            >
              <View style={[styles.volumeFill, { width: `${Math.round(currentVol * 100)}%` }]} />
            </Pressable>
            <OTOText variant="caption" weight="medium" customColor={color.text.secondary}>
              {Math.round(currentVol * 100)}%
            </OTOText>
          </View>

          {/* Audio Pipeline Card */}
          <Pressable
            style={styles.card}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Audio Pipeline settings"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
              onNavigatePipeline?.();
            }}
          >
            <View style={styles.cardIconBadge}>
              <WaveformIcon size={22} color={color.text.primary} />
            </View>
            <View style={styles.cardInfo}>
              <OTOText variant="body" weight="semibold">
                Audio Pipeline
              </OTOText>
              <OTOText variant="meta" customColor={color.text.tertiary}>
                {audioSpec}
              </OTOText>
            </View>
            <ChevronRightIcon size={20} color={color.text.tertiary} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.glass.solidFallback,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[4],
    paddingBottom: space[8],
    paddingTop: space[3],
    gap: space[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: space[2],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: space[3],
    minHeight: 56,
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  volumeTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: color.text.primary,
    borderRadius: radius.full,
  },
});
