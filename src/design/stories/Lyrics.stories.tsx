import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { color, space, radius } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { OTOLyrics } from '@/lyrics/components/OTOLyrics';
import {
  mockParsedDuetLyrics,
  mockParsedLrcLyrics,
  mockParsedHindiLyrics,
  mockParsedArabicLyrics,
  mockParsedCjkLyrics,
  mockParsedCyrillicLyrics,
} from '@/mock/mockLyrics';

export function LyricsStory(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'duet' | 'lrc' | 'hindi' | 'arabic' | 'cjk' | 'cyrillic' | 'inline' | 'skeleton' | 'instrumental' | 'unavailable'
  >('duet');

  const positionMs = useSharedValue(1000);
  const [isPlaying, setIsPlaying] = useState(true);

  // Playhead timer for story visualization
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      positionMs.value = (positionMs.value + 150) % 45000;
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, positionMs]);

  const handleSeek = (timeMs: number) => {
    positionMs.value = timeMs;
  };

  const getLyricsForTab = () => {
    switch (activeTab) {
      case 'duet':
        return mockParsedDuetLyrics;
      case 'lrc':
        return mockParsedLrcLyrics;
      case 'hindi':
        return mockParsedHindiLyrics;
      case 'arabic':
        return mockParsedArabicLyrics;
      case 'cjk':
        return mockParsedCjkLyrics;
      case 'cyrillic':
        return mockParsedCyrillicLyrics;
      case 'inline':
        return mockParsedDuetLyrics;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsRow}>
          {(['duet', 'lrc', 'hindi', 'arabic', 'cjk', 'cyrillic'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            >
              <OTOText
                variant="caption"
                weight={activeTab === tab ? 'bold' : 'regular'}
                colorRole={activeTab === tab ? 'primary' : 'tertiary'}
              >
                {tab.toUpperCase()}
              </OTOText>
            </Pressable>
          ))}
        </View>
        <View style={styles.tabsRow}>
          {(['inline', 'skeleton', 'instrumental', 'unavailable'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            >
              <OTOText
                variant="caption"
                weight={activeTab === tab ? 'bold' : 'regular'}
                colorRole={activeTab === tab ? 'primary' : 'tertiary'}
              >
                {tab.toUpperCase()}
              </OTOText>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setIsPlaying((p) => !p)}
            style={[styles.tabButton, styles.playToggle]}
          >
            <OTOText variant="caption" weight="bold" colorRole="accent">
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </OTOText>
          </Pressable>
        </View>
      </View>

      {/* Lyrics Viewer Body */}
      <View style={styles.lyricsContainer}>
        <OTOLyrics
          lyrics={getLyricsForTab()}
          positionMs={positionMs}
          onSeek={handleSeek}
          isLoading={activeTab === 'skeleton'}
          isInstrumental={activeTab === 'instrumental'}
          isUnavailable={activeTab === 'unavailable'}
          mode={activeTab === 'inline' ? 'inline' : 'fullscreen'}
          onExpand={() => setActiveTab('duet')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  tabsWrapper: {
    padding: space[2],
    backgroundColor: color.bg.s1,
    gap: space[1],
    borderBottomWidth: 1,
    borderBottomColor: color.hairline,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[1],
  },
  tabButton: {
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
    backgroundColor: color.bg.s2,
  },
  tabButtonActive: {
    backgroundColor: color.bg.s3,
  },
  playToggle: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: color.accent.signature,
  },
  lyricsContainer: {
    flex: 1,
  },
});
