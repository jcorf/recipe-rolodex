import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { CATEGORIES, GLOWS, VENUES, type Shown, type Draft, type Recipe, type Settings, type SortBy } from './types';
import { Rolodex, buildItems, type RolodexItem } from './components/Rolodex';
import { sortOptionsFor } from './sorting';
import { stampCardId } from './stamps';
import { CardStack, FindSlip, SurpriseTag, type SurpriseOptions } from './components/DeskObjects';
import {
  exportCard, exportCards, importFiles, importMessage,
  loadExportFormat, saveExportFormat, type ExportFormat,
} from './exportRecipes';
import { FruitMark } from './components/FruitMark';
import { useDeskSlide } from './useDeskSlide';
import { JamJar } from './components/JamJar';
import { useDriftingLight } from './useDriftingLight';
import { Letter } from './components/Letter';
import { EditableTitle } from './components/EditableTitle';
import { CalendarView } from './components/CalendarView';
import { ShareSheet } from './components/ShareSheet';
import { CalendarShare } from './components/CalendarShare';
import { ActionTag } from './components/ActionTag';
import { fileSlug, renderRecipeImage } from './shareImage';

/** The cursor glow's two colours, as CSS variables on the glow layer. */
function glowStyle(key?: string): React.CSSProperties {
  const g = GLOWS.find((x) => x.key === key) ?? GLOWS[0];
  return { '--glow-warm': g.warm, '--glow-cool': g.cool } as React.CSSProperties;
}

/** The way to divide the box when the chosen one no longer fits what's in it. */
const fallbackSort = (show: Shown): SortBy => (show.recipes ? 'category' : 'rating');

const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? '';

function filterRecipes(recipes: Recipe[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return recipes;
  return recipes.filter((r) =>
    [
      r.title, r.cuisine, r.category, categoryLabel(r.category), r.review, ...(r.ingredients ?? []),
      // restaurants: where, how much, what kind of place, and what was eaten there
      r.location ?? '', r.address ?? '', r.price ?? '', VENUES.find((v) => v.key === r.venue)?.label ?? '', ...(r.visits ?? []).map((v) => v.dish),
    ].some((field) => field.toLowerCase().includes(q)),
  );
}

type Share = { kind: 'recipe'; id: string } | { kind: 'month'; year: number; month: number; seed: number } | null;

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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [share, setShare] = useState<Share>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(loadExportFormat);
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

  // The slip shows each letter at once; the rolodex catches up a moment later (it can be thousands of cards).
  const searched = useDeferredValue(query);
  /** The search the rolodex last started over for (see the layout effect below). */
  const lastSearched = useRef(searched);
  const showRecipes = settings?.showRecipes ?? true;
  const showRestaurants = settings?.showRestaurants ?? false;
  /** What's in the box. Whatever is put away stays out of everything: the rolodex, search, sorts, the calendar. */
  const kinds = useMemo<Shown>(() => ({ recipes: showRecipes, restaurants: showRestaurants }), [showRecipes, showRestaurants]);
  const visible = useMemo(
    () => recipes.filter((r) => (r.kind === 'restaurant' ? showRestaurants : showRecipes)),
    [recipes, showRecipes, showRestaurants],
  );
  const shown = useMemo(() => filterRecipes(visible, searched), [visible, searched]);

  // a restaurant-only sort (price, location…) can't stay on once restaurants are off
  const chosenSort = settings?.sortBy ?? 'category';
  const sortBy = sortOptionsFor(kinds).some((o) => o.key === chosenSort) ? chosenSort : fallbackSort(kinds);
  const sortedItems = useMemo(() => buildItems(shown, sortBy), [shown, sortBy]);
  // Just after a rating, the box keeps its old order for a moment (the stars fill in, the confetti
  // falls), then the card is filed in its new place and the box flips there with it.
  const [held, setHeld] = useState<RolodexItem[] | null>(null);
  const items = useMemo(() => {
    if (!held) return sortedItems;
    const byId = new Map(shown.map((r) => [r.id, r]));
    return held.flatMap<RolodexItem>((it) => (it.kind === 'recipe' ? (byId.has(it.recipe.id) ? [{ ...it, recipe: byId.get(it.recipe.id)! }] : []) : [it]));
  }, [held, sortedItems, shown]);
  const releaseHeld = useRef<number>();

  // Settings change on the page at once and are saved in the background.
  const changeSettings = (patch: Partial<Settings>) => {
    // putting recipes or restaurants away also drops a sort that only makes sense for them
    if (patch.showRecipes !== undefined || patch.showRestaurants !== undefined) {
      const next: Shown = { recipes: patch.showRecipes ?? showRecipes, restaurants: patch.showRestaurants ?? showRestaurants };
      if (!sortOptionsFor(next).some((o) => o.key === (settings?.sortBy ?? 'category'))) patch = { ...patch, sortBy: fallbackSort(next) };
    }
    setSettings((s) => (s ? { ...s, ...patch } : s));
    if (patch.sortBy || patch.showRecipes !== undefined || patch.showRestaurants !== undefined) setIndex(0);
    api.saveSettings(patch).then(setSettings).catch(() => { /* keep the local choice; it retries next change */ });
  };

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  // Rating or editing a card can move it in the box (sorted by stars, a new name under a-z…). The card
  // you were looking at stays in front, rather than the box showing whatever slid into its place.
  const follow = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = follow.current;
    if (!id) return;
    follow.current = null;
    const i = items.findIndex((item) => item.kind === 'recipe' && item.recipe.id === id);
    if (i !== -1) setIndex(i);
  }, [items]);

  const focusById = (id: string, list: Recipe[]) => {
    const i = buildItems(list, sortBy).findIndex((item) => item.kind === 'recipe' && item.recipe.id === id);
    if (i !== -1) {
      setQuery('');
      lastSearched.current = ''; // clearing the search here shouldn't send the rolodex back to the front
      setIndex(i);
    }
  };

  /** Cuisines in the box, for the surprise card's menu. */
  const cuisines = useMemo(
    () => [...new Set(recipes.filter((r) => r.kind !== 'restaurant').map((r) => r.cuisine.trim().toLowerCase()).filter(Boolean))].sort(),
    [recipes],
  );

  /** The dice: jump to a random card with no stars yet (or any card), by meal or cuisine if asked. Returns false if none fit. */
  const surprise = ({ includeCooked, category, cuisine }: SurpriseOptions) => {
    const front = items[index];
    const pool = recipes.filter((r) =>
      r.kind !== 'restaurant' && // surprise me is for something to cook
      (includeCooked || (!r.rating && !r.cooked?.length)) &&
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

  // A new search starts on its first recipe (once the rolodex has caught up with it).
  useLayoutEffect(() => {
    if (lastSearched.current === searched) return;
    lastSearched.current = searched;
    setIndex(searched.trim() ? firstRecipe(items) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, items]);

  const find = (q: string) => {
    setQuery(q);
  };

  // "/" jumps to the find slip (unless you're already writing somewhere, or a card is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || open || calendarOpen || share || t.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      findRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, calendarOpen, share]);

  const close = useCallback(() => setOpen(null), []);
  /** A new card is a restaurant from the start when restaurants are all that's in the box. */
  const newDraft: Draft = showRestaurants && !showRecipes ? { kind: 'restaurant' } : {};

  const stampLook = { colors: settings?.dividerColors ?? {}, fruits: settings?.dividerFruits ?? {}, finish: settings?.stampFinish ?? 'plain', ateOutStyle: settings?.ateOutStyle ?? 'circle', ateOutColor: settings?.ateOutColor ?? '' };
  const closeShare = useCallback(() => setShare(null), []);
  const closeCalendar = useCallback(() => setCalendarOpen(false), []);
  const shareRecipe = share?.kind === 'recipe' ? recipes.find((r) => r.id === share.id) : undefined;
  const glow = GLOWS.find((g) => g.key === settings?.glowPalette) ?? GLOWS[0];
  const shareContext = { recipeFont: settings?.recipeFont ?? 'hand', look: stampLook, glow: { warm: glow.warm, cool: glow.cool }, show: kinds };

  const openRecipe = open?.kind === 'saved' ? recipes.find((r) => r.id === open.id) : undefined;

  // the stack and the find slip slide over when one of them is put away or brought back
  const deskRowRef = useRef<HTMLDivElement>(null);
  useDeskSlide(deskRowRef, `${settings?.showNewCard ?? true}-${settings?.showFind ?? true}`);

  return (
    <div className="desk" data-recipe-font={settings?.recipeFont ?? 'hand'}>
      <div ref={ambientRef} className="ambient" style={glowStyle(settings?.glowPalette)} aria-hidden="true" />
      <header className="desk-header">
        <h1 className="wordmark">
          <FruitMark glyph={settings?.titleFruit ?? 'h'} onChange={(titleFruit) => changeSettings({ titleFruit })} />
          <EditableTitle value={settings?.siteTitle ?? 'my recipes'} onChange={(siteTitle) => changeSettings({ siteTitle })} />
        </h1>
      </header>

      <main className="desk-surface">
        {loadError ? (
          <p className="load-error" role="alert">{loadError}</p>
        ) : (
          <div ref={deskRowRef} className="desk-row">
            <div className="desk-side is-left">
              {(settings?.showNewCard ?? true) && <CardStack onAdd={() => setOpen({ kind: 'draft', draft: newDraft })} />}
            </div>

            <Rolodex
              dividerColors={settings?.dividerColors ?? {}}
              dividerFruits={settings?.dividerFruits ?? {}}
              flipSound={settings?.flipSound ?? true}
              onDividerFruit={(group, glyph) =>
                changeSettings({ dividerFruits: { ...settings?.dividerFruits, [group]: glyph } })
              }
              keyboard={!open && !calendarOpen && !share}
              onRate={(recipe, rating) => {
                setHeld((h) => h ?? items);
                window.clearTimeout(releaseHeld.current);
                releaseHeld.current = window.setTimeout(() => {
                  follow.current = recipe.id;
                  setHeld(null);
                }, 1100);
                setRecipes((list) => list.map((r) => (r.id === recipe.id ? { ...r, rating } : r)));
                api.update(recipe.id, { rating }).catch(() => {
                  follow.current = recipe.id;
                  setRecipes((list) => list.map((r) => (r.id === recipe.id ? recipe : r))); // put it back if the save failed
                });
              }}
              items={items}
              recipeCount={shown.length}
              index={index}
              onIndex={setIndex}
              onOpen={(r) => setOpen({ kind: 'saved', id: r.id })}
              onNew={() => setOpen({ kind: 'draft', draft: newDraft })}
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

      <div className="spoon-desk">
        <ActionTag icon="spoon" label="what I ate" onClick={() => setCalendarOpen(true)} />
      </div>

      {!loadError && showRecipes && recipes.some((r) => r.kind !== 'restaurant') && <SurpriseTag onPick={surprise} cuisines={cuisines} />}

      <JamJar
        sortBy={sortBy}
        onSortBy={(next) => changeSettings({ sortBy: next })}
        recipeFont={settings?.recipeFont ?? 'hand'}
        onRecipeFont={(recipeFont) => changeSettings({ recipeFont })}
        desk={{ showNewCard: settings?.showNewCard ?? true, showFind: settings?.showFind ?? true }}
        show={kinds}
        onShow={changeSettings}
        onDesk={(patch) => {
          if (patch.showFind === false) find(''); // putting find away clears it, so nothing stays hidden
          changeSettings(patch);
        }}
        flipSound={settings?.flipSound ?? true}
        onFlipSound={(flipSound) => changeSettings({ flipSound })}
        glowPalette={settings?.glowPalette ?? 'peach'}
        onGlowPalette={(glowPalette) => changeSettings({ glowPalette })}
        exportFormat={exportFormat}
        onExportFormat={(format) => { setExportFormat(format); saveExportFormat(format); }}
        onExportAll={() => exportCards(recipes, exportFormat)}
        counts={{ recipes: recipes.filter((r) => r.kind !== 'restaurant').length, restaurants: recipes.filter((r) => r.kind === 'restaurant').length }}
        onClear={async (kind) => {
          const gone = await api.removeAll(kind);
          setRecipes((list) => list.filter((r) => !(kind === 'both' || (kind === 'restaurants') === (r.kind === 'restaurant'))));
          setIndex(0);
          return `${gone} ${gone === 1 ? 'card' : 'cards'} thrown away.`;
        }}
        onReseed={async () => {
          const fresh = await api.reseed();
          const ids = new Set(fresh.map((r) => r.id));
          setRecipes((list) => [...list.filter((r) => !ids.has(r.id)), ...fresh]);
          setIndex(0);
          return `${fresh.length} sample cards are back in the box, unrated.`;
        }}
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
          stampLook={stampLook}
          onShare={() => setShare({ kind: 'recipe', id: openRecipe.id })}
          exportLabel={`export card (.${exportFormat})`}
          onExport={() => exportCard(openRecipe, exportFormat)}
          onClose={close}
          onSave={async (patch) => {
            const saved = await api.update(openRecipe.id, patch);
            follow.current = saved.id;
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

      {calendarOpen && (
        <CalendarView
          paused={!!share}
          recipes={recipes}
          show={kinds}
          look={stampLook}
          onClose={closeCalendar}
          onAteOutStyle={(ateOutStyle) => changeSettings({ ateOutStyle })}
          onAteOutColor={(ateOutColor) => changeSettings({ ateOutColor })}
          onOpenRecipe={(r) => { setCalendarOpen(false); setOpen({ kind: 'saved', id: stampCardId(r) }); }}
          onFinish={(stampFinish) => changeSettings({ stampFinish })}
          onShare={(year, month, seed) => setShare({ kind: 'month', year, month, seed })}
        />
      )}

      {shareRecipe && (
        <ShareSheet
          key={shareRecipe.id + shareRecipe.updatedAt}
          title={shareRecipe.title}
          filename={`${fileSlug(shareRecipe.title)}.png`}
          render={(white) => renderRecipeImage(shareRecipe, { ...shareContext, white })}
          onClose={closeShare}
        />
      )}
      {share?.kind === 'month' && (
        <CalendarShare
          year={share.year}
          month={share.month}
          seed={share.seed}
          recipes={recipes}
          context={shareContext}
          onClose={closeShare}
        />
      )}

      {open?.kind === 'draft' && (
        <Letter
          recipe={open.draft}
          stampLook={stampLook}
          canBeRestaurant={showRecipes && showRestaurants}
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
