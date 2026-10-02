/**
 * @/design/palette — OTO Dynamic Color Pipeline
 *
 * Public API:
 *   import { OTOPaletteProvider, usePaletteContext } from '@/design/palette';
 *   import { usePalette } from '@/design/palette';
 *   import type { OTOPalette } from '@/design/palette';
 */

export { OTOPaletteProvider, usePaletteContext } from './OTOPaletteProvider';
export { usePalette } from './usePalette';
export type { OTOPalette } from './quantize';
export type { UsePaletteResult, PaletteSharedValues } from './usePalette';
