import { useCallback, useRef, useState } from 'react';
import { GLOWS, type GlowKey, type Settings, type SortBy } from '../types';
import { SORT_OPTIONS } from '../sorting';
import { useDismiss } from '../useDismiss';
import { PenCircle } from './ink';
import { PenIcon } from './PenIcons';
import type { ExportFormat } from '../exportRecipes';

/**
 * The strawberry jam jar in the desk's bottom-right corner: the way into settings.
 * Hover or keyboard focus tips its gingham lid open 45°; clicking opens a little cotton
 * card of settings. Clicking anywhere else (or Escape) closes it.
 */
const WRITING: { key: Settings['recipeFont']; label: string }[] = [
  { key: 'hand', label: 'handwritten' },
  { key: 'caveat', label: 'casual script' },
  { key: 'print', label: 'printed' },
];

const DESK: { key: 'showNewCard' | 'showFind'; label: string }[] = [
  { key: 'showNewCard', label: 'new cards' },
  { key: 'showFind', label: 'find' },
];

/** The "?" card: how the desk works, and why it exists. */
function HelpNote() {
  return (
    <div className="help-note">
      <span className="pop-title">how it works</span>
      <ul>
        <li><b>flip</b> with ↑ ↓ ← →, the scroll wheel, or by clicking a tab. it goes round and round.</li>
        <li><b>open</b> the front card to read it, edit it, or give it stars. half stars count.</li>
        <li><b>new card</b>: pull one from the stack, or click a blank one. paste a link on the first line and it fills itself in.</li>
        <li><b>find</b> with <kbd>/</kbd>. it looks through names, meals, cuisines and ingredients.</li>
        <li><b>surprise me</b> picks something you haven’t cooked yet.</li>
        <li>click a <b>fruit</b> to swap it for another.</li>
        <li><b>the box</b>: save a copy of every recipe (and any open card) as .json to add back later, or .md to read or print.</li>
      </ul>
      <span className="pop-title">why I made it</span>
      <p>
        a place to keep every recipe I love, close to how a real recipe box feels, and a nudge to
        actually cook the ones I’ve saved.
      </p>
    </div>
  );
}

export function JamJar({
  sortBy, onSortBy, recipeFont, onRecipeFont, desk, onDesk, onExportAll, exportFormat, onExportFormat, onImportFiles, glowPalette, onGlowPalette,
}: {
  sortBy: SortBy;
  onSortBy: (sortBy: SortBy) => void;
  recipeFont: Settings['recipeFont'];
  onRecipeFont: (font: Settings['recipeFont']) => void;
  /** Which desk objects are out (circled) or put away. */
  desk: Pick<Settings, 'showNewCard' | 'showFind'>;
  onDesk: (patch: Partial<Pick<Settings, 'showNewCard' | 'showFind'>>) => void;
  /** Save every recipe in the chosen format. */
  onExportAll: () => void;
  /** .json backs up (and can be added back); .md is readable text. Cards use the same choice. */
  exportFormat: ExportFormat;
  onExportFormat: (format: ExportFormat) => void;
  /** Add recipes from exported .json files; resolves to a line saying what happened. */
  onImportFiles: (files: File[]) => Promise<string>;
  /** The colours the cursor glow drifts between. */
  glowPalette: GlowKey;
  onGlowPalette: (glow: GlowKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [importNote, setImportNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => { setOpen(false); setHelp(false); setImportNote(''); }, []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className={`jam-jar ${open ? 'is-open' : ''}`}>
      {open && (
        <div className={`pop jar-pop ${help ? 'is-help' : ''}`}>
          <div className="pop-card sort-card">
            <button
              type="button"
              className="help-button"
              aria-pressed={help}
              onClick={() => setHelp((h) => !h)}
            >
              <span className="help-mark" aria-hidden="true">
                {help ? '←' : '?'}
                <PenCircle variant={3} />
              </span>
              <span>{help ? 'back to settings' : 'how this works'}</span>
            </button>
            {help ? <HelpNote /> : (<>
            <div role="radiogroup" aria-labelledby="sort-title">
            <span id="sort-title" className="pop-title">sort the box by</span>
            {SORT_OPTIONS.map((o, i) => (
              <label key={o.key} className={`sort-option ${o.key === sortBy ? 'is-chosen' : ''}`}>
                <input
                  type="radio"
                  name="sort-by"
                  className="visually-hidden"
                  checked={o.key === sortBy}
                  onChange={() => onSortBy(o.key)}
                />
                <span className="sort-label">
                  {o.label}
                  {o.key === sortBy && <PenCircle variant={i} />}
                </span>
              </label>
            ))}
            </div>
            <div role="radiogroup" aria-labelledby="writing-title" className="setting-group">
              <span id="writing-title" className="pop-title">recipe writing</span>
              {WRITING.map((o, i) => (
                <label key={o.key} className={`sort-option ${o.key === recipeFont ? 'is-chosen' : ''}`}>
                  <input
                    type="radio"
                    name="recipe-font"
                    className="visually-hidden"
                    checked={o.key === recipeFont}
                    onChange={() => onRecipeFont(o.key)}
                  />
                  <span className={`sort-label writing-${o.key}`}>
                    {o.label}
                    {o.key === recipeFont && <PenCircle variant={i + 2} />}
                  </span>
                </label>
              ))}
            </div>
            <div role="group" aria-labelledby="desk-title" className="setting-group">
              <span id="desk-title" className="pop-title">on the desk</span>
              {DESK.map((o, i) => (
                <label key={o.key} className={`sort-option ${desk[o.key] ? 'is-chosen' : ''}`}>
                  <input
                    type="checkbox"
                    className="visually-hidden"
                    checked={desk[o.key]}
                    onChange={(e) => onDesk({ [o.key]: e.target.checked })}
                  />
                  <span className="sort-label">
                    {o.label}
                    {desk[o.key] && <PenCircle variant={i + 1} />}
                  </span>
                </label>
              ))}
            </div>
            <div role="radiogroup" aria-labelledby="glow-title" className="setting-group">
              <span id="glow-title" className="pop-title">cursor glow</span>
              <div className="glow-swatches">
                {GLOWS.map((g, i) => (
                  <label key={g.key} className="glow-swatch" title={g.label}>
                    <input
                      type="radio"
                      name="glow"
                      className="visually-hidden"
                      checked={g.key === glowPalette}
                      onChange={() => onGlowPalette(g.key)}
                    />
                    <span
                      className="glow-dot"
                      style={{ background: `linear-gradient(135deg, rgb(${g.warm}) 30%, rgb(${g.cool}) 100%)` }}
                    >
                      {g.key === glowPalette && <PenCircle variant={i} />}
                    </span>
                    <span className="visually-hidden">{g.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="setting-group">
              <span className="pop-title">the box</span>
              <button type="button" className="sort-option file-option" onClick={onExportAll}>
                <PenIcon name="export" />
                <span className="sort-label">save a copy</span>
              </button>
              <div role="radiogroup" aria-label="Save copies as" className="format-choice">
                <span>as</span>
                {([['json', '.json', 'to add back later'], ['md', '.md', 'to read or print']] as const).map(([key, label, hint], i) => (
                  <label key={key} className="format-option" title={hint}>
                    <input
                      type="radio"
                      name="export-format"
                      className="visually-hidden"
                      checked={exportFormat === key}
                      onChange={() => onExportFormat(key)}
                    />
                    <span className="sort-label">
                      {label}
                      {exportFormat === key && <PenCircle variant={i + 1} />}
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" className="sort-option file-option" onClick={() => fileRef.current?.click()}>
                <PenIcon name="import" />
                <span className="sort-label">add from files <small>.json</small></span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                multiple
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={async (e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = ''; // so picking the same file again still counts
                  if (files.length) setImportNote(await onImportFiles(files));
                }}
              />
              {importNote && <p className="file-note" role="status">{importNote}</p>}
            </div>
            </>)}
          </div>
        </div>
      )}
      <button
        type="button"
        className="jam-jar-button"
        aria-label="Settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img className="jam-jar-body" src="/jar/jar.webp" alt="" width="260" height="278" />
        <img className="jam-jar-lid" src="/jar/lid.webp" alt="" width="300" height="141" />
      </button>
    </div>
  );
}
