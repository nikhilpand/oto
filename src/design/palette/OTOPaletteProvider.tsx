/**
 * OTOPaletteProvider.tsx — React context for current-track palette.
 *
 * Wraps the app (or player subtree) so any component can call
 * `usePaletteContext()` to read the active OTOPalette hex strings
 * or access shared values for Skia shader uniforms.
 *
 * Usage:
 *   <OTOPaletteProvider uri={currentTrack?.artworkUrl}>
 *     {children}
 *   </OTOPaletteProvider>
 */

import React, { createContext, useContext } from 'react';
import { usePalette, UsePaletteResult } from './usePalette';
import { OTOPalette } from './quantize';

const FALLBACK_PALETTE: OTOPalette = {
  dominant: '#1A1B1F',
  secondary: '#2C2D32',
  accent: '#E5A93C',
  shadow: '#080809',
  highlight: '#3A3B40',
};

const PaletteContext = createContext<UsePaletteResult>({
  palette: FALLBACK_PALETTE,
  sharedValues: {
    dominantRGB: { value: [0.1, 0.106, 0.122] } as ReturnType<typeof import('react-native-reanimated').useSharedValue<[number, number, number]>>,
    accentRGB: { value: [0.898, 0.663, 0.235] } as ReturnType<typeof import('react-native-reanimated').useSharedValue<[number, number, number]>>,
    highlightRGB: { value: [0.227, 0.231, 0.251] } as ReturnType<typeof import('react-native-reanimated').useSharedValue<[number, number, number]>>,
  },
});

export interface OTOPaletteProviderProps {
  uri: string | null | undefined;
  children: React.ReactNode;
}

export function OTOPaletteProvider({ uri, children }: OTOPaletteProviderProps) {
  const result = usePalette(uri);
  return (
    <PaletteContext.Provider value={result}>
      {children}
    </PaletteContext.Provider>
  );
}

/** Hook: read active palette hex strings (causes 1 React re-render per track change) */
export function usePaletteContext(): UsePaletteResult {
  return useContext(PaletteContext);
}
