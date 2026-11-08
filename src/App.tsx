import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { CATEGORIES, GLOWS, type Draft, type Recipe, type Settings } from './types';
import { Rolodex, buildItems, type RolodexItem } from './components/Rolodex';
import { CardStack, FindSlip, SurpriseTag, type SurpriseOptions } from './components/DeskObjects';
import { exportAll, exportAllMarkdown, importFiles, importMessage } from './exportRecipes';
import { FruitMark } from './components/FruitMark';
import { JamJar } from './components/JamJar';
import { useDriftingLight } from './useDriftingLight';
import { Letter } from './components/Letter';

/** The cursor glow's two colours, as CSS variables on the glow layer. */
function glowStyle(key?: string): React.CSSProperties {
  const g = GLOWS.find((x) => x.key === key) ?? GLOWS[0];
  return { '--glow-warm': g.warm, '--glow-cool': g.cool } as React.CSSProperties;
}

const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? '';

function filterRecipes(recipes: Recipe[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return recipes;
  return recipes.filter((r) =>
    [r.title, r.cuisine, r.category, categoryLabel(r.category), r.review, ...r.ingredients].some((field) => field.toLowerCase().includes(q)),
  );
}

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

  const shown = useMemo(() => filterRecipes(recipes, query), [recipes, query]);

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

  /** Cuisines in the box, for the surprise card's menu. */
  const cuisines = useMemo(
    () => [...new Set(recipes.map((r) => r.cuisine.trim().toLowerCase()).filter(Boolean))].sort(),
    [recipes],
  );

  /** The dice: jump to a random card with no stars yet (or any card), by meal or cuisine if asked. Returns false if none fit. */
  const surprise = ({ includeCooked, category, cuisine }: SurpriseOptions) => {
    const front = items[index];
    const pool = recipes.filter((r) =>
      (includeCooked || !r.rating) &&
      (!category || (category === 'unsorted' ? !r.category : r.category === category)) &&
      (!cuisine || r.cuisine.trim().toLowerCase() === cuisine) &&
      !(front?.kind === 'recipe' && front.recipe.id === r.id && (recipes.length > 1)),
    );
    if (!pool.length) return false;
    focusById(pool[Math.floor(Math.random() * pool.length)].id, recipes);
    return true;
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

  /** Where a search starts: on its first recipe, not the divider above it. */
  const firstRecipe = (list: RolodexItem[]) => Math.max(0, list.findIndex((item) => item.kind === 'recipe'));

  const find = (q: string) => {
    setQuery(q);
    setIndex(q.trim() ? firstRecipe(buildItems(filterRecipes(recipes, q), sortBy)) : 0);
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
      <div ref={ambientRef} className="ambient" style={glowStyle(settings?.glowPalette)} aria-hidden="true" />
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
              onNew={() => setOpen({ kind: 'draft', draft: {} })}
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

      {!loadError && recipes.length > 0 && <SurpriseTag onPick={surprise} cuisines={cuisines} />}

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
        glowPalette={settings?.glowPalette ?? 'peach'}
        onGlowPalette={(glowPalette) => changeSettings({ glowPalette })}
        onExportAll={() => exportAll(recipes)}
        onExportMarkdown={() => exportAllMarkdown(recipes)}
        onImportFiles={async (files) => {
          try {
            const summary = await importFiles(files, api.importRecipes);
            if (summary.added.length) setRecipes((list) => [...list, ...summary.added]);
            return importMessage(summary);
          } catch (err) {
            return (err as Error).message;
          }
        }}
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
