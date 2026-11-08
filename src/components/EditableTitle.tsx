import { useEffect, useRef, useState } from 'react';

/**
 * The name at the top of the desk, written in pen. Click it to rewrite it: Enter or clicking away
 * keeps the new name, Escape puts the old one back. An empty name isn't kept.
 */
export function EditableTitle({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const finish = (keep: boolean) => {
    const next = draft.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (keep && next && next !== value) onChange(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="ink-input wordmark-input"
        value={draft}
        maxLength={40}
        size={Math.max(8, draft.length + 1)}
        aria-label="Name of your recipe box"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(true);
          else if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className="wordmark-text"
      aria-label={`${value}: rename your recipe box`}
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      {value}
    </button>
  );
}
