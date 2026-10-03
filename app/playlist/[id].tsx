import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PlaylistScreen } from '@/detail/screens/PlaylistScreen';
import { DetailStateView } from '@/detail/components/DetailStateView';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { resolvePlaylist } from '@/detail/services/playlistResolutionService';
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

    void resolvePlaylist(id, {
      title: paramTitle,
      artworkUrl: paramArtwork,
      subtitle: paramSubtitle,
    }).then((resolved) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (resolved && resolved.tracks.length > 0) {
        setPlaylist(resolved);
      } else {
        setErrorMessage('Playlist could not be loaded or is empty.');
      }
    });

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

  if (isLoading || errorMessage || !playlist) {
    return (
      <DetailStateView
        isLoading={isLoading}
        errorMessage={errorMessage}
        title={paramTitle || 'Playlist'}
        subtitle={paramSubtitle}
        artworkUrl={paramArtwork}
        onBack={() => router.back()}
      />
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