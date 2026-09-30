import { StorybookViewer } from '@/design/stories/StorybookViewer';

/**
 * Main Home Tab View
 *
 * During active architecture & component slice phases (P0–P4), this mounts
 * the full interactive OTO Storybook Viewer, allowing verification of:
 * - Design tokens & typography
 * - OTOButton, OTOIconButton, OTOGlassSurface, OTOArtwork
 * - Dynamic OKLCH color extraction & contrast clamping
 * - 120Hz Audio Engine playhead interpolation & discrete controls
 * - P0 De-Risk Skia & Reanimated stack validation
 * - Quality Tier switches (T3, T2, T1, T0) and Reduced Motion mode
 */
export default function HomeScreen() {
  return <StorybookViewer />;
}
