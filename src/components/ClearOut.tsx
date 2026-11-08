import { useState } from 'react';
import type { CardKinds } from '../store/types';
import { PenIcon } from './PenIcons';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function what(kind: CardKinds, counts: { recipes: number; restaurants: number }) {
  if (kind === 'recipes') return plural(counts.recipes, 'recipe', 'recipes');
  if (kind === 'restaurants') return plural(counts.restaurants, 'restaurant', 'restaurants');
  return plural(counts.recipes + counts.restaurants, 'card', 'cards');
}

/**
 * At the bottom of the settings: emptying the box (recipes, restaurants or both, asked twice, since
 * it can't be undone), and putting the sample cards back in, unrated.
 */
export function ClearOut({
  counts, onClear, onReseed,
}: {
  counts: { recipes: number; restaurants: number };
  onClear: (kind: CardKinds) => Promise<string>;
  onReseed: () => Promise<string>;
}) {
  const [step, setStep] = useState<'idle' | 'pick' | 'sure' | 'really'>('idle');
  const [kind, setKind] = useState<CardKinds>('both');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const total = counts.recipes + counts.restaurants;

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    try {
      setNote(await task());
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setBusy(false);
      setStep('idle');
    }
  };
  const keep = () => setStep('idle');

  return (
    <div className="clear-out">
      <button type="button" className="sort-option file-option" disabled={busy} onClick={() => run(onReseed)}>
        <PenIcon name="plus" />
        <span className="sort-label">put the sample cards back</span>
      </button>

      {step === 'idle' && (
        <button type="button" className="sort-option file-option is-trash" disabled={!total || busy} onClick={() => { setNote(''); setStep('pick'); }}>
          <PenIcon name="tear" />
          <span className="sort-label">throw cards away</span>
        </button>
      )}

      {step === 'pick' && (
        <div className="clear-step" role="group" aria-label="Which cards to throw away">
          <span className="clear-question">which ones?</span>
          {(['recipes', 'restaurants', 'both'] as const).map((k) => {
            const n = k === 'recipes' ? counts.recipes : k === 'restaurants' ? counts.restaurants : total;
            return (
              <button key={k} type="button" className="clear-choice" disabled={!n} onClick={() => { setKind(k); setStep('sure'); }}>
                {k === 'both' ? 'all of them' : k} <small>{n}</small>
              </button>
            );
          })}
          <button type="button" className="today-link" onClick={keep}>never mind</button>
        </div>
      )}

      {step === 'sure' && (
        <div className="clear-step" role="alertdialog" aria-label="Throw them away?">
          <span className="clear-question">throw away {what(kind, counts)}?</span>
          <div className="clear-buttons">
            <button type="button" className="clear-choice is-danger" onClick={() => setStep('really')} autoFocus>yes</button>
            <button type="button" className="clear-choice" onClick={keep}>keep them</button>
          </div>
        </div>
      )}

      {step === 'really' && (
        <div className="clear-step" role="alertdialog" aria-label="Really throw them away?">
          <span className="clear-question">really? they can’t be brought back. save a copy first if you might want them.</span>
          <div className="clear-buttons">
            <button type="button" className="clear-choice is-danger is-final" disabled={busy} onClick={() => run(() => onClear(kind))}>
              throw them away
            </button>
            <button type="button" className="clear-choice" onClick={keep} autoFocus>keep them</button>
          </div>
        </div>
      )}

      {note && <p className="file-note" role="status">{note}</p>}
    </div>
  );
}
