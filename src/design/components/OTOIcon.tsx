/**
 * OTOIcon — Professional Vector Icon Suite.
 *
 * Backed by @expo/vector-icons (Ionicons & MaterialCommunityIcons) for
 * pixel-crisp, production-grade vector rendering across iOS and Android.
 *
 * - 100% token-driven colors and geometry
 * - Pixel-crisp anti-aliased rendering
 * - Accessible with default roles and labels
 * - Standardized touch bounding boxes
 */

import { View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { color as tokensColor } from '@/design/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: ColorValue;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
}

// ─── 1. Home Icon ────────────────────────────────────────────────────────────
export function HomeIcon({
  size = 24,
  color = tokensColor.text.primary,
  focused,
  style,
}: IconProps) {
  const iconColor = focused ? tokensColor.accent.signature : (color as string);
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Home"
    >
      <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={iconColor} />
    </View>
  );
}

// ─── 2. Search Icon ──────────────────────────────────────────────────────────
export function SearchIcon({
  size = 24,
  color = tokensColor.text.primary,
  focused,
  style,
}: IconProps) {
  const iconColor = focused ? tokensColor.accent.signature : (color as string);
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Search"
    >
      <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={iconColor} />
    </View>
  );
}

// ─── 3. Library Icon ─────────────────────────────────────────────────────────
export function LibraryIcon({
  size = 24,
  color = tokensColor.text.primary,
  focused,
  style,
}: IconProps) {
  const iconColor = focused ? tokensColor.accent.signature : (color as string);
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Library"
    >
      <Ionicons name={focused ? 'library' : 'library-outline'} size={size} color={iconColor} />
    </View>
  );
}

// ─── 4. Play Icon ────────────────────────────────────────────────────────────
export function PlayIcon({
  size = 24,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Play"
    >
      <Ionicons name="play" size={size} color={color as string} style={{ marginLeft: size * 0.06 }} />
    </View>
  );
}

// ─── 5. Pause Icon ───────────────────────────────────────────────────────────
export function PauseIcon({
  size = 24,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Pause"
    >
      <Ionicons name="pause" size={size} color={color as string} />
    </View>
  );
}

// ─── 6. Skip Forward Icon ────────────────────────────────────────────────────
export function SkipForwardIcon({
  size = 24,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Skip Forward"
    >
      <Ionicons name="play-skip-forward" size={size} color={color as string} />
    </View>
  );
}

// ─── 7. Skip Back Icon ───────────────────────────────────────────────────────
export function SkipBackIcon({
  size = 24,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Skip Back"
    >
      <Ionicons name="play-skip-back" size={size} color={color as string} />
    </View>
  );
}

// ─── 8. Shuffle Icon ─────────────────────────────────────────────────────────
export function ShuffleIcon({
  size = 24,
  color = tokensColor.text.primary,
  active = false,
  style,
}: IconProps & { active?: boolean }) {
  const iconColor = active ? tokensColor.accent.signature : (color as string);
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel={active ? 'Shuffle enabled' : 'Shuffle disabled'}
    >
      <Ionicons name="shuffle" size={size} color={iconColor} />
    </View>
  );
}

// ─── 9. Repeat Icon ──────────────────────────────────────────────────────────
export function RepeatIcon({
  size = 24,
  color = tokensColor.text.primary,
  mode = 'off',
  style,
}: IconProps & { mode?: 'off' | 'all' | 'one' }) {
  const isActive = mode !== 'off';
  const iconColor = isActive ? tokensColor.accent.signature : (color as string);
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Repeat mode: ${mode}`}
    >
      {mode === 'one' ? (
        <MaterialCommunityIcons name="repeat-once" size={size} color={iconColor} />
      ) : (
        <Ionicons name="repeat" size={size} color={iconColor} />
      )}
    </View>
  );
}

// ─── 10. Heart / Favorite Icon ───────────────────────────────────────────────
export function HeartIcon({
  size = 24,
  filled = false,
  color = tokensColor.accent.signature,
  style,
}: IconProps & { filled?: boolean }) {
  const iconColor = filled ? (color as string) : tokensColor.text.secondary;
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel={filled ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Ionicons
        name={filled ? 'heart' : 'heart-outline'}
        size={size}
        color={iconColor}
      />
    </View>
  );
}

// ─── 11. More Horizontal (Overflow) Icon ─────────────────────────────────────
export function MoreHorizontalIcon({
  size = 24,
  color = tokensColor.text.secondary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="More options"
    >
      <Ionicons name="ellipsis-horizontal" size={size} color={color as string} />
    </View>
  );
}

// ─── 12. Chevron Down Icon ───────────────────────────────────────────────────
export function ChevronDownIcon({
  size = 24,
  color = tokensColor.text.secondary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Collapse"
    >
      <Ionicons name="chevron-down" size={size} color={color as string} />
    </View>
  );
}

// ─── 13. Close / Dismiss Icon ────────────────────────────────────────────────
export function CloseIcon({
  size = 20,
  color = tokensColor.text.secondary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Close"
    >
      <Ionicons name="close" size={size} color={color as string} />
    </View>
  );
}

// ─── 14. List View Icon ──────────────────────────────────────────────────────
export function ListIcon({
  size = 20,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="List view"
    >
      <Ionicons name="list" size={size} color={color as string} />
    </View>
  );
}

// ─── 15. Grid View Icon ──────────────────────────────────────────────────────
export function GridIcon({
  size = 20,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Grid view"
    >
      <Ionicons name="grid-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 16. Download Status Icon ────────────────────────────────────────────────
export function DownloadIcon({
  size = 16,
  color = tokensColor.semantic.success,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Downloaded"
    >
      <Ionicons name="arrow-down-circle" size={size} color={color as string} />
    </View>
  );
}

// ─── 17. Clock / Pending Icon ────────────────────────────────────────────────
export function ClockIcon({
  size = 16,
  color = tokensColor.text.tertiary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Pending"
    >
      <Ionicons name="time-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 18. Alert / Error Icon ──────────────────────────────────────────────────
export function AlertIcon({
  size = 16,
  color = tokensColor.semantic.error,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Alert"
    >
      <Ionicons name="alert-circle-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 19. Trash / Remove Icon ─────────────────────────────────────────────────
export function TrashIcon({
  size = 20,
  color = tokensColor.text.tertiary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Delete"
    >
      <Ionicons name="trash-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 20. Drag Handle (Reorder) Icon ──────────────────────────────────────────
export function DragHandleIcon({
  size = 20,
  color = tokensColor.text.tertiary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Drag handle"
    >
      <Ionicons name="reorder-two-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 21. Music Note Icon ─────────────────────────────────────────────────────
export function MusicNoteIcon({
  size = 24,
  color = tokensColor.text.primary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Music"
    >
      <Ionicons name="musical-notes" size={size} color={color as string} />
    </View>
  );
}

// ─── 22. Lyrics Icon ─────────────────────────────────────────────────────────
export function LyricsIcon({
  size = 20,
  color = tokensColor.text.secondary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Lyrics"
    >
      <MaterialCommunityIcons name="comment-quote-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 23. Queue Icon ──────────────────────────────────────────────────────────
export function QueueIcon({
  size = 20,
  color = tokensColor.text.secondary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Queue"
    >
      <MaterialCommunityIcons name="playlist-music" size={size} color={color as string} />
    </View>
  );
}

// ─── 24. Device / Speaker Icon ───────────────────────────────────────────────
export function DeviceIcon({
  size = 20,
  color = tokensColor.text.secondary,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Connected Device"
    >
      <MaterialCommunityIcons name="cast-connected" size={size} color={color as string} />
    </View>
  );
}

// ─── 25. Cloud Offline Icon ──────────────────────────────────────────────────
export function CloudOfflineIcon({
  size = 16,
  color = tokensColor.semantic.warning,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Offline"
    >
      <Ionicons name="cloud-offline-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 26. Sync Icon ───────────────────────────────────────────────────────────
export function SyncIcon({
  size = 16,
  color = tokensColor.accent.signature,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Sync"
    >
      <Ionicons name="sync-outline" size={size} color={color as string} />
    </View>
  );
}

// ─── 27. Timer Icon (alias to ClockIcon) ──────────────────────────────────────
export { ClockIcon as TimerIcon };

// ─── 28. Check Icon ──────────────────────────────────────────────────────────
export function CheckIcon({
  size = 20,
  color = tokensColor.accent.signature,
  style,
}: IconProps) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel="Success check"
    >
      <Ionicons name="checkmark-circle" size={size} color={color as string} />
    </View>
  );
}
