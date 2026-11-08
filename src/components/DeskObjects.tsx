import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { cardLook, InkFrame, InkRule } from './ink';
import { PenIcon } from './PenIcons';
import { PenCircle } from './ink';
import { useDismiss } from '../useDismiss';
import { CATEGORIES } from '../types';
import { InkSelect } from './InkSelect';

/**
 * A little stack of blank cotton cards beside the rolodex. Pulling the top one starts a new
 * recipe: paste a link on its first line and it fills itself in, or write a name by hand.
 */
export function CardStack({ onAdd }: { onAdd: () => void }) {
  const look = cardLook('blank-stack');
  return (
    <button type="button" className="card-stack" onClick={onAdd} aria-label="New card: paste a link or write one by hand">
      <span className="stack-card is-under-2" style={cardLook('blank-under-2').style} aria-hidden="true" />
      <span className="stack-card is-under-1" style={cardLook('blank-under-1').style} aria-hidden="true" />
      <span className="stack-card is-top" style={look.style} aria-hidden="true">
        <InkFrame variant={look.frame} />
        <span className="stack-label">new card</span>
      </span>
    </button>
  );
}

/** A cotton slip beside the rolodex you write on to find a card. Filters as you type. */
export const FindSlip = forwardRef<HTMLInputElement, { value: string; onChange: (value: string) => void }>(
  function FindSlip({ value, onChange }, ref) {
    const look = cardLook('find-slip');
    return (
      <div className="find-slip" style={look.style}>
        <span className="slip-paper" aria-hidden="true" />
        <label className="slip-field">
          <span className="visually-hidden">Find a recipe by name, meal, cuisine or ingredient</span>
          <input
            ref={ref}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="find…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <InkRule variant={look.rule} />
        {value && (
          <button type="button" className="slip-clear" aria-label="Clear find" onClick={() => onChange('')}>
            <PenIcon name="cancel" />
          </button>
        )}
      </div>
    );
  },
);

export interface SurpriseOptions {
  /** Also pick recipes that already have stars. */
  includeCooked: boolean;
  /** A meal key ('' = any meal) and a cuisine ('' = any cuisine). */
  category: string;
  cuisine: string;
}

/**
 * A kraft tag that rolls the dice: it brings the box to a recipe you haven't cooked yet (no stars).
 * Its little arrow opens a card to narrow it by meal or cuisine, or to include cooked recipes.
 * `onPick` says whether it found one; when there's none the tag says so for a moment.
 */
export function SurpriseTag({
  onPick, cuisines,
}: { onPick: (options: SurpriseOptions) => boolean; cuisines: string[] }) {
  const [options, setOptions] = useState<SurpriseOptions>({ includeCooked: false, category: '', cuisine: '' });
  const [empty, setEmpty] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);
  useEffect(() => {
    if (!empty) return;
    const t = setTimeout(() => setEmpty(false), 2600);
    return () => clearTimeout(t);
  }, [empty]);
  const narrowed = options.category || options.cuisine;

  return (
    <div ref={ref} className="surprise">
      {open && (
        <div className="pop surprise-pop">
          <div className="pop-card">
            <span className="pop-title">surprise me with</span>
            <label className={`sort-option ${options.includeCooked ? 'is-chosen' : ''}`}>
              <input
                type="checkbox"
                className="visually-hidden"
                checked={options.includeCooked}
                onChange={(e) => setOptions((o) => ({ ...o, includeCooked: e.target.checked }))}
              />
              <span className="sort-label">
                ones I’ve cooked too
                {options.includeCooked && <PenCircle variant={2} />}
              </span>
            </label>
            <div className="surprise-field">
              <span>meal</span>
<InkSelect
                label="Meal"
                value={options.category}
                onChange={(category) => setOptions((o) => ({ ...o, category }))}
                options={[{ value: '', label: 'any' }, ...CATEGORIES.map((c) => ({ value: c.key, label: c.label })), { value: 'unsorted', label: 'unsorted' }]}
              />
            </div>
            <div className="surprise-field">
              <span>cuisine</span>
<InkSelect
                label="Cuisine"
                value={options.cuisine}
                onChange={(cuisine) => setOptions((o) => ({ ...o, cuisine }))}
                options={[{ value: '', label: 'any' }, ...cuisines.map((c) => ({ value: c, label: c }))]}
              />
            </div>
          </div>
        </div>
      )}
      <div className="surprise-tag">
        <button
          type="button"
          className="surprise-go"
          onClick={() => { setOpen(false); setEmpty(!onPick(options)); }}
        >
          <PenIcon name="dice" />
          <span role="status">
            {empty ? (options.includeCooked || narrowed ? 'nothing like that' : 'you’ve cooked them all!') : 'surprise me'}
          </span>
        </button>
        <button
          type="button"
          className="surprise-more"
          aria-label="Surprise options: meal, cuisine, include cooked"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <PenIcon name="more" />
        </button>
      </div>
    </div>
  );
}
