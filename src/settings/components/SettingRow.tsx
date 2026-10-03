import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { color, space, radius, type, fontFamily } from '@/design/tokens';
import { ChevronRightIcon } from '@/design/components/OTOIcon';

interface SettingRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  valueBadge?: string;
  badgeLabel?: string;
  accessibilityLabel?: string;
  bottomElement?: React.ReactNode;
}

export function SettingRow({
  title,
  subtitle,
  icon,
  rightElement,
  onPress,
  showChevron,
  valueBadge,
  badgeLabel,
  accessibilityLabel,
  bottomElement,
}: SettingRowProps): React.ReactElement {
  const content = (
    <View style={styles.container}>
      <View style={styles.row}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badgeLabel && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeLabel}</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {rightElement}

        {valueBadge && (
          <Text style={styles.valueBadge}>{valueBadge}</Text>
        )}

        {showChevron && (
          <View style={styles.chevron}>
            <ChevronRightIcon size={18} color={color.text.tertiary} />
          </View>
        )}
      </View>
      {bottomElement && <View style={styles.bottomContainer}>{bottomElement}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  iconContainer: {
    marginRight: space[3],
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: { flex: 1, marginRight: space[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: {
    fontSize: type.body[0],
    lineHeight: type.body[1],
    fontFamily: fontFamily.medium,
    color: color.text.primary,
  },
  subtitle: {
    fontSize: type.caption[0],
    lineHeight: type.caption[1],
    fontFamily: fontFamily.regular,
    color: color.text.tertiary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: color.bg.s3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: color.accent.signature,
  },
  valueBadge: {
    fontSize: type.caption[0],
    fontFamily: fontFamily.medium,
    color: color.text.secondary,
    marginRight: space[1],
  },
  chevron: { marginLeft: 2 },
  bottomContainer: { marginTop: space[3] },
});
