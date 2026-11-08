import { useEffect, useRef, useState } from 'react';
import { ActionTag } from './ActionTag';
import { PenCircle } from './ink';

const WHITE_KEY = 'share-white-background';
const loadWhite = () => {
  try { return localStorage.getItem(WHITE_KEY) === '1'; } catch { return false; }
};

/**
 * A picture to send: the card or calendar month drawn at full size, with ways to hand it on:
 * the phone/computer share sheet when there is one, copy it, or save the .png.
 */
export function ShareSheet({
  title, filename, render, onClose,
}: { title: string; filename: string; render: (white: boolean) => Promise<Blob>; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('drawing it…');
  const [white, setWhite] = useState(loadWhite);
  const overlayRef = useRef<HTMLDivElement>(null);
  const file = blob ? new File([blob], filename, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const canCopy = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

  // (re)draw whenever the backdrop changes; the last picture stays up until the new one is ready
  useEffect(() => {
    let alive = true;
    render(white)
      .then((b) => {
        if (!alive) return;
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setNote('');
      })
      .catch((err: Error) => alive && setNote(err.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [white]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const chooseBackdrop = (next: boolean) => {
    setWhite(next);
    try { localStorage.setItem(WHITE_KEY, next ? '1' : '0'); } catch { /* fine for this visit */ }
  };

  useEffect(() => {
    overlayRef.current?.focus({ preventScroll: true });
    // Escape closes just this sheet, not the card or calendar underneath it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const save = () => {
    if (!url) return;
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setNote('saved');
  };
  const copy = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setNote('copied, ready to paste');
    } catch {
      setNote('couldn’t copy that here; save it instead');
    }
  };
  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title });
    } catch {
      /* closed the share sheet: nothing to say */
    }
  };

  return (
    <>
      <div
        ref={overlayRef}
        tabIndex={-1}
        className="letter-overlay share-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${title}`}
        onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <figure className="share-picture">
          {url ? <img src={url} alt={`${title}, as a picture`} /> : <div className="share-wait" aria-hidden="true" />}
          {note && <p className="letter-notice" role="status">{note}</p>}
          <div role="radiogroup" aria-label="Background of the picture" className="share-backdrop">
            <span>background</span>
            {([[false, 'glow'], [true, 'white']] as const).map(([value, label], i) => (
              <label key={label} className={`sort-option ${white === value ? 'is-chosen' : ''}`}>
                <input type="radio" name="share-background" className="visually-hidden" checked={white === value} onChange={() => chooseBackdrop(value)} />
                <span className="sort-label">
                  {label}
                  {white === value && <PenCircle variant={i + 2} />}
                </span>
              </label>
            ))}
          </div>
        </figure>
      </div>
      <nav className="card-actions share-actions" aria-label="Share actions">
        {canShare && <ActionTag icon="share" label="share…" onClick={share} />}
        {canCopy && <ActionTag icon="copy" label="copy picture" onClick={copy} disabled={!blob} />}
        <ActionTag icon="export" label="save picture (.png)" onClick={save} disabled={!blob} />
        <ActionTag icon="cancel" label="close" tone="quiet" onClick={onClose} />
      </nav>
    </>
  );
}
