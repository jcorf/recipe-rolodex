import { useEffect, useRef, useState } from 'react';
import { cropPhoto, type PhotoFiles } from '../photos';
import { ActionTag } from './ActionTag';
import { PenIcon } from './PenIcons';

/**
 * Turn, crop, zoom and move a photo. The picture sits behind a 4:5 frame (the shape of a stamp): drag it,
 * scroll or press − / + to zoom. A dashed square shows what the little polaroid will show of it.
 * Nothing is kept until "keep it".
 */
const ASPECT = 4 / 5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function PhotoEditor({
  src, title, onDone, onCancel,
}: { src: string; title: string; onDone: (files: PhotoFiles) => Promise<void> | void; onCancel: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  /** What's on show: the photo as given, or a turned copy of it. */
  const [shownSrc, setShownSrc] = useState(src);
  const turned = useRef<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  /** The part of the picture at the middle of the frame (0–1 each way), and how far in we are. */
  const [view, setView] = useState({ cx: 0.5, cy: 0.5, zoom: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = new Image();
    el.onload = () => (el.naturalWidth > 0 ? setImg(el) : setFailed(true));
    el.onerror = () => setFailed(true);
    el.src = src;
  }, [src]);

  // turned copies are made here, so they're let go of here
  useEffect(() => () => turned.current.forEach((u) => URL.revokeObjectURL(u)), []);

  /** Turns the picture a quarter each way; the crop starts over, since what's in the middle has moved. */
  const turn = async (quarter: 1 | -1) => {
    if (!img || busy) return;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((quarter * Math.PI) / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    turned.current.push(url);
    const next = new Image();
    next.onload = () => { setImg(next); setShownSrc(url); setView({ cx: 0.5, cy: 0.5, zoom: 1 }); };
    next.src = url;
  };

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // how big the picture is drawn: at zoom 1 it just covers the frame
  const base = img && frame.w ? Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight) : 1;
  const scale = base * view.zoom;
  const shownW = img ? img.naturalWidth * scale : 0;
  const shownH = img ? img.naturalHeight * scale : 0;

  /** Keeps the picture covering the frame, whatever the zoom or drag. */
  const clamp = (v: { cx: number; cy: number; zoom: number }) => {
    if (!img || !frame.w) return v;
    const s = base * v.zoom;
    const halfX = frame.w / 2 / (img.naturalWidth * s);
    const halfY = frame.h / 2 / (img.naturalHeight * s);
    return { zoom: v.zoom, cx: Math.min(1 - halfX, Math.max(halfX, v.cx)), cy: Math.min(1 - halfY, Math.max(halfY, v.cy)) };
  };
  const zoomBy = (factor: number) =>
    setView((v) => clamp({ ...v, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(v.zoom * factor).toFixed(3))) }));

  useEffect(() => {
    // Escape closes just this editor, not the card behind it
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onCancel(); }
      else if (e.key === '+' || e.key === '=') zoomBy(1.15);
      else if (e.key === '-') zoomBy(1 / 1.15);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel, img, frame.w]);

  const keep = async () => {
    if (!img || busy) return;
    setBusy(true);
    setError('');
    try {
      const sw = frame.w / scale;
      const sh = frame.h / scale;
      const files = await cropPhoto(img, { sx: view.cx * img.naturalWidth - sw / 2, sy: view.cy * img.naturalHeight - sh / 2, sw, sh });
      await onDone(files);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const left = img ? frame.w / 2 - view.cx * shownW : 0;
  const top = img ? frame.h / 2 - view.cy * shownH : 0;

  return (
    <>
      <div className="letter-overlay photo-editor-overlay" role="dialog" aria-modal="true" aria-label={`Crop the photo of ${title}`}>
        <div className="photo-editor">
          <p className="photo-editor-title">move it and zoom in until it looks right</p>
          <div
            ref={frameRef}
            className="crop-frame"
            style={{ aspectRatio: String(ASPECT) }}
            onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => {
              if (!drag.current || !img) return;
              const dx = e.clientX - drag.current.x;
              const dy = e.clientY - drag.current.y;
              drag.current = { x: e.clientX, y: e.clientY };
              setView((v) => clamp({ ...v, cx: v.cx - dx / shownW, cy: v.cy - dy / shownH }));
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08)}
          >
            {img && <img src={shownSrc} alt="" draggable={false} style={{ width: shownW, height: shownH, left, top }} />}
            {!img && <p className="crop-wait">{failed ? 'couldn’t open that photo here' : 'opening the photo…'}</p>}
            {img && <span className="crop-guide" aria-hidden="true" />}
          </div>
          <div className="crop-turn" role="group" aria-label="Rotate">
            <button type="button" className="month-flip turn-left" aria-label="Turn left" disabled={!img || busy} onClick={() => turn(-1)}><PenIcon name="turn" /></button>
            <button type="button" className="month-flip" aria-label="Turn right" disabled={!img || busy} onClick={() => turn(1)}><PenIcon name="turn" /></button>
          </div>
          <div className="crop-zoom" role="group" aria-label="Zoom">
            <button type="button" className="month-flip" aria-label="Zoom out" disabled={!img || view.zoom <= MIN_ZOOM} onClick={() => zoomBy(1 / 1.25)}>
              <PenIcon name="minus" />
            </button>
            <span className="crop-zoom-level" aria-live="polite">{view.zoom.toFixed(1)}×</span>
            <button type="button" className="month-flip" aria-label="Zoom in" disabled={!img || view.zoom >= MAX_ZOOM} onClick={() => zoomBy(1.25)}>
              <PenIcon name="plus" />
            </button>
            <button type="button" className="today-link" disabled={!img} onClick={() => setView({ cx: 0.5, cy: 0.5, zoom: 1 })}>reset</button>
          </div>
          {error && <p className="letter-error" role="alert">{error}</p>}
        </div>
      </div>
      <nav className="card-actions photo-actions" aria-label="Photo actions">
        <ActionTag icon="save" label={busy ? 'saving…' : 'keep it'} tone="primary" onClick={keep} disabled={!img || busy} written />
        <ActionTag icon="tuck" label="never mind" onClick={onCancel} written />
      </nav>
    </>
  );
}
