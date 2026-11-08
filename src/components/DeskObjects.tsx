import { forwardRef } from 'react';
import { cardLook, InkFrame, InkRule } from './ink';
import { PenIcon } from './PenIcons';

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
