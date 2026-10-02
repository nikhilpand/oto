import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AlbumScreen } from '@/detail/screens/AlbumScreen';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { getLiveHomeFeed } from '@/api/otoBackend';
import type { Track } from '@/domain/types';
import type { Album } from '@/detail/types';

export default function AlbumRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);
  const [album, setAlbum] = useState<Album | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getLiveHomeFeed().then((feed) => {
      if (!isMounted || !feed) return;
      const nr = feed.newReleases.find((r) => r.id === id) || feed.newReleases[0];
      if (nr && nr.tracks.length > 0) {
        setAlbum({
          id: nr.id,
          title: nr.title,
          artist: nr.artist,
          artworkUrl: nr.artworkUrl,
          thumbhash: nr.thumbhash,
          year: 2024,
          totalTracks: nr.tracks.length,
          durationMs: nr.tracks.reduce((acc, t) => acc + t.durationMs, 0),
          tracks: nr.tracks,
          isExplicit: false,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (!album) return;
      const idx = album.tracks.findIndex((t) => t.id === track.id);
      playContext(album.tracks, idx >= 0 ? idx : 0, {
        id: album.id,
        title: album.title,
        type: 'album',
      });
      void engine.load(track, true);
    },
    [album, engine, playContext]
  );

  const handlePlayAll = useCallback(() => {
    if (!album || album.tracks.length === 0) return;
    playContext(album.tracks, 0, {
      id: album.id,
      title: album.title,
      type: 'album',
    });
    void engine.load(album.tracks[0]!, true);
  }, [album, engine, playContext]);

  const handleShuffle = useCallback(() => {
    if (!album || album.tracks.length === 0) return;
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    playContext(shuffled, 0, {
      id: album.id,
      title: album.title,
      type: 'album',
    });
    void engine.load(shuffled[0]!, true);
  }, [album, engine, playContext]);

  if (!album) return null;

  return (
    <AlbumScreen
      album={album}
      onPlayTrack={handlePlayTrack}
      onPlayAll={handlePlayAll}
      onShuffle={handleShuffle}
    />
  );
}