/**
 * Turning the live viewport into a shareable image.
 *
 * The point is not a screenshot — the user can already take one. The point is a
 * frame the artist can send to a client or print: a chosen backdrop instead of the
 * editor's dark studio, and enough resolution that the linework survives.
 *
 * Everything here mutates the renderer for the duration of one frame and puts it
 * back. That is why each helper takes and returns an explicit snapshot of what it
 * touched: a capture that throws halfway must not leave the editor rendering at 3x
 * pixel ratio on a white background forever.
 */
import { Color, Spherical, Vector3 } from 'three'
import type { Camera, Scene, WebGLRenderer } from 'three'

import type { CaptureBackground } from '@/features/tattoo-editor/store/editorStore'

/** Matches the editor's own backdrop, so "studio" reproduces what is on screen. */
const STUDIO_COLOR = '#121215'

const BACKGROUND_COLORS: Record<Exclude<CaptureBackground, 'transparent'>, string> = {
  studio: STUDIO_COLOR,
  white: '#ffffff',
  black: '#000000',
}

/** Name given to the ground shadow so a capture can hide it when it would show. */
export const GROUND_SHADOW_NAME = 'ground-shadow'

interface RendererSnapshot {
  pixelRatio: number
  background: Scene['background']
  clearAlpha: number
  groundVisible: boolean | null
}

function applyCaptureSettings(
  gl: WebGLRenderer,
  scene: Scene,
  background: CaptureBackground,
  scale: number,
): RendererSnapshot {
  const ground = scene.getObjectByName(GROUND_SHADOW_NAME)

  const snapshot: RendererSnapshot = {
    pixelRatio: gl.getPixelRatio(),
    background: scene.background,
    clearAlpha: gl.getClearAlpha(),
    groundVisible: ground ? ground.visible : null,
  }

  // setPixelRatio resizes the drawing buffer without touching the CSS size, so the
  // camera aspect — and therefore the framing the user set up — is preserved.
  gl.setPixelRatio(scale)

  if (background === 'transparent') {
    scene.background = null
    gl.setClearAlpha(0)
    // A contact shadow floating on nothing reads as a grey smudge once the image is
    // composited over something else.
    if (ground) ground.visible = false
  } else {
    scene.background = new Color(BACKGROUND_COLORS[background])
    gl.setClearAlpha(1)
  }

  return snapshot
}

function restore(gl: WebGLRenderer, scene: Scene, snapshot: RendererSnapshot): void {
  gl.setPixelRatio(snapshot.pixelRatio)
  scene.background = snapshot.background
  gl.setClearAlpha(snapshot.clearAlpha)

  const ground = scene.getObjectByName(GROUND_SHADOW_NAME)
  if (ground && snapshot.groundVisible !== null) ground.visible = snapshot.groundVisible
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not encode the frame'))
    }, 'image/png')
  })
}

/** Renders one frame with the capture settings applied and returns it as a PNG. */
export async function captureFrame(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  background: CaptureBackground,
  scale: number,
): Promise<Blob> {
  const snapshot = applyCaptureSettings(gl, scene, background, scale)
  try {
    gl.render(scene, camera)
    return await toBlob(gl.domElement)
  } finally {
    restore(gl, scene, snapshot)
  }
}

/**
 * Renders the model from `count` angles evenly spaced around the orbit target.
 *
 * The camera's distance and height are the ones the user already chose — only the
 * azimuth changes — so the set reads as one shoot rather than four unrelated
 * renders. The original position is restored even if a frame fails.
 */
export async function captureTurntable(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  target: Vector3,
  background: CaptureBackground,
  scale: number,
  count: number,
): Promise<Blob[]> {
  const originalPosition = camera.position.clone()
  const originalQuaternion = camera.quaternion.clone()

  const spherical = new Spherical().setFromVector3(camera.position.clone().sub(target))
  const baseTheta = spherical.theta
  const offset = new Vector3()
  const frames: Blob[] = []

  try {
    for (let index = 0; index < count; index += 1) {
      spherical.theta = baseTheta + (index * Math.PI * 2) / count
      camera.position.copy(target).add(offset.setFromSpherical(spherical))
      camera.lookAt(target)
      camera.updateMatrixWorld()

      frames.push(await captureFrame(gl, scene, camera, background, scale))
    }
  } finally {
    camera.position.copy(originalPosition)
    camera.quaternion.copy(originalQuaternion)
    camera.updateMatrixWorld()
  }

  return frames
}

/** Stable, sortable, and readable in a phone gallery. */
export function captureFilename(index?: number): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  return index === undefined
    ? `tattooview-${stamp}.png`
    : `tattooview-${stamp}-${String(index + 1).padStart(2, '0')}.png`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
