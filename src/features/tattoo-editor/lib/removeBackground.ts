/** Largest edge kept when rasterizing an upload, to bound texture memory. */
const MAX_EDGE = 2048

/** Width of the alpha ramp beyond the cutoff, in normalized colour distance. */
const FEATHER = 0.09

/** Half-size of the square patch sampled at each corner. */
const CORNER_PATCH = 6

export interface BackgroundSample {
  r: number
  g: number
  b: number
}

/**
 * Draws the bitmap into a canvas, downscaling only if it exceeds `maxEdge`.
 *
 * Takes an ImageBitmap rather than an HTMLImageElement so callers can decode a
 * File directly with `createImageBitmap`, with no object URL to create, revoke,
 * or accidentally revoke mid-flight.
 *
 * The dialog rasterizes twice: small for the live slider preview, full size on
 * accept. Reprocessing 4M pixels on every slider tick would make the control feel
 * broken, and the user cannot see that resolution in a thumbnail anyway.
 */
export function rasterize(image: ImageBitmap, maxEdge = MAX_EDGE): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas context unavailable')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas
}

/**
 * Estimates the background colour from the four corners.
 *
 * Corners are used rather than a global average because a design's subject sits
 * in the middle; averaging the whole image would drag the estimate toward the ink
 * and cause the algorithm to erase the artwork instead of the paper.
 */
export function sampleBackground(canvas: HTMLCanvasElement): BackgroundSample {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas context unavailable')

  const { width, height } = canvas
  const corners: Array<[number, number]> = [
    [0, 0],
    [width - CORNER_PATCH * 2, 0],
    [0, height - CORNER_PATCH * 2],
    [width - CORNER_PATCH * 2, height - CORNER_PATCH * 2],
  ]

  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (const [x, y] of corners) {
    const patch = context.getImageData(
      Math.max(0, x),
      Math.max(0, y),
      Math.min(CORNER_PATCH * 2, width),
      Math.min(CORNER_PATCH * 2, height),
    ).data

    for (let i = 0; i < patch.length; i += 4) {
      // Already-transparent pixels say nothing about the background colour.
      if (patch[i + 3] < 8) continue
      r += patch[i]
      g += patch[i + 1]
      b += patch[i + 2]
      count++
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255 }
  return { r: r / count, g: g / count, b: b / count }
}

/**
 * Makes background-coloured pixels transparent.
 *
 * Alpha is derived from each pixel's RGB distance to the sampled background, not
 * from its brightness. A brightness threshold is simpler but destroys pale
 * colours — a watercolour design's yellows and pinks would be erased along with
 * the paper. Distance-to-background keeps any pixel that differs in hue, however
 * light it is.
 *
 * Existing alpha is preserved multiplicatively, so a PNG that is already cut out
 * does not gain hard edges by passing through here.
 *
 * @param tolerance Normalized colour distance treated as background, 0–1.
 */
export function removeBackground(
  source: HTMLCanvasElement,
  tolerance: number,
): HTMLCanvasElement {
  const output = document.createElement('canvas')
  output.width = source.width
  output.height = source.height

  const context = output.getContext('2d')
  if (!context) throw new Error('2D canvas context unavailable')

  const sourceContext = source.getContext('2d')
  if (!sourceContext) throw new Error('2D canvas context unavailable')

  const image = sourceContext.getImageData(0, 0, source.width, source.height)
  const pixels = image.data
  const background = sampleBackground(source)

  // Normalizes the RGB cube diagonal to 1 so `tolerance` is resolution and
  // colour-depth independent.
  const diagonal = Math.sqrt(3) * 255

  for (let i = 0; i < pixels.length; i += 4) {
    const dr = pixels[i] - background.r
    const dg = pixels[i + 1] - background.g
    const db = pixels[i + 2] - background.b
    const distance = Math.sqrt(dr * dr + dg * dg + db * db) / diagonal

    const ramp = Math.min(1, Math.max(0, (distance - tolerance) / FEATHER))
    pixels[i + 3] = Math.round(pixels[i + 3] * ramp)
  }

  context.putImageData(image, 0, 0)
  return output
}

/** Encodes a canvas as a PNG object URL. PNG because alpha must survive. */
export function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not encode the processed image'))
        return
      }
      resolve(URL.createObjectURL(blob))
    }, 'image/png')
  })
}
