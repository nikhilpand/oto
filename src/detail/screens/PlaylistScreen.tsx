/**
 * PlaylistScreen — Parallax header + flat track list.
 * Simpler than Album/Artist: no tabs, flat rows with thumbnail.
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
import type { Playlist, ContextAction } from '../types';

export interface PlaylistScreenProps {
  playlist: Playlist;
  onPlayTrack: (track: Track) => void;
  onPlayAll: () => void;
  onShuffle: () => void;
}

export function PlaylistScreen({
  playlist,
  onPlayTrack,
  onPlayAll,
  onShuffle,
}: PlaylistScreenProps): React.JSX.Element {
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

  const handleAction = useCallback((track: Track, action: ContextAction) => {
    console.log('action', action, track.id);
  }, []);

  const totalDuration = React.useMemo(() => {
    const totalSec = Math.round(playlist.durationMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }, [playlist.durationMs]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.artworkLayer, artworkStyle]}>
        <OTOArtwork
          uri={playlist.artworkUrl}
          thumbhash={playlist.thumbhash}
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
      </Animated.View>

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
          <OTOText variant="body" colorRole="primary" numberOfLines={1}>{playlist.title}</OTOText>
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

        <View style={styles.meta}>
          <OTOText variant="title" colorRole="primary">{playlist.title}</OTOText>
          {playlist.description ? (
            <OTOText variant="body" colorRole="secondary" style={styles.desc}>
              {playlist.description}
            </OTOText>
          ) : null}
          <OTOText variant="meta" colorRole="tertiary">
            {playlist.owner} · {playlist.totalTracks} songs · {totalDuration}
          </OTOText>
        </View>

        <View style={styles.transport}>
          <OTOButton label="Shuffle" variant="secondary" onPress={onShuffle} accessibilityLabel="Shuffle playlist" />
          <OTOButton label="Play" variant="primary" onPress={onPlayAll} accessibilityLabel="Play playlist" />
        </View>

        {playlist.tracks.map((track) => (
          <OTOSongRow
            key={track.id}
            track={track}
            showIndex={false}
            onPress={onPlayTrack}
            onContextAction={handleAction}
            onContextOpen={openContext}
          />
        ))}
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
  meta: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[3],
    gap: space[1],
  },
  desc: { marginTop: space[1] },
  transport: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[4],
  },
});
