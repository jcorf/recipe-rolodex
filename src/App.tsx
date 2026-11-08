import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { CATEGORIES, type Draft, type Recipe, type Settings } from './types';
import { Rolodex, buildItems } from './components/Rolodex';
import { CardStack, FindSlip } from './components/DeskObjects';
import { exportAll } from './exportRecipes';
import { FruitMark } from './components/FruitMark';
import { JamJar } from './components/JamJar';
import { useDriftingLight } from './useDriftingLight';
import { Letter } from './components/Letter';

const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? '';

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
  const findRef = useRef<HTMLInputElement>(null);

  const ambientRef = useRef<HTMLDivElement>(null);
  useDriftingLight(ambientRef);

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
      [r.title, r.cuisine, r.category, categoryLabel(r.category), r.review, ...r.ingredients].some((field) => field.toLowerCase().includes(q)),
    );
  }, [recipes, query]);

  const sortBy = settings?.sortBy ?? 'category';
  const items = useMemo(() => buildItems(shown, sortBy), [shown, sortBy]);

  // Settings change on the page at once and are saved in the background.
  const changeSettings = (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    if (patch.sortBy) setIndex(0);
    api.saveSettings(patch).then(setSettings).catch(() => { /* keep the local choice; it retries next change */ });
  };

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  const focusById = (id: string, list: Recipe[]) => {
    const i = buildItems(list, sortBy).findIndex((item) => item.kind === 'recipe' && item.recipe.id === id);
    if (i !== -1) {
      setQuery('');
      setIndex(i);
    }
  };

  /** Pasting a link on a new card's first line fills the card from the page. */
  const importLink = async (url: string) => {
    const { found, draft } = await api.importLink(url);
    return {
      draft,
      notice: found
        ? 'Copied from the page. Give it a look, then file it.'
        : 'That page didn’t share its recipe details, so I kept the name, photo and link. Fill in the rest by hand.',
    };
  };

  const find = (q: string) => {
    setQuery(q);
    setIndex(0);
  };

  // "/" jumps to the find slip (unless you're already writing somewhere, or a card is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || open || t.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      findRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = useCallback(() => setOpen(null), []);

  const openRecipe = open?.kind === 'saved' ? recipes.find((r) => r.id === open.id) : undefined;

  return (
    <div className="desk" data-recipe-font={settings?.recipeFont ?? 'hand'}>
      <div ref={ambientRef} className="ambient" aria-hidden="true" />
      <header className="desk-header">
        <h1 className="wordmark">
          <FruitMark glyph={settings?.titleFruit ?? 'h'} onChange={(titleFruit) => changeSettings({ titleFruit })} />
          <span>my recipes</span>
        </h1>
      </header>

      <main className="desk-surface">
        {loadError ? (
          <p className="load-error" role="alert">{loadError}</p>
        ) : (
          <div className="desk-row">
            <div className="desk-side is-left">
              {(settings?.showNewCard ?? true) && <CardStack onAdd={() => setOpen({ kind: 'draft', draft: {} })} />}
            </div>

            <Rolodex
              dividerColors={settings?.dividerColors ?? {}}
              dividerFruits={settings?.dividerFruits ?? {}}
              onDividerFruit={(group, glyph) =>
                changeSettings({ dividerFruits: { ...settings?.dividerFruits, [group]: glyph } })
              }
              keyboard={!open}
              onRate={(recipe, rating) => {
                setRecipes((list) => list.map((r) => (r.id === recipe.id ? { ...r, rating } : r)));
                api.update(recipe.id, { rating }).catch(() => {
                  setRecipes((list) => list.map((r) => (r.id === recipe.id ? recipe : r))); // put it back if the save failed
                });
              }}
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
                    : 'no cards yet. pull a blank card from the stack to start.'
              }
            />

            <div className="desk-side is-right">
              {(settings?.showFind ?? true) && <FindSlip ref={findRef} value={query} onChange={find} />}
            </div>
          </div>
        )}
      </main>

      <JamJar
        sortBy={sortBy}
        onSortBy={(next) => changeSettings({ sortBy: next })}
        recipeFont={settings?.recipeFont ?? 'hand'}
        onRecipeFont={(recipeFont) => changeSettings({ recipeFont })}
        desk={{ showNewCard: settings?.showNewCard ?? true, showFind: settings?.showFind ?? true }}
        onDesk={(patch) => {
          if (patch.showFind === false) find(''); // putting find away clears it, so nothing stays hidden
          changeSettings(patch);
        }}
        onExportAll={() => exportAll(recipes)}
      />

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
          onImport={importLink}
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
