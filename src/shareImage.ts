import { FRAMES, RULES, STARS } from './components/inkPaths';
import { cardLook, toPixels } from './components/ink';
import { loadFruitFont } from './components/FruitMark';
import { stampFill, stampFruit, type StampLook } from './components/MonthGrid';
import { MONTH_NAMES, WEEKDAYS, shortDay, addDays, hash01, longDate, monthWeeks, pickShown, rangeLabel, stampTilt, weekdayName } from './dates';
import { stampGrain } from './stampGrain';
import { abbreviateUnits, servesLabel, splitAmount, stepText } from './recipeText';
import { scallopPath } from './scallop';
import { PATHS } from './components/PenIcons';
import { stampsByDay } from './stamps';
import { BORDER_OUTLINE, CIRCLE_CLIP, CIRCLE_OUTLINE, STAMP_CANCEL, STAMP_H, STAMP_INSET, STAMP_PAPER, STAMP_PEN, STAMP_VEIL, STAMP_W } from './components/Stamp';
import type { Recipe, Settings, Shown, StampCard } from './types';
import { keptPhotoUrl } from './usePhoto';

/**
 * Pictures of a recipe card, and of a month of the calendar, drawn straight onto a canvas in the
 * same cotton / pen / handwriting look as the page (a screenshot of the page can't be saved at a
 * fixed size, and photos from other sites would stop a canvas from being exported, so they come
 * through the app's own /api/image).
 */
const SCALE = 2; // 2× the logical size, so the picture stays sharp when shared
const ALL: Shown = { recipes: true, restaurants: true };
const INK = '#3d3c40';
const INK_SOFT = '#6f6d70';
const PENCIL = '#a39d96';
const DESK = '#f5f3ee';
const LABEL_FONT = 'La Belle Aurore';

export interface ShareContext {
  recipeFont: Settings['recipeFont'];
  look: StampLook;
  /** The cursor-glow colours the owner picked, as "r g b": they tint the desk behind the picture. */
  glow: { warm: string; cool: string };
  /** A plain white desk behind the picture instead of the glow colours. */
  white?: boolean;
  /** Which kinds of card are in the box, so the pictures stamp only those. */
  show?: Shown;
}

export interface MonthLook {
  /** The seed the page used for the stamps' lean, so the picture matches it. */
  seed: number;
}

const handFamily = (font: Settings['recipeFont']) => (font === 'caveat' ? 'Caveat' : font === 'print' ? 'Mukta Malar' : 'Zeyada');
const handSize = (font: Settings['recipeFont']) => (font === 'caveat' ? 22 : font === 'print' ? 15 : 25);

async function ensureFonts(families: string[]) {
  await Promise.all([...families.map((f) => document.fonts.load(`24px "${f}"`)), loadFruitFont()]).catch(() => undefined);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** A photo's address as the canvas can read it: other sites' photos come back through the app. */
const photoSrc = (url: string) => (/^https?:/i.test(url) ? `/api/image?url=${encodeURIComponent(url)}` : url);

/** A card's photo for the canvas: one kept on this device (same-origin, no trip out), else its web link. */
async function recipePhoto(r: Recipe, size: 'main' | 'thumb') {
  const kept = await keptPhotoUrl(r, size);
  if (kept) return loadImage(kept);
  return r.image ? loadImage(photoSrc(r.image)) : null;
}

function newCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * SCALE);
  canvas.height = Math.round(h * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  return { canvas, ctx };
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / k;
  const sh = h / k;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

/** A path authored in `from` units, drawn into a w × h box (so a stroke keeps an even width). */
function stroke(ctx: CanvasRenderingContext2D, d: string, from: [number, number], x: number, y: number, w: number, h: number) {
  const path = new Path2D();
  path.addPath(new Path2D(d), new DOMMatrix().translate(x, y).scale(w / from[0], h / from[1]));
  ctx.stroke(path);
}

/** Cotton paper: the card's grain at its own angle and strength, cut with the torn edge. */
async function cottonSheet(w: number, h: number, id: string) {
  const look = cardLook(id);
  const style = look.style as Record<string, string>;
  const { canvas, ctx } = newCanvas(w, h);
  ctx.fillStyle = '#f6f5f1';
  ctx.fillRect(0, 0, w, h);
  const grainUrl = /url\('?([^')]+)'?\)/.exec(style['--grain'])?.[1] ?? '/cotton-0.webp';
  const [grain, deckle] = await Promise.all([loadImage(grainUrl), loadImage('/deckle.svg')]);
  if (grain) {
    const pattern = ctx.createPattern(grain, 'repeat')!;
    pattern.setTransform(new DOMMatrix().scale(256 / grain.naturalWidth));
    ctx.save();
    ctx.globalAlpha = Number(style['--grain-opacity']) || 1;
    ctx.translate(w / 2, h / 2);
    ctx.rotate((parseFloat(style['--grain-rot']) * Math.PI) / 180);
    ctx.fillStyle = pattern;
    ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.restore();
  }
  if (deckle) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(deckle, 0, 0, w, h);
  }
  return { sheet: canvas, look };
}

/** The picture of a finished sheet: the desk, the sheet's soft shadow, and a signature underneath. */
function onDesk(sheet: HTMLCanvasElement, w: number, h: number, margin: number, glow: ShareContext['glow'], white = false) {
  const W = w + margin * 2;
  const H = h + margin * 2 + 22;
  const { canvas, ctx } = newCanvas(W, H);
  ctx.fillStyle = white ? '#ffffff' : DESK;
  ctx.fillRect(0, 0, W, H);
  // the page's two lights: the warm one up by the cursor, the cool one drifting in the far corner
  const light = (cx: number, cy: number, rgb: string, strength: number) => {
    const [r, g, b] = rgb.split(' ');
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.95);
    g2.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
    g2.addColorStop(0.55, `rgba(${r},${g},${b},${strength * 0.35})`);
    g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  };
  if (!white) {
    light(W * 0.2, H * 0.12, glow.warm, 0.9);
    light(W * 0.85, H * 0.92, glow.cool, 0.85);
  }
  ctx.save();
  ctx.shadowColor = 'rgba(60,55,50,.3)';
  ctx.shadowBlur = 26 * SCALE;
  ctx.shadowOffsetY = 10 * SCALE;
  ctx.drawImage(sheet, margin, margin, w, h); // the context is already scaled
  ctx.restore();
  return { canvas, ctx, W, H };
}

function signature(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.font = `15px "${LABEL_FONT}"`;
  ctx.fillStyle = PENCIL;
  ctx.textAlign = 'center';
  ctx.fillText('from my recipe rolodex', W / 2, H - 16);
  ctx.textAlign = 'left';
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t make the picture.'))), 'image/png'));

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawStar(ctx: CanvasRenderingContext2D, variant: number, fill: number, x: number, y: number, size: number) {
  const d = STARS[variant % STARS.length];
  const path = new Path2D();
  path.addPath(new Path2D(d), new DOMMatrix().translate(x, y).scale(size / 100));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 4.5 * (size / 100);
  ctx.lineJoin = 'round';
  if (fill > 0) {
    ctx.save();
    if (fill === 0.5) {
      ctx.beginPath();
      ctx.rect(x, y, size / 2, size);
      ctx.clip();
    }
    ctx.globalAlpha = 0.92;
    ctx.fill(path);
    ctx.restore();
  }
  ctx.globalAlpha = fill > 0 ? 1 : 0.45;
  ctx.stroke(path);
  ctx.restore();
}

/** A recipe card as a picture: the open card, on the desk. */
export async function renderRecipeImage(recipe: Recipe, { recipeFont, glow, white }: ShareContext): Promise<Blob> {
  const hand = handFamily(recipeFont);
  const handPx = handSize(recipeFont);
  const fix = (t: string) => t.toLowerCase(); // everything is written lowercase, like the page
  await ensureFonts([LABEL_FONT, hand]);
  const photo = await recipePhoto(recipe, 'main');

  const CW = 620;
  const PAD = 46;
  const inner = CW - PAD * 2;
  const { canvas: scratch, ctx: m } = newCanvas(10, 10);
  void scratch;

  // ── lay out: every piece's height is measured first, so the card is exactly as tall as it needs
  const photoW = photo ? 118 : 0;
  m.font = `38px "${LABEL_FONT}"`;
  const titleLines = wrap(m, recipe.title.toLowerCase(), inner - (photo ? photoW + 22 : 0));
  const eatenOut = recipe.kind === 'restaurant';
  const meta = (eatenOut
    ? [recipe.price, recipe.venue, recipe.location, recipe.cuisine]
    : [recipe.totalTime, servesLabel(recipe.servings), recipe.cuisine]
  ).filter(Boolean).join('  ·  ').toLowerCase();
  m.font = `${handPx + 3}px "${hand}"`;
  // a recipe's note sits under the title; a restaurant's thoughts get their own column instead
  const noteLines = recipe.review && !eatenOut ? wrap(m, fix(recipe.review), inner) : [];
  const colGap = 30;
  const col1 = (inner - colGap) * 0.42;
  const col2 = inner - colGap - col1;
  const lh = handPx * (recipeFont === 'print' ? 1.4 : 1.12);
  m.font = `${handPx}px "${hand}"`;
  // left column: ingredients, or the meals eaten (day, then what was had); right: directions, or thoughts
  const leftTitle = eatenOut ? 'what we ate' : 'ingredients';
  const rightTitle = eatenOut ? 'thoughts' : 'directions';
  const leftLines: [string, string][] = eatenOut
    ? [...(recipe.visits ?? [])].sort((a, b) => b.date.localeCompare(a.date)).map((v) => [shortDay(v.date), v.dish || 'a visit'])
    : recipe.ingredients.map((line) => splitAmount(line));
  const amtW = Math.min(col1 * 0.45, Math.max(54, ...leftLines.map(([a]) => m.measureText(fix(a)).width + 12)));
  const ingredientRows = leftLines.map(([amount, name]) => ({ amount, lines: wrap(m, fix(name), col1 - (amount ? amtW : 0)) }));
  const numbered = !eatenOut;
  const stepRows = eatenOut
    ? (recipe.review ? recipe.review.split('\n').filter(Boolean).map((p) => wrap(m, fix(p), col2)) : [])
    : recipe.steps.map((s) => wrap(m, fix(stepText(abbreviateUnits(s))), col2 - 26));
  const rowGap = 5;
  const ingredientsH = ingredientRows.reduce((h, r) => h + Math.max(1, r.lines.length) * lh + rowGap, 0) || lh;
  const stepsH = stepRows.reduce((h, r) => h + r.length * lh + rowGap + 2, 0) || lh;

  let y = 56;
  const titleY = y;
  y += titleLines.length * 56;
  const starsY = y - 2;
  y += 40;
  const metaY = y;
  if (meta) y += 34;
  const addressY = y - 8;
  if (eatenOut && recipe.address) y += 24;
  if (photo) y = Math.max(y, 34 + 140 + 24);
  const noteY = y;
  y += noteLines.length ? noteLines.length * (handPx + 3) * 1.15 + 8 : 0;
  const ruleY = y;
  y += 30;
  const colsTop = y;
  y += Math.max(ingredientsH, stepsH) + 22;
  const footY = y + 24;
  const CH = footY + 44;

  const { sheet, look } = await cottonSheet(CW, CH, recipe.id);
  const c = sheet.getContext('2d')!; // already scaled by newCanvas
  c.globalCompositeOperation = 'source-over'; // the torn-edge cut leaves it on destination-in
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // the border is drawn after the paper is cut, so it sits on top of the grain
  {
    const draw = (d: string, alpha: number) => {
      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = INK;
      c.lineWidth = 1.5;
      const moved = new Path2D();
      moved.addPath(new Path2D(toPixels(d, CW - 10, CH - 10)), new DOMMatrix().translate(5, 5));
      c.stroke(moved);
      c.restore();
    };
    draw(FRAMES[look.frame].main, 0.9);
    if (FRAMES[look.frame].echo) draw(FRAMES[look.frame].echo!, 0.45);

    // title, stars, details
    c.fillStyle = INK;
    c.textBaseline = 'alphabetic';
    c.font = `38px "${LABEL_FONT}"`;
    titleLines.forEach((line, i) => c.fillText(line, PAD, titleY + 36 + i * 56));
    for (let n = 1; n <= 5; n++) {
      const fill = recipe.rating >= n ? 1 : recipe.rating >= n - 0.5 ? 0.5 : 0;
      drawStar(c, look.star + n, fill, PAD + (n - 1) * 27, starsY, 24);
    }
    if (meta) {
      c.font = `18px "${LABEL_FONT}"`;
      c.fillStyle = INK_SOFT;
      c.fillText(meta, PAD, metaY + 22);
    }
    if (eatenOut && recipe.address) { // the extra line for the spot itself
      c.font = `17px "${LABEL_FONT}"`;
      c.fillStyle = INK_SOFT;
      c.fillText(recipe.address.toLowerCase(), PAD, addressY + 22);
    }
    if (noteLines.length) {
      c.font = `${handPx + 3}px "${hand}"`;
      c.fillStyle = INK_SOFT;
      noteLines.forEach((line, i) => c.fillText(line, PAD, noteY + 22 + i * (handPx + 3) * 1.15));
    }

    // a polaroid taped on, if there's a photo
    if (photo) {
      c.save();
      c.translate(CW - PAD - photoW / 2, 34 + 70);
      c.rotate(0.05);
      c.shadowColor = 'rgba(60,55,50,.28)';
      c.shadowBlur = 8;
      c.shadowOffsetY = 3;
      c.fillStyle = '#fffefa';
      c.fillRect(-photoW / 2, -70, photoW, 140);
      c.shadowColor = 'transparent';
      drawCover(c, photo, -photoW / 2 + 7, -70 + 7, photoW - 14, 104);
      c.fillStyle = 'rgba(220,193,150,.78)';
      c.fillRect(-26, -78, 52, 16);
      c.restore();
    }

    // the drawn rule
    c.strokeStyle = INK;
    c.lineWidth = 1.4;
    c.globalAlpha = 0.85;
    stroke(c, RULES[look.rule], [100, 6], PAD, ruleY, inner, 10);
    c.globalAlpha = 1;

    // columns
    c.fillStyle = INK;
    c.font = `20px "${LABEL_FONT}"`;
    c.fillText(leftTitle, PAD, colsTop + 14);
    c.fillText(rightTitle, PAD + col1 + colGap, colsTop + 14);
    c.font = `${handPx}px "${hand}"`;
    let iy = colsTop + 14 + lh + 4;
    ingredientRows.forEach((row) => {
      c.fillStyle = INK_SOFT;
      c.fillText(row.amount, PAD, iy);
      c.fillStyle = INK;
      row.lines.forEach((line, i) => c.fillText(line, PAD + (row.amount ? amtW : 0), iy + i * lh));
      iy += Math.max(1, row.lines.length) * lh + rowGap;
    });
    let sy = colsTop + 14 + lh + 4;
    const sx = PAD + col1 + colGap;
    stepRows.forEach((lines, n) => {
      if (numbered) {
        c.fillStyle = INK_SOFT;
        c.fillText(`${n + 1}.`, sx, sy);
      }
      c.fillStyle = INK;
      lines.forEach((line, i) => c.fillText(line, numbered ? sx + 26 : sx, sy + i * lh));
      sy += lines.length * lh + rowGap + 2;
    });
    if (!ingredientRows.length || !stepRows.length) {
      c.fillStyle = PENCIL;
      if (!ingredientRows.length) c.fillText(eatenOut ? 'no visits yet' : 'none written down yet', PAD, iy);
      if (!stepRows.length) c.fillText('none written down yet', sx, sy);
    }

    // sign-off
    c.fillStyle = INK;
    c.textAlign = 'right';
    c.font = `22px "${LABEL_FONT}"`;
    const from = recipe.sourceName && recipe.sourceName !== 'sample card' ? recipe.sourceName : recipe.sourceUrl ? new URL(recipe.sourceUrl).hostname.replace(/^www\./, '') : '';
    c.fillText(`xo, ${from ? `from ${from}` : eatenOut ? `from ${recipe.location || 'a night out'}` : 'from my own kitchen'}`.toLowerCase(), CW - PAD, footY);
    c.textAlign = 'left';

    const margin = 40;
    const out = onDesk(sheet, CW, CH, margin, glow, white);
    signature(out.ctx, out.W, out.H);
    return toBlob(out.canvas);
  }
}

/** One stamp, drawn at (x, y) with its top-left corner, `h` tall, tilted by `tilt` radians. */
function drawStamp(
  c: CanvasRenderingContext2D, recipe: StampCard, photo: HTMLImageElement | null, look: StampLook,
  x: number, y: number, h: number, tilt: number,
) {
  const k = h / STAMP_H;
  c.save();
  c.translate(x + (STAMP_W * k) / 2, y + h / 2);
  c.rotate(tilt);
  c.translate(-(STAMP_W * k) / 2, -h / 2);
  c.scale(k, k);
  c.shadowColor = 'rgba(60,55,50,.35)';
  c.shadowBlur = 5;
  c.shadowOffsetY = 2;
  // a cooked dish is a perforated rectangle; a meal eaten out is a scalloped circle, or a hand-cut bordered colour
  const round = !!recipe.ateOut && (look.ateOutStyle ?? 'circle') === 'circle';
  const bordered = !!recipe.ateOut && look.ateOutStyle === 'border';
  c.fillStyle = bordered ? stampFill(recipe, look) : STAMP_PAPER;
  c.fill(new Path2D(round ? CIRCLE_OUTLINE : bordered ? BORDER_OUTLINE : scallopPath(STAMP_W, STAMP_H, 4.6)));
  c.shadowColor = 'transparent';
  const iw = STAMP_W - STAMP_INSET * 2;
  const ih = STAMP_H - STAMP_INSET * 2;
  c.save();
  if (round) c.clip(new Path2D(CIRCLE_CLIP));
  else {
    c.beginPath();
    c.rect(STAMP_INSET, STAMP_INSET, iw, ih);
    c.clip();
  }
  if (photo) drawCover(c, photo, STAMP_INSET, STAMP_INSET, iw, ih);
  else {
    c.fillStyle = bordered ? STAMP_PAPER : stampFill(recipe, look); // the colour is already the border
    c.fillRect(STAMP_INSET, STAMP_INSET, iw, ih);
    c.fillStyle = INK;
    if (recipe.ateOut) { // a meal eaten out with no photo: a fork, drawn in pen
      c.save();
      c.translate(STAMP_W / 2 - 19, STAMP_H / 2 - 17);
      c.scale(1.6, 1.6);
      c.strokeStyle = INK;
      c.lineWidth = 1.15;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke(new Path2D(PATHS.fork));
      c.restore();
    } else {
      c.textAlign = 'center';
      c.font = `44px 'KR Fruitsy'`;
      c.fillText(stampFruit(recipe, look), STAMP_W / 2, STAMP_H / 2 + 14);
      c.textAlign = 'left';
    }
  }
  if (look.finish === 'grainy') c.drawImage(stampGrain(), STAMP_INSET, STAMP_INSET, iw, ih);
  if (look.finish === 'faded') {
    c.globalAlpha = STAMP_VEIL;
    c.fillStyle = STAMP_PAPER;
    c.fillRect(STAMP_INSET, STAMP_INSET, iw, ih);
    c.globalAlpha = 1;
  }
  c.strokeStyle = INK;
  c.lineCap = 'round';
  c.lineWidth = 1;
  c.globalAlpha = 0.32;
  c.stroke(new Path2D(STAMP_CANCEL));
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 0.9;
  c.globalAlpha = 0.75;
  c.stroke(new Path2D(round ? CIRCLE_CLIP : STAMP_PEN));
  c.restore();
}

/** A month of the calendar as a picture, a stamp on every day something was cooked. */
export async function renderMonthImage(year: number, month: number, recipes: Recipe[], { recipeFont, look, glow, white, show }: ShareContext, { seed }: MonthLook): Promise<Blob> {
  const hand = handFamily(recipeFont === 'print' ? 'hand' : recipeFont);
  await ensureFonts([LABEL_FONT, hand]);
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const byDay = new Map<string, StampCard[]>();
  for (const [d, list] of stampsByDay(recipes, show ?? ALL)) if (d.startsWith(prefix)) byDay.set(d, list);
  const photos = new Map<string, HTMLImageElement | null>();
  await Promise.all([...new Set([...byDay.values()].flat())].map(async (r) => {
    photos.set(r.id, await recipePhoto(r, 'thumb'));
  }));

  const weeks = monthWeeks(year, month);
  const CW = 640;
  const PAD = 40;
  const cellW = (CW - PAD * 2) / 7;
  const cellH = 108; // roomy cells, so the stamps can be big
  const headH = 150;
  const CH = headH + 34 + weeks.length * cellH + 40;
  const id = `calendar-${year}-${month}`;
  const { sheet, look: ink } = await cottonSheet(CW, CH, id);
  const c = sheet.getContext('2d')!; // already scaled by newCanvas
  c.globalCompositeOperation = 'source-over';
  c.lineCap = 'round';
  c.lineJoin = 'round';

  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  c.globalAlpha = 0.9;
  const moved = new Path2D();
  moved.addPath(new Path2D(toPixels(FRAMES[ink.frame].main, CW - 10, CH - 10)), new DOMMatrix().translate(5, 5));
  c.stroke(moved);
  c.restore();

  c.fillStyle = INK;
  c.textAlign = 'center';
  c.font = `54px "${LABEL_FONT}"`;
  c.fillText(MONTH_NAMES[month], CW / 2 - 24, 82);
  c.font = `26px "${hand}"`;
  c.fillStyle = INK_SOFT;
  c.fillText(String(year), CW / 2 + c.measureText(MONTH_NAMES[month]).width * 0 + 92, 82);
  c.font = `19px "${LABEL_FONT}"`;
  c.fillText(countLine([...byDay.values()].flat(), 'nothing stamped yet'), CW / 2, 112);
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.globalAlpha = 0.8;
  stroke(c, RULES[ink.rule], [100, 6], PAD, 122, CW - PAD * 2, 10);
  c.globalAlpha = 1;

  c.font = `20px "${LABEL_FONT}"`;
  c.fillStyle = INK_SOFT;
  WEEKDAYS.forEach((d, i) => c.fillText(d, PAD + cellW * i + cellW / 2, headH + 20));
  c.textAlign = 'left';

  weeks.forEach((week, w) => {
    const top = headH + 34 + w * cellH;
    c.save();
    c.strokeStyle = PENCIL;
    c.globalAlpha = 0.55;
    c.setLineDash([3, 4]);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(PAD, top + cellH - 4);
    c.lineTo(CW - PAD, top + cellH - 4);
    c.stroke();
    c.restore();
    week.forEach((day, i) => {
      if (!day) return;
      const x = PAD + i * cellW;
      const list = pickShown(byDay.get(day) ?? [], day, seed);
      list.forEach((r, n) => {
        const h = list.length > 1 ? 72 : 90;
        const sw = (STAMP_W / STAMP_H) * h;
        const sx = x + (cellW - sw) / 2 + 4 + (list.length > 1 ? (n ? 12 : -10) : 0);
        const sy = top + 12 + (list.length > 1 && n ? 12 : 0);
        drawStamp(c, r, photos.get(r.id) ?? null, look, sx, sy, h, (stampTilt(r.id, day, seed) * Math.PI) / 180);
      });
      c.font = `21px "${hand}"`; // the day number sits on top of any stamp
      c.fillStyle = INK_SOFT;
      c.fillText(String(Number(day.slice(8))), x + 4, top + 22);
      const extra = (byDay.get(day) ?? []).length - 2;
      if (extra > 0) {
        c.font = `18px "${LABEL_FONT}"`;
        c.fillStyle = INK;
        c.fillText(`+${extra}`, x + cellW - 26, top + 22);
      }
    });
  });

  const out = onDesk(sheet, CW, CH, 40, glow, white);
  signature(out.ctx, out.W, out.H);
  return toBlob(out.canvas);
}

export const fileSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recipe';

/** "3 dishes cooked  ·  2 dishes ate out" (or what to say when there's nothing). */
function countLine(list: StampCard[], none: string) {
  const out = list.filter((s) => s.ateOut).length;
  const cooked = list.length - out;
  const parts = [
    cooked ? `${cooked} ${cooked === 1 ? 'dish' : 'dishes'} cooked` : '',
    out ? `${out} ${out === 1 ? 'dish' : 'dishes'} ate out` : '',
  ].filter(Boolean);
  return parts.length ? parts.join('  ·  ') : none;
}

/** Who was cooked on each of these days, with each recipe's photo ready to draw. */
async function cookedOn(days: string[], recipes: Recipe[], show: Shown) {
  const byDay = new Map<string, StampCard[]>();
  for (const [d, list] of stampsByDay(recipes, show)) if (days.includes(d)) byDay.set(d, list);
  const photos = new Map<string, HTMLImageElement | null>();
  await Promise.all([...new Set([...byDay.values()].flat())].map(async (r) => {
    photos.set(r.id, await recipePhoto(r, 'thumb'));
  }));
  return { byDay, photos };
}

/** The pen border and the sheet it's drawn on, shared by the week and day pictures. */
async function penSheet(CW: number, CH: number, id: string) {
  const { sheet, look: ink } = await cottonSheet(CW, CH, id);
  const c = sheet.getContext('2d')!; // already scaled by newCanvas
  c.globalCompositeOperation = 'source-over';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 1.5;
  c.globalAlpha = 0.9;
  const moved = new Path2D();
  moved.addPath(new Path2D(toPixels(FRAMES[ink.frame].main, CW - 10, CH - 10)), new DOMMatrix().translate(5, 5));
  c.stroke(moved);
  c.restore();
  return { sheet, c, ink };
}

/** Recipes in a steady shuffle that follows `seed`, so the dice (and the page) agree on the order. */
const shuffled = (list: StampCard[], day: string, seed: number) =>
  [...list].sort((a, b) => hash01(`${seed}|${a.id}|${day}|order`) - hash01(`${seed}|${b.id}|${day}|order`));

/**
 * Seven days in a row, starting on `start`, as a picture: a column per day, every dish stamped in a
 * little overlapping stack (up to five; the rest are counted).
 */
export async function renderWeekImage(start: string, recipes: Recipe[], { recipeFont, look, glow, white, show }: ShareContext, { seed }: MonthLook): Promise<Blob> {
  const hand = handFamily(recipeFont === 'print' ? 'hand' : recipeFont);
  await ensureFonts([LABEL_FONT, hand]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const { byDay, photos } = await cookedOn(days, recipes, show ?? ALL);

  const CW = 720;
  const PAD = 34;
  const colW = (CW - PAD * 2) / 7;
  const stampH = 96; // big enough to read, and as large as the month picture's
  const stampW = (STAMP_W / STAMP_H) * stampH;
  const step = 74;
  const MAX = 5;
  const total = days.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0);
  const stacked = Math.max(0, ...days.map((d) => Math.min(MAX, byDay.get(d)?.length ?? 0)));
  const bodyTop = 214;
  const bodyH = stacked ? stampH + (stacked - 1) * step + 26 : 96;
  const CH = bodyTop + bodyH + 46;

  const { sheet, c, ink } = await penSheet(CW, CH, `week-${start}`);
  c.fillStyle = INK;
  c.textAlign = 'center';
  c.font = `48px "${LABEL_FONT}"`;
  c.fillText(rangeLabel(days[0], days[6]), CW / 2, 84);
  c.font = `19px "${LABEL_FONT}"`;
  c.fillStyle = INK_SOFT;
  c.fillText(countLine(days.flatMap((d) => byDay.get(d) ?? []), 'nothing stamped this week'), CW / 2, 114);
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.globalAlpha = 0.8;
  stroke(c, RULES[ink.rule], [100, 6], PAD, 124, CW - PAD * 2, 10);
  c.globalAlpha = 1;

  // faint pencil lines between the days
  c.save();
  c.strokeStyle = PENCIL;
  c.globalAlpha = 0.5;
  c.setLineDash([3, 5]);
  c.lineWidth = 1;
  for (let i = 1; i < 7; i++) {
    c.beginPath();
    c.moveTo(PAD + i * colW, 150);
    c.lineTo(PAD + i * colW, CH - 36);
    c.stroke();
  }
  c.restore();

  days.forEach((day, i) => {
    const x = PAD + i * colW;
    c.textAlign = 'center';
    c.fillStyle = INK_SOFT;
    c.font = `20px "${LABEL_FONT}"`;
    c.fillText(weekdayName(day).slice(0, 3), x + colW / 2, 170);
    c.fillStyle = INK;
    c.font = `26px "${hand}"`;
    c.fillText(String(Number(day.slice(8))), x + colW / 2, 198);
    const list = shuffled(byDay.get(day) ?? [], day, seed);
    list.slice(0, MAX).forEach((r, n) => {
      const sx = x + (colW - stampW) / 2 + (hash01(`${seed}|${r.id}|${day}|x`) - 0.5) * 8;
      drawStamp(c, r, photos.get(r.id) ?? null, look, sx, bodyTop + n * step, stampH, (stampTilt(r.id, day, seed) * Math.PI) / 180);
    });
    if (list.length > MAX) {
      c.fillStyle = INK;
      c.font = `18px "${LABEL_FONT}"`;
      c.fillText(`+${list.length - MAX}`, x + colW / 2, bodyTop + (MAX - 1) * step + stampH + 20);
    }
  });
  if (!total) {
    c.fillStyle = PENCIL;
    c.font = `26px "${LABEL_FONT}"`;
    c.fillText('nothing stamped this week', CW / 2, bodyTop + 52);
  }

  const out = onDesk(sheet, CW, CH, 40, glow, white);
  signature(out.ctx, out.W, out.H);
  return toBlob(out.canvas);
}

/**
 * One day as a picture: its name written large, then every stamp from that day scattered like they
 * were laid down by hand: overlapping in loose rows, each leaning its own way, a few held on with
 * a strip of tape, and the dishes' names written underneath.
 */
export async function renderDayImage(day: string, recipes: Recipe[], { recipeFont, look, glow, white, show }: ShareContext, { seed }: MonthLook): Promise<Blob> {
  const hand = handFamily(recipeFont === 'print' ? 'hand' : recipeFont);
  await ensureFonts([LABEL_FONT, hand]);
  const { byDay, photos } = await cookedOn([day], recipes, show ?? ALL);
  const all = shuffled(byDay.get(day) ?? [], day, seed);
  const MAX = 12;
  const list = all.slice(0, MAX);
  const n = list.length;

  const CW = 640;
  const PAD = 44;
  const inner = CW - PAD * 2;
  // how big the stamps are and how many to a row, so a few sit large and many still fill the page
  const [stampH, perRow] =
    n <= 1 ? [220, 1] : n === 2 ? [180, 2] : n === 3 ? [150, 3] : n === 4 ? [128, 4] : n <= 6 ? [130, 3] : n <= 8 ? [120, 4] : n <= 10 ? [100, 5] : [100, 4];
  const stampW = (STAMP_W / STAMP_H) * stampH;
  const rows = n ? Math.ceil(n / perRow) : 0;
  const rowH = stampH * 0.86;
  const areaH = n ? stampH + (rows - 1) * rowH + 30 : 120;

  const { canvas: scratch, ctx: m } = newCanvas(10, 10);
  void scratch;
  m.font = `26px "${hand}"`;
  const names = all.length ? wrap(m, [...new Set(list.map((r) => r.title.toLowerCase()))].join('  ·  ') + (all.length > MAX ? `  ·  and ${all.length - MAX} more` : ''), inner) : [];

  const headH = 194;
  const namesH = names.length ? names.length * 32 + 22 : 0;
  const CH = headH + areaH + namesH + 54;
  const { sheet, c, ink } = await penSheet(CW, CH, `day-${day}`);

  c.textAlign = 'center';
  c.fillStyle = INK;
  c.font = `58px "${LABEL_FONT}"`;
  c.fillText(weekdayName(day), CW / 2, 84);
  c.fillStyle = INK_SOFT;
  c.font = `28px "${hand}"`;
  c.fillText(longDate(day), CW / 2, 138); // low enough that the descenders of the weekday clear it
  c.font = `19px "${LABEL_FONT}"`;
  c.fillText(countLine(all, 'nothing stamped on this day'), CW / 2, 166);
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.globalAlpha = 0.8;
  stroke(c, RULES[ink.rule], [100, 6], PAD, 176, inner, 10);
  c.globalAlpha = 1;

  // lay the stamps in loose, staggered rows
  const top = headH + 12;
  const gapX = perRow > 1 ? Math.min(stampW * 1.38, (inner - stampW - 24) / (perRow - 1)) : 0;
  list.forEach((r, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const rowW = stampW + (inRow - 1) * gapX;
    const stagger = row % 2 ? gapX * 0.22 : -gapX * 0.1;
    const jx = (hash01(`${seed}|${r.id}|jx`) - 0.5) * 14;
    const jy = (hash01(`${seed}|${r.id}|jy`) - 0.5) * 10;
    const x = PAD + (inner - rowW) / 2 + (i % perRow) * gapX + stagger + jx;
    const y = top + row * rowH + jy;
    const tilt = (stampTilt(r.id, day, seed) * 1.5 * Math.PI) / 180;
    drawStamp(c, r, photos.get(r.id) ?? null, look, x, y, stampH, tilt);
    if (hash01(`${seed}|${r.id}|tape`) > 0.5) { // a strip of tape across the top edge
      c.save();
      c.translate(x + stampW / 2 + (hash01(`${seed}|${r.id}|tx`) - 0.5) * stampW * 0.5, y + 2);
      c.rotate(tilt + (hash01(`${seed}|${r.id}|tr`) - 0.5) * 0.6);
      c.fillStyle = 'rgba(220,193,150,.72)';
      c.fillRect(-19, -7, 38, 14);
      c.restore();
    }
  });
  if (!n) {
    c.fillStyle = PENCIL;
    c.font = `26px "${LABEL_FONT}"`;
    c.fillText('nothing stamped on this day', CW / 2, headH + 66);
  }

  c.fillStyle = INK;
  c.font = `26px "${hand}"`;
  names.forEach((line, i) => c.fillText(line, CW / 2, headH + areaH + 22 + i * 32));

  const out = onDesk(sheet, CW, CH, 40, glow, white);
  signature(out.ctx, out.W, out.H);
  return toBlob(out.canvas);
}
