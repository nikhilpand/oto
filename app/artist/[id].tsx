import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArtistScreen } from '@/detail/screens/ArtistScreen';
import { DetailStateView } from '@/detail/components/DetailStateView';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { resolveArtist } from '@/detail/services/artistResolutionService';
import type { Track } from '@/domain/types';
import type { Artist } from '@/detail/types';

export default function ArtistRoute() {
  const { id, name: paramName, artworkUrl: paramArtwork } =
    useLocalSearchParams<{
      id: string;
      name?: string;
      artworkUrl?: string;
    }>();
  const router = useRouter();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);

  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Reset is intentional: syncing UI state to a new external fetch on route param change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setErrorMessage(null);

    void resolveArtist(id, {
      name: paramName,
      artworkUrl: paramArtwork,
    }).then((resolved) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (resolved && resolved.popularTracks.length > 0) {
        setArtist(resolved);
      } else {
        setErrorMessage('Artist details could not be loaded.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id, paramName, paramArtwork]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (!artist) return;
      const idx = artist.popularTracks.findIndex((t) => t.id === track.id);
      playContext(artist.popularTracks, idx >= 0 ? idx : 0, {
        id: artist.id,
        title: artist.name,
        type: 'artist',
      });
      void engine.load(track, true);
    },
    [artist, engine, playContext]
  );

  if (isLoading || errorMessage || !artist) {
    return (
      <DetailStateView
        isLoading={isLoading}
        errorMessage={errorMessage}
        title={paramName || 'Artist'}
        artworkUrl={paramArtwork}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <ArtistScreen
      artist={artist}
      onPlayTrack={handlePlayTrack}
    />
  );
}