import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ArtistScreen } from '@/detail/screens/ArtistScreen';
import { useAudioEngine } from '@/audio/AudioContext';
import { useQueueStore } from '@/store/useQueueStore';
import { getLiveHomeFeed } from '@/api/otoBackend';
import type { Track } from '@/domain/types';
import type { Artist } from '@/detail/types';

export default function ArtistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const engine = useAudioEngine();
  const playContext = useQueueStore((s) => s.playContext);
  const [artist, setArtist] = useState<Artist | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getLiveHomeFeed().then((feed) => {
      if (!isMounted || !feed) return;
      const allTracks = [
        feed.heroTrack,
        ...feed.quickPicks,
        ...feed.continueListening.map((c) => c.track),
      ];
      const targetTrack =
        allTracks.find((t) => t.id === id || t.artist === id) || feed.heroTrack;
      if (targetTrack) {
        setArtist({
          id: targetTrack.artist,
          name: targetTrack.artist,
          artworkUrl: targetTrack.artworkUrl,
          thumbhash: targetTrack.thumbhash,
          monthlyListeners: 12_400_000,
          popularTracks: allTracks
            .filter((t) => t.artist === targetTrack.artist)
            .slice(0, 5),
          discography: [],
          related: [],
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

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

  if (!artist) return null;

  return <ArtistScreen artist={artist} onPlayTrack={handlePlayTrack} />;
}