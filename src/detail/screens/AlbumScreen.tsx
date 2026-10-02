/**
 * AlbumScreen — Parallax collapsing header + track list.
 *
 * Architecture:
 *   - useParallaxHeader drives all scroll-derived motion on the UI thread
 *   - Animated.FlatList (FlashList unavailable here) for track rows
 *   - ContextActionSheet for per-track actions
 *   - OTOPaletteProvider-sourced tint on header bg overlay
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OTOText } from '@/design/components/OTOText';
import { OTOButton } from '@/design/components/OTOButton';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { color, space } from '@/design/tokens';
import { usePalette } from '@/design/context/PaletteContext';
import { useParallaxHeader, HEADER_HEIGHT } from '../useParallaxHeader';
import { OTOSongRow } from '../components/OTOSongRow';
import { ContextActionSheet } from '../components/ContextActionSheet';
import type { Track } from '@/domain/types';
import type { Album, ContextAction } from '../types';

export interface AlbumScreenProps {
  album: Album;
  onPlayTrack: (track: Track) => void;
  onPlayAll: () => void;
  onShuffle: () => void;
}

export function AlbumScreen({
  album,
  onPlayTrack,
  onPlayAll,
  onShuffle,
}: AlbumScreenProps): React.JSX.Element {
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

  const openContext = useCallback((track: Track) => {
    setContextTrack(track);
    setSheetVisible(true);
  }, []);

  const handleAction = useCallback(
    (track: Track, action: ContextAction) => {
      // Wire to playback store in P11+
      console.log('context action', action, track.id);
    },
    [],
  );

  const totalDuration = React.useMemo(() => {
    const totalSec = Math.round(album.durationMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }, [album.durationMs]);

  const ListHeader = (
    <View>
      {/* Spacer for parallax artwork area */}
      <View style={{ height: HEADER_HEIGHT }} />

      {/* Album meta */}
      <View style={styles.meta}>
        <OTOText variant="title" colorRole="primary" style={styles.albumTitle}>
          {album.title}
        </OTOText>
        <OTOText variant="artist" colorRole="secondary">{album.artist}</OTOText>
        <OTOText variant="meta" colorRole="tertiary" style={styles.metaLine}>
          {album.year} · {album.totalTracks} songs · {totalDuration}
        </OTOText>
      </View>

      {/* Transport: Play + Shuffle — sticky via Animated.View outside list */}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Fixed parallax artwork layer */}
      <Animated.View style={[styles.artworkLayer, artworkStyle]}>
        <OTOArtwork
          uri={album.artworkUrl}
          thumbhash={album.thumbhash}
          size={HEADER_HEIGHT}
          borderRadius={0}
          style={styles.artworkFull}
        />
        {/* Palette-tinted scrim always present */}
        <View
          style={[
            styles.artworkScrim,
            { backgroundColor: activePalette.dominant + '99' },
          ]}
        />
        {/* Bottom fade to bg.base */}
        <View style={styles.artworkFadeBottom} />
      </Animated.View>

      {/* Nav bar — collapses header bg over it */}
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
          <OTOText variant="body" colorRole="primary" numberOfLines={1}>
            {album.title}
          </OTOText>
        </Animated.View>
        <View style={styles.navRight} />
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {ListHeader}

        {/* Sticky transport (positioned absolutely after render for stickiness) */}
        <View style={styles.transport}>
          <OTOButton
            label="Shuffle"
            variant="secondary"
            onPress={onShuffle}
            accessibilityLabel="Shuffle album"
          />
          <OTOButton
            label="Play"
            variant="primary"
            onPress={onPlayAll}
            accessibilityLabel="Play album"
          />
        </View>

        {/* Track rows */}
        {album.tracks.map((track, idx) => (
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
      </Animated.ScrollView>

      {/* Context sheet */}
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
  root: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  artworkLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  artworkFull: {
    width: '100%',
    height: '100%',
  },
  artworkScrim: {
    ...StyleSheet.absoluteFill,
  },
  artworkFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // Gradient sim: multiple views not ideal; real impl uses Skia in P11
  },
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
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: space[3],
  },
  navRight: {
    minWidth: 44,
  },
  scrollContent: {
    paddingTop: 0,
  },
  meta: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[3],
    gap: space[1],
  },
  albumTitle: {
    marginBottom: space[1],
  },
  metaLine: {
    marginTop: space[2],
  },
  transport: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[4],
  },
});
