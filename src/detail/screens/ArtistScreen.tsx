/**
 * ArtistScreen — Parallax header + popular tracks + discography tabs + related artists.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { color, space, radius } from '@/design/tokens';
import { usePalette } from '@/design/context/PaletteContext';
import { useParallaxHeader, HEADER_HEIGHT } from '../useParallaxHeader';
import { OTOSongRow } from '../components/OTOSongRow';
import { ContextActionSheet } from '../components/ContextActionSheet';
import type { Track } from '@/domain/types';
import type { Artist, DiscographyFilter, ContextAction } from '../types';

export interface ArtistScreenProps {
  artist: Artist;
  onPlayTrack: (track: Track) => void;
}

const FILTERS: DiscographyFilter[] = ['Albums', 'EPs', 'Singles'];

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M monthly listeners`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K monthly listeners`;
  return `${n} monthly listeners`;
}

export function ArtistScreen({
  artist,
  onPlayTrack,
}: ArtistScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activePalette } = usePalette();
  const {
    scrollHandler,
    artworkStyle,
    headerBgStyle,
    navTitleStyle,
  } = useParallaxHeader();

  const [contextTrack, setContextTrack] = useState<Track | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [discoFilter, setDiscoFilter] = useState<DiscographyFilter>('Albums');

  const openContext = useCallback((track: Track) => {
    setContextTrack(track);
    setSheetVisible(true);
  }, []);

  const handleAction = useCallback((track: Track, action: ContextAction) => {
    console.log('action', action, track.id);
  }, []);

  const filteredDiscography = artist.discography.filter(
    (a) => a.type === (discoFilter === 'Albums' ? 'Album' : discoFilter === 'EPs' ? 'EP' : 'Single'),
  );

  return (
    <View style={styles.root}>
      {/* Parallax hero art */}
      <Animated.View style={[styles.artworkLayer, artworkStyle]}>
        <OTOArtwork
          uri={artist.artworkUrl}
          thumbhash={artist.thumbhash}
          size={HEADER_HEIGHT}
          borderRadius={0}
          style={styles.artworkFull}
        />
        <View
          style={[
            styles.artworkScrim,
            { backgroundColor: activePalette.dominant + '88' },
          ]}
        />
        {/* Artist name overlay */}
        <View style={styles.artistNameOverlay}>
          <OTOText variant="display" colorRole="primary" style={styles.artistName}>
            {artist.name}
          </OTOText>
          <OTOText variant="meta" colorRole="secondary">
            {formatListeners(artist.monthlyListeners)}
          </OTOText>
        </View>
      </Animated.View>

      {/* Nav bar */}
      <Animated.View
        style={[
          styles.navBar,
          { paddingTop: insets.top },
          headerBgStyle,
          { backgroundColor: color.bg.base },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <OTOText variant="body" colorRole="primary">‹</OTOText>
        </Pressable>
        <Animated.View style={navTitleStyle}>
          <OTOText variant="body" colorRole="primary" numberOfLines={1}>{artist.name}</OTOText>
        </Animated.View>
        <View style={styles.navRight} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        <View style={{ height: HEADER_HEIGHT }} />

        {/* Follow + Play */}
        <View style={styles.transport}>
          <OTOButton label="Follow" variant="secondary" onPress={() => {}} accessibilityLabel="Follow artist" />
          <OTOButton label="Play" variant="primary" onPress={() => { const t = artist.popularTracks[0]; if (t) onPlayTrack(t); }} accessibilityLabel="Play top songs" />
        </View>

        {/* Popular tracks */}
        <OTOText variant="section" colorRole="primary" style={styles.sectionTitle}>
          Popular
        </OTOText>
        {artist.popularTracks.map((track, idx) => (
          <OTOSongRow
            key={track.id}
            track={track}
            index={idx}
            showIndex
            onPress={onPlayTrack}
            onContextAction={handleAction}
            onContextOpen={openContext}
          />
        ))}

        {/* Discography tabs */}
        <OTOText variant="section" colorRole="primary" style={styles.sectionTitle}>
          Discography
        </OTOText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              style={[
                styles.filterChip,
                discoFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setDiscoFilter(f)}
              accessible
              accessibilityRole="button"
              accessibilityState={{ selected: discoFilter === f }}
            >
              <OTOText
                variant="meta"
                colorRole={discoFilter === f ? 'primary' : 'secondary'}
              >
                {f}
              </OTOText>
            </Pressable>
          ))}
        </ScrollView>

        <FlatList
          data={filteredDiscography}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discographyList}
          renderItem={({ item }) => (
            <Pressable style={styles.discographyCard} accessible accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.year}`}>
              <OTOArtwork
                uri={item.artworkUrl}
                thumbhash={item.thumbhash}
                size={120}
                borderRadius={radius.md}
              />
              <OTOText variant="meta" colorRole="primary" numberOfLines={2} style={styles.discographyTitle}>
                {item.title}
              </OTOText>
              <OTOText variant="caption" colorRole="tertiary">
                {item.year} · {item.type}
              </OTOText>
            </Pressable>
          )}
        />

        {/* Related artists */}
        <OTOText variant="section" colorRole="primary" style={styles.sectionTitle}>
          Fans also like
        </OTOText>
        <FlatList
          data={artist.related}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedList}
          renderItem={({ item }) => (
            <Pressable style={styles.relatedCard} accessible accessibilityRole="button" accessibilityLabel={item.name}>
              <OTOArtwork
                uri={item.artworkUrl}
                thumbhash={item.thumbhash}
                size={80}
                borderRadius={radius.full}
              />
              <OTOText variant="caption" colorRole="secondary" style={styles.relatedName} numberOfLines={1}>
                {item.name}
              </OTOText>
            </Pressable>
          )}
        />
      </Animated.ScrollView>

      <ContextActionSheet
        track={contextTrack}
        visible={sheetVisible}
        onDismiss={() => setSheetVisible(false)}
        onAction={handleAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.base },
  artworkLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  artworkFull: { width: '100%', height: '100%' },
  artworkScrim: { ...StyleSheet.absoluteFill },
  artistNameOverlay: {
    position: 'absolute',
    bottom: space[4],
    left: space[4],
    right: space[4],
    gap: space[1],
  },
  artistName: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[2],
    zIndex: 10,
  },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingRight: space[3] },
  navRight: { minWidth: 44 },
  scrollContent: { paddingTop: 0 },
  transport: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
  },
  sectionTitle: {
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[3],
  },
  filterRow: {
    paddingHorizontal: space[4],
    gap: space[2],
    paddingBottom: space[3],
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
  },
  filterChipActive: {
    backgroundColor: color.bg.s3,
    borderWidth: 1,
    borderColor: color.accent.signature,
  },
  discographyList: { paddingHorizontal: space[4], gap: space[4] },
  discographyCard: { width: 128, gap: space[1] },
  discographyTitle: { marginTop: space[1] },
  relatedList: { paddingHorizontal: space[4], gap: space[4] },
  relatedCard: { width: 88, alignItems: 'center', gap: space[2] },
  relatedName: { textAlign: 'center' },
});
