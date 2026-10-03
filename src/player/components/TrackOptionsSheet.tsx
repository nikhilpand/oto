/**
 * TrackOptionsSheet — BitChord-aligned Glass Bottom Sheet for Track Actions.
 * Direct match to WhatsApp Image 2026-10-02 at 8.48.10 PM (1).jpeg.
 */

import React from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius, touchTarget } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import {
  UndoIcon,
  HeartIcon,
  ThumbsDownIcon,
  PlaylistPlusIcon,
  DownloadIcon,
  RadioIcon,
} from '@/design/components/OTOIcon';
import type { Track } from '@/domain/types';

export interface TrackOptionsSheetProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
  isLiked?: boolean;
  onToggleLike?: (track: Track) => void;
  onDislike?: (track: Track) => void;
  onRevertOriginal?: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
  onDownload?: (track: Track) => void;
  onStartRadio?: (track: Track) => void;
}

export function TrackOptionsSheet({
  visible,
  track,
  onClose,
  isLiked = false,
  onToggleLike,
  onDislike,
  onRevertOriginal,
  onAddToPlaylist,
  onDownload,
  onStartRadio,
}: TrackOptionsSheetProps): React.JSX.Element | null {
  if (!visible || !track) return null;

  const minTouch = Platform.select({ ios: touchTarget.ios, default: touchTarget.android }) || 48;
  const handleAction = (cb?: (t: Track) => void) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cb?.(track);
    onClose();
  };

  const options = [
    { id: 'revert', label: 'Revert to original', icon: <UndoIcon size={22} color={color.text.primary} />, onPress: () => handleAction(onRevertOriginal), accessibilityLabel: 'Revert track to original version' },
    { id: 'like', label: isLiked ? 'Liked' : 'Like', icon: <HeartIcon size={22} filled={isLiked} color={isLiked ? color.accent.signature : color.text.primary} />, onPress: () => handleAction(onToggleLike), accessibilityLabel: isLiked ? 'Unlike track' : 'Like track' },
    { id: 'dislike', label: 'Dislike', icon: <ThumbsDownIcon size={22} color={color.text.primary} />, onPress: () => handleAction(onDislike), accessibilityLabel: 'Dislike track' },
    { id: 'playlist', label: 'Add to playlist', icon: <PlaylistPlusIcon size={22} color={color.text.primary} />, onPress: () => handleAction(onAddToPlaylist), accessibilityLabel: 'Add track to playlist' },
    { id: 'download', label: 'Download', icon: <DownloadIcon size={22} color={color.text.primary} />, onPress: () => handleAction(onDownload), accessibilityLabel: 'Download track' },
    { id: 'radio', label: 'Start radio', icon: <RadioIcon size={22} color={color.text.primary} />, onPress: () => handleAction(onStartRadio), accessibilityLabel: 'Start radio' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close options">
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <OTOArtwork uri={track.artworkUrl} thumbhash={track.thumbhash} size={48} borderRadius={radius.xs} alt={track.title} />
            <View style={styles.headerText}>
              <OTOText variant="body" weight="bold" colorRole="primary" numberOfLines={1}>{track.title}</OTOText>
              <OTOText variant="caption" colorRole="secondary" numberOfLines={1}>{track.artist}</OTOText>
            </View>
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.actionList}>
            {options.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={opt.onPress}
                accessible
                accessibilityRole="button"
                accessibilityLabel={opt.accessibilityLabel}
                style={({ pressed }) => [styles.optionRow, { minHeight: minTouch }, pressed && styles.optionPressed]}
              >
                <View style={styles.iconContainer}>{opt.icon}</View>
                <OTOText variant="body" colorRole="primary" weight="medium">{opt.label}</OTOText>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'flex-end' },
  sheetContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space[2],
    paddingBottom: space[6],
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: space[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: space[2],
  },
  headerText: { marginLeft: space[3], flex: 1, gap: space[1] },
  actionList: { paddingVertical: space[1] },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.sm },
  optionPressed: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  iconContainer: { width: 36, alignItems: 'center', justifyContent: 'center', marginRight: space[3] },
});
