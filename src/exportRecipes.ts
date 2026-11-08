import { CATEGORIES, type Recipe } from './types';
import { abbreviateUnits, ratingLabel, servesLabel, stepText } from './recipeText';

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
    const sent = await send(cards);
    total.added = sent.added;
    total.skipped += sent.skipped;
    total.invalid += sent.invalid;
  }
  return total;
}

/** "added 3 recipes · 1 was already here" */
export function importMessage({ added, skipped, invalid }: ImportSummary) {
  const parts = [`added ${added.length} recipe${added.length === 1 ? '' : 's'}`];
  if (skipped) parts.push(`${skipped} already in the box`);
  if (invalid) parts.push(`${invalid} couldn’t be read`);
  return parts.join(' · ');
}

/** One recipe, ready to lay out in any format. */
function sections(r: Recipe) {
  const meal = CATEGORIES.find((c) => c.key === r.category)?.label;
  return {
    title: r.title,
    details: [meal, r.cuisine, r.totalTime, servesLabel(r.servings), r.rating ? ratingLabel(r.rating) : ''].filter(Boolean).join(' · '),
    source: r.sourceUrl ? { name: r.sourceName && r.sourceName !== 'sample card' ? r.sourceName : r.sourceUrl, url: r.sourceUrl } : null,
    note: r.review,
    ingredients: r.ingredients.map(abbreviateUnits),
    steps: r.steps.map(stepText),
  };
}

const NONE = 'none written down yet';

/** One recipe as markdown: title, a line of details, the note, ingredients, numbered directions. */
export function recipeToMarkdown(r: Recipe) {
  const c = sections(r);
  const out = [`# ${c.title}`];
  if (c.details) out.push(`*${c.details}*`);
  if (c.source) out.push(`From [${c.source.name}](${c.source.url})`);
  if (c.note) out.push(c.note.split('\n').map((l) => `> ${l}`).join('\n'));
  out.push('## Ingredients', c.ingredients.length ? c.ingredients.map((i) => `- ${i}`).join('\n') : `_${NONE}_`);
  out.push('## Directions', c.steps.length ? c.steps.map((s, n) => `${n + 1}. ${s}`).join('\n') : `_${NONE}_`);
  return out.join('\n\n') + '\n';
}

/** The same, as plain text that reads fine anywhere. */
export function recipeToText(r: Recipe) {
  const c = sections(r);
  const out = [c.title.toUpperCase()];
  if (c.details) out.push(c.details);
  if (c.source) out.push(`From ${c.source.name}: ${c.source.url}`);
  if (c.note) out.push(c.note);
  out.push('INGREDIENTS\n' + (c.ingredients.length ? c.ingredients.map((i) => `- ${i}`).join('\n') : NONE));
  out.push('DIRECTIONS\n' + (c.steps.length ? c.steps.map((s, n) => `${n + 1}. ${s}`).join('\n') : NONE));
  return out.join('\n\n') + '\n';
}

/** A Word document: one recipe per page. */
async function toDocx(recipes: Recipe[]) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun, ExternalHyperlink } = await import('docx');
  const children = recipes.flatMap((r, n) => {
    const c = sections(r);
    const list = (items: string[], numbered: boolean) =>
      items.length
        ? items.map((t, i) => new Paragraph({ text: numbered ? `${i + 1}. ${t}` : t, bullet: numbered ? undefined : { level: 0 } }))
        : [new Paragraph({ children: [new TextRun({ text: NONE, italics: true })] })];
    return [
      new Paragraph({ text: c.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: n > 0 }),
      ...(c.details ? [new Paragraph({ children: [new TextRun({ text: c.details, italics: true })] })] : []),
      ...(c.source
        ? [new Paragraph({ children: [new TextRun('From '), new ExternalHyperlink({ link: c.source.url, children: [new TextRun({ text: c.source.name, style: 'Hyperlink' })] })] })]
        : []),
      ...(c.note ? [new Paragraph({ children: [new TextRun({ text: c.note, italics: true })], spacing: { before: 120 } })] : []),
      new Paragraph({ text: 'Ingredients', heading: HeadingLevel.HEADING_2 }),
      ...list(c.ingredients, false),
      new Paragraph({ text: 'Directions', heading: HeadingLevel.HEADING_2 }),
      ...list(c.steps, true),
    ];
  });
  return Packer.toBlob(new Document({ sections: [{ children }] }));
}

/** A PDF: one recipe per page (more if it runs long). */
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
    if (c.source) write(`From ${c.source.name}`, 10, 'normal', 2);
    if (c.note) write(c.note, 11, 'italic', 6);
    write('Ingredients', 14, 'bold', 2);
    (c.ingredients.length ? c.ingredients : [NONE]).forEach((i) => write(c.ingredients.length ? `•  ${i}` : i, 11, 'normal'));
    y += 10;
    write('Directions', 14, 'bold', 2);
    (c.steps.length ? c.steps : [NONE]).forEach((s, i) => write(c.steps.length ? `${i + 1}.  ${s}` : s, 11, 'normal', 3));
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
    case 'json': return single ? recipes[0] : { exportedAt: new Date().toISOString(), count: recipes.length, recipes };
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
