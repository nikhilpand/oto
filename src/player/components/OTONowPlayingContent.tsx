import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';
import { space, touchTarget } from '@/design/tokens';
import { usePalette } from '@/design/context/PaletteContext';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAudioEngine } from '@/audio/AudioContext';
import { OTOLyrics } from '@/lyrics/components/OTOLyrics';
import { OTOQueue } from '@/queue/components/OTOQueue';
import { useNowPlayingLyrics } from '../hooks/useNowPlayingLyrics';
import { useNowPlayingTransport } from '../hooks/useNowPlayingTransport';

import { NowPlayingHeader } from './NowPlayingHeader';
import { NowPlayingArtwork } from './NowPlayingArtwork';
import { NowPlayingMetadata } from './NowPlayingMetadata';
import { NowPlayingLyricsTeaser } from './NowPlayingLyricsTeaser';
import { NowPlayingControls } from './NowPlayingControls';
import { NowPlayingSecondaryBar } from './NowPlayingSecondaryBar';
import { TrackOptionsSheet } from './TrackOptionsSheet';
import { AudioOutputSheet } from './AudioOutputSheet';
import { useDownloadStore } from '@/downloads/DownloadStore';

export interface OTONowPlayingContentProps {
  onCollapse: () => void;
  artworkSize: number;
  progress: SharedValue<number>;
  positionMs: SharedValue<number>;
  onSheetModeChange?: (mode: 'player' | 'lyrics' | 'queue') => void;
}

const EMPTY_LYRICS = {
  lines: [],
  isWordSynced: false,
  isLineSynced: false,
  hasDuet: false,
  script: 'latin' as const,
};

export function OTONowPlayingContent({
  onCollapse,
  artworkSize,
  progress,
  positionMs,
  onSheetModeChange,
}: OTONowPlayingContentProps): React.JSX.Element | null {
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const setTrack = usePlaybackStore((s) => s.setTrack);
  const engine = useAudioEngine();
  const { activePalette } = usePalette();
  const enqueueDownload = useDownloadStore((s) => s.enqueue);

  const [isLiked, setIsLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showOutputSheet, setShowOutputSheet] = useState(false);

  const {
    liveLyrics,
    isLoadingLyrics,
    currentProvider,
    isTranslating,
    handleChangeProvider,
    handleToggleTranslate,
  } = useNowPlayingLyrics(currentTrack);

  const {
    isPlaying,
    isShuffled,
    repeatMode,
    handleTogglePlay,
    handleSkipNext,
    handleSkipPrev,
    handleToggleShuffle,
    handleToggleRepeat,
    handleSeek,
  } = useNowPlayingTransport();

  if (!currentTrack) return null;

  const minTouchSize = Platform.OS === 'ios' ? touchTarget.ios : touchTarget.android;

  return (
    <View style={styles.container}>
      <NowPlayingHeader
        track={currentTrack}
        onCollapse={onCollapse}
        minTouchSize={minTouchSize}
        onOptionsPress={() => setShowOptions(true)}
      />

      {showQueue ? (
        <View style={styles.lyricsSection}>
          <OTOQueue
            onClose={() => {
              setShowQueue(false);
              onSheetModeChange?.('player');
            }}
            onTrackSelect={(selected) => {
              setTrack(selected);
              void engine.load(selected, true);
            }}
          />
        </View>
      ) : showLyrics ? (
        <View style={styles.lyricsSection}>
          <OTOLyrics
            lyrics={liveLyrics || EMPTY_LYRICS}
            positionMs={positionMs}
            onSeek={handleSeek}
            isLoading={isLoadingLyrics}
            mode="fullscreen"
            providerName={currentProvider}
            onChangeProvider={handleChangeProvider}
            onToggleTranslate={handleToggleTranslate}
            isTranslating={isTranslating}
          />
        </View>
      ) : (
        <>
          <NowPlayingArtwork
            track={currentTrack}
            artworkSize={artworkSize}
            isPlaying={isPlaying}
          />
          <NowPlayingMetadata
            track={currentTrack}
            isLiked={isLiked}
            onToggleLike={() => setIsLiked((prev) => !prev)}
            onOptionsPress={() => setShowOptions(true)}
            minTouchSize={minTouchSize}
            accentColor={activePalette.accent}
          />
          <NowPlayingLyricsTeaser
            firstLineText={liveLyrics?.lines?.[0]?.text}
            onPress={() => {
              setShowLyrics(true);
              setShowQueue(false);
              onSheetModeChange?.('lyrics');
            }}
          />
        </>
      )}

      <NowPlayingControls
        durationMs={currentTrack.durationMs}
        progress={progress}
        positionMs={positionMs}
        isPlaying={isPlaying}
        isShuffled={isShuffled}
        repeatMode={repeatMode}
        activeAccent={activePalette.accent}
        minTouchSize={minTouchSize}
        onTogglePlay={handleTogglePlay}
        onSkipNext={handleSkipNext}
        onSkipPrev={handleSkipPrev}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onSeek={handleSeek}
      />

      <NowPlayingSecondaryBar
        showLyrics={showLyrics}
        showQueue={showQueue}
        onToggleLyrics={() => setShowLyrics((p) => { const n = !p; if (n) setShowQueue(false); onSheetModeChange?.(n ? 'lyrics' : 'player'); return n; })}
        onToggleQueue={() => setShowQueue((p) => { const n = !p; if (n) setShowLyrics(false); onSheetModeChange?.(n ? 'queue' : 'player'); return n; })}
        activeDominant={activePalette.dominant}
        minTouchSize={minTouchSize}
        onOpenOutputSheet={() => setShowOutputSheet(true)}
        isShuffled={isShuffled}
        onToggleShuffle={handleToggleShuffle}
        repeatMode={repeatMode}
        onToggleRepeat={handleToggleRepeat}
      />

      <TrackOptionsSheet
        visible={showOptions}
        track={currentTrack}
        onClose={() => setShowOptions(false)}
        isLiked={isLiked}
        onToggleLike={() => setIsLiked((prev) => !prev)}
        onDownload={(t) => enqueueDownload(t)}
      />
      <AudioOutputSheet visible={showOutputSheet} onClose={() => setShowOutputSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  lyricsSection: {
    flex: 1,
    minHeight: 280,
    marginVertical: space[2],
  },
});
