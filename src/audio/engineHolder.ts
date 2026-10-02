/**
 * Global AudioEngine Holder
 *
 * Lightweight registry allowing headless tasks, background services,
 * and non-React subsystems (like SleepTimer) to access the active AudioEngine
 * without importing the full React AudioContext or native dependencies.
 */

import type { AudioEngine } from './AudioEngine';

let globalAudioEngine: AudioEngine | null = null;

export function getGlobalAudioEngine(): AudioEngine | null {
  return globalAudioEngine;
}

export function setGlobalAudioEngine(engine: AudioEngine | null): void {
  globalAudioEngine = engine;
}
