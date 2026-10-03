import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Ensure React is marked as used
void React.version;

jest.mock(
  'react-native',
  () => {
    const React = require('react');
    return {
      StyleSheet: {
        create: (styles: any) => styles,
        flatten: (style: any) => style,
        hairlineWidth: 1,
      },
      View: (props: any) => React.createElement('View', props, props.children),
      Text: (props: any) => React.createElement('Text', props, props.children),
      Pressable: ({ onPress, children, ...rest }: any) =>
        React.createElement('Pressable', { onClick: onPress, onPress, ...rest }, children),
      Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
    };
  },
  { virtual: true }
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('Ionicons', props),
    MaterialCommunityIcons: (props: any) => React.createElement('MaterialCommunityIcons', props),
  };
});

import { NowPlayingSecondaryBar } from '../components/NowPlayingSecondaryBar';

describe('NowPlayingSecondaryBar worst-case tests', () => {
  it('renders Solo and Party segmented pill when showQueue is false', () => {
    const onOpenPartyModal = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <NowPlayingSecondaryBar
          showLyrics={false}
          showQueue={false}
          onToggleLyrics={jest.fn()}
          onToggleQueue={jest.fn()}
          minTouchSize={48}
          onOpenPartyModal={onOpenPartyModal}
        />
      );
    });

    const root = renderer.root;
    const soloBtn = root.findAll((n) => n.props.accessibilityLabel === 'Solo listening mode')[0];
    const partyBtn = root.findAll((n) => n.props.accessibilityLabel === 'Listen together party mode')[0];

    expect(soloBtn).toBeDefined();
    expect(partyBtn).toBeDefined();

    act(() => {
      partyBtn!.props.onPress();
    });
    expect(onOpenPartyModal).toHaveBeenCalled();
  });

  it('renders Shuffle, Repeat, and Autoplay controls when showQueue is true', () => {
    const onToggleShuffle = jest.fn();
    const onToggleRepeat = jest.fn();
    const onToggleAutoplay = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <NowPlayingSecondaryBar
          showLyrics={false}
          showQueue={true}
          onToggleLyrics={jest.fn()}
          onToggleQueue={jest.fn()}
          minTouchSize={48}
          isShuffled={true}
          repeatMode="all"
          autoplayEnabled={true}
          onToggleShuffle={onToggleShuffle}
          onToggleRepeat={onToggleRepeat}
          onToggleAutoplay={onToggleAutoplay}
        />
      );
    });

    const root = renderer.root;
    const shuffleBtn = root.findAll((n) => n.props.accessibilityLabel?.includes('Shuffle'))[0];
    const repeatBtn = root.findAll((n) => n.props.accessibilityLabel?.includes('Repeat'))[0];
    const autoplayBtn = root.findAll((n) => n.props.accessibilityLabel?.includes('Autoplay'))[0];

    expect(shuffleBtn).toBeDefined();
    expect(repeatBtn).toBeDefined();
    expect(autoplayBtn).toBeDefined();

    act(() => {
      shuffleBtn!.props.onPress();
      repeatBtn!.props.onPress();
      autoplayBtn!.props.onPress();
    });

    expect(onToggleShuffle).toHaveBeenCalled();
    expect(onToggleRepeat).toHaveBeenCalled();
    expect(onToggleAutoplay).toHaveBeenCalled();
  });

  it('triggers onOpenOutputSheet when audio output text is pressed', () => {
    const onOpenOutputSheet = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <NowPlayingSecondaryBar
          showLyrics={false}
          showQueue={false}
          onToggleLyrics={jest.fn()}
          onToggleQueue={jest.fn()}
          minTouchSize={48}
          onOpenOutputSheet={onOpenOutputSheet}
        />
      );
    });

    const outputBtn = renderer.root.findAll((n) => n.props.accessibilityLabel === 'Audio output device')[0];
    expect(outputBtn).toBeDefined();

    act(() => {
      outputBtn!.props.onPress();
    });
    expect(onOpenOutputSheet).toHaveBeenCalled();
  });
});
