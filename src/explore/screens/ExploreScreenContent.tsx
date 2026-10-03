/**
 * ExploreScreenContent — BitChord-matched Dynamic Explore Feed.
 *
 * - Header: Soundwave logo on left, user profile avatar pill on right
 * - Responsive 2-column grid of vibrant category cards with tilted artwork
 * - Live YouTube Music mood & genre sections with fallback
 * - Fluid safe-area insets & bottom chrome clearance
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { color, space } from '@/design/tokens';
import { useLayout } from '@/design/hooks/useLayout';
import { OTOText } from '@/design/components/OTOText';
import { useGoogleAuth } from '@/auth/useGoogleAuth';
import { GoogleSignInModal } from '@/auth/components/GoogleSignInModal';
import { ExploreCategoryCard } from '../components/ExploreCategoryCard';
import { ExploreHeader } from '../components/ExploreHeader';
import {
  fetchLiveExploreSections,
  type LiveExploreSection,
} from '../services/liveExploreService';
import type { ExploreCardItem } from '../data/exploreData';

export function ExploreScreenContent(): React.JSX.Element {
  const router = useRouter();
  const { bottomChrome, contentWidth } = useLayout();
  const { isSignedIn, activeProfile } = useGoogleAuth();

  const [sections, setSections] = useState<LiveExploreSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    const live = await fetchLiveExploreSections();
    setSections(live);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCardPress = useCallback(
    (item: ExploreCardItem) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/search',
        params: { q: item.query },
      });
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. BitChord Header: Waveform Logo & User Pill */}
      <ExploreHeader
        contentWidth={contentWidth}
        isSignedIn={isSignedIn}
        activeProfile={activeProfile}
        onOpenAuth={() => setAuthModalVisible(true)}
      />

      {/* 2. Scrollable Dynamic Sections */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomChrome, maxWidth: contentWidth },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={color.accent.signature}
          />
        }
      >
        {sections.map((section, sIdx) => (
          <View key={section.title} style={sIdx > 0 ? styles.followingSection : undefined}>
            <View style={styles.sectionHeader}>
              <OTOText variant="title" weight="bold" style={styles.sectionTitle}>
                {section.title}
              </OTOText>
            </View>

            <View style={styles.grid}>
              {section.items.map((card) => (
                <View key={card.id} style={styles.gridItem}>
                  <ExploreCategoryCard item={card} onPress={handleCardPress} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Account Hub Modal */}
      <GoogleSignInModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  scrollContent: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: space[4],
    paddingTop: space[2],
  },
  sectionHeader: {
    marginBottom: space[3],
  },
  followingSection: {
    marginTop: space[6],
  },
  sectionTitle: {
    fontSize: 20,
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
});
