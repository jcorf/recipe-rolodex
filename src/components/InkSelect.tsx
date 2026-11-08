import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../useDismiss';
import { PenCircle } from './ink';
import { PenIcon } from './PenIcons';

/**
 * A drop-down drawn like the rest of the desk, instead of the browser's own menu: the current
 * choice written on a dashed line, and a cotton card of options with the chosen one circled.
 * The card opens over the whole page (a portal) so a card's torn edge can't clip it.
 */
export interface InkOption { value: string; label: string }

export function InkSelect({
  value, options, onChange, label, className = '',
}: { value: string; options: InkOption[]; onChange: (value: string) => void; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ x: number; y: number; w: number; above: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [buttonRef, popRef], []);
  useDismiss(open, refs, close);

  const chosen = options.find((o) => o.value === value) ?? options[0];

  const show = () => {
    const r = buttonRef.current!.getBoundingClientRect();
    const need = Math.min(options.length * 34 + 40, 320);
    const above = r.bottom + need > window.innerHeight && r.top > need;
    setAt({ x: r.left, y: above ? r.top : r.bottom, w: Math.max(r.width, 140), above });
    setOpen(true);
  };

  // when it opens, focus the chosen option so the arrow keys work straight away
  useEffect(() => {
    if (!open) return;
    const list = popRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    (list && ([...list].find((el) => el.getAttribute('aria-selected') === 'true') ?? list[0]))?.focus();
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); buttonRef.current?.focus(); };

  const onListKey = (e: React.KeyboardEvent) => {
    const items = [...popRef.current!.querySelectorAll<HTMLElement>('[role="option"]')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[Math.min(items.length - 1, i + 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[Math.max(0, i - 1)]?.focus(); }
    else if (e.key === 'Escape') { // closes just this list, not the card it's on
      e.preventDefault();
      e.nativeEvent.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    }
    e.stopPropagation(); // arrows here must not flip the rolodex
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`ink-input ink-select ${className}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); show(); }
        }}
      >
        <span>{chosen?.label}</span>
        <PenIcon name="more" />
      </button>
      {open && at && createPortal(
        <div
          ref={popRef}
          className="pop ink-select-pop"
          style={{ left: at.x, top: at.above ? at.y - 8 : at.y + 8, minWidth: at.w, translate: at.above ? '0 -100%' : '0 0' }}
          onKeyDown={onListKey}
          // a click in the list isn't "outside" for any card it opened from (the surprise card, the open recipe)
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="pop-card" role="listbox" aria-label={label}>
            <div className="pop-scroll">
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`sort-option ink-option ${o.value === value ? 'is-chosen' : ''}`}
                onClick={() => pick(o.value)}
              >
                <span className="sort-label">
                  {o.label}
                  {o.value === value && <PenCircle variant={i} />}
                </span>
              </button>
            ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
