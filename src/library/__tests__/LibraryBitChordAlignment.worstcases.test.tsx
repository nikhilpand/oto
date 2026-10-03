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

import { ListeningExperienceCarousel } from '../components/ListeningExperienceCarousel';
import { OnDeviceHubSection } from '../components/OnDeviceHubSection';

describe('Library BitChord Alignment worst-case tests', () => {
  it('renders ListeningExperienceCarousel with minutes listened and top artist matching BitChord', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ListeningExperienceCarousel
          minutesListened={80}
          topTrackTitle="Oh, Pretty Woman"
          topTrackArtist="Roy Orbison"
          totalPlays={12}
        />
      );
    });

    const root = renderer.root;
    const texts = root.findAll((n) => typeof n.props.children === 'string');
    const textValues = texts.map((t) => t.props.children);

    expect(textValues).toContain('YOUR LISTENING EXPERIENCE');
    expect(textValues).toContain('80 MINUTES LISTENED');
    expect(textValues).toContain('Roy Orbison · Oh, Pretty Woman');

    const card = root.findAll((n) => n.props.accessibilityLabel?.includes('80 minutes listened'))[0];
    expect(card).toBeDefined();
  });

  it('renders OnDeviceHubSection with Downloads, Local Music, and WebDAV cards', () => {
    const onDownloadsPress = jest.fn();
    const onLocalPress = jest.fn();
    const onWebDAVPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <OnDeviceHubSection
          downloadCount={5}
          onDownloadsPress={onDownloadsPress}
          onLocalPress={onLocalPress}
          onWebDAVPress={onWebDAVPress}
        />
      );
    });

    const root = renderer.root;
    const downloadsCard = root.findAll((n) => n.props.accessibilityLabel === 'Offline downloads: 5 tracks')[0];
    const localCard = root.findAll((n) => n.props.accessibilityLabel === 'Local device music')[0];
    const webdavCard = root.findAll((n) => n.props.accessibilityLabel === 'WebDAV network storage')[0];

    expect(downloadsCard).toBeDefined();
    expect(localCard).toBeDefined();
    expect(webdavCard).toBeDefined();

    act(() => {
      downloadsCard!.props.onPress();
      localCard!.props.onPress();
      webdavCard!.props.onPress();
    });

    expect(onDownloadsPress).toHaveBeenCalled();
    expect(onLocalPress).toHaveBeenCalled();
    expect(onWebDAVPress).toHaveBeenCalled();
  });
});
