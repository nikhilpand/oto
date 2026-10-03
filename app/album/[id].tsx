import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlbumScreen } from '@/detail/screens/AlbumScreen';
import { DetailStateView } from '@/detail/components/DetailStateView';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { resolveAlbum } from '@/detail/services/albumResolutionService';
import type { Track } from '@/domain/types';
import type { Album } from '@/detail/types';

export default function AlbumRoute() {
  const { id, title: paramTitle, artist: paramArtist, artworkUrl: paramArtwork } =
    useLocalSearchParams<{
      id: string;
      title?: string;
      artist?: string;
      artworkUrl?: string;
    }>();
  const router = useRouter();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Reset is intentional: syncing UI state to a new external fetch on route param change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setErrorMessage(null);

    void resolveAlbum(id, {
      title: paramTitle,
      artist: paramArtist,
      artworkUrl: paramArtwork,
    }).then((resolved) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (resolved && resolved.tracks.length > 0) {
        setAlbum(resolved);
      } else {
        setErrorMessage('Album could not be loaded or is empty.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id, paramTitle, paramArtist, paramArtwork]);

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

  if (isLoading || errorMessage || !album) {
    return (
      <DetailStateView
        isLoading={isLoading}
        errorMessage={errorMessage}
        title={paramTitle || 'Album'}
        subtitle={paramArtist}
        artworkUrl={paramArtwork}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <AlbumScreen
      album={album}
      onPlayTrack={handlePlayTrack}
      onPlayAll={handlePlayAll}
      onShuffle={handleShuffle}
    />
  );
}