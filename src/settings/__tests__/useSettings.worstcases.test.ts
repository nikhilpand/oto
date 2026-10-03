import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppSettings } from '@/store/settings/AppSettings';
import { useSettings } from '../hooks/useSettings';

function renderHook(): { current: ReturnType<typeof useSettings> } {
  const returnVal: { current: ReturnType<typeof useSettings> } = {} as any;
  function TestComponent() {
    returnVal.current = useSettings();
    return null;
  }
  act(() => {
    TestRenderer.create(React.createElement(TestComponent));
  });
  return returnVal;
}

describe('useSettings & AppSettings Worst-Case Tests', () => {
  beforeEach(() => {
    AppSettings.reset();
  });

  it('provides safe default settings without crashing', () => {
    const result = renderHook();
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.outputPrecision).toBe('32bit_float');
    expect(result.current.settings.audioQuality).toBe('high');
    expect(result.current.settings.dolbyAtmos).toBe(true);
    expect(result.current.settings.cacheLimitMb).toBe(500);
  });

  it('reactively updates setting and notifies hook listeners', () => {
    const result = renderHook();

    act(() => {
      result.current.updateSetting('theme', 'light');
    });

    expect(result.current.settings.theme).toBe('light');
    expect(AppSettings.get('theme')).toBe('light');

    act(() => {
      result.current.updateSetting('outputPrecision', '16bit');
    });

    expect(result.current.settings.outputPrecision).toBe('16bit');
    expect(AppSettings.get('outputPrecision')).toBe('16bit');
  });

  it('handles batch updates with updateSettings', () => {
    const result = renderHook();

    act(() => {
      result.current.updateSettings({
        crossfadeDurationMs: 4000,
        skipSilence: true,
        highPerformanceMode: true,
      });
    });

    expect(result.current.settings.crossfadeDurationMs).toBe(4000);
    expect(result.current.settings.skipSilence).toBe(true);
    expect(result.current.settings.highPerformanceMode).toBe(true);
  });

  it('restores all default values when resetSettings is called', () => {
    const result = renderHook();

    act(() => {
      result.current.updateSetting('theme', 'light');
      result.current.updateSetting('crossfadeDurationMs', 8000);
    });

    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.crossfadeDurationMs).toBe(8000);

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.crossfadeDurationMs).toBe(0);
  });
});
