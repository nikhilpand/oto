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
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<LyricsProviderName>('BiniLyrics');

  useEffect(() => {
    let isMounted = true;
    if (currentTrack) {
      setLiveLyrics(null);
      setOriginalLyrics(null);
      setIsTranslated(false);
      void LyricsRepository.getLyrics({
        title: currentTrack.title,
        artist: currentTrack.artist,
        durationMs: currentTrack.durationMs,
        album: currentTrack.album,
        videoId: currentTrack.id,
      }).then((lyrics) => {
        if (!isMounted || !lyrics) return;
        setLiveLyrics(lyrics);
        setOriginalLyrics(lyrics);
        if (lyrics.provider) {
          setCurrentProvider(lyrics.provider as LyricsProviderName);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [currentTrack]);

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
    const translated = await LyricsTranslationService.translate(
      currentTrack.id,
      originalLyrics.lines,
      'en'
    );
    setIsTranslating(false);
    if (translated) {
      setLiveLyrics(translated);
      setIsTranslated(true);
    }
  }, [currentTrack, isTranslated, originalLyrics]);

  return {
    liveLyrics,
    currentProvider,
    isTranslating,
    handleChangeProvider,
    handleToggleTranslate,
  };
}
