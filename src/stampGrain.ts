/**
 * The worn, grainy look of an old printed stamp: paper-coloured speckles that eat into the picture
 * (thicker in patches, like uneven ink), and a few dark flecks. It's made once, as a transparent
 * picture laid over the stamp's photo, so the page and the shared picture show the very same grain.
 */
const W = 144;
const H = 176;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grain: HTMLCanvasElement | null = null;
let url = '';

export function stampGrain() {
  if (grain) return grain;
  const rand = mulberry32(20261107);
  // a coarse grid of "how worn is it here", smoothed between its points
  const gw = 9;
  const gh = 11;
  const wear = Array.from({ length: gw * gh }, () => rand());
  const wearAt = (x: number, y: number) => {
    const fx = (x / W) * (gw - 1);
    const fy = (y / H) * (gh - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const a = wear[y0 * gw + x0];
    const b = wear[y0 * gw + Math.min(gw - 1, x0 + 1)];
    const c = wear[Math.min(gh - 1, y0 + 1) * gw + x0];
    const d = wear[Math.min(gh - 1, y0 + 1) * gw + Math.min(gw - 1, x0 + 1)];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const n = rand();
      if (n < 0.07 + 0.3 * wearAt(x, y)) { // paper showing through
        img.data[i] = 255; img.data[i + 1] = 254; img.data[i + 2] = 250; img.data[i + 3] = 215;
      } else if (n > 0.996) { // a fleck of ink
        img.data[i] = 61; img.data[i + 1] = 60; img.data[i + 2] = 64; img.data[i + 3] = 110;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  grain = canvas;
  return canvas;
}

export const stampGrainUrl = () => (url ||= stampGrain().toDataURL('image/png'));
