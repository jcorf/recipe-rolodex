import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTH_NAMES, addMonths } from '../dates';
import { STAMP_FINISHES, type Recipe, type StampFinish } from '../types';
import { cardLook, InkFrame, InkRule, PenCircle } from './ink';
import { ActionTag } from './ActionTag';
import { PenIcon } from './PenIcons';
import { MonthGrid, type StampLook } from './MonthGrid';

/**
 * The calendar of what was cooked: a cotton page of one month at a time, a stamp of the recipe on
 * every day it was cooked. Flip months with the pen arrows or ← →; click a stamp to open its recipe.
 */
export function cookedByDay(recipes: Recipe[]) {
  const days = new Map<string, Recipe[]>();
  for (const r of recipes) for (const day of r.cooked ?? []) days.set(day, [...(days.get(day) ?? []), r]);
  return days;
}

export function CalendarView({
  recipes, look, onOpenRecipe, onShare, onClose, onFinish, paused = false,
}: {
  /** Choose how the stamps are finished: plain, grainy or faded (saved as a setting). */
  onFinish: (finish: StampFinish) => void;
  /** A share sheet is open on top: leave the keys to it. */
  paused?: boolean;
  recipes: Recipe[];
  look: StampLook;
  onOpenRecipe: (recipe: Recipe) => void;
  /** Share this month as a picture. */
  onShare: (year: number, month: number, seed: number) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const [at, setAt] = useState({ year: now.getFullYear(), month: now.getMonth() });
  // every opening and every turned page lays the stamps down a little differently
  const [seed, setSeed] = useState(() => Math.random());
  const overlayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => cookedByDay(recipes), [recipes]);
  const styleLook = cardLook(`calendar-${at.year}-${at.month}`);
  const flip = (by: number) => {
    setAt((a) => addMonths(a.year, a.month, by));
    setSeed(Math.random());
  };

  useEffect(() => {
    overlayRef.current?.focus({ preventScroll: true });
    document.body.classList.add('card-open'); // the desk light holds still behind the blur
    return () => document.body.classList.remove('card-open');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') flip(-1);
      else if (e.key === 'ArrowRight') flip(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, paused]);

  const monthPrefix = `${at.year}-${String(at.month + 1).padStart(2, '0')}`;
  // a day with more than two dishes can't show them all: the dice deals a different pair
  const crowded = [...days.entries()].some(([d, list]) => d.startsWith(monthPrefix) && list.length > 2);
  const cookedCount = [...days.entries()].filter(([d]) => d.startsWith(monthPrefix)).reduce((n, [, list]) => n + list.length, 0);

  return (
    <>
      <div
        ref={overlayRef}
        tabIndex={-1}
        className="letter-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={`What I cooked, ${MONTH_NAMES[at.month]} ${at.year}`}
        onPointerDown={(e) => { if (!sceneRef.current?.contains(e.target as Node)) onClose(); }}
      >
        <div ref={sceneRef} className="open-scene calendar-scene">
          <div className="open-card calendar-sheet" style={styleLook.style}>
            <div className="card-face">
              <InkFrame variant={styleLook.frame} />
              <header className="calendar-head">
                <button type="button" className="month-flip" aria-label="Previous month" onClick={() => flip(-1)}><PenIcon name="left" /></button>
                <h1 className="calendar-month">
                  <span>{MONTH_NAMES[at.month]}</span>
                  <small>{at.year}</small>
                </h1>
                <button type="button" className="month-flip" aria-label="Next month" onClick={() => flip(1)}><PenIcon name="right" /></button>
              </header>
              <p className="calendar-count" aria-live="polite">
                {cookedCount ? `${cookedCount} ${cookedCount === 1 ? 'dish' : 'dishes'} cooked` : 'nothing stamped yet'}
              </p>
              <InkRule variant={styleLook.rule} />
              <MonthGrid
                year={at.year}
                month={at.month}
                days={days}
                look={look}
                seed={seed}
                onStamp={(r) => onOpenRecipe(r)}
              />
              <div role="radiogroup" aria-label="How the stamps are finished" className="calendar-finish">
                <span>stamps</span>
                {STAMP_FINISHES.map((f, i) => (
                  <label key={f.key} className={`sort-option ${look.finish === f.key || (!look.finish && f.key === 'plain') ? 'is-chosen' : ''}`}>
                    <input
                      type="radio"
                      name="stamp-finish"
                      className="visually-hidden"
                      checked={(look.finish ?? 'plain') === f.key}
                      onChange={() => onFinish(f.key)}
                    />
                    <span className="sort-label">
                      {f.label}
                      {(look.finish ?? 'plain') === f.key && <PenCircle variant={i + 4} />}
                    </span>
                  </label>
                ))}
                {crowded && (
                  <button type="button" className="finish-dice" aria-label="Deal a new set of stamps on crowded days" onClick={() => setSeed(Math.random())}>
                    <PenIcon name="dice" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <nav className="card-actions" aria-label="Calendar actions">
        <ActionTag icon="share" label="share this month" onClick={() => onShare(at.year, at.month, seed)} />
        <ActionTag icon="cancel" label="close" tone="quiet" onClick={onClose} />
      </nav>
    </>
  );
}
