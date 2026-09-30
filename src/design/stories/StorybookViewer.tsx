import { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { color, space, radius, QualityTier } from '@/design/tokens';
import { OTOText } from '@/design/components/OTOText';
import { QualityTierProvider } from '@/design/hooks/useQualityTier';
import { ReducedMotionProvider } from '@/design/hooks/useReducedMotion';
import { OTOTextStories } from './OTOText.stories';
import { OTOButtonStories } from './OTOButton.stories';
import { OTOIconButtonStories } from './OTOIconButton.stories';
import { OTOGlassSurfaceStories } from './OTOGlassSurface.stories';
import { OTOArtworkStories } from './OTOArtwork.stories';
import { ColorHarnessStories } from './ColorHarness.stories';
import { AudioHarnessStories } from './AudioHarness.stories';
import { DeRiskStackStories } from './DeRiskStack.stories';
import { PlayerShellStories } from './PlayerShell.stories';

type StoryTab = 'all' | 'text' | 'button' | 'iconButton' | 'glass' | 'artwork' | 'color' | 'audio' | 'derisk' | 'playerShell';

export function StorybookViewer() {
  const [activeTab, setActiveTab] = useState<StoryTab>('all');
  const [activeTier, setActiveTier] = useState<QualityTier>(QualityTier.Full);
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <QualityTierProvider initialTier={activeTier}>
      <ReducedMotionProvider reducedMotion={reducedMotion}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <OTOText variant="title" colorRole="accent">
              OTO Storybook
            </OTOText>
            <OTOText variant="caption" colorRole="tertiary">
              Design Tokens & Primitives Verification
            </OTOText>

            {/* Quality Tier Selector */}
            <View style={styles.controlRow}>
              <OTOText variant="caption" colorRole="secondary">
                Quality Tier:
              </OTOText>
              {([3, 2, 1, 0] as QualityTier[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setActiveTier(t)}
                  style={[
                    styles.chip,
                    activeTier === t && styles.chipActive,
                  ]}
                >
                  <OTOText
                    variant="caption"
                    customColor={
                      activeTier === t ? color.bg.base : color.text.secondary
                    }
                  >
                    T{t}
                  </OTOText>
                </Pressable>
              ))}
            </View>

            {/* Reduced Motion Toggle */}
            <View style={styles.controlRow}>
              <OTOText variant="caption" colorRole="secondary">
                Reduced Motion:
              </OTOText>
              <Pressable
                onPress={() => setReducedMotion(!reducedMotion)}
                style={[
                  styles.chip,
                  reducedMotion && styles.chipActive,
                ]}
              >
                <OTOText
                  variant="caption"
                  customColor={
                    reducedMotion ? color.bg.base : color.text.secondary
                  }
                >
                  {reducedMotion ? 'Enabled' : 'Disabled'}
                </OTOText>
              </Pressable>
            </View>

            {/* Component Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {(
                [
                  ['all', 'All'],
                  ['text', 'Text'],
                  ['button', 'Button'],
                  ['iconButton', 'IconButton'],
                  ['glass', 'Glass'],
                  ['artwork', 'Artwork'],
                  ['color', 'Color Harness'],
                  ['audio', 'Audio Engine'],
                  ['derisk', 'De-Risk Canvas'],
                  ['playerShell', 'Player Shell'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setActiveTab(key)}
                  style={[
                    styles.tabButton,
                    activeTab === key && styles.tabButtonActive,
                  ]}
                >
                  <OTOText
                    variant="caption"
                    weight={activeTab === key ? 'semibold' : 'regular'}
                    customColor={
                      activeTab === key
                        ? color.accent.signature
                        : color.text.tertiary
                    }
                  >
                    {label}
                  </OTOText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {(activeTab === 'all' || activeTab === 'text') && <OTOTextStories />}
            {(activeTab === 'all' || activeTab === 'button') && <OTOButtonStories />}
            {(activeTab === 'all' || activeTab === 'iconButton') && <OTOIconButtonStories />}
            {(activeTab === 'all' || activeTab === 'glass') && <OTOGlassSurfaceStories />}
            {(activeTab === 'all' || activeTab === 'artwork') && <OTOArtworkStories />}
            {(activeTab === 'all' || activeTab === 'color') && <ColorHarnessStories />}
            {(activeTab === 'all' || activeTab === 'audio') && <AudioHarnessStories />}
            {(activeTab === 'all' || activeTab === 'derisk') && <DeRiskStackStories />}
            {(activeTab === 'all' || activeTab === 'playerShell') && <PlayerShellStories />}
          </ScrollView>
        </SafeAreaView>
      </ReducedMotionProvider>
    </QualityTierProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg.base,
  },
  header: {
    padding: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
    backgroundColor: color.bg.s1,
    gap: space[2],
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[1],
  },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.full,
    backgroundColor: color.bg.s2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
  },
  chipActive: {
    backgroundColor: color.accent.signature,
    borderColor: color.accent.signature,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  tabButton: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: color.bg.s2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space[8],
  },
});
