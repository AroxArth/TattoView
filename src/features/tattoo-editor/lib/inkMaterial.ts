/**
 * Shader surgery that makes a decal read as ink *under* the skin instead of paint
 * on top of it.
 *
 * THE PHYSICAL MODEL
 *
 * Tattoo pigment is deposited in the dermis, with the epidermis still on top of
 * it. Light reaches the pigment through living tissue and scatters back out
 * through it, which produces three effects a plain textured quad cannot fake:
 *
 *  1. Ink SUBTRACTS light, it never adds any. A tattoo can only ever be darker
 *     than the skin around it — which is exactly what a multiply blend does.
 *  2. Multiplying against the already-lit skin means the ink inherits the skin's
 *     shading, shadows and specular for free. No second lighting pass, and the
 *     tattoo can never look brighter than the limb it sits on.
 *  3. The tissue above the pigment scatters short wavelengths, so buried black
 *     ink reads blue-grey rather than black, and every hue loses saturation.
 *
 * WHY THE MATERIAL IS STILL MeshStandardMaterial
 *
 * The lighting it computes is thrown away (see the injection below), so a basic
 * material would be cheaper. It stays standard because the grazing-angle fade
 * needs `vec3 normal` in scope in the fragment shader, and only the lit shaders
 * run `normal_fragment_begin`. Correct beats cheap on a mesh this small.
 *
 * THE BLENDING CONTRACT — all three of these are required together
 *
 *   blending          = MultiplyBlending
 *   premultipliedAlpha = true   <- three ERRORS OUT on MultiplyBlending without it
 *   toneMapped         = false
 *
 * three 0.185 maps MultiplyBlending to
 *   blendFuncSeparate(DST_COLOR, ONE_MINUS_SRC_ALPHA, ZERO, ONE)
 * only on the premultiplied branch; the non-premultiplied branch logs
 * "MultiplyBlending requires material.premultipliedAlpha = true" and sets no blend
 * function at all. With it, the framebuffer result is
 *
 *   dst * srcRGB + dst * (1 - srcA)   =   dst * mix(1, ink, coverage)
 *
 * once `premultiplied_alpha_fragment` has multiplied our RGB by our alpha. So the
 * shader outputs the raw ink colour in `.rgb` and the coverage in `.a`, and three
 * premultiplies it for us — after the colour-space conversion, which is what makes
 * this a Photoshop-style multiply in display space rather than a linear one.
 *
 * `toneMapped = false` is not cosmetic either. Tone mapping runs on gl_FragColor
 * right after our injection point, and ACES maps 1.0 to roughly 0.8 — every
 * *transparent* texel would come out as a grey wash darkening the whole limb.
 */
import { Color, Vector3 } from 'three'
import type { WebGLProgramParametersWithUniforms } from 'three'

/**
 * Colour buried pigment converges toward as it settles deeper.
 *
 * Cool on purpose. The warmth in a healed tattoo comes from the multiply against
 * warm skin, not from the pigment — tinting the ink warm as well double-counts it
 * and turns black work muddy brown.
 */
const DERMIS_TINT = new Color(0.32, 0.36, 0.44)

/** Luminance weights (Rec. 709), used to desaturate toward perceived brightness. */
const LUMA = 'vec3(0.2126, 0.7152, 0.0722)'

/**
 * Distinguishes this program from a stock MeshStandardMaterial.
 *
 * three caches compiled programs by material parameters and does NOT account for
 * `onBeforeCompile`. The body skin is also a MeshStandardMaterial, so without a
 * distinct key the two could share one program and the ink blend would land on the
 * skin, or never land at all.
 */
export const INK_PROGRAM_CACHE_KEY = () => 'tattoo-decal-subsurface-ink'

export interface InkUniforms {
  /** Projection axis in world space. Equals the design's stored surface normal. */
  uProjAxis: { value: Vector3 }
  /** 0 = pigment sitting on the surface, 1 = fully settled in the dermis. */
  uDepth: { value: number }
  /** Overall pigment density. Drives coverage, not a naive alpha fade. */
  uDensity: { value: number }
  uDermisTint: { value: Color }
}

export function createInkUniforms(): InkUniforms {
  return {
    uProjAxis: { value: new Vector3(0, 0, 1) },
    uDepth: { value: 0.55 },
    uDensity: { value: 0.9 },
    uDermisTint: { value: DERMIS_TINT.clone() },
  }
}

/**
 * Builds the `onBeforeCompile` hook for a given uniform set.
 *
 * The uniform object must be stable across renders and mutated in place — three
 * keeps the reference it was handed at compile time, so replacing the object
 * silently stops updating the shader.
 */
export function inkShaderPatch(uniforms: InkUniforms) {
  return (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uProjAxis = uniforms.uProjAxis
    shader.uniforms.uDepth = uniforms.uDepth
    shader.uniforms.uDensity = uniforms.uDensity
    shader.uniforms.uDermisTint = uniforms.uDermisTint

    // The projection axis cannot be read from the decal's own matrix: drei
    // consumes position/rotation/scale to BUILD the DecalGeometry and leaves the
    // mesh at identity, with the vertices baked into the parent's space. Reading
    // `normalMatrix * vec3(0,0,1)` there returns the camera's axis, not the
    // projector's.
    shader.vertexShader = `uniform vec3 uProjAxis;\nvarying vec3 vProjAxis;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vProjAxis = normalize(mat3(viewMatrix) * uProjAxis);`,
    )

    shader.fragmentShader = `
      varying vec3 vProjAxis;
      uniform float uDepth;
      uniform float uDensity;
      uniform vec3 uDermisTint;
      ${shader.fragmentShader}
    `.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>

       // DecalGeometry is a box projection: the texture is cast along one axis
       // like a slide projector, so each texel covers progressively more skin as
       // the surface turns away from it, approaching infinite stretch at 90
       // degrees. This is projection maths, not mesh resolution — a denser mesh
       // smears identically. The only real fix is to stop drawing where the
       // projection stops being valid.
       float facing = dot(normalize(normal), normalize(vProjAxis));
       float coverage = diffuseColor.a * uDensity * smoothstep(0.02, 0.30, facing);
       if (coverage < 0.004) discard;

       vec3 ink = diffuseColor.rgb;

       // Tissue above the pigment scatters hue out of it, so buried ink is always
       // less saturated than the bottle it came from.
       float inkLuma = dot(ink, ${LUMA});
       ink = mix(ink, vec3(inkLuma), uDepth * 0.55);

       // ...and pushes what is left toward the dermis colour, which is why no
       // tattoo ever reads as pure black on real skin.
       ink = mix(ink, uDermisTint, uDepth * (1.0 - inkLuma) * 0.85);

       // Ink is written raw here and premultiplied by three AFTER the colour-space
       // conversion, which turns the multiply blend into a display-space one.
       gl_FragColor = vec4(ink, coverage);`,
    )
  }
}
