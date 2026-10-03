import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
  LyricsRepository,
  type LyricsProviderName,
} from '@/utils/lyrics/LyricsRepository';
import { LyricsTranslationService } from '@/utils/lyrics/LyricsTranslation';
import type { ParsedLyrics } from '@/utils/lyrics/types';
import type { Track } from '@/domain/types';

export function useNowPlayingLyrics(currentTrack: Track | null) {
  const [liveLyrics, setLiveLyrics] = useState<ParsedLyrics | null>(null);
  const [originalLyrics, setOriginalLyrics] = useState<ParsedLyrics | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<LyricsProviderName>('BiniLyrics');

  const trackId = currentTrack?.id;
  const trackTitle = currentTrack?.title;
  const trackArtist = currentTrack?.artist;
  const trackDuration = currentTrack?.durationMs;
  const trackAlbum = currentTrack?.album;

  useEffect(() => {
    let isMounted = true;
    if (trackId && trackTitle && trackArtist) {
      setLiveLyrics(null);
      setOriginalLyrics(null);
      setIsTranslated(false);
      setIsLoadingLyrics(true);
      void LyricsRepository.getLyrics({
        title: trackTitle,
        artist: trackArtist,
        durationMs: trackDuration,
        album: trackAlbum,
        videoId: trackId,
      })
        .then((lyrics) => {
          if (!isMounted) return;
          if (lyrics) {
            setLiveLyrics(lyrics);
            setOriginalLyrics(lyrics);
            if (lyrics.provider) {
              setCurrentProvider(lyrics.provider as LyricsProviderName);
            }
          }
        })
        .catch(() => {
          // Provider failure surfaces as the empty-lyrics state, never an unhandled rejection.
        })
        .finally(() => {
          if (isMounted) setIsLoadingLyrics(false);
        });
    } else {
      setIsLoadingLyrics(false);
    }
    return () => {
      isMounted = false;
    };
  }, [trackId, trackTitle, trackArtist, trackDuration, trackAlbum]);

  const handleChangeProvider = useCallback(async () => {
    if (!currentTrack) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const providers: LyricsProviderName[] = [
      'BiniLyrics',
      'Musixmatch',
      'SimpMusic',
      'LrcLib',
      'KuGou',
    ];
    const nextIdx = (providers.indexOf(currentProvider) + 1) % providers.length;
    const nextProvider = providers[nextIdx] || 'BiniLyrics';
    setCurrentProvider(nextProvider);

    setIsLoadingLyrics(true);
    try {
      const fetched = await LyricsRepository.getLyricsFromProvider(nextProvider, {
        title: currentTrack.title,
        artist: currentTrack.artist,
        durationMs: currentTrack.durationMs,
        album: currentTrack.album,
        videoId: currentTrack.id,
      });
      if (fetched) {
        setLiveLyrics(fetched);
        setOriginalLyrics(fetched);
        setIsTranslated(false);
      }
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [currentProvider, currentTrack]);

  const handleToggleTranslate = useCallback(async () => {
    if (!currentTrack || !originalLyrics || originalLyrics.lines.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isTranslated) {
      setLiveLyrics(originalLyrics);
      setIsTranslated(false);
      return;
    }
    setIsTranslating(true);
    try {
      const translated = await LyricsTranslationService.translate(
        currentTrack.id,
        originalLyrics.lines,
        'en'
      );
      if (translated) {
        setLiveLyrics(translated);
        setIsTranslated(true);
      }
    } catch {
      // Keep original lyrics on translation failure.
    } finally {
      setIsTranslating(false);
    }
  }, [currentTrack, isTranslated, originalLyrics]);

  return {
    liveLyrics,
    isLoadingLyrics,
    currentProvider,
    isTranslating,
    handleChangeProvider,
    handleToggleTranslate,
  };
}
