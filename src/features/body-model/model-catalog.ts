/**
 * Body models shipped with the app.
 *
 * Every entry is CC-BY-4.0. That license permits commercial use but REQUIRES
 * author credit, so `attribution` is not decorative metadata — it is a legal
 * obligation rendered by the credits screen. Do not add a model here without it.
 *
 * `defaultReferenceCm` is a typical adult measurement used only as a starting
 * hint for calibration; the user is expected to override it with the real one.
 */
export interface BodyModelEntry {
  id: string
  /**
   * Developer-facing name. What the user reads comes from the dictionary via
   * `modelLabelKey(id)` — this one shows up in consoles and session files and
   * should not shift with the UI language.
   */
  label: string
  /** Path under public/, produced by `pnpm prepare:model`. */
  url: string
  /** Developer-facing; the shown text is `modelMeasurementKey(id)`. */
  measurementLabel: string
  defaultReferenceCm: number
  attribution: {
    title: string
    author: string
    authorUrl: string
    sourceUrl: string
    license: string
    licenseUrl: string
  }
}

export const BODY_MODELS: BodyModelEntry[] = [
  {
    id: 'forearm',
    label: 'Forearm',
    url: '/models/forearm.glb',
    measurementLabel: 'Elbow to fingertips',
    defaultReferenceCm: 45,
    attribution: {
      title: 'arm',
      author: 'DJMaesen',
      authorUrl: 'https://sketchfab.com/bumstrum',
      sourceUrl: 'https://sketchfab.com/3d-models/arm-696f4493d39a44d7b5cf4c85b4239ae8',
      license: 'CC-BY-4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
  {
    id: 'fullarm',
    label: 'Full arm',
    url: '/models/fullarm.glb',
    measurementLabel: 'Shoulder to fingertips',
    defaultReferenceCm: 75,
    attribution: {
      title: 'Anatomy - male arm',
      author: '3dmaven',
      authorUrl: 'https://sketchfab.com/3Dmaven',
      sourceUrl:
        'https://sketchfab.com/3d-models/anatomy-male-arm-af9a4101fa2c483cab363cf0a629762f',
      license: 'CC-BY-4.0',
      licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
    },
  },
]

export const DEFAULT_MODEL_ID = 'forearm'

export function getModel(id: string): BodyModelEntry {
  return BODY_MODELS.find((model) => model.id === id) ?? BODY_MODELS[0]
}
