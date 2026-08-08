/**
 * Saving and reopening a placement session.
 *
 * WHY A FILE AND NOT A SHARE LINK
 *
 * The obvious product shape is a url the client sends to the artist. It is not
 * buildable here, and the reason is structural rather than a missing afternoon of
 * work: TattooView has no backend, and the artwork is the bulk of the session. A
 * single 2048px design is megabytes once encoded — orders of magnitude past what
 * any browser or server will carry in a url. A real share link means hosting the
 * images somewhere, which means an account, storage and a privacy decision about
 * other people's artwork.
 *
 * A file sidesteps all of that and still travels over WhatsApp, mail or Drive,
 * which is how these conversations actually happen. It is also the honest option:
 * the design never leaves the machine unless its owner sends it.
 *
 * The textures are embedded as data URLs rather than referenced, so the file stays
 * self-contained — a session that only works on the machine that made it would be
 * pointless.
 */
import { TranslatedError } from '@/i18n'
import type { EditorDocument, TattooDesign } from '@/features/tattoo-editor/store/editorStore'

const FORMAT = 'tattooview.session'
const VERSION = 1

export const SESSION_FILE_EXTENSION = '.tattooview.json'

interface SerializedDesign {
  id: string
  name: string
  aspect: number
  position: [number, number, number]
  normal: [number, number, number]
  roll: number
  widthUnits: number
  opacity: number
  inkDepth: number
  mirrored: boolean
  isPlaced: boolean
  /** The design itself, as a data URL. Keeps the file self-contained. */
  texture: string
}

interface SessionFile {
  format: typeof FORMAT
  version: number
  savedAt: string
  modelId: string
  skinToneId: string
  referenceLengthCm: number | null
  designs: SerializedDesign[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new TranslatedError('error.encodeTexture'))
    reader.readAsDataURL(blob)
  })
}

async function urlToDataUrl(url: string): Promise<string> {
  // Works for both object URLs and data URLs, so a session loaded and re-saved
  // round-trips without special casing.
  const response = await fetch(url)
  return blobToDataUrl(await response.blob())
}

async function dataUrlToObjectUrl(dataUrl: string): Promise<string> {
  const response = await fetch(dataUrl)
  return URL.createObjectURL(await response.blob())
}

export async function serializeSession(document: EditorDocument): Promise<SessionFile> {
  const designs = await Promise.all(
    document.designs.map(async (design) => ({
      id: design.id,
      name: design.name,
      aspect: design.aspect,
      position: design.position,
      normal: design.normal,
      roll: design.roll,
      widthUnits: design.widthUnits,
      opacity: design.opacity,
      inkDepth: design.inkDepth,
      mirrored: design.mirrored,
      isPlaced: design.isPlaced,
      texture: await urlToDataUrl(design.textureUrl),
    })),
  )

  return {
    format: FORMAT,
    version: VERSION,
    savedAt: new Date().toISOString(),
    modelId: document.modelId,
    skinToneId: document.skinToneId,
    referenceLengthCm: document.referenceLengthCm,
    designs,
  }
}

export function downloadSession(session: SessionFile, filename: string): void {
  const blob = new Blob([JSON.stringify(session)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function isVector3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number')
}

function isSerializedDesign(value: unknown): value is SerializedDesign {
  if (typeof value !== 'object' || value === null) return false
  const design = value as Record<string, unknown>

  return (
    typeof design.id === 'string' &&
    typeof design.name === 'string' &&
    typeof design.aspect === 'number' &&
    design.aspect > 0 &&
    isVector3(design.position) &&
    isVector3(design.normal) &&
    typeof design.roll === 'number' &&
    typeof design.widthUnits === 'number' &&
    typeof design.opacity === 'number' &&
    typeof design.isPlaced === 'boolean' &&
    typeof design.texture === 'string' &&
    design.texture.startsWith('data:image/')
  )
}

/**
 * Parses a session file into a document, rebuilding one object URL per design.
 *
 * Validation is deliberately paranoid. This is a file a user received from someone
 * else; a malformed field reaching the store surfaces later as a crash inside the
 * render loop, where nothing points back to the real cause.
 */
export async function parseSession(text: string): Promise<EditorDocument> {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new TranslatedError('error.notASession')
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new TranslatedError('error.notASession')
  }

  const session = raw as Record<string, unknown>
  if (session.format !== FORMAT) throw new TranslatedError('error.notASession')
  if (typeof session.version !== 'number' || session.version > VERSION) {
    throw new TranslatedError('error.newerVersion')
  }
  if (typeof session.modelId !== 'string' || !Array.isArray(session.designs)) {
    throw new TranslatedError('error.incompleteSession')
  }

  const valid = session.designs.filter(isSerializedDesign)
  if (valid.length !== session.designs.length) {
    throw new TranslatedError('error.damagedDesigns')
  }

  const designs: TattooDesign[] = await Promise.all(
    valid.map(async (design) => ({
      id: design.id,
      name: design.name,
      textureUrl: await dataUrlToObjectUrl(design.texture),
      aspect: design.aspect,
      position: design.position,
      normal: design.normal,
      roll: design.roll,
      widthUnits: design.widthUnits,
      opacity: design.opacity,
      // Defaults cover sessions saved before these fields existed.
      inkDepth: typeof design.inkDepth === 'number' ? design.inkDepth : 0.55,
      mirrored: design.mirrored === true,
      isPlaced: design.isPlaced,
    })),
  )

  return {
    designs,
    selectedId: designs[0]?.id ?? null,
    modelId: session.modelId,
    skinToneId: typeof session.skinToneId === 'string' ? session.skinToneId : 'natural',
    referenceLengthCm:
      typeof session.referenceLengthCm === 'number' ? session.referenceLengthCm : null,
  }
}
