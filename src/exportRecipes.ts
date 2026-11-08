import { CATEGORIES, type Recipe } from './types';
import { abbreviateUnits, ratingLabel, servesLabel, stepText } from './recipeText';
import { api } from './api';

/** A kept photo travels inside a .json backup as two data: links, so a backup brings the photos back too. */
interface PhotoData { main: string; thumb: string }
type BackupCard = Recipe & { photoData?: PhotoData; visitPhotoData?: (PhotoData | null)[] };

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Kept photos stop at 1200px, so a backed-up one is well under this. Anything bigger isn't ours. */
const MAX_PHOTO_DATA = 8 * 1024 * 1024;

function fromDataUrl(url: unknown): Blob | null {
  if (typeof url !== 'string' || url.length > MAX_PHOTO_DATA) return null;
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  } catch {
    return null;
  }
}

async function photoPair(id: string | undefined): Promise<PhotoData | null> {
  if (!id) return null;
  const [main, thumb] = await Promise.all([api.photo(id, 'main'), api.photo(id, 'thumb')]);
  return main && thumb ? { main: await toDataUrl(main), thumb: await toDataUrl(thumb) } : null;
}

async function withPhotoData(r: Recipe): Promise<BackupCard> {
  const own = await photoPair(r.photo);
  // a restaurant's meals each carry the photo of the dish
  const visitData = r.visits?.length ? await Promise.all(r.visits.map((v) => photoPair(v.photo))) : [];
  return {
    ...r,
    ...(own ? { photoData: own } : {}),
    ...(visitData.some(Boolean) ? { visitPhotoData: visitData } : {}),
  };
}

async function restorePair(data: PhotoData | null | undefined): Promise<string> {
  if (!data) return '';
  const main = fromDataUrl(data.main);
  const thumb = fromDataUrl(data.thumb);
  return main && thumb ? api.savePhoto({ main, thumb }) : '';
}

async function restorePhoto(card: unknown): Promise<unknown> {
  if (!card || typeof card !== 'object') return card;
  const { photoData, visitPhotoData, ...rest } = card as BackupCard;
  const out: Record<string, unknown> = { ...rest };
  if (photoData) out.photo = await restorePair(photoData);
  if (Array.isArray(rest.visits)) {
    out.visits = await Promise.all(rest.visits.map(async (v, i) => {
      const { photo: _gone, ...visit } = (v ?? {}) as unknown as Record<string, unknown>;
      void _gone;
      const id = await restorePair(visitPhotoData?.[i]);
      return id ? { ...visit, photo: id } : visit;
    }));
  }
  return out;
}

function download(filename: string, data: unknown, type = 'application/json') {
  const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Today's date where you are (not UTC), e.g. 2026-11-07. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const slug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recipe';

export const EXPORT_FORMATS = [
  { key: 'json', label: '.json' }, // backs up, and can be added back
  { key: 'md', label: '.md' },
  { key: 'txt', label: '.txt' },
  { key: 'docx', label: '.docx' },
  { key: 'pdf', label: '.pdf' },
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number]['key'];

const FORMAT_KEY = 'export-format';
/** The format exports use (.json to back up and add back; the rest to read, edit or print); remembered in this browser. */
export function loadExportFormat(): ExportFormat {
  try {
    const saved = localStorage.getItem(FORMAT_KEY);
    return EXPORT_FORMATS.find((f) => f.key === saved)?.key ?? 'json';
  } catch { return 'json'; }
}
export function saveExportFormat(format: ExportFormat) {
  try { localStorage.setItem(FORMAT_KEY, format); } catch { /* private window: fine for this visit */ }
}

export interface ImportSummary {
  added: Recipe[];
  /** Cards already in the box. */
  skipped: number;
  /** Cards (or whole files) that weren't recipes. */
  invalid: number;
}

/** Reads .json files (one card, a list, or an "export all" file) and adds their recipes to the box. */
export async function importFiles(files: File[], send: (payload: unknown) => Promise<ImportSummary>): Promise<ImportSummary> {
  const total: ImportSummary = { added: [], skipped: 0, invalid: 0 };
  const cards: unknown[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(await file.text());
      cards.push(...(Array.isArray(data) ? data : Array.isArray(data?.recipes) ? data.recipes : [data]));
    } catch {
      total.invalid++; // not JSON at all
    }
  }
  if (cards.length) {
    const sent = await send(await Promise.all(cards.map(restorePhoto)));
    total.added = sent.added;
    total.skipped += sent.skipped;
    total.invalid += sent.invalid;
  }
  return total;
}

/** "added 3 recipes · 1 was already here" */
export function importMessage({ added, skipped, invalid }: ImportSummary) {
  const parts = [`added ${added.length} card${added.length === 1 ? '' : 's'}`];
  if (skipped) parts.push(`${skipped} already in the box`);
  if (invalid) parts.push(`${invalid} couldn’t be read`);
  return parts.join(' · ');
}

/** A titled list on a card: bullets, numbered steps, or plain paragraphs. */
interface Part { title: string; items: string[]; style: 'bullets' | 'numbered' | 'paragraphs' }

/** One card (a recipe or a restaurant), ready to lay out in any format. */
function sections(r: Recipe) {
  const source = r.sourceUrl ? { name: r.sourceName && r.sourceName !== 'sample card' ? r.sourceName : r.sourceUrl, url: r.sourceUrl } : null;
  if (r.kind === 'restaurant') {
    const meals = [...(r.visits ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((v) => `${v.date} — ${v.dish || 'a visit'}`);
    return {
      title: r.title,
      details: [r.price, r.venue, r.location, r.cuisine, r.rating ? ratingLabel(r.rating) : ''].filter(Boolean).join(' · '),
      source,
      address: r.address ?? '',
      note: '',
      parts: [
        { title: 'What we ate', items: meals, style: 'bullets' },
        { title: 'Thoughts', items: r.review ? r.review.split('\n').filter(Boolean) : [], style: 'paragraphs' },
      ] as Part[],
    };
  }
  const meal = CATEGORIES.find((c) => c.key === r.category)?.label;
  return {
    title: r.title,
    details: [meal, r.cuisine, r.totalTime, servesLabel(r.servings), r.rating ? ratingLabel(r.rating) : ''].filter(Boolean).join(' · '),
    source,
    address: '',
    note: r.review,
    parts: [
      { title: 'Ingredients', items: r.ingredients.map(abbreviateUnits), style: 'bullets' },
      { title: 'Directions', items: r.steps.map(stepText), style: 'numbered' },
    ] as Part[],
  };
}

const NONE = 'none written down yet';

/** One card as markdown: title, a line of details, the note, then its lists. */
export function recipeToMarkdown(r: Recipe) {
  const c = sections(r);
  const out = [`# ${c.title}`];
  if (c.details) out.push(`*${c.details}*`);
  if (c.address) out.push(`Address: ${c.address}`);
  if (c.source) out.push(`From [${c.source.name}](${c.source.url})`);
  if (c.note) out.push(c.note.split('\n').map((l) => `> ${l}`).join('\n'));
  for (const part of c.parts) {
    out.push(`## ${part.title}`);
    out.push(
      !part.items.length ? `_${NONE}_`
        : part.style === 'numbered' ? part.items.map((s, n) => `${n + 1}. ${s}`).join('\n')
          : part.style === 'paragraphs' ? part.items.join('\n\n')
            : part.items.map((i) => `- ${i}`).join('\n'),
    );
  }
  return out.join('\n\n') + '\n';
}

/** The same, as plain text that reads fine anywhere. */
export function recipeToText(r: Recipe) {
  const c = sections(r);
  const out = [c.title.toUpperCase()];
  if (c.details) out.push(c.details);
  if (c.address) out.push(`Address: ${c.address}`);
  if (c.source) out.push(`From ${c.source.name}: ${c.source.url}`);
  if (c.note) out.push(c.note);
  for (const part of c.parts) {
    out.push(
      part.title.toUpperCase() + '\n' +
        (!part.items.length ? NONE
          : part.style === 'numbered' ? part.items.map((s, n) => `${n + 1}. ${s}`).join('\n')
            : part.style === 'paragraphs' ? part.items.join('\n\n')
              : part.items.map((i) => `- ${i}`).join('\n')),
    );
  }
  return out.join('\n\n') + '\n';
}

/** A Word document: one card per page. */
async function toDocx(recipes: Recipe[]) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun, ExternalHyperlink } = await import('docx');
  const children = recipes.flatMap((r, n) => {
    const c = sections(r);
    const list = (part: Part) =>
      part.items.length
        ? part.items.map((t, i) =>
            new Paragraph({
              text: part.style === 'numbered' ? `${i + 1}. ${t}` : t,
              bullet: part.style === 'bullets' ? { level: 0 } : undefined,
            }))
        : [new Paragraph({ children: [new TextRun({ text: NONE, italics: true })] })];
    return [
      new Paragraph({ text: c.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: n > 0 }),
      ...(c.details ? [new Paragraph({ children: [new TextRun({ text: c.details, italics: true })] })] : []),
      ...(c.address ? [new Paragraph({ children: [new TextRun(`Address: ${c.address}`)] })] : []),
      ...(c.source
        ? [new Paragraph({ children: [new TextRun('From '), new ExternalHyperlink({ link: c.source.url, children: [new TextRun({ text: c.source.name, style: 'Hyperlink' })] })] })]
        : []),
      ...(c.note ? [new Paragraph({ children: [new TextRun({ text: c.note, italics: true })], spacing: { before: 120 } })] : []),
      ...c.parts.flatMap((part) => [new Paragraph({ text: part.title, heading: HeadingLevel.HEADING_2 }), ...list(part)]),
    ];
  });
  return Packer.toBlob(new Document({ sections: [{ children }] }));
}

/** A PDF: one card per page (more if it runs long). */
async function toPdf(recipes: Recipe[]) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 56;
  let y = M;
  const write = (text: string, size: number, style: 'normal' | 'bold' | 'italic', gap = 0) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(text, W - M * 2) as string[]) {
      if (y > H - M) { pdf.addPage(); y = M; }
      pdf.text(line, M, y);
      y += size * 1.35;
    }
    y += gap;
  };
  recipes.forEach((r, n) => {
    if (n > 0) { pdf.addPage(); y = M; }
    const c = sections(r);
    write(c.title, 22, 'bold', 4);
    if (c.details) write(c.details, 11, 'italic', 2);
    if (c.address) write(`Address: ${c.address}`, 10, 'normal', 2);
    if (c.source) write(`From ${c.source.name}`, 10, 'normal', 2);
    if (c.note) write(c.note, 11, 'italic', 6);
    c.parts.forEach((part, k) => {
      if (k > 0) y += 10;
      write(part.title, 14, 'bold', 2);
      if (!part.items.length) write(NONE, 11, 'normal');
      part.items.forEach((t, i) =>
        write(part.style === 'bullets' ? `•  ${t}` : part.style === 'numbered' ? `${i + 1}.  ${t}` : t, 11, 'normal', part.style === 'bullets' ? 0 : 3));
    });
  });
  return pdf.output('blob');
}

const MIME: Record<ExportFormat, string> = {
  json: 'application/json',
  md: 'text/markdown',
  txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

async function make(recipes: Recipe[], format: ExportFormat, single: boolean): Promise<string | Blob | unknown> {
  switch (format) {
    case 'json': {
      const cards = await Promise.all(recipes.map(withPhotoData));
      return single ? cards[0] : { exportedAt: new Date().toISOString(), count: cards.length, recipes: cards };
    }
    case 'md': return recipes.map(recipeToMarkdown).join('\n---\n\n');
    case 'txt': return recipes.map(recipeToText).join('\n' + '-'.repeat(40) + '\n\n');
    case 'docx': return toDocx(recipes);
    case 'pdf': return toPdf(recipes);
  }
}

/** Every recipe in the box as my-recipes-YYYY-MM-DD.<format>. */
export async function exportCards(recipes: Recipe[], format: ExportFormat) {
  download(`my-recipes-${today()}.${format}`, await make(recipes, format, false), MIME[format]);
}

/** One recipe as its-name.<format>. */
export async function exportCard(recipe: Recipe, format: ExportFormat) {
  download(`${slug(recipe.title)}.${format}`, await make([recipe], format, true), MIME[format]);
}
