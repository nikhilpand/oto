import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';

export function useNowPlayingTransport() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isShuffled = usePlaybackStore((s) => s.isShuffled);
  const repeatMode = usePlaybackStore((s) => s.repeatMode);
  const setShuffle = usePlaybackStore((s) => s.setShuffle);
  const setRepeatMode = usePlaybackStore((s) => s.setRepeatMode);
  const engine = useAudioEngine();

  const handleTogglePlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      void engine.pause();
    } else {
      void engine.play();
    }
  }, [engine, isPlaying]);

  const handleSkipNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void engine.skipToNext();
  }, [engine]);

  const handleSkipPrev = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void engine.skipToPrevious();
  }, [engine]);

  const handleToggleShuffle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShuffle(!isShuffled);
  }, [isShuffled, setShuffle]);

  const handleToggleRepeat = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(nextMode);
  }, [repeatMode, setRepeatMode]);

  const handleSeek = useCallback(
    (targetMs: number) => {
      void engine.seekTo(targetMs);
    },
    [engine]
  );

  return {
    isPlaying,
    isShuffled,
    repeatMode,
    handleTogglePlay,
    handleSkipNext,
    handleSkipPrev,
    handleToggleShuffle,
    handleToggleRepeat,
    handleSeek,
  };
}
