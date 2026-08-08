import { create } from 'zustand'

import { DEFAULT_MODEL_ID, getModel } from '@/features/body-model/model-catalog'
import { DEFAULT_SKIN_TONE_ID } from '@/features/body-model/skin-tones'
import { releaseUnreachable, trackTexture } from '@/features/tattoo-editor/lib/textureRegistry'

/**
 * A tattoo placed on the 3D body model.
 *
 * Orientation is stored as a surface `normal` plus a `roll` angle rather than a
 * baked euler. The normal comes from the surface and only changes when the design
 * moves; the roll is the user's choice and must stay independent, otherwise
 * rotating a design would require re-deriving it from a raycast it no longer has.
 *
 * `position` and `normal` live in the LOCAL space of the body mesh, which is what
 * `<Decal>` expects since the decal is mounted as a child of that mesh.
 */
export interface TattooDesign {
  id: string
  name: string
  /** Object URL of the processed design. Owned by `textureRegistry`. */
  textureUrl: string
  /** Intrinsic pixel aspect ratio (width / height) of the image. */
  aspect: number
  position: [number, number, number]
  normal: [number, number, number]
  /** Rotation around the surface normal, in radians. */
  roll: number
  /** Width of the decal in world units. Height is derived from `aspect`. */
  widthUnits: number
  /** Pigment density, 0..1. Fed to the ink shader as coverage. */
  opacity: number
  /** How deep the pigment sits, 0..1. Drives desaturation and the dermis tint. */
  inkDepth: number
  /** False until the user has clicked the model to anchor it. */
  isPlaced: boolean
}

export type NewDesign = Pick<TattooDesign, 'id' | 'name' | 'textureUrl' | 'aspect'>

export type CaptureBackground = 'studio' | 'white' | 'black' | 'transparent'
export type CaptureMode = 'current' | 'turntable'

export interface CaptureRequest {
  /** Changes on every request so the rig re-fires even for identical settings. */
  token: number
  mode: CaptureMode
}

/** The part of the editor that undo and redo move through. */
interface EditorDocument {
  designs: TattooDesign[]
  selectedId: string | null
  modelId: string
  skinToneId: string
  referenceLengthCm: number | null
}

interface HistoryEntry {
  document: EditorDocument
}

/**
 * Consecutive changes sharing a merge key collapse into one history entry while
 * they keep arriving inside this window. Without it a single drag of the size
 * slider buries every earlier action under a hundred one-pixel steps.
 */
const MERGE_WINDOW_MS = 600

/** Bounds memory, and bounds how long a deleted texture stays reachable. */
const HISTORY_LIMIT = 60

interface EditorState extends EditorDocument {
  /** When true, the next click on the body mesh anchors the selected design. */
  isPlacing: boolean
  /** True while the user drags a placed design across the skin. */
  isDragging: boolean

  /**
   * Length of the loaded body model along its dominant axis, in world units.
   * Measured from the mesh bounding box once the model is ready.
   */
  modelLengthUnits: number | null

  captureBackground: CaptureBackground
  captureScale: number
  captureRequest: CaptureRequest | null

  past: HistoryEntry[]
  future: HistoryEntry[]

  addDesign: (design: NewDesign) => void
  removeDesign: (id: string) => void
  selectDesign: (id: string | null) => void
  setPlacing: (isPlacing: boolean) => void
  setDragging: (isDragging: boolean) => void
  /** Anchors the selected design and leaves placement mode. */
  placeSelected: (position: [number, number, number], normal: [number, number, number]) => void
  /** Moves an already-placed design without leaving drag mode. */
  moveDesign: (
    id: string,
    position: [number, number, number],
    normal: [number, number, number],
  ) => void
  updateSelected: (
    patch: Partial<Pick<TattooDesign, 'widthUnits' | 'opacity' | 'roll' | 'inkDepth'>>,
  ) => void
  setModelLengthUnits: (length: number) => void
  setReferenceLengthCm: (cm: number | null) => void
  setModelId: (id: string, defaultReferenceCm: number) => void
  setSkinToneId: (id: string) => void

  setCaptureBackground: (background: CaptureBackground) => void
  setCaptureScale: (scale: number) => void
  requestCapture: (mode: CaptureMode) => void
  clearCaptureRequest: () => void

  /** Replaces the whole document from a loaded file and resets history. */
  loadDocument: (document: EditorDocument) => void
  undo: () => void
  redo: () => void
}

function snapshot(state: EditorDocument): HistoryEntry {
  return {
    document: {
      designs: state.designs,
      selectedId: state.selectedId,
      modelId: state.modelId,
      skinToneId: state.skinToneId,
      referenceLengthCm: state.referenceLengthCm,
    },
  }
}

/** Every texture the user can still reach by undoing or redoing. */
function reachableTextures(
  present: EditorDocument,
  past: HistoryEntry[],
  future: HistoryEntry[],
): Set<string> {
  const urls = new Set<string>()
  for (const design of present.designs) urls.add(design.textureUrl)
  for (const entry of [...past, ...future]) {
    for (const design of entry.document.designs) urls.add(design.textureUrl)
  }
  return urls
}

/**
 * Last merge key seen and when. Module scope rather than store state because it is
 * bookkeeping about *how* the state changed, never rendered, and keeping it out of
 * the store avoids re-rendering every subscriber on a slider tick.
 */
let lastMerge: { key: string; at: number } | null = null

export const useEditorStore = create<EditorState>((set, get) => {
  /**
   * Applies a document change and records it in history.
   *
   * `mergeKey` collapses a burst of changes of the same kind — a slider drag, a
   * pointer move — into a single undo step.
   */
  function commit(
    updater: (document: EditorDocument) => Partial<EditorDocument>,
    mergeKey?: string,
  ) {
    set((state) => {
      const patch = updater(state)
      const next: EditorDocument = {
        designs: patch.designs ?? state.designs,
        selectedId: patch.selectedId !== undefined ? patch.selectedId : state.selectedId,
        modelId: patch.modelId ?? state.modelId,
        skinToneId: patch.skinToneId ?? state.skinToneId,
        referenceLengthCm:
          patch.referenceLengthCm !== undefined ? patch.referenceLengthCm : state.referenceLengthCm,
      }

      const now = Date.now()
      const merges =
        mergeKey !== undefined && lastMerge?.key === mergeKey && now - lastMerge.at < MERGE_WINDOW_MS

      lastMerge = mergeKey === undefined ? null : { key: mergeKey, at: now }

      const past = merges ? state.past : [...state.past, snapshot(state)].slice(-HISTORY_LIMIT)

      // Any new action invalidates the redo branch — that branch is now
      // unreachable, so its textures become collectable in the same pass.
      releaseUnreachable(reachableTextures(next, past, []))

      return { ...next, past, future: [] }
    })
  }

  return {
    designs: [],
    selectedId: null,
    modelId: DEFAULT_MODEL_ID,
    skinToneId: DEFAULT_SKIN_TONE_ID,
    referenceLengthCm: getModel(DEFAULT_MODEL_ID).defaultReferenceCm,

    isPlacing: false,
    isDragging: false,
    modelLengthUnits: null,

    captureBackground: 'studio',
    captureScale: 2,
    captureRequest: null,

    past: [],
    future: [],

    addDesign: (design) => {
      trackTexture(design.textureUrl)
      commit((state) => ({
        designs: [
          ...state.designs,
          {
            ...design,
            position: [0, 0, 0],
            normal: [0, 0, 1],
            roll: 0,
            widthUnits: 0.25,
            opacity: 0.9,
            inkDepth: 0.55,
            isPlaced: false,
          },
        ],
        selectedId: design.id,
      }))
      set({ isPlacing: true })
    },

    // No revoke here on purpose: undo must be able to bring the design back.
    // `textureRegistry` frees the url once no history entry can reach it.
    removeDesign: (id) =>
      commit((state) => ({
        designs: state.designs.filter((d) => d.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      })),

    // Selection is a view concern, not a document edit — it would flood history.
    selectDesign: (id) => set({ selectedId: id }),
    setPlacing: (isPlacing) => set({ isPlacing }),
    setDragging: (isDragging) => set({ isDragging }),

    placeSelected: (position, normal) => {
      commit((state) => ({
        designs: state.designs.map((d) =>
          d.id === state.selectedId ? { ...d, position, normal, isPlaced: true } : d,
        ),
      }))
      set({ isPlacing: false })
    },

    moveDesign: (id, position, normal) =>
      commit(
        (state) => ({
          designs: state.designs.map((d) => (d.id === id ? { ...d, position, normal } : d)),
        }),
        `move:${id}`,
      ),

    updateSelected: (patch) =>
      commit(
        (state) => ({
          designs: state.designs.map((d) => (d.id === state.selectedId ? { ...d, ...patch } : d)),
        }),
        `adjust:${get().selectedId}:${Object.keys(patch).join(',')}`,
      ),

    setModelLengthUnits: (length) => set({ modelLengthUnits: length }),

    setReferenceLengthCm: (cm) => commit(() => ({ referenceLengthCm: cm }), 'calibration'),

    // Placements are coordinates on a specific limb, so they cannot survive a model
    // swap — carrying them over would drop every tattoo at a meaningless spot.
    setModelId: (id, defaultReferenceCm) => {
      commit(() => ({
        modelId: id,
        designs: [],
        selectedId: null,
        referenceLengthCm: defaultReferenceCm,
      }))
      set({ isPlacing: false, isDragging: false })
    },

    setSkinToneId: (id) => commit(() => ({ skinToneId: id }), 'skin'),

    setCaptureBackground: (captureBackground) => set({ captureBackground }),
    setCaptureScale: (captureScale) => set({ captureScale }),
    requestCapture: (mode) => set({ captureRequest: { token: Date.now(), mode } }),
    clearCaptureRequest: () => set({ captureRequest: null }),

    loadDocument: (document) => {
      for (const design of document.designs) trackTexture(design.textureUrl)
      // A loaded session replaces the document outright, so every url the old one
      // held — including its whole history — becomes unreachable at once.
      releaseUnreachable(reachableTextures(document, [], []))
      lastMerge = null
      set({ ...document, past: [], future: [], isPlacing: false, isDragging: false })
    },

    undo: () =>
      set((state) => {
        const previous = state.past.at(-1)
        if (!previous) return state

        lastMerge = null
        const past = state.past.slice(0, -1)
        const future = [snapshot(state), ...state.future].slice(0, HISTORY_LIMIT)
        return { ...previous.document, past, future, isPlacing: false, isDragging: false }
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0]
        if (!next) return state

        lastMerge = null
        const past = [...state.past, snapshot(state)].slice(-HISTORY_LIMIT)
        return {
          ...next.document,
          past,
          future: state.future.slice(1),
          isPlacing: false,
          isDragging: false,
        }
      }),
  }
})

/** Reads the live document without subscribing. Used by session export. */
export function currentDocument(): EditorDocument {
  const state = useEditorStore.getState()
  return {
    designs: state.designs,
    selectedId: state.selectedId,
    modelId: state.modelId,
    skinToneId: state.skinToneId,
    referenceLengthCm: state.referenceLengthCm,
  }
}

export type { EditorDocument }

/**
 * Converts world units to centimetres using the user's calibration.
 * Returns null while the model span or the reference measurement is unknown —
 * showing a guessed size to a tattoo artist is worse than showing nothing.
 */
export function useCmPerUnit(): number | null {
  const modelLengthUnits = useEditorStore((s) => s.modelLengthUnits)
  const referenceLengthCm = useEditorStore((s) => s.referenceLengthCm)

  if (!modelLengthUnits || !referenceLengthCm) return null
  return referenceLengthCm / modelLengthUnits
}
