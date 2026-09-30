import { Skia, SkRuntimeEffect } from '@shopify/react-native-skia';

/**
 * Atmospheric Liquid Background Runtime Shader (SkSL).
 *
 * Adapted from BitChord's AGSL runtime shader and specified in docs/DESIGN.md §6.
 * Creates an organic, dynamic multi-point gradient with radial vignette falloff
 * driven entirely on the GPU.
 */
export const ATMOSPHERE_SKSL = `
uniform float2 iResolution;
uniform float iTime;
uniform float4 uDominant;
uniform float4 uSecondary;
uniform float4 uAccent;
uniform float4 uShadow;

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    
    // Low-frequency organic drift
    float wave1 = sin(uv.x * 2.5 + iTime * 0.15) * 0.5 + 0.5;
    float wave2 = cos(uv.y * 3.0 - iTime * 0.12) * 0.5 + 0.5;
    float blend = clamp((wave1 + wave2) * 0.5, 0.0, 1.0);
    
    // Radial falloff towards vignette edges
    vec2 center = uv - vec2(0.5, 0.4);
    float dist = length(center);
    float vignette = smoothstep(0.85, 0.2, dist);
    
    vec4 color = mix(uShadow, uDominant, blend);
    color = mix(color, uSecondary, uv.y * 0.6);
    color += uAccent * (1.0 - smoothstep(0.0, 0.45, dist)) * 0.25;
    
    return color * vignette;
}
`;

let compiledEffect: SkRuntimeEffect | null = null;

/**
 * Compiles or returns cached atmosphere runtime effect.
 * Returns null safely in test or non-Skia environments without throwing.
 */
export function getAtmosphereRuntimeEffect(): SkRuntimeEffect | null {
  if (compiledEffect) {
    return compiledEffect;
  }

  try {
    if (Skia && typeof Skia.RuntimeEffect?.Make === 'function') {
      compiledEffect = Skia.RuntimeEffect.Make(ATMOSPHERE_SKSL);
      return compiledEffect;
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[OTO] Atmosphere SkSL shader compilation failed, falling back:', err);
    }
  }

  return null;
}
