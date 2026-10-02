import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PlaylistScreen } from '@/detail/screens/PlaylistScreen';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { getLiveHomeFeed } from '@/api/otoBackend';
import { GoogleAuthStore } from '@/auth/GoogleAuthStore';
import { innertubeClient } from '@/auth/innertube/InnertubeClient';
import { parseDurationMs } from '@/auth/innertube/innertubeParsers';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOArtwork } from '@/design/components/OTOArtwork';
import { upgradeArtworkUrl } from '@/utils/imageQuality';
import type { Track } from '@/domain/types';
import type { Playlist } from '@/detail/types';

export default function PlaylistRoute() {
  const { id, title: paramTitle, artworkUrl: paramArtwork, subtitle: paramSubtitle } =
    useLocalSearchParams<{ id: string; title?: string; artworkUrl?: string; subtitle?: string }>();
  const router = useRouter();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    async function loadPlaylistData() {
      try {
        const session = GoogleAuthStore.toInnertubeSession();

        // 1. Liked Songs
        if (id === 'liked_songs' || id === 'LM') {
          let songs = session ? await innertubeClient.fetchLikedSongs(session) : [];
          if (!isMounted) return;

          const tracks: Track[] = songs.map((s) => ({
            id: s.videoId,
            title: s.title,
            artist: s.artist,
            artists: [s.artist],
            album: s.albumName || '',
            artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || paramArtwork || ''),
            thumbhash: '',
            durationMs: parseDurationMs(s.durationText),
            isExplicit: Boolean(s.isExplicit),
          }));

          setPlaylist({
            id: 'liked_songs',
            title: paramTitle || 'Liked Songs',
            description: paramSubtitle || `${tracks.length} songs from YouTube Music`,
            artworkUrl: upgradeArtworkUrl(tracks[0]?.artworkUrl || paramArtwork || ''),
            thumbhash: '',
            owner: session?.account?.name || 'You',
            totalTracks: tracks.length,
            durationMs: tracks.reduce((acc, t) => acc + (t.durationMs || 180000), 0),
            tracks,
          });
          setIsLoading(false);
          return;
        }

        // 2. YouTube Music Playlist (either starts with PL/VL or is from user playlists)
        if (id && (id.startsWith('PL') || id.startsWith('VL') || id.length >= 10)) {
          const songs = await innertubeClient.fetchPlaylistTracks(id, session);
          if (!isMounted) return;

          if (songs && songs.length > 0) {
            const tracks: Track[] = songs.map((s) => ({
              id: s.videoId,
              title: s.title,
              artist: s.artist,
              artists: [s.artist],
              album: s.albumName || '',
              artworkUrl: upgradeArtworkUrl(s.thumbnailUrl || paramArtwork || ''),
              thumbhash: '',
              durationMs: parseDurationMs(s.durationText),
              isExplicit: Boolean(s.isExplicit),
            }));

            setPlaylist({
              id,
              title: paramTitle || 'YouTube Music Playlist',
              description: paramSubtitle || `${tracks.length} tracks`,
              artworkUrl: upgradeArtworkUrl(paramArtwork || tracks[0]?.artworkUrl || ''),
              thumbhash: '',
              owner: session?.account?.name || 'YouTube Music',
              totalTracks: tracks.length,
              durationMs: tracks.reduce((acc, t) => acc + (t.durationMs || 180000), 0),
              tracks,
            });
            setIsLoading(false);
            return;
          }
        }

        // 3. Fallback to Made For You / Local Feed
        const feed = await getLiveHomeFeed();
        if (!isMounted) return;

        const mfy = feed?.madeForYou.find((p) => p.id === id) || feed?.madeForYou[0];
        if (mfy && mfy.tracks.length > 0) {
          setPlaylist({
            id: mfy.id,
            title: mfy.title,
            description: mfy.subtitle,
            artworkUrl: upgradeArtworkUrl(mfy.artworkUrl),
            thumbhash: mfy.thumbhash,
            owner: 'OTO Curated',
            totalTracks: mfy.trackCount,
            durationMs: mfy.tracks.reduce((acc, t) => acc + t.durationMs, 0),
            tracks: mfy.tracks.map((t) => ({
              ...t,
              artworkUrl: upgradeArtworkUrl(t.artworkUrl),
            })),
          });
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        setErrorMessage('Playlist could not be loaded or is empty.');
      } catch (err: any) {
        if (!isMounted) return;
        setIsLoading(false);
        setErrorMessage(err?.message || 'Failed to load playlist');
      }
    }

    void loadPlaylistData();

    return () => {
      isMounted = false;
    };
  }, [id, paramTitle, paramArtwork, paramSubtitle]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (!playlist) return;
      const idx = playlist.tracks.findIndex((t) => t.id === track.id);
      playContext(playlist.tracks, idx >= 0 ? idx : 0, {
        id: playlist.id,
        title: playlist.title,
        type: 'playlist',
      });
      void engine.load(track, true);
    },
    [playlist, engine, playContext]
  );

  const handlePlayAll = useCallback(() => {
    if (!playlist || playlist.tracks.length === 0) return;
    playContext(playlist.tracks, 0, {
      id: playlist.id,
      title: playlist.title,
      type: 'playlist',
    });
    void engine.load(playlist.tracks[0]!, true);
  }, [playlist, engine, playContext]);

  const handleShuffle = useCallback(() => {
    if (!playlist || playlist.tracks.length === 0) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    playContext(shuffled, 0, {
      id: playlist.id,
      title: playlist.title,
      type: 'playlist',
    });
    void engine.load(shuffled[0]!, true);
  }, [playlist, engine, playContext]);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.loadingContainer}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <OTOText variant="body" colorRole="primary">‹</OTOText>
          </Pressable>
        </View>
        <View style={styles.loadingBody}>
          {paramArtwork ? (
            <OTOArtwork uri={paramArtwork} size={160} borderRadius={radius.md} style={styles.loadingArt} />
          ) : null}
          <OTOText variant="headline" weight="bold" style={styles.loadingTitle}>
            {paramTitle || 'Loading Playlist...'}
          </OTOText>
          {paramSubtitle && (
            <OTOText variant="caption" colorRole="secondary">
              {paramSubtitle}
            </OTOText>
          )}
          <ActivityIndicator size="large" color={color.accent.signature} style={styles.spinner} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !playlist) {
    return (
      <SafeAreaView edges={['top']} style={styles.loadingContainer}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <OTOText variant="body" colorRole="primary">‹</OTOText>
          </Pressable>
        </View>
        <View style={styles.loadingBody}>
          <OTOText variant="headline" weight="bold">
            {paramTitle || 'Playlist'}
          </OTOText>
          <OTOText variant="body" colorRole="secondary" style={styles.errorText}>
            {errorMessage || 'No tracks found in this playlist.'}
          </OTOText>
          <Pressable style={styles.goBackBtn} onPress={() => router.back()}>
            <OTOText variant="body" weight="bold" colorRole="primary">
              Go Back
            </OTOText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PlaylistScreen
      playlist={playlist}
      onPlayTrack={handlePlayTrack}
      onPlayAll={handlePlayAll}
      onShuffle={handleShuffle}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  navBar: {
    height: 48,
    paddingHorizontal: space[3],
    justifyContent: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    gap: space[2],
  },
  loadingArt: {
    marginBottom: space[3],
  },
  loadingTitle: {
    textAlign: 'center',
  },
  spinner: {
    marginTop: space[4],
  },
  errorText: {
    textAlign: 'center',
    marginTop: space[2],
  },
  goBackBtn: {
    marginTop: space[4],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    backgroundColor: color.bg.s2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.hairline,
  },
});