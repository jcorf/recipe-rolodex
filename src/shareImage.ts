import { FRAMES, RULES, STARS } from './components/inkPaths';
import { cardLook, toPixels } from './components/ink';
import { loadFruitFont } from './components/FruitMark';
import { stampFill, stampFruit, type StampLook } from './components/MonthGrid';
import { MONTH_NAMES, WEEKDAYS, monthWeeks, stampTilt } from './dates';
import { stampGrain } from './stampGrain';
import { abbreviateUnits, servesLabel, splitAmount, stepText } from './recipeText';
import { scallopPath } from './scallop';
import { STAMP_CANCEL, STAMP_H, STAMP_INSET, STAMP_PAPER, STAMP_PEN, STAMP_W } from './components/Stamp';
import type { Recipe, Settings } from './types';

/**
 * Pictures of a recipe card, and of a month of the calendar, drawn straight onto a canvas in the
 * same cotton / pen / handwriting look as the page (a screenshot of the page can't be saved at a
 * fixed size, and photos from other sites would stop a canvas from being exported, so they come
 * through the app's own /api/image).
 */
const SCALE = 2; // 2× the logical size, so the picture stays sharp when shared
const INK = '#3d3c40';
const INK_SOFT = '#6f6d70';
const PENCIL = '#a39d96';
const DESK = '#f5f3ee';
const LABEL_FONT = 'La Belle Aurore';

export interface ShareContext {
  recipeFont: Settings['recipeFont'];
  look: StampLook;
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
function onDesk(sheet: HTMLCanvasElement, w: number, h: number, margin: number) {
  const W = w + margin * 2;
  const H = h + margin * 2 + 22;
  const { canvas, ctx } = newCanvas(W, H);
  ctx.fillStyle = DESK;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W * 0.9);
  glow.addColorStop(0, 'rgba(247,215,199,.55)');
  glow.addColorStop(1, 'rgba(247,215,199,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
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
export async function renderRecipeImage(recipe: Recipe, { recipeFont }: ShareContext): Promise<Blob> {
  const hand = handFamily(recipeFont);
  const handPx = handSize(recipeFont);
  const lower = recipeFont !== 'print';
  const fix = (t: string) => (lower ? t.toLowerCase() : t);
  await ensureFonts([LABEL_FONT, hand]);
  const photo = recipe.image ? await loadImage(photoSrc(recipe.image)) : null;

  const CW = 620;
  const PAD = 46;
  const inner = CW - PAD * 2;
  const { canvas: scratch, ctx: m } = newCanvas(10, 10);
  void scratch;

  // ── lay out: every piece's height is measured first, so the card is exactly as tall as it needs
  const photoW = photo ? 118 : 0;
  m.font = `38px "${LABEL_FONT}"`;
  const titleLines = wrap(m, recipe.title.toLowerCase(), inner - (photo ? photoW + 22 : 0));
  const meta = [recipe.totalTime, servesLabel(recipe.servings), recipe.cuisine].filter(Boolean).join('  ·  ');
  m.font = `${handPx + 3}px "${hand}"`;
  const noteLines = recipe.review ? wrap(m, fix(recipe.review), inner) : [];
  const colGap = 30;
  const col1 = (inner - colGap) * 0.42;
  const col2 = inner - colGap - col1;
  const lh = handPx * (recipeFont === 'print' ? 1.4 : 1.12);
  m.font = `${handPx}px "${hand}"`;
  const amtW = Math.min(col1 * 0.45, Math.max(54, ...recipe.ingredients.map((l) => m.measureText(fix(splitAmount(l)[0])).width + 12)));
  const ingredientRows = recipe.ingredients.map((line) => {
    const [amount, name] = splitAmount(line);
    return { amount, lines: wrap(m, fix(name), col1 - (amount ? amtW : 0)) };
  });
  const stepRows = recipe.steps.map((s) => wrap(m, fix(stepText(abbreviateUnits(s))), col2 - 26));
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
    c.fillText('ingredients', PAD, colsTop + 14);
    c.fillText('directions', PAD + col1 + colGap, colsTop + 14);
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
      c.fillStyle = INK_SOFT;
      c.fillText(`${n + 1}.`, sx, sy);
      c.fillStyle = INK;
      lines.forEach((line, i) => c.fillText(line, sx + 26, sy + i * lh));
      sy += lines.length * lh + rowGap + 2;
    });
    if (!recipe.ingredients.length || !recipe.steps.length) {
      c.fillStyle = PENCIL;
      if (!recipe.ingredients.length) c.fillText('none written down yet', PAD, iy);
      if (!recipe.steps.length) c.fillText('none written down yet', sx, sy);
    }

    // sign-off
    c.fillStyle = INK;
    c.textAlign = 'right';
    c.font = `22px "${LABEL_FONT}"`;
    const from = recipe.sourceName && recipe.sourceName !== 'sample card' ? recipe.sourceName : recipe.sourceUrl ? new URL(recipe.sourceUrl).hostname.replace(/^www\./, '') : '';
    c.fillText(`xo, ${from ? `from ${from}` : 'from my own kitchen'}`, CW - PAD, footY);
    c.textAlign = 'left';

    const margin = 40;
    const out = onDesk(sheet, CW, CH, margin);
    signature(out.ctx, out.W, out.H);
    return toBlob(out.canvas);
  }
}

/** One stamp, drawn at (x, y) with its top-left corner, `h` tall, tilted by `tilt` radians. */
function drawStamp(
  c: CanvasRenderingContext2D, recipe: Recipe, photo: HTMLImageElement | null, look: StampLook,
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
  c.fillStyle = STAMP_PAPER;
  c.fill(new Path2D(scallopPath(STAMP_W, STAMP_H, 4.6)));
  c.shadowColor = 'transparent';
  const iw = STAMP_W - STAMP_INSET * 2;
  const ih = STAMP_H - STAMP_INSET * 2;
  c.save();
  c.beginPath();
  c.rect(STAMP_INSET, STAMP_INSET, iw, ih);
  c.clip();
  if (photo) drawCover(c, photo, STAMP_INSET, STAMP_INSET, iw, ih);
  else {
    c.fillStyle = stampFill(recipe, look);
    c.fillRect(STAMP_INSET, STAMP_INSET, iw, ih);
    c.fillStyle = INK;
    c.textAlign = 'center';
    c.font = `44px 'KR Fruitsy'`;
    c.fillText(stampFruit(recipe, look), STAMP_W / 2, STAMP_H / 2 + 14);
    c.textAlign = 'left';
  }
  if (look.grainy) c.drawImage(stampGrain(), STAMP_INSET, STAMP_INSET, iw, ih);
  c.strokeStyle = INK;
  c.lineCap = 'round';
  c.lineWidth = 1;
  c.globalAlpha = 0.32;
  c.stroke(new Path2D(STAMP_CANCEL));
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 0.9;
  c.globalAlpha = 0.75;
  c.stroke(new Path2D(STAMP_PEN));
  c.restore();
}

/** A month of the calendar as a picture, a stamp on every day something was cooked. */
export async function renderMonthImage(year: number, month: number, recipes: Recipe[], { recipeFont, look }: ShareContext, { seed }: MonthLook): Promise<Blob> {
  const hand = handFamily(recipeFont === 'print' ? 'hand' : recipeFont);
  await ensureFonts([LABEL_FONT, hand]);
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const byDay = new Map<string, Recipe[]>();
  for (const r of recipes) for (const d of r.cooked ?? []) if (d.startsWith(prefix)) byDay.set(d, [...(byDay.get(d) ?? []), r]);
  const photos = new Map<string, HTMLImageElement | null>();
  await Promise.all([...new Set([...byDay.values()].flat())].map(async (r) => {
    photos.set(r.id, r.image ? await loadImage(photoSrc(r.image)) : null);
  }));

  const weeks = monthWeeks(year, month);
  const CW = 640;
  const PAD = 40;
  const cellW = (CW - PAD * 2) / 7;
  const cellH = 92;
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

  const count = [...byDay.values()].reduce((n, l) => n + l.length, 0);
  c.fillStyle = INK;
  c.textAlign = 'center';
  c.font = `54px "${LABEL_FONT}"`;
  c.fillText(MONTH_NAMES[month], CW / 2 - 24, 82);
  c.font = `26px "${hand}"`;
  c.fillStyle = INK_SOFT;
  c.fillText(String(year), CW / 2 + c.measureText(MONTH_NAMES[month]).width * 0 + 92, 82);
  c.font = `19px "${LABEL_FONT}"`;
  c.fillText(count ? `${count} ${count === 1 ? 'dish' : 'dishes'} cooked` : 'nothing stamped yet', CW / 2, 112);
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
      const list = (byDay.get(day) ?? []).slice(0, 2);
      list.forEach((r, n) => {
        const h = list.length > 1 ? 58 : 70;
        const sw = (STAMP_W / STAMP_H) * h;
        const sx = x + (cellW - sw) / 2 + 4 + (list.length > 1 ? (n ? 11 : -9) : 0);
        const sy = top + 16 + (list.length > 1 && n ? 12 : 0);
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

  const out = onDesk(sheet, CW, CH, 40);
  signature(out.ctx, out.W, out.H);
  return toBlob(out.canvas);
}

export const fileSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recipe';
