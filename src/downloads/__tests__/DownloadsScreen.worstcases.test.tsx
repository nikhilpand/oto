import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Ensure React is marked as used
void React.version;

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
      TouchableOpacity: ({ onPress, children, ...rest }: any) =>
        React.createElement('TouchableOpacity', { onClick: onPress, onPress, ...rest }, children),
      Alert: {
        alert: (...args: any[]) => mockAlert(...args),
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

import { DownloadsScreenContent } from '../screens/DownloadsScreenContent';
import { useDownloadStore } from '../DownloadStore';

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  return {
    FlashList: ({ data, renderItem, keyExtractor }: any) => {
      return React.createElement(
        'View',
        { testID: 'flash-list' },
        data?.map((item: any, index: number) => {
          const key = keyExtractor ? keyExtractor(item, index) : index;
          return React.createElement(React.Fragment, { key }, renderItem({ item, index }));
        })
      );
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', { testID: 'expo-image', ...props }),
  };
});

jest.mock('@/components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

jest.mock('../DownloadStore', () => ({
  useDownloadStore: jest.fn(),
}));

jest.mock('../DownloadDB', () => ({
  getTotalDownloadedBytes: jest.fn(() => 10485760), // 10 MB
}));

jest.mock('../DownloadEngine', () => ({
  getDeviceStorageInfo: jest.fn().mockResolvedValue({
    freeBytes: 50 * 1024 * 1024 * 1024,
    totalBytes: 128 * 1024 * 1024 * 1024,
  }),
}));

describe('DownloadsScreen Worst-Case Tests', () => {
  const mockInit = jest.fn();
  const mockRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    (useDownloadStore as unknown as jest.Mock).mockReturnValue({
      records: [],
      init: mockInit,
      remove: mockRemove,
    });
  });

  function getAllTexts(renderer: TestRenderer.ReactTestRenderer): string[] {
    const textNodes = renderer.root.findAllByType('Text' as any);
    return textNodes.map((n) =>
      Array.isArray(n.props.children)
        ? n.props.children.join('')
        : String(n.props.children ?? '')
    );
  }

  it('renders safe empty state when no downloads exist', async () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<DownloadsScreenContent />);
    });

    expect(mockInit).toHaveBeenCalledTimes(1);
    const texts = getAllTexts(renderer!);
    expect(texts).toContain('No downloads yet');
    expect(texts.some((t) => t.includes('10.0 MB used'))).toBe(true);
  });

  it('renders active, queued, completed, and failed downloads with correct badges', async () => {
    const mockTrack = {
      id: 'track_1',
      title: 'Lossless Track',
      artist: 'BitChord Master',
      artists: ['BitChord Master'],
      album: 'Studio Vault',
      durationMs: 240000,
      artworkUrl: 'https://img.oto.music/art.jpg',
      thumbhash: '',
      isExplicit: false,
    };

    (useDownloadStore as unknown as jest.Mock).mockReturnValue({
      records: [
        {
          id: 'dl_active',
          track: { ...mockTrack, id: 'track_1', title: 'Active Stream' },
          localUri: '',
          fileSizeBytes: 20000000,
          status: 'downloading',
          progress: 0.65,
          createdAt: 1700000000000,
        },
        {
          id: 'dl_queued',
          track: { ...mockTrack, id: 'track_2', title: 'Queued Stream' },
          localUri: '',
          fileSizeBytes: 0,
          status: 'queued',
          progress: 0,
          createdAt: 1700000001000,
        },
        {
          id: 'dl_done',
          track: { ...mockTrack, id: 'track_3', title: 'Completed Master' },
          localUri: 'file:///data/track3.m4a',
          fileSizeBytes: 31457280, // 30 MB
          status: 'completed',
          progress: 1,
          createdAt: 1700000002000,
        },
        {
          id: 'dl_fail',
          track: { ...mockTrack, id: 'track_4', title: 'Failed Master' },
          localUri: '',
          fileSizeBytes: 0,
          status: 'failed',
          progress: 0.1,
          createdAt: 1700000003000,
        },
      ],
      init: mockInit,
      remove: mockRemove,
    });

    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<DownloadsScreenContent />);
    });

    const texts = getAllTexts(renderer!);

    expect(texts).toContain('Active Stream');
    expect(texts).toContain('Queued Stream');
    expect(texts).toContain('Completed Master');
    expect(texts).toContain('Failed Master');
    expect(texts).toContain('65%');
    expect(texts.some((t) => t.includes('30.0 MB'))).toBe(true);
    expect(texts).toContain('Queued');
    expect(texts).toContain('Failed');
  });

  it('triggers delete confirmation alert when remove button is pressed', async () => {
    const mockTrack = {
      id: 'track_1',
      title: 'Track To Remove',
      artist: 'Artist',
      artists: ['Artist'],
      album: 'Album',
      durationMs: 180000,
      artworkUrl: 'https://img.oto.music/art.jpg',
      thumbhash: '',
      isExplicit: false,
    };

    (useDownloadStore as unknown as jest.Mock).mockReturnValue({
      records: [
        {
          id: 'rec_to_delete',
          track: mockTrack,
          localUri: 'file:///path/to/song.m4a',
          fileSizeBytes: 15000000,
          status: 'completed',
          progress: 1,
          createdAt: 1700000000000,
        },
      ],
      init: mockInit,
      remove: mockRemove,
    });

    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<DownloadsScreenContent />);
    });

    const trashBtns = renderer!.root.findAll(
      (node) => (node.type as any) === 'TouchableOpacity' && node.props.accessibilityLabel === 'Remove Track To Remove'
    );
    expect(trashBtns.length).toBe(1);

    act(() => {
      trashBtns[0]?.props.onPress();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Remove Download',
      'Delete this file from device?',
      expect.any(Array)
    );

    const buttons = mockAlert.mock.calls[0][2];
    const deleteBtn = buttons?.find((b: any) => b.text === 'Delete');
    expect(deleteBtn).toBeDefined();

    act(() => {
      deleteBtn!.onPress!();
    });

    expect(mockRemove).toHaveBeenCalledWith('rec_to_delete');
  });
});
