import { useState, useEffect, useCallback } from 'react';
import { AppSettings, type AppSettingsData } from '@/store/settings/AppSettings';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettingsData>(() => AppSettings.getAll());

  useEffect(() => {
    return AppSettings.subscribe((newSettings) => {
      setSettingsState(newSettings);
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettingsData>(key: K, value: AppSettingsData[K]) => {
    AppSettings.set({ [key]: value } as Partial<AppSettingsData>);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettingsData>) => {
    AppSettings.set(partial);
  }, []);

  const resetSettings = useCallback(() => {
    AppSettings.reset();
  }, []);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  };
}
