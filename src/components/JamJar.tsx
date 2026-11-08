import { useCallback, useRef, useState } from 'react';
import { GLOWS, type GlowKey, type Settings, type Shown, type SortBy } from '../types';
import { sortOptionsFor } from '../sorting';
import { useDismiss } from '../useDismiss';
import { PenCircle } from './ink';
import { PenIcon } from './PenIcons';
import { EXPORT_FORMATS, type ExportFormat } from '../exportRecipes';
import { InkSelect } from './InkSelect';

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

/** What goes in the box. Restaurants are a feature you turn on; one of the two always stays on. */
const IN_BOX: { key: 'showRecipes' | 'showRestaurants'; label: string }[] = [
  { key: 'showRecipes', label: 'recipes' },
  { key: 'showRestaurants', label: 'restaurants' },
];

/** The "?" card: how the desk works, and why it exists. */
function HelpNote() {
  return (
    <div className="help-note">
      <span className="pop-title">how it works</span>
      <ul>
        <li><b>flip</b> with ↑ ↓ ← →, the scroll wheel, or by clicking a tab. it goes round and round.</li>
        <li><b>open</b> the front card to read it, edit it, or give it stars. half stars count.</li>
        <li><b>new card</b>: pull one from the stack. paste a link on the first line and it fills itself in.</li>
        <li><b>find</b>: looks through names, meals, cuisines and ingredients.</li>
        <li><b>surprise me</b> picks something you haven’t cooked yet. its little arrow narrows it by meal or cuisine.</li>
        <li><b>in the box</b> chooses what the rolodex holds: recipes, restaurants, or both. restaurants are off until you turn them on. a restaurant card keeps its price, kind of place, city (and an extra line for the address), plus every meal you ate there with the day (and a photo of the dish), and your thoughts. forgot a meal? tap it on the card to add what you had, its photo, or move its day. sort by price, location or kind of place once they’re in.</li>
        <li>tap a card’s <b>photo</b> to crop, move and zoom it, even when you aren’t editing. no photo yet? tap the light plus.</li>
        <li><b>cooked it?</b> open a card and press the stamp tag, then tap the day. tap a stamped day again to lift the stamp off.</li>
        <li><b>the spoon</b> (top right) opens the calendar: a stamp of each dish on the day you cooked it. meals you ate out are stamped too, as a scalloped circle or a bordered colour (you choose, under the month). flip months with the arrows or ← →, tap a stamp to open the recipe, and press t (or tap “today”) to come back to this month. under the month, choose plain, grainy or faded stamps; the dice deals new ones on days with more than two.</li>
        <li><b>share</b> a card as a picture to send, copy or save. from the calendar you can share the month, any seven days in a row (step the start day with the arrows; the double arrows jump a week), or one day with all its stamps scattered together.</li>
        <li>click the <b>name at the top</b> to rename your box.</li>
        <li>click a <b>fruit</b> to swap it for another.</li>
        <li><b>the box</b>: save a copy of every recipe (and any open card) as .json to add back later, or as .md, .txt, .docx or .pdf to read, edit or print.</li>
      </ul>
      <span className="pop-title">why I made it</span>
      <p>
        so we can share and keep the recipes that we've gathered with more fun and whimsy, and to provide a
        final nudge to try one's i've been meaning to. - xo,{' '}
        <span style={{ textDecoration: 'underline', textDecorationColor: '#e6a2a2', textDecorationThickness: '1.5px', textUnderlineOffset: '5px' }}>from julie</span>
      </p>
    </div>
  );
}

export function JamJar({
  sortBy, onSortBy, recipeFont, onRecipeFont, desk, onDesk, show, onShow, onExportAll, exportFormat, onExportFormat, onImportFiles, flipSound, onFlipSound, glowPalette, onGlowPalette,
}: {
  sortBy: SortBy;
  onSortBy: (sortBy: SortBy) => void;
  recipeFont: Settings['recipeFont'];
  onRecipeFont: (font: Settings['recipeFont']) => void;
  /** Which desk objects are out (circled) or put away. */
  desk: Pick<Settings, 'showNewCard' | 'showFind'>;
  onDesk: (patch: Partial<Pick<Settings, 'showNewCard' | 'showFind'>>) => void;
  /** Which kinds of card are in the box, and a way to change that. */
  show: Shown;
  onShow: (patch: Partial<Pick<Settings, 'showRecipes' | 'showRestaurants'>>) => void;
  /** Save every recipe in the chosen format. */
  onExportAll: () => void;
  /** .json backs up (and can be added back); .md is readable text. Cards use the same choice. */
  exportFormat: ExportFormat;
  onExportFormat: (format: ExportFormat) => void;
  /** Add recipes from exported .json files; resolves to a line saying what happened. */
  onImportFiles: (files: File[]) => Promise<string>;
  /** The paper-flick sound when a card flips. */
  flipSound: boolean;
  onFlipSound: (on: boolean) => void;
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
            <div className="pop-scroll">
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
            {sortOptionsFor(show).map((o, i) => (
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
            <div role="group" aria-labelledby="box-title" className="setting-group">
              <span id="box-title" className="pop-title">in the box</span>
              {IN_BOX.map((o, i) => {
                const on = o.key === 'showRecipes' ? show.recipes : show.restaurants;
                const other = o.key === 'showRecipes' ? show.restaurants : show.recipes;
                const last = on && !other; // the box can't be empty of both
                return (
                  <label key={o.key} className={`sort-option ${on ? 'is-chosen' : ''} ${last ? 'is-locked' : ''}`}>
                    <input
                      type="checkbox"
                      className="visually-hidden"
                      checked={on}
                      disabled={last}
                      onChange={(e) => onShow({ [o.key]: e.target.checked })}
                    />
                    <span className="sort-label">
                      {o.label}
                      {on && <PenCircle variant={i + 3} />}
                    </span>
                  </label>
                );
              })}
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
              <label className={`sort-option ${flipSound ? 'is-chosen' : ''}`}>
                <input type="checkbox" className="visually-hidden" checked={flipSound} onChange={(e) => onFlipSound(e.target.checked)} />
                <span className="sort-label">
                  flip sound
                  {flipSound && <PenCircle variant={4} />}
                </span>
              </label>
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
              <div className="format-choice">
                <span>as</span>
                <InkSelect
                  label="Save copies as"
                  value={exportFormat}
                  onChange={(f) => onExportFormat(f as ExportFormat)}
                  options={EXPORT_FORMATS.map((f) => ({ value: f.key, label: f.label }))}
                />
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
