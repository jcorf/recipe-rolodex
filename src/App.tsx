import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { Draft, Recipe, Settings } from './types';
import { Rolodex, buildItems } from './components/Rolodex';
import { FruitMark } from './components/FruitMark';
import { useDriftingLight } from './useDriftingLight';
import { Letter } from './components/Letter';

type Open =
  | { kind: 'saved'; id: string }
  | { kind: 'draft'; draft: Draft; notice?: string }
  | null;

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Open>(null);
  const [link, setLink] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useDriftingLight();

  useEffect(() => {
    api.settings().then(setSettings).catch(() => { /* defaults below keep the dividers coloured */ });
    api.list()
      .then(setRecipes)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      [r.title, r.cuisine, r.category, r.review, ...r.ingredients].some((field) => field.toLowerCase().includes(q)),
    );
  }, [recipes, query]);

  const items = useMemo(() => buildItems(shown), [shown]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  const focusById = (id: string, list: Recipe[]) => {
    const i = buildItems(list).findIndex((item) => item.kind === 'recipe' && item.recipe.id === id);
    if (i !== -1) {
      setQuery('');
      setIndex(i);
    }
  };

  async function importLink(e: React.FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const { found, draft } = await api.importLink(link.trim());
      setOpen({
        kind: 'draft',
        draft,
        notice: found
          ? 'Copied from the page. Give it a look, then file it.'
          : 'That page didn’t share its recipe details, so I saved the name, photo and link. Fill in the rest by hand.',
      });
      setLink('');
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const close = useCallback(() => setOpen(null), []);

  const openRecipe = open?.kind === 'saved' ? recipes.find((r) => r.id === open.id) : undefined;

  return (
    <div className="desk">
      <div className="ambient" aria-hidden="true" />
      <header className="desk-header">
        <h1 className="wordmark">
          <FruitMark />
          <span>my recipes</span>
        </h1>

        <form className="link-strip" onSubmit={importLink}>
          <label htmlFor="link" className="visually-hidden">Recipe link</label>
          <input
            id="link"
            className="strip-input"
            type="url"
            inputMode="url"
            placeholder="paste a recipe link…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            aria-describedby={importError ? 'import-error' : undefined}
          />
          <button className="tag-button is-primary" disabled={importing || !link.trim()}>
            {importing ? 'fetching…' : 'make a card'}
          </button>
          <button type="button" className="tag-button" onClick={() => setOpen({ kind: 'draft', draft: {} })}>
            write one by hand
          </button>
          {importError && <p id="import-error" className="strip-error" role="alert">{importError}</p>}
        </form>
      </header>

      <main className="desk-surface">
        {loadError ? (
          <p className="load-error" role="alert">{loadError}</p>
        ) : (
          <>
            <label className="find-field">
              <span>find</span>
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
                placeholder="a name, category or ingredient"
              />
            </label>

            <Rolodex
              dividerColors={settings?.dividerColors ?? {}}
              items={items}
              recipeCount={shown.length}
              index={index}
              onIndex={setIndex}
              onOpen={(r) => setOpen({ kind: 'saved', id: r.id })}
              emptyMessage={
                loading
                  ? 'dusting off the cards…'
                  : query
                    ? `no card mentions “${query}”`
                    : 'no cards yet. paste a recipe link above, or write one by hand.'
              }
            />
          </>
        )}
      </main>

      {open?.kind === 'saved' && openRecipe && (
        <Letter
          key={openRecipe.id}
          recipe={openRecipe}
          isNew={false}
          onClose={close}
          onSave={async (patch) => {
            const saved = await api.update(openRecipe.id, patch);
            setRecipes((list) => list.map((r) => (r.id === saved.id ? saved : r)));
            return saved;
          }}
          onDelete={async () => {
            await api.remove(openRecipe.id);
            setRecipes((list) => list.filter((r) => r.id !== openRecipe.id));
            setOpen(null);
          }}
        />
      )}

      {open?.kind === 'draft' && (
        <Letter
          recipe={open.draft}
          isNew
          notice={open.notice}
          onClose={close}
          onSave={async (patch) => {
            const saved = await api.create({ ...open.draft, ...patch });
            const next = [...recipes, saved];
            setRecipes(next);
            focusById(saved.id, next);
            setOpen({ kind: 'saved', id: saved.id });
            return saved;
          }}
          onDelete={async () => setOpen(null)}
        />
      )}
    </div>
  );
}
