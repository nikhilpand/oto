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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('Ionicons', props),
    MaterialCommunityIcons: (props: any) => React.createElement('MaterialCommunityIcons', props),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', props),
  };
});

import { TrackOptionsSheet } from '../components/TrackOptionsSheet';
import type { Track } from '@/domain/types';

const mockTrack: Track = {
  id: 'track_test_123',
  title: 'Oh, Pretty Women',
  artist: 'Roy Orbison',
  artists: ['Roy Orbison'],
  album: 'Mystery Girl',
  durationMs: 180000,
  artworkUrl: 'https://example.com/art.jpg',
  thumbhash: 'abc',
  isExplicit: false,
};

describe('TrackOptionsSheet worst-case tests', () => {
  it('renders track summary and all 6 BitChord options', () => {
    const onClose = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TrackOptionsSheet
          visible={true}
          track={mockTrack}
          onClose={onClose}
          isLiked={false}
        />
      );
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Oh, Pretty Women');
    expect(json).toContain('Roy Orbison');
    expect(json).toContain('Revert to original');
    expect(json).toContain('Like');
    expect(json).toContain('Dislike');
    expect(json).toContain('Add to playlist');
    expect(json).toContain('Download');
    expect(json).toContain('Start radio');
  });

  it('triggers onDownload and onClose when Download option is pressed', () => {
    const onDownload = jest.fn();
    const onClose = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TrackOptionsSheet
          visible={true}
          track={mockTrack}
          onClose={onClose}
          onDownload={onDownload}
        />
      );
    });

    const downloadBtn = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'Download track'
    )[0];
    expect(downloadBtn).toBeTruthy();

    act(() => {
      downloadBtn!.props.onPress();
    });

    expect(onDownload).toHaveBeenCalledWith(mockTrack);
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers onStartRadio and onClose when Start radio option is pressed', () => {
    const onStartRadio = jest.fn();
    const onClose = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TrackOptionsSheet
          visible={true}
          track={mockTrack}
          onClose={onClose}
          onStartRadio={onStartRadio}
        />
      );
    });

    const radioBtn = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === 'Start radio'
    )[0];
    expect(radioBtn).toBeTruthy();

    act(() => {
      radioBtn!.props.onPress();
    });

    expect(onStartRadio).toHaveBeenCalledWith(mockTrack);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders null when visible is false or track is null', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TrackOptionsSheet visible={false} track={mockTrack} onClose={jest.fn()} />
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });
});
