// Client-side photo preparation. The photo is resized and re-encoded as JPEG on a canvas, which
// drops EXIF metadata (GPS location, device, time). Only the resized copy is uploaded, once, for
// recognition. Nothing is written to storage.

export const MAX_SIDE_PX = 1280
export const LOW_DATA_MAX_SIDE_PX = 1024
const JPEG_QUALITY = 0.8

/** Scale (w, h) down so the longest side is at most `max`. Never upscales. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const s = max / longest
  return { width: Math.round(width * s), height: Math.round(height * s) }
}

export async function prepareMealPhoto(file: Blob, maxSide: number = MAX_SIDE_PX): Promise<Blob> {
  // imageOrientation applies the EXIF rotation before the metadata is discarded.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', JPEG_QUALITY),
    )
  } finally {
    bitmap.close()
  }
}
