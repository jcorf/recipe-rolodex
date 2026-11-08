import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, type Category, type Draft, type Recipe } from '../types';
import { GinghamBow, GooglyEyes, PatchHeart, Star } from './Stickers';

interface Props {
  recipe: Draft;
  /** True for a card that hasn't been saved into the rolodex yet. */
  isNew: boolean;
  notice?: string;
  onSave: (patch: Draft) => Promise<Recipe | void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
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

export function Letter({ recipe, isNew, notice, onSave, onDelete, onClose }: Props) {
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<Form>(() => toForm(recipe));
  const [rating, setRating] = useState(recipe.rating ?? 0);
  const [review, setReview] = useState(recipe.review ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmTear, setConfirmTear] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (editing ? firstFieldRef.current : closeRef.current)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Rating and review write straight onto a saved card, like ink.
  const rate = (n: number) => {
    const next = n === rating ? 0 : n;
    setRating(next);
    if (!isNew) run(() => onSave({ rating: next }));
  };
  const saveReview = () => {
    if (!isNew && review !== (recipe.review ?? '')) run(() => onSave({ review }));
  };

  const saveCard = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await onSave({
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

  const shown = editing ? { ...recipe, ...form, ingredients: lines(form.ingredients), steps: lines(form.steps) } : recipe;
  const source = sourceLabel(shown);
  const meta = [shown.totalTime, shown.servings && `serves ${shown.servings}`, shown.cuisine].filter(Boolean);

  return (
    <div className="letter-overlay" role="dialog" aria-modal="true" aria-label={recipe.title || 'New recipe card'}>
      <div className="letter-toolbar">
        <button ref={closeRef} className="tag-button" onClick={onClose}>
          tuck it back
        </button>
        {!isNew && !editing && (
          <button className="tag-button" onClick={() => setEditing(true)}>
            edit card
          </button>
        )}
      </div>

      <div className="letter-scene">
        <div className="envelope-back" aria-hidden="true" />

        <form className="letter" onSubmit={saveCard}>
          <div className="paper" aria-hidden="true"><div className="paper-sheet" /></div>
          <GooglyEyes className="letter-eyes" />

          {notice && <p className="letter-notice" role="status">{notice}</p>}

          <header className="letter-header">
            <div className="letter-heading-block">
              {editing ? (
                <label className="salutation">
                  <span>dear</span>
                  <input ref={firstFieldRef} className="ink-input" value={form.title} onChange={set('title')} placeholder="recipe name" required aria-label="Recipe name" />
                </label>
              ) : (
                <h1 className="salutation">dear {shown.title},</h1>
              )}

              {editing ? (
                <div className="meta-fields">
                  <label>
                    filed under
                    <select className="ink-input ink-select" value={form.category} onChange={set('category')}>
                      <option value="">unsorted</option>
                      {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </label>
                  <label>time <input className="ink-input" value={form.totalTime} onChange={set('totalTime')} placeholder="e.g. 30 min" /></label>
                  <label>serves <input className="ink-input" value={form.servings} onChange={set('servings')} placeholder="e.g. 4" /></label>
                  <label>cuisine <input className="ink-input" value={form.cuisine} onChange={set('cuisine')} placeholder="e.g. italian" /></label>
                </div>
              ) : (
                meta.length > 0 && <p className="letter-meta">{meta.join('  ·  ')}</p>
              )}
            </div>

            <fieldset className="rating">
              <legend className="visually-hidden">Your rating{rating ? `: ${rating} of 5` : ', not rated yet'}</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="star-button"
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-pressed={n <= rating}
                  onClick={() => rate(n)}
                >
                  <Star filled={n <= rating} variant={n * 3 + (recipe.title?.length ?? 0)} />
                </button>
              ))}
            </fieldset>
          </header>

          {(shown.image || editing) && (
            <figure className={`polaroid ${shown.image ? '' : 'is-empty'}`}>
              <GinghamBow className="polaroid-bow" />
              {shown.image ? (
                <img src={shown.image} alt={`Photo of ${shown.title || 'this recipe'}`} />
              ) : (
                <div className="polaroid-empty">paste a photo link below</div>
              )}
            </figure>
          )}

          <label className="review">
            <span className="visually-hidden">Your review</span>
            <textarea
              className="ink-area review-area"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              onBlur={saveReview}
              placeholder="how did it turn out? write yourself a little note…"
              rows={Math.max(2, Math.ceil(review.length / 60))}
            />
          </label>

          <h2 className="letter-heading">what you’ll need</h2>
          {editing ? (
            <textarea className="ink-area" value={form.ingredients} onChange={set('ingredients')} rows={Math.max(4, lines(form.ingredients).length + 1)} placeholder="one ingredient per line" aria-label="Ingredients, one per line" />
          ) : shown.ingredients?.length ? (
            <ul className="ingredients">{shown.ingredients.map((item, i) => <li key={i}>{item}</li>)}</ul>
          ) : (
            <p className="letter-empty">no ingredients written down yet</p>
          )}

          <h2 className="letter-heading">how to make it</h2>
          {editing ? (
            <textarea className="ink-area" value={form.steps} onChange={set('steps')} rows={Math.max(4, lines(form.steps).length * 2)} placeholder="one step per line" aria-label="Steps, one per line" />
          ) : shown.steps?.length ? (
            <ol className="steps">{shown.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
          ) : (
            <p className="letter-empty">no steps written down yet</p>
          )}

          {editing && (
            <div className="link-fields">
              <label>photo link <input className="ink-input" value={form.image} onChange={set('image')} placeholder="https://…/photo.jpg" inputMode="url" /></label>
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

          {editing && (
            <div className="letter-actions">
              <button type="submit" className="tag-button is-primary" disabled={busy}>
                {busy ? 'saving…' : isNew ? 'file it in the rolodex' : 'save card'}
              </button>
              {!isNew && (
                <button type="button" className="tag-button" onClick={() => { setForm(toForm(recipe)); setEditing(false); }}>
                  never mind
                </button>
              )}
              {!isNew && (
                confirmTear ? (
                  <span className="tear-confirm">
                    really tear it up?
                    <button type="button" className="tag-button is-danger" onClick={() => run(onDelete)}>yes, tear it up</button>
                    <button type="button" className="tag-button" onClick={() => setConfirmTear(false)}>keep it</button>
                  </span>
                ) : (
                  <button type="button" className="tag-button is-quiet" onClick={() => setConfirmTear(true)}>tear up card</button>
                )
              )}
            </div>
          )}
        </form>

        <div className="envelope-front" aria-hidden="true">
          <div className="pocket">
            <svg className="envelope-folds" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 L47 52 Q50 49 53 52 L100 100" fill="none" stroke="var(--kraft-deep)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <PatchHeart className="envelope-seal" />
        </div>
      </div>
    </div>
  );
}
