import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { HeadphonesIcon } from '@/design/components/OTOIcon';

export interface ListeningExperienceCarouselProps {
  minutesListened?: number;
  topTrackTitle?: string;
  topTrackArtist?: string;
  totalPlays?: number;
  onPress?: () => void;
}

export function ListeningExperienceCarousel({
  minutesListened = 80,
  topTrackTitle = 'Oh, Pretty Woman',
  topTrackArtist = 'Roy Orbison',
  totalPlays = 12,
  onPress,
}: ListeningExperienceCarouselProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <OTOText variant="meta" weight="bold" customColor={color.text.tertiary} style={styles.headerTitle}>
        YOUR LISTENING EXPERIENCE
      </OTOText>

      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${minutesListened} minutes listened, top track: ${topTrackArtist} - ${topTrackTitle}`}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <OTOText variant="title" weight="bold" customColor="#F0FDF4" style={styles.minutesText}>
              {`${minutesListened} MINUTES LISTENED`}
            </OTOText>
          </View>

          <OTOText variant="body" weight="medium" customColor="#BBF7D0" numberOfLines={1}>
            {`${topTrackArtist} · ${topTrackTitle}`}
          </OTOText>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <HeadphonesIcon size={14} color="#86EFAC" />
              <OTOText variant="meta" weight="semibold" customColor="#86EFAC">
                {`${totalPlays} plays`}
              </OTOText>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space[4],
    marginBottom: space[4],
  },
  headerTitle: {
    letterSpacing: 1.2,
    marginBottom: space[2],
  },
  card: {
    backgroundColor: '#064E3B',
    borderRadius: radius.lg,
    padding: space[4],
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  cardContent: {
    gap: space[2],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minutesText: {
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[1],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    backgroundColor: 'rgba(6, 78, 59, 0.6)',
    paddingHorizontal: space[2],
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.3)',
  },
});
