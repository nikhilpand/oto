import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PlaylistScreen } from '@/detail/screens/PlaylistScreen';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { getLiveHomeFeed } from '@/api/otoBackend';
import type { Track } from '@/domain/types';
import type { Playlist } from '@/detail/types';

export default function PlaylistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getLiveHomeFeed().then((feed) => {
      if (!isMounted || !feed) return;
      const mfy = feed.madeForYou.find((p) => p.id === id) || feed.madeForYou[0];
      if (mfy && mfy.tracks.length > 0) {
        setPlaylist({
          id: mfy.id,
          title: mfy.title,
          description: mfy.subtitle,
          artworkUrl: mfy.artworkUrl,
          thumbhash: mfy.thumbhash,
          owner: 'OTO Curated',
          totalTracks: mfy.trackCount,
          durationMs: mfy.tracks.reduce((acc, t) => acc + t.durationMs, 0),
          tracks: mfy.tracks,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

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

  if (!playlist) return null;

  return (
    <PlaylistScreen
      playlist={playlist}
      onPlayTrack={handlePlayTrack}
      onPlayAll={handlePlayAll}
      onShuffle={handleShuffle}
    />
  );
}