// Renders the cotton-paper grain tiles used on the index cards (public/cotton-N.webp).
//
//   npm run textures
//
// Each tile is fractal noise lit from one side (an SVG lighting filter), rendered by Chrome
// and saved as a seamless 512px tile that the cards show at 256px (sharp on 2x screens).
// The tile is stored as black ink with transparency (alpha = 1 − brightness): laid over a card
// normally, that looks exactly like multiplying the grey grain onto it, without a blend mode,
// which forced the browser to recomposite every card whenever anything on the page moved.
// Tweak VARIANTS to change the look, then rerun. Which tile each card gets, how it's rotated
// and how strongly it shows (opacity) are picked per card in src/components/Rolodex.tsx → cardLook().
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Grain size runs 1× (finest) → 2× (coarsest): baseFrequency 0.09 → 0.045.
// [seed, baseFrequency, surfaceScale (depth of the fibres), light azimuth in degrees]
const VARIANTS = [
  [4, 0.09, 1.5, 45],
  [19, 0.08, 1.6, 120],
  [33, 0.07, 1.7, 70],
  [47, 0.062, 1.8, 200],
  [58, 0.053, 1.9, 300],
  [71, 0.045, 2.0, 160],
];
const SIZE = 512;
// Lifts the shading toward white so the card stays light: out = in × SOFTEN + (1 − SOFTEN).
const SOFTEN = 0.5;

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--disable-gpu', '--disable-gpu-rasterization'], // GPU raster leaves a faint seam in the tile
});
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
for (const [i, [seed, freq, depth, azimuth]] of VARIANTS.entries()) {
  await page.setContent(`<body style="margin:0">
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" style="display:block">
      <filter id="c" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="4" seed="${seed}" stitchTiles="stitch"/>
        <feDiffuseLighting lighting-color="#fff" surfaceScale="${depth}"><feDistantLight azimuth="${azimuth}" elevation="65"/></feDiffuseLighting>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="${SOFTEN}" intercept="${1 - SOFTEN}"/>
          <feFuncG type="linear" slope="${SOFTEN}" intercept="${1 - SOFTEN}"/>
          <feFuncB type="linear" slope="${SOFTEN}" intercept="${1 - SOFTEN}"/>
        </feComponentTransfer>
      </filter>
      <rect width="${SIZE}" height="${SIZE}" filter="url(#c)"/>
    </svg></body>`);
  const grey = await page.screenshot({ type: 'png' });
  const webp = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, c.width, c.height);
    for (let p = 0; p < px.data.length; p += 4) {
      px.data[p + 3] = 255 - px.data[p]; // darker grain → more opaque ink
      px.data[p] = px.data[p + 1] = px.data[p + 2] = 0;
    }
    x.putImageData(px, 0, 0);
    return c.toDataURL('image/webp', 0.9).split(',')[1];
  }, grey.toString('base64'));
  const file = path.join(OUT, `cotton-${i}.webp`);
  writeFileSync(file, Buffer.from(webp, 'base64'));
  console.log('wrote', path.relative(process.cwd(), file));
}
await browser.close();
