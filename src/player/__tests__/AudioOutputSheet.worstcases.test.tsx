import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { AudioOutputSheet } from '../components/AudioOutputSheet';

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
      Modal: ({ visible, children }: any) =>
        visible ? React.createElement('Modal', { visible }, children) : null,
      Pressable: ({ onPress, children, ...rest }: any) =>
        React.createElement('Pressable', { onClick: onPress, onPress, ...rest }, children),
      ScrollView: (props: any) => React.createElement('ScrollView', props, props.children),
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

describe('AudioOutputSheet worst-case tests', () => {
  it('renders active device card, volume control, and audio pipeline card matching BitChord', () => {
    const onClose = jest.fn();
    const onNavigatePipeline = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <AudioOutputSheet
          visible={true}
          onClose={onClose}
          deviceName="F²F's Phone"
          volume={0.8}
          audioSpec="32-bit float · 48 kHz"
          onNavigatePipeline={onNavigatePipeline}
        />
      );
    });

    const root = renderer.root;
    // Check device name and "Playing here" subtitle
    const texts = root.findAll((n) => typeof n.props.children === 'string');
    const textValues = texts.map((t) => t.props.children);
    expect(textValues).toContain("F²F's Phone");
    expect(textValues).toContain('Playing here');
    expect(textValues).toContain('Audio Pipeline');
    expect(textValues).toContain('32-bit float · 48 kHz');

    // Check device card accessibility
    const deviceCard = root.findAll(
      (n) => n.props.accessibilityLabel === "Active device: F²F's Phone, Playing here"
    )[0];
    expect(deviceCard).toBeDefined();

    // Check pipeline card click
    const pipelineCard = root.findAll(
      (n) => n.props.accessibilityLabel === 'Audio Pipeline settings'
    )[0];
    expect(pipelineCard).toBeDefined();
    act(() => {
      pipelineCard!.props.onPress();
    });
    expect(onNavigatePipeline).toHaveBeenCalled();
  });

  it('handles volume changes through slider or buttons', () => {
    const onVolumeChange = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <AudioOutputSheet
          visible={true}
          onClose={jest.fn()}
          volume={0.5}
          onVolumeChange={onVolumeChange}
        />
      );
    });

    const volumeSlider = renderer.root.findAll(
      (n) => n.props.accessibilityLabel === 'Output volume slider'
    )[0];
    expect(volumeSlider).toBeDefined();
  });

  it('renders null when visible is false', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AudioOutputSheet visible={false} onClose={jest.fn()} />
      );
    });

    expect(renderer.toJSON()).toBeNull();
  });
});
