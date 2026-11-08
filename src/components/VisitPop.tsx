import { useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MONTH_NAMES, addMonths, longDate, shortDay } from '../dates';
import { stampsByDay } from '../stamps';
import { addPhoto, usePhotoSrc } from '../usePhoto';
import type { Recipe, Visit } from '../types';
import { MonthGrid, type StampLook } from './MonthGrid';
import { PenIcon } from './PenIcons';

/** A small photo of a dish, from the photo kept on the visit. */
export function VisitThumb({ photo, label }: { photo?: string; label: string }) {
  const src = usePhotoSrc({ photo }, 'thumb');
  return src ? <img className="visit-thumb" src={src} alt={label} /> : null;
}

/**
 * "When did you eat here?": a month page. What you had (and a photo of it, if you like) is written
 * first, then tapping a day files that meal under it. Tap a day again for a second meal; every meal
 * stays listed below, and can be crossed off.
 */
export function VisitPop({
  restaurant, visits, look, onChange, innerRef,
}: {
  restaurant: Recipe;
  visits: Visit[];
  look: StampLook;
  onChange: (visits: Visit[]) => void;
  innerRef: RefObject<HTMLDivElement>;
}) {
  const start = visits.length ? new Date(`${visits[visits.length - 1].date}T12:00:00`) : new Date();
  const [seed] = useState(() => Math.random());
  const [at, setAt] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [dish, setDish] = useState('');
  const [photo, setPhoto] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // the restaurant stamps each day it was visited, with that visit's photo
  const days = useMemo(() => stampsByDay([{ ...restaurant, kind: 'restaurant', visits }], { recipes: false, restaurants: true }), [restaurant, visits]);
  const flip = (by: number) => setAt((a) => addMonths(a.year, a.month, by));
  const sorted = [...visits].map((v, i) => ({ v, i })).sort((a, b) => b.v.date.localeCompare(a.v.date));

  const eat = (date: string) => {
    onChange([...visits, { date, dish: dish.trim(), ...(photo ? { photo } : {}) }].sort((a, b) => a.date.localeCompare(b.date)));
    setDish('');
    setPhoto('');
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setAdding(true);
    setError('');
    try {
      setPhoto(await addPhoto(file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const previewPhoto = usePhotoSrc({ photo }, 'thumb');

  return createPortal(
    <div ref={innerRef} className="pop cooked-pop visit-pop" role="dialog" aria-label="When did you eat here?">
      <div className="pop-card">
        <span className="pop-title">when did you eat here?</span>
        <div className="visit-what">
          <input
            className="ink-input"
            value={dish}
            onChange={(e) => setDish(e.target.value)}
            placeholder="what did you have?"
            aria-label="What you had"
            maxLength={120}
          />
          <button type="button" className="visit-photo" onClick={() => fileRef.current?.click()} disabled={adding} aria-label={photo ? 'Change the photo of the dish' : 'Add a photo of the dish'}>
            {previewPhoto ? <img src={previewPhoto} alt="" /> : <PenIcon name="plus" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        {error && <p className="letter-error" role="alert">{error}</p>}
        <div className="cooked-head">
          <button type="button" className="month-flip" aria-label="Previous month" onClick={() => flip(-1)}><PenIcon name="left" /></button>
          <span className="cooked-month">{MONTH_NAMES[at.month]} <small>{at.year}</small></span>
          <button type="button" className="month-flip" aria-label="Next month" onClick={() => flip(1)}><PenIcon name="right" /></button>
        </div>
        <MonthGrid year={at.year} month={at.month} days={days} look={look} seed={seed} compact onDay={eat} />
        {sorted.length > 0 && (
          <ul className="visit-list">
            {sorted.map(({ v, i }) => (
              <li key={i}>
                <span className="amt" title={longDate(v.date)}>{shortDay(v.date)}</span>
                <span className="visit-dish">{v.dish || 'a visit'}</span>
                <VisitThumb photo={v.photo} label={v.dish || 'the dish'} />
                <button type="button" className="visit-remove" aria-label={`Remove the visit on ${longDate(v.date)}`} onClick={() => onChange(visits.filter((_, n) => n !== i))}>
                  <PenIcon name="cancel" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="cooked-total" aria-live="polite">
          {visits.length ? `${visits.length} ${visits.length === 1 ? 'meal' : 'meals'} here` : 'no meals here yet'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
