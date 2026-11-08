import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTH_NAMES, addMonths } from '../dates';
import { STAMP_FINISHES, type Recipe, type Shown, type StampCard, type StampFinish } from '../types';
import { stampsByDay } from '../stamps';
import { cardLook, InkFrame, InkRule, PenCircle } from './ink';
import { ActionTag } from './ActionTag';
import { PenIcon } from './PenIcons';
import { MonthGrid, type StampLook } from './MonthGrid';

/**
 * The calendar of what was cooked: a cotton page of one month at a time, a stamp of the recipe on
 * every day it was cooked. Flip months with the pen arrows or ← →; click a stamp to open its recipe.
 */
export function CalendarView({
  recipes, show, look, onOpenRecipe, onShare, onClose, onFinish, onAteOutBorder, paused = false,
}: {
  /** Which kinds of card stamp the calendar (recipes cooked, meals eaten out). */
  show: Shown;
  /** Give meals eaten out a zigzag edge, or the same edge as a cooked dish. */
  onAteOutBorder: (on: boolean) => void;
  /** Choose how the stamps are finished: plain, grainy or faded (saved as a setting). */
  onFinish: (finish: StampFinish) => void;
  /** A share sheet is open on top: leave the keys to it. */
  paused?: boolean;
  recipes: Recipe[];
  look: StampLook;
  onOpenRecipe: (recipe: StampCard) => void;
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
  const days = useMemo(() => stampsByDay(recipes, show), [recipes, show]);
  const styleLook = cardLook(`calendar-${at.year}-${at.month}`);
  const thisMonth = now.getFullYear() === at.year && now.getMonth() === at.month;
  const goToday = () => {
    setAt({ year: now.getFullYear(), month: now.getMonth() });
    setSeed(Math.random());
  };
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
      else if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey && !e.altKey) goToday();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, paused]);

  const monthPrefix = `${at.year}-${String(at.month + 1).padStart(2, '0')}`;
  // a day with more than two dishes can't show them all: the dice deals a different pair
  const crowded = [...days.entries()].some(([d, list]) => d.startsWith(monthPrefix) && list.length > 2);
  const inMonth = [...days.entries()].filter(([d]) => d.startsWith(monthPrefix)).flatMap(([, list]) => list);
  const ateOutCount = inMonth.filter((s) => s.ateOut).length;
  const cookedCount = inMonth.length - ateOutCount;
  const anyAteOut = [...days.values()].some((list) => list.some((s) => s.ateOut));
  const countText = [
    cookedCount ? `${cookedCount} ${cookedCount === 1 ? 'dish' : 'dishes'} cooked` : '',
    ateOutCount ? `${ateOutCount} ${ateOutCount === 1 ? 'dish' : 'dishes'} ate out` : '',
  ].filter(Boolean).join('  ·  ') || 'nothing stamped yet';

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
                {countText}
                {!thisMonth && (
                  <button type="button" className="today-link" onClick={goToday}>today</button>
                )}
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
              {anyAteOut && (
                <label className={`sort-option calendar-option ${look.ateOutBorder ? 'is-chosen' : ''}`}>
                  <input type="checkbox" className="visually-hidden" checked={!!look.ateOutBorder} onChange={(e) => onAteOutBorder(e.target.checked)} />
                  <span className="sort-label">
                    zigzag edge for meals out
                    {look.ateOutBorder && <PenCircle variant={6} />}
                  </span>
                </label>
              )}
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
