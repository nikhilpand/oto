import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Ensure React is marked as used
void React.version;

const mockPush = jest.fn();
const mockAlert = jest.fn();

jest.mock(
  'react-native',
  () => {
    const React = require('react');
    return {
      StyleSheet: {
        create: (styles: any) => styles,
        flatten: (style: any) => style,
      },
      View: (props: any) => React.createElement('View', props, props.children),
      Text: (props: any) => React.createElement('Text', props, props.children),
      ScrollView: (props: any) => React.createElement('ScrollView', props, props.children),
      TextInput: (props: any) => React.createElement('TextInput', props),
      TouchableOpacity: ({ onPress, children, ...rest }: any) =>
        React.createElement('TouchableOpacity', { onClick: onPress, onPress, ...rest }, children),
      Alert: {
        alert: (...args: any[]) => mockAlert(...args),
      },
      Linking: {
        openURL: jest.fn(),
      },
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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock('@/auth/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    isSignedIn: true,
    activeProfile: { email: 'nikhil@oto.test', name: 'Nikhil' },
    promptSignIn: jest.fn(),
  }),
}));

jest.mock('@/audio/cache/StreamCache', () => ({
  clearStreamCache: jest.fn().mockResolvedValue(undefined),
  getCachedTotalBytes: jest.fn(() => 52428800),
}));

import { SettingsScreenContent } from '../screens/SettingsScreenContent';
import { AppSettings } from '@/store/settings/AppSettings';

describe('SettingsScreen Worst-Case Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockPush.mockClear();
    AppSettings.reset();
  });

  function getAllTexts(renderer: TestRenderer.ReactTestRenderer): string[] {
    const textNodes = renderer.root.findAllByType('Text' as any);
    return textNodes.map((n) =>
      Array.isArray(n.props.children)
        ? n.props.children.join('')
        : String(n.props.children ?? '')
    );
  }

  it('renders all BitChord-aligned sections and initial state cleanly', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<SettingsScreenContent />);
    });

    const texts = getAllTexts(renderer!);
    expect(texts).toContain('Settings');
    expect(texts).toContain('Account & integrations');
    expect(texts).toContain('nikhil@oto.test');
    expect(texts).toContain('AUDIO QUALITY');
    expect(texts).toContain('PLAYBACK');
    expect(texts).toContain('APPEARANCE');
    expect(texts).toContain('PERFORMANCE');
    expect(texts).toContain('STORAGE');
    expect(texts).toContain('oto 1.0');
    expect(texts).toContain('~YouTube Music & Listen Together Backend');
  });

  it('toggles SettingSwitch and updates AppSettings store', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<SettingsScreenContent />);
    });

    const switchNodes = renderer!.root.findAll(
      (node) => (node.type as any) === 'TouchableOpacity' && node.props.accessibilityRole === 'switch'
    );
    expect(switchNodes.length).toBeGreaterThanOrEqual(5);

    const preferMusicOnlySwitch = switchNodes.find(
      (n) => n.props.accessibilityLabel === 'Prefer music-only version'
    );
    expect(preferMusicOnlySwitch).toBeDefined();

    act(() => {
      preferMusicOnlySwitch!.props.onPress();
    });

    expect(AppSettings.get('preferMusicOnly')).toBe(true);
  });

  it('switches segmented control values for Theme and Output Precision', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<SettingsScreenContent />);
    });

    const buttons = renderer!.root.findAll(
      (node) => (node.type as any) === 'TouchableOpacity' && node.props.accessibilityRole === 'button'
    );

    const lightThemeTab = buttons.find((b) => {
      const texts = b.findAllByType('Text' as any).map((t: any) => t.props.children);
      return texts.includes('Light');
    });
    expect(lightThemeTab).toBeDefined();

    act(() => {
      lightThemeTab!.props.onPress();
    });

    expect(AppSettings.get('theme')).toBe('light');

    const pcmTab = buttons.find((b) => {
      const texts = b.findAllByType('Text' as any).map((t: any) => t.props.children);
      return texts.includes('16-bit PCM');
    });
    expect(pcmTab).toBeDefined();

    act(() => {
      pcmTab!.props.onPress();
    });

    expect(AppSettings.get('outputPrecision')).toBe('16bit');
  });

  it('navigates to offline downloads screen when Manage offline downloads is pressed', () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<SettingsScreenContent />);
    });

    const manageDownloadsBtn = renderer!.root.findAll(
      (node) =>
        (node.type as any) === 'TouchableOpacity' &&
        node.props.accessibilityLabel === 'Manage offline downloads'
    );
    expect(manageDownloadsBtn.length).toBe(1);

    act(() => {
      manageDownloadsBtn[0]?.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith('/downloads');
  });
});
