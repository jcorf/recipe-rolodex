// Turns a photo someone picks into the two small copies the rolodex keeps. The original never
// leaves the device: it is read, drawn smaller onto a canvas, and let go. Drawing it again also
// leaves behind everything hidden in the file, such as where the photo was taken (EXIF / GPS).

/** The open card and shared pictures (drawn at 2×) stay sharp at this size. */
const MAIN_PX = 1200;
/** The polaroid on a card and the calendar stamps. */
const THUMB_PX = 320;
const QUALITY = 0.78;
/** Bigger than this before shrinking is almost certainly not a food photo. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export type PhotoSize = 'main' | 'thumb';

export interface PhotoFiles {
  main: Blob;
  thumb: Blob;
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap turns phone photos the right way up (EXIF orientation) and decodes off the main thread
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* fall back to an <img> below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** One copy, no longer than `px` on its long side, as WebP (or JPEG where WebP can't be written). */
async function shrink(source: ImageBitmap | HTMLImageElement, px: number): Promise<Blob> {
  const w = source.width;
  const h = source.height;
  const k = Math.min(1, px / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fdfdfb'; // a see-through PNG gets polaroid white behind it, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const webp = await toBlob(canvas, 'image/webp');
  // older Safari quietly hands back a PNG when it can't write WebP: use JPEG there instead
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob(canvas, 'image/jpeg');
  if (!jpeg) throw new Error('Couldn’t shrink that photo.');
  return jpeg;
}

/** A picked file as the two copies to keep, or an error a person can act on. */
export async function makePhoto(file: Blob): Promise<PhotoFiles> {
  if (!file.type.startsWith('image/')) throw new Error('That isn’t a photo. Pick a .jpg, .png, .webp or .heic picture.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is too big (over 25 MB). Try a smaller one.');
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error('This browser can’t open that photo. Try a .jpg or .png (on a phone, pick it from Photos).');
  }
  try {
    const [main, thumb] = await Promise.all([shrink(source, MAIN_PX), shrink(source, THUMB_PX)]);
    return { main, thumb };
  } finally {
    if ('close' in source) source.close();
  }
}
