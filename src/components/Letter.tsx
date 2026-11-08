import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, type Category, type Draft, type Recipe } from '../types';
import { servesLabel, splitAmount, stepText } from '../recipeText';
import { cardLook, InkFrame, InkRule } from './ink';
import { HOLDER } from './inkPaths';
import { ActionTag, FORM_ID } from './ActionTag';
import { GinghamBow, PatchHeart } from './Stickers';
import { StarRating } from './StarRating';
import { InkSelect } from './InkSelect';
import { CookedPop } from './CookedPop';
import type { StampLook } from './MonthGrid';
import { useDismiss } from '../useDismiss';

/**
 * The open recipe: the rolodex card pulled out of the box and enlarged, standing in a
 * cardboard index-card holder. Its actions float in a column of tags beside it.
 */

interface Props {
  recipe: Draft;
  /** True for a card that hasn't been saved into the rolodex yet. */
  isNew: boolean;
  notice?: string;
  onSave: (patch: Draft) => Promise<Recipe | void>;
  /** New cards only: fill the card from a pasted link. */
  onImport?: (url: string) => Promise<{ draft: Draft; notice: string }>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  /** Saved cards only: save this card in the chosen export format. */
  onExport?: () => void;
  exportLabel?: string;
  /** Saved cards only: how stamps look on the desk, and share this card as a picture. */
  stampLook?: StampLook;
  onShare?: () => void;
}

interface Form {
  title: string;
  category: Category | '';
  cuisine: string;
  servings: string;
  totalTime: string;
  image: string;
  sourceUrl: string;
  ingredients: string;
  steps: string;
}

const toForm = (r: Draft): Form => ({
  title: r.title ?? '',
  category: r.category ?? '',
  cuisine: r.cuisine ?? '',
  servings: r.servings ?? '',
  totalTime: r.totalTime ?? '',
  image: r.image ?? '',
  sourceUrl: r.sourceUrl ?? '',
  ingredients: (r.ingredients ?? []).join('\n'),
  steps: (r.steps ?? []).join('\n'),
});

const lines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);

function sourceLabel(r: Draft) {
  if (r.sourceName && r.sourceName !== 'sample card') return r.sourceName;
  try {
    return r.sourceUrl ? new URL(r.sourceUrl).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}


const isLink = (text: string) => /^https?:\/\/\S+$/i.test(text.trim());

export function Letter({ recipe, isNew, notice, onSave, onImport, onDelete, onClose, onExport, exportLabel = 'export card', stampLook, onShare }: Props) {
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<Form>(() => toForm(recipe));
  const [rating, setRating] = useState(recipe.rating ?? 0);
  const [review, setReview] = useState(recipe.review ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmTear, setConfirmTear] = useState(false);
  const [note, setNote] = useState(notice);
  const [importing, setImporting] = useState(false);
  /** Page details an import found that have no field of their own (kept when the card is filed). */
  const [extra, setExtra] = useState<Draft>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const [cookedOpen, setCookedOpen] = useState(false);
  const cookedRef = useRef<HTMLDivElement>(null);
  const closeCooked = useCallback(() => setCookedOpen(false), []);
  const cookedRefs = useMemo(() => [actionsRef, cookedRef], []);
  useDismiss(cookedOpen, cookedRefs, closeCooked);
  const look = cardLook(recipe.id ?? 'new-card');

  useEffect(() => {
    // focus the card itself (not a tag, whose label would pop up), or the title on a new card
    (editing ? titleRef.current : overlayRef.current)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While a card is open the desk light holds still: the blurred backdrop would re-render on every move.
  useEffect(() => {
    document.body.classList.add('card-open');
    return () => document.body.classList.remove('card-open');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // The rating writes straight onto a saved card, like ink; the note is written while editing.
  const rate = (next: number) => {
    setRating(next);
    if (!isNew) run(() => onSave({ rating: next }));
  };

  const saveCard = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await onSave({
        ...extra,
        title: form.title,
        category: form.category,
        cuisine: form.cuisine,
        servings: form.servings,
        totalTime: form.totalTime,
        image: form.image,
        sourceUrl: form.sourceUrl,
        ingredients: lines(form.ingredients),
        steps: lines(form.steps),
        rating,
        review,
      });
      if (!isNew) setEditing(false);
    });
  };

  // The first line of a new card takes a link or a name: a link fills the card in from the page.
  async function importFrom(url: string) {
    if (!onImport || importing) return;
    setImporting(true);
    setNote(undefined);
    setForm((f) => ({ ...f, title: '' }));
    try {
      const { draft, notice: found } = await onImport(url.trim());
      setForm(toForm({ ...draft, category: draft.category ?? form.category }));
      setExtra({ sourceName: draft.sourceName, description: draft.description });
      setNote(found);
    } catch (err) {
      // keep the link so it's not lost; the rest gets written by hand
      setForm((f) => ({ ...f, title: '', sourceUrl: url.trim() }));
      setNote(`${(err as Error).message} I kept the link as the original recipe.`);
    } finally {
      setImporting(false);
      titleRef.current?.focus();
    }
  }
  const titleLink = isNew && onImport;

  const cancelEdit = () => {
    setForm(toForm(recipe));
    setReview(recipe.review ?? '');
    setConfirmTear(false);
    setEditing(false);
  };

  const shown = editing ? { ...recipe, ...form, ingredients: lines(form.ingredients), steps: lines(form.steps) } : recipe;
  const source = sourceLabel(shown);
  const meta = [shown.totalTime, servesLabel(shown.servings), shown.cuisine].filter(Boolean);

  return (
    <>
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="letter-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={recipe.title || 'New recipe card'}
      // a click anywhere off the card tucks it back (not while editing, so a stray click can't lose changes)
      onPointerDown={(e) => {
        if (!editing && !sceneRef.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div ref={sceneRef} className="open-scene">
        <div className="holder-back" aria-hidden="true" />

        <form id={FORM_ID} className="open-card" style={look.style} onSubmit={saveCard}>
          <div className="card-face">
            <InkFrame variant={look.frame} />

            {note && <p className="letter-notice" role="status">{note}</p>}

            <header className="open-header">
              <div className="open-heading">
                {editing ? (
                  <input
                    ref={titleRef}
                    className="ink-input open-title-input"
                    value={form.title}
                    onChange={set('title')}
                    placeholder={importing ? 'fetching…' : titleLink ? 'paste a link, or write a name…' : 'recipe name'}
                    disabled={importing}
                    required
                    aria-label={titleLink ? 'Recipe name, or paste a link to fill the card in' : 'Recipe name'}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (titleLink && isLink(text)) {
                        e.preventDefault();
                        importFrom(text);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (titleLink && e.key === 'Enter' && isLink(form.title)) {
                        e.preventDefault();
                        importFrom(form.title);
                      }
                    }}
                    onBlur={() => titleLink && isLink(form.title) && importFrom(form.title)}
                  />
                ) : (
                  <h1 className="open-title">{shown.title}</h1>
                )}

                <StarRating rating={rating} onRate={rate} variant={look.star} />

                {editing ? (
                  <div className="meta-fields">
                    <label>
                      filed under
<InkSelect
                        label="Filed under"
                        value={form.category}
                        onChange={(category) => setForm((f) => ({ ...f, category: category as Category | '' }))}
                        options={[{ value: '', label: 'unsorted' }, ...CATEGORIES.map((c) => ({ value: c.key, label: c.label }))]}
                      />
                    </label>
                    <label>time <input className="ink-input" value={form.totalTime} onChange={set('totalTime')} placeholder="e.g. 30 min" /></label>
                    <label>serves <input className="ink-input" value={form.servings} onChange={set('servings')} placeholder="e.g. 4" /></label>
                    <label>cuisine <input className="ink-input" value={form.cuisine} onChange={set('cuisine')} placeholder="e.g. italian" /></label>
                  </div>
                ) : (
                  meta.length > 0 && <p className="open-meta">{meta.join('  ·  ')}</p>
                )}
              </div>

              {(shown.image || editing) && (
                <figure className={`mini-polaroid ${shown.image ? '' : 'is-empty'}`}>
                  <GinghamBow className="mini-polaroid-bow" />
                  {shown.image ? (
                    <img src={shown.image} alt={`Photo of ${shown.title || 'this recipe'}`} />
                  ) : (
                    <button type="button" className="mini-polaroid-add" onClick={() => photoRef.current?.focus()}>
                      add a photo
                    </button>
                  )}
                </figure>
              )}
            </header>

            {editing ? (
              <label className="review">
                <span className="visually-hidden">Your note</span>
                <textarea
                  className="ink-area review-area"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="how did it turn out? write yourself a little note…"
                  rows={1}
                />
              </label>
            ) : (
              review && <p className="review review-text">{review}</p>
            )}

            <InkRule variant={look.rule} />

            <div className="open-columns">
              <section>
                <h2 className="card-col-title">ingredients</h2>
                {editing ? (
                  <textarea className="ink-area hand-area" value={form.ingredients} onChange={set('ingredients')} rows={Math.max(4, lines(form.ingredients).length + 1)} placeholder="one ingredient per line" aria-label="Ingredients, one per line" />
                ) : shown.ingredients?.length ? (
                  <ul className="card-ingredients">
                    {shown.ingredients.map((line, i) => {
                      const [amount, name] = splitAmount(line);
                      return <li key={i}><span className="amt">{amount}</span><span>{name}</span></li>;
                    })}
                  </ul>
                ) : (
                  <p className="card-col-empty">none written down yet</p>
                )}
              </section>
              <section>
                <h2 className="card-col-title">directions</h2>
                {editing ? (
                  <textarea className="ink-area hand-area" value={form.steps} onChange={set('steps')} rows={Math.max(4, lines(form.steps).length * 2)} placeholder="one step per line" aria-label="Directions, one step per line" />
                ) : shown.steps?.length ? (
                  <ol className="card-steps">{shown.steps.map((step, i) => <li key={i}>{stepText(step)}</li>)}</ol>
                ) : (
                  <p className="card-col-empty">none written down yet</p>
                )}
              </section>
            </div>

            {editing && (
              <div className="link-fields">
                <label>photo link <input ref={photoRef} className="ink-input" value={form.image} onChange={set('image')} placeholder="https://…/photo.jpg" inputMode="url" /></label>
                <label>original recipe <input className="ink-input" value={form.sourceUrl} onChange={set('sourceUrl')} placeholder="https://…" inputMode="url" /></label>
              </div>
            )}

            <p className="signoff">
              xo,{' '}
              {shown.sourceUrl ? (
                <a href={shown.sourceUrl} target="_blank" rel="noreferrer">from {source || 'the original'}</a>
              ) : (
                <span>from my own kitchen</span>
              )}
            </p>

            {error && <p className="letter-error" role="alert">{error}</p>}
          </div>
        </form>

        <div className="holder-front" aria-hidden="true">
          <svg className="holder-outline" viewBox="0 0 1000 240" preserveAspectRatio="none">
            <path vectorEffect="non-scaling-stroke" d={HOLDER} />
          </svg>
          <PatchHeart className="holder-heart" />
        </div>
      </div>
    </div>

      {/* outside the overlay: its backdrop blur would otherwise make "fixed" scroll with the card */}
      <nav ref={actionsRef} className="card-actions" aria-label="Card actions">
        {!editing && !confirmTear && (
          <>
            <ActionTag icon="edit" label="edit card" onClick={() => { closeCooked(); setEditing(true); }} />
            {!isNew && stampLook && <ActionTag icon="stamp" label="I cooked this" onClick={() => setCookedOpen((o) => !o)} />}
            {!isNew && onExport && <ActionTag icon="export" label={exportLabel} onClick={() => { closeCooked(); onExport(); }} />}
            {!isNew && onShare && <ActionTag icon="share" label="share card" onClick={() => { closeCooked(); onShare(); }} />}
            {!isNew && (
              <ActionTag icon="tear" label="tear up card" tone="quiet" onClick={() => setConfirmTear(true)} />
            )}
          </>
        )}
        {cookedOpen && !editing && !confirmTear && !isNew && stampLook && (
          <CookedPop innerRef={cookedRef} recipe={recipe as Recipe} look={stampLook} onChange={(cooked) => run(() => onSave({ cooked }))} />
        )}
        {editing && !confirmTear && (
          <>
            <ActionTag icon="save" label={busy ? 'saving…' : isNew ? 'file it' : 'save card'} tone="primary" type="submit" disabled={busy} written />
            <ActionTag icon="tuck" label={isNew ? 'tuck it back' : 'never mind'} onClick={isNew ? onClose : cancelEdit} written />
            {!isNew && (
              <ActionTag icon="tear" label="tear up card" tone="quiet" onClick={() => setConfirmTear(true)} />
            )}
          </>
        )}
        {confirmTear && (
          <div className="tear-confirm" role="group" aria-label="Really tear it up?">
            <span className="tear-question">tear it up?</span>
            <ActionTag icon="save" label="yes, tear it up" tone="danger" onClick={() => run(onDelete)} autoFocus />
            <ActionTag icon="cancel" label="keep it" onClick={() => setConfirmTear(false)} />
          </div>
        )}
      </nav>
    </>
  );
}
