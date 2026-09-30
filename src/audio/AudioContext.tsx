import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { AudioEngine } from './AudioEngine';
import { FakeAudioEngine } from './FakeAudioEngine';
import { usePlaybackStore } from '../store/usePlaybackStore';

const AudioEngineContext = createContext<AudioEngine | null>(null);

export interface AudioEngineProviderProps {
  engine?: AudioEngine;
  children: React.ReactNode;
}

/**
 * Provides the singleton AudioEngine to the application tree and binds
 * its discrete lifecycle events to the lightweight Zustand usePlaybackStore.
 *
 * Position ticks (~4Hz) are intentionally ignored here so the React tree
 * never re-renders during playback.
 */
export function AudioEngineProvider({
  engine: customEngine,
  children,
}: AudioEngineProviderProps): React.JSX.Element {
  const [defaultEngine] = React.useState<FakeAudioEngine>(() => new FakeAudioEngine());
  const activeEngine = customEngine ?? defaultEngine;

  useEffect(() => {
    const unsubStatus = activeEngine.onStatusChange((status) => {
      const store = usePlaybackStore.getState();
      store.setStatus(status);
      store.setPlaying(status === 'playing');
    });

    const unsubTrack = activeEngine.onTrackChange((track) => {
      usePlaybackStore.getState().setTrack(track);
    });

    const unsubError = activeEngine.onError((error) => {
      console.error('[AudioEngine Error]', error);
    });

    return () => {
      unsubStatus();
      unsubTrack();
      unsubError();
      if (!customEngine) {
        defaultEngine.destroy();
      }
    };
  }, [activeEngine, customEngine, defaultEngine]);

  const value = useMemo(() => activeEngine, [activeEngine]);

  return (
    <AudioEngineContext.Provider value={value}>
      {children}
    </AudioEngineContext.Provider>
  );
}

/**
 * Access the platform-agnostic AudioEngine interface.
 * UI components must use this hook rather than directly calling native audio APIs.
 */
export function useAudioEngine(): AudioEngine {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error('useAudioEngine must be used within an AudioEngineProvider');
  }
  return context;
}
