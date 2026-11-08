import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { longDate, shortDay, todayYmd } from '../dates';
import { stampsByDay } from '../stamps';
import { addPhoto, usePhotoSrc } from '../usePhoto';
import type { Recipe, Visit } from '../types';
import { type StampLook } from './MonthGrid';
import { PopCalendar } from './PopCalendar';
import { PenIcon } from './PenIcons';

/** A small photo of a dish, from the photo kept on the visit. */
export function VisitThumb({ photo, label }: { photo?: string; label: string }) {
  const src = usePhotoSrc({ photo }, 'thumb');
  return src ? <img className="visit-thumb" src={src} alt={label} /> : null;
}

/** One meal in the list, every part of it editable: what was had, its photo, and its day. */
function VisitRow({
  visit, moving, onDish, onMove, onPhoto, onRemove,
}: {
  visit: Visit;
  moving: boolean;
  onDish: (dish: string) => void;
  onMove: () => void;
  onPhoto: () => void;
  onRemove: () => void;
}) {
  const [dish, setDish] = useState(visit.dish);
  useEffect(() => setDish(visit.dish), [visit.dish]);
  const thumb = usePhotoSrc({ photo: visit.photo }, 'thumb');
  // saved when you leave the line (not on every letter), like writing on a card
  // every meal says what was had: clearing the line puts back what was written before
  const commit = () => {
    const text = dish.trim();
    if (!text) setDish(visit.dish);
    else if (text !== visit.dish) onDish(text);
  };
  return (
    <li className={moving ? 'is-moving' : ''}>
      <button type="button" className="visit-date" aria-pressed={moving} title="Move to another day" onClick={onMove}>
        {shortDay(visit.date)}
      </button>
      <input
        className={`ink-input visit-dish-input ${dish.trim() ? '' : 'is-needed'}`}
        value={dish}
        required
        maxLength={120}
        placeholder="what did you have?"
        aria-label={`What you had on ${longDate(visit.date)}`}
        onChange={(e) => setDish(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      />
      <button type="button" className="visit-photo is-small" onClick={onPhoto} aria-label={visit.photo ? 'Change the photo of this meal' : 'Add a photo of this meal'}>
        {thumb ? <img src={thumb} alt="" /> : <PenIcon name="plus" />}
      </button>
      <button type="button" className="visit-remove" aria-label={`Remove the visit on ${longDate(visit.date)}`} onClick={onRemove}>
        <PenIcon name="cancel" />
      </button>
    </li>
  );
}

/**
 * "When did you eat here?": a month page (a week, on a phone). What you had (and a photo of it, if you like) is written
 * first, then tapping a day files that meal under it. Tap a day again for a second meal; every meal
 * stays listed below, and can be edited later (what you had, its photo, its day) or crossed off.
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
  const start = visits.length ? visits[visits.length - 1].date : todayYmd();
  const [seed] = useState(() => Math.random());
  const [dish, setDish] = useState('');
  const [photo, setPhoto] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dishRef = useRef<HTMLInputElement>(null);
  /** A day was tapped before what you had was written: the line asks for it. */
  const [asking, setAsking] = useState(false);
  /** A meal already listed whose photo is being picked, and one waiting to be moved to a new day. */
  const rowFileRef = useRef<HTMLInputElement>(null);
  const [photoFor, setPhotoFor] = useState<number | null>(null);
  const [moving, setMoving] = useState<number | null>(null);

  // the restaurant stamps each day it was visited, with that visit's photo
  const days = useMemo(() => stampsByDay([{ ...restaurant, kind: 'restaurant', visits }], { recipes: false, restaurants: true }), [restaurant, visits]);
  const sorted = [...visits].map((v, i) => ({ v, i })).sort((a, b) => b.v.date.localeCompare(a.v.date));

  const eat = (date: string) => {
    if (moving !== null) { // a listed meal was waiting for a new day
      onChange(visits.map((v, i) => (i === moving ? { ...v, date } : v)).sort((a, b) => a.date.localeCompare(b.date)));
      setMoving(null);
      return;
    }
    if (!dish.trim()) { // what you had comes first: the day waits for it
      setAsking(true);
      dishRef.current?.focus();
      return;
    }
    setAsking(false);
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

  const pickForRow = async (file: File | undefined) => {
    const at = photoFor;
    setPhotoFor(null);
    if (!file || at === null) return;
    setError('');
    try {
      const id = await addPhoto(file);
      onChange(visits.map((v, i) => (i === at ? { ...v, photo: id } : v)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const previewPhoto = usePhotoSrc({ photo }, 'thumb');

  return createPortal(
    <div ref={innerRef} className="pop cooked-pop visit-pop" role="dialog" aria-label="When did you eat here?">
      <div className="pop-card">
        <span className="pop-title">when did you eat here?</span>
        {/* adding a meal is two steps, numbered so the order is plain: write it, then tap its day */}
        <p className="visit-step"><span className="visit-step-num" aria-hidden="true">1</span> what did you have?</p>
        <div className="visit-what">
          <input
            ref={dishRef}
            className={`ink-input ${dish.trim() ? '' : 'is-needed'} ${asking ? 'is-asking' : ''}`}
            value={dish}
            onChange={(e) => { setDish(e.target.value); setAsking(false); }}
            placeholder="write the dish here"
            aria-label="What you had"
            aria-describedby={asking ? 'visit-ask' : undefined}
            required
            maxLength={120}
          />
          <button type="button" className="visit-photo" onClick={() => fileRef.current?.click()} disabled={adding} aria-label={photo ? 'Change the photo of the dish' : 'Add a photo of the dish'}>
            {previewPhoto ? <img src={previewPhoto} alt="" /> : <PenIcon name="plus" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        {error && <p className="letter-error" role="alert">{error}</p>}
        {asking && <p id="visit-ask" className="visit-moving" role="status">write what you had first, then tap the day</p>}
        <p className="visit-step"><span className="visit-step-num" aria-hidden="true">2</span> tap the day you ate it</p>
        <PopCalendar start={start} days={days} look={look} seed={seed} onDay={eat} />
        {moving !== null && (
          <p className="visit-moving" role="status">
            tap the new day for {visits[moving]?.dish || 'this meal'}{' '}
            <button type="button" className="today-link" onClick={() => setMoving(null)}>never mind</button>
          </p>
        )}
        <section className="visit-meals" aria-label="Meals here">
          <h3 className="visit-meals-title" aria-live="polite">
            {visits.length ? `meals here · ${visits.length}` : 'no meals here yet'}
          </h3>
          {sorted.length > 0 && (
            <ul className="visit-list">
              {sorted.map(({ v, i }) => (
                <VisitRow
                  key={`${v.date}-${i}`}
                  visit={v}
                  moving={moving === i}
                  onDish={(dish) => onChange(visits.map((x, n) => (n === i ? { ...x, dish } : x)))}
                  onMove={() => setMoving((m) => (m === i ? null : i))}
                  onPhoto={() => { setPhotoFor(i); rowFileRef.current?.click(); }}
                  onRemove={() => { setMoving(null); onChange(visits.filter((_, n) => n !== i)); }}
                />
              ))}
            </ul>
          )}
        </section>
        <input ref={rowFileRef} type="file" accept="image/*" hidden onChange={(e) => { pickForRow(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>,
    document.body,
  );
}
