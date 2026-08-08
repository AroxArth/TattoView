import { create } from 'zustand'

import { DEFAULT_MODEL_ID, getModel } from '@/features/body-model/model-catalog'

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
  /** Object URL of the processed design. Must be revoked when the design is removed. */
  textureUrl: string
  /** Intrinsic pixel aspect ratio (width / height) of the image. */
  aspect: number
  position: [number, number, number]
  normal: [number, number, number]
  /** Rotation around the surface normal, in radians. */
  roll: number
  /** Width of the decal in world units. Height is derived from `aspect`. */
  widthUnits: number
  opacity: number
  /** False until the user has clicked the model to anchor it. */
  isPlaced: boolean
}

export type NewDesign = Pick<TattooDesign, 'id' | 'name' | 'textureUrl' | 'aspect'>

interface EditorState {
  designs: TattooDesign[]
  selectedId: string | null
  /** When true, the next click on the body mesh anchors the selected design. */
  isPlacing: boolean
  /** True while the user drags a placed design across the skin. */
  isDragging: boolean
  /** Id from the body model catalog. */
  modelId: string

  /**
   * Length of the loaded body model along its dominant axis, in world units.
   * Measured from the mesh bounding box once the model is ready.
   */
  modelLengthUnits: number | null
  /** Real-world length the user declares for that same span, in centimetres. */
  referenceLengthCm: number | null

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
  updateSelected: (patch: Partial<Pick<TattooDesign, 'widthUnits' | 'opacity' | 'roll'>>) => void
  setModelLengthUnits: (length: number) => void
  setReferenceLengthCm: (cm: number | null) => void
  setModelId: (id: string, defaultReferenceCm: number) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  designs: [],
  selectedId: null,
  isPlacing: false,
  isDragging: false,
  modelId: DEFAULT_MODEL_ID,
  modelLengthUnits: null,
  referenceLengthCm: getModel(DEFAULT_MODEL_ID).defaultReferenceCm,

  addDesign: (design) =>
    set((state) => ({
      designs: [
        ...state.designs,
        {
          ...design,
          position: [0, 0, 0],
          normal: [0, 0, 1],
          roll: 0,
          widthUnits: 0.25,
          opacity: 0.9,
          isPlaced: false,
        },
      ],
      selectedId: design.id,
      isPlacing: true,
    })),

  removeDesign: (id) =>
    set((state) => {
      const target = state.designs.find((d) => d.id === id)
      if (target) URL.revokeObjectURL(target.textureUrl)
      return {
        designs: state.designs.filter((d) => d.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }
    }),

  selectDesign: (id) => set({ selectedId: id }),
  setPlacing: (isPlacing) => set({ isPlacing }),
  setDragging: (isDragging) => set({ isDragging }),

  placeSelected: (position, normal) =>
    set((state) => ({
      isPlacing: false,
      designs: state.designs.map((d) =>
        d.id === state.selectedId ? { ...d, position, normal, isPlaced: true } : d,
      ),
    })),

  moveDesign: (id, position, normal) =>
    set((state) => ({
      designs: state.designs.map((d) => (d.id === id ? { ...d, position, normal } : d)),
    })),

  updateSelected: (patch) =>
    set((state) => ({
      designs: state.designs.map((d) => (d.id === state.selectedId ? { ...d, ...patch } : d)),
    })),

  setModelLengthUnits: (length) => set({ modelLengthUnits: length }),
  setReferenceLengthCm: (cm) => set({ referenceLengthCm: cm }),

  // Placements are coordinates on a specific limb, so they cannot survive a model
  // swap — carrying them over would drop every tattoo at a meaningless spot.
  setModelId: (id, defaultReferenceCm) =>
    set((state) => {
      state.designs.forEach((d) => URL.revokeObjectURL(d.textureUrl))
      return {
        modelId: id,
        designs: [],
        selectedId: null,
        isPlacing: false,
        isDragging: false,
        referenceLengthCm: defaultReferenceCm,
      }
    }),
}))

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
