import { useCallback, useRef, useState } from 'react';
import type { Settings, SortBy } from '../types';
import { SORT_OPTIONS } from '../sorting';
import { useDismiss } from '../useDismiss';
import { PenCircle } from './ink';

/**
 * The strawberry jam jar in the desk's bottom-right corner: the way into settings.
 * Hover or keyboard focus tips its gingham lid open 45°; clicking opens a little cotton
 * card of settings. Clicking anywhere else (or Escape) closes it.
 */
const WRITING: { key: Settings['recipeFont']; label: string }[] = [
  { key: 'hand', label: 'handwritten' },
  { key: 'print', label: 'printed' },
];

const DESK: { key: 'showNewCard' | 'showFind'; label: string }[] = [
  { key: 'showNewCard', label: 'new cards' },
  { key: 'showFind', label: 'find' },
];

export function JamJar({
  sortBy, onSortBy, recipeFont, onRecipeFont, desk, onDesk, onExportAll,
}: {
  sortBy: SortBy;
  onSortBy: (sortBy: SortBy) => void;
  recipeFont: Settings['recipeFont'];
  onRecipeFont: (font: Settings['recipeFont']) => void;
  /** Which desk objects are out (circled) or put away. */
  desk: Pick<Settings, 'showNewCard' | 'showFind'>;
  onDesk: (patch: Partial<Pick<Settings, 'showNewCard' | 'showFind'>>) => void;
  /** Save every recipe as a .json file. */
  onExportAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className={`jam-jar ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="pop jar-pop">
          <div className="pop-card sort-card">
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
            <div className="setting-group">
              <span className="pop-title">export</span>
              <button type="button" className="sort-option export-option" onClick={onExportAll}>
                <span className="sort-label">all recipes <small>.json</small></span>
              </button>
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
