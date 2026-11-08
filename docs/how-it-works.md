# How the recipe rolodex works

A guided tour of the code, written for someone who knows some programming but not much
TypeScript or React. Read it top to bottom once, then use it as a map.

---

## 1. The big picture

```
          your browser                                       Vercel (the host)
 ┌──────────────────────────────────────────┐        ┌───────────────────────────────┐
 │  index.html  →  src/main.tsx  →  App.tsx │        │ static files (the built app)  │
 │                         │                │        │                               │
 │        components/ (what you see)        │ fetch  │ api/import.js  reads a recipe │
 │                         │                │ ─────▶ │ api/image.js   passes a photo │
 │       src/api.ts  (the one door)         │        └───────────────────────────────┘
 │                         │                │
 │   store/localStore.ts → IndexedDB        │        Supabase (later, when signed in)
 │   (cards, settings, photos, on device)   │ ─────▶ Google sign-in · Postgres · photos
 └──────────────────────────────────────────┘
```

Three ideas carry the whole app:

1. **It is a single-page app.** The server sends one HTML page and a bundle of JavaScript once.
   From then on everything (flipping cards, editing, the calendar) happens in the browser.
2. **Your cards live in the browser**, in IndexedDB (a small database every browser has). No
   server stores them. That's why it works offline, and also why a different phone doesn't
   see the same cards yet.
3. **The page only talks to storage through one door** (`src/api.ts`). That door is what lets a
   signed-in, cloud-backed store slot in later without rewriting the components.

---

## 2. The tools, and what each one does

| Tool | What it is | Where you see it |
|---|---|---|
| **TypeScript** | JavaScript plus *types*: labels saying what shape a value has. They're checked when you build, then removed, so the browser runs plain JavaScript. | every `.ts` / `.tsx` file |
| **React** | A library for building a page out of *components*: functions that take data and return what should be on screen. | `src/components/*.tsx`, `App.tsx` |
| **Vite** | The dev server and the bundler. `npm run dev` serves the app and reloads when you save; `npm run build` makes the `dist/` folder Vercel hosts. | `vite.config.ts` |
| **IndexedDB** | A database built into the browser. | `src/store/db.ts` |
| **Vercel** | Hosts `dist/` and runs the small files in `api/` as *serverless functions* (code that runs on request, with no server to manage). | `vercel.json`, `api/` |
| **Supabase** (new) | A hosted Postgres database with sign-in (Google) and file storage. | `src/account/`, `supabase/` |

`.ts` is TypeScript; `.tsx` is TypeScript that also contains JSX (the HTML-looking parts
inside React components).

---

## 3. TypeScript in five minutes, with examples from this repo

### Types describe shapes
`src/types.ts` is the best file to read first. It says what a card *is*:

```ts
export interface Recipe {
  id: string;
  title: string;
  rating: number;
  ingredients: string[];      // a list of strings
  cooked?: string[];          // the ? means "may be missing"
  kind?: 'recipe' | 'restaurant';   // only one of these two exact strings
  ...
}
```

- `interface` names a shape. Any object with those fields counts as a `Recipe`.
- `string[]` is "a list of strings".
- `?` makes a field optional.
- `'recipe' | 'restaurant'` is a *union*: only those values are allowed. Type `'restuarant'`
  by mistake and the build fails, so typos are caught before you ever run it.

### Small helpers you'll see everywhere
```ts
type Draft = Partial<Recipe>;          // the same fields as Recipe, all optional
Pick<Settings, 'showNewCard' | 'showFind'>   // just those two fields of Settings
Promise<Recipe[]>                     // "a list of recipes, arriving later"
```

### Functions say what goes in and what comes out
```ts
export function weekOf(day: string): string[] { ... }
//                    ^ takes a string     ^ returns a list of strings
```

### `async` / `await`: waiting without freezing the page
Reading from a database or the network takes time. A function marked `async` can `await` a
slow step, and the page stays responsive meanwhile:

```ts
const recipes = await api.list();   // wait for the cards, then carry on
```

You'll also see the older style, `.then(...)`, which means the same thing:
`api.list().then(setRecipes)`.

### Other syntax you'll see
| You see | It means |
|---|---|
| `a ?? b` | `a`, unless it's null/undefined, then `b` |
| `a?.b` | `a.b`, or undefined if `a` is missing (no crash) |
| `x!` | "trust me, this isn't null" |
| `{ ...card, rating: 5 }` | a copy of `card` with `rating` changed |
| `(r) => r.title` | a small function: take `r`, return its title |
| `` `${n} cards` `` | text with a value placed inside |

---

## 4. React in five minutes

### A component is a function that returns what to show
`src/components/ActionTag.tsx` (one of the small buttons on an open card) is a good first one:

```tsx
export function ActionTag({ icon, label, onClick }: { icon: PenIconName; label: string; onClick?: () => void }) {
  return (
    <button className="action-tag" aria-label={label} onClick={onClick}>
      <PenIcon name={icon} />
    </button>
  );
}
```

- The inputs (`icon`, `label`, `onClick`) are called **props**. The part after the `:` is their type.
- What it returns looks like HTML; that's **JSX**. `className` is HTML's `class`.
- `{label}` drops a value into the markup.
- Another component uses it like a tag: `<ActionTag icon="cancel" label="close card" onClick={onClose} />`.

### State: values that make the page redraw when they change
```tsx
const [open, setOpen] = useState(false);
...
<button onClick={() => setOpen(true)}>
```
`useState` gives back the current value and a function to change it. Calling `setOpen`
makes React run the component again and update the page to match. **You never change the page
by hand; you change state, and the page follows.** That one rule is the heart of React.

### Effects: doing something *after* drawing
```tsx
useEffect(() => {
  api.list().then(setRecipes);    // load the cards once, when the app first appears
}, []);                            // [] = run once; [x] = run again whenever x changes
```

### Other hooks used here
- `useMemo(() => work, [inputs])`: remembers a computed value until its inputs change
  (e.g. sorting thousands of cards only when the cards or the sort change).
- `useRef`: a box that holds a value (often a page element) *without* causing a redraw.
- `useLayoutEffect`: like `useEffect`, but runs before the browser paints. Used when a
  measurement or a jump must happen before you'd see a flicker.
- Custom hooks: any function starting with `use` that uses other hooks, such as
  `useAccount`, `useDismiss` or `useDeskSlide`. They're how logic is shared between components.

### Data flows down, events flow up
`App.tsx` holds the important state (the cards, the settings, which card is open). It hands
values *down* to components as props, and hands down functions (`onSave`, `onRate`…) that the
components call to send changes back *up*. For example, `JamJar` (settings) never saves
anything itself: it calls `onSortBy(...)`, and `App` updates the state and saves.

---

## 5. A walk through the folders

```
index.html               the one page; it has an empty <div id="root">
src/
  main.tsx               starts React inside #root, loads fonts + styles, registers offline mode
  App.tsx                the desk: holds all the state, wires every component together
  types.ts               the shapes: Recipe, Visit, Settings, categories, prices
  api.ts                 the one door to storage (plus the "read this recipe link" call)

  components/            everything you see
    Rolodex.tsx            the spinning box of cards and its tabs
    Letter.tsx             an open card: reading, editing, stars, photo, stamps
    JamJar.tsx             the jam jar = settings
    CalendarView.tsx       the spoon = the month of stamps
    VisitPop / CookedPop   "when did you eat/cook it?" pop-ups
    PhotoEditor.tsx        crop / move / zoom a photo
    ShareSheet.tsx         share a card or calendar as a picture
    ink.tsx, PenIcons.tsx  the hand-drawn pen strokes and icons
    AccountRow.tsx         (new) "sign in with Google" in settings

  store/                 where cards are kept
    types.ts               the Store interface: the list of things any store must be able to do
    localStore.ts          that list, done with IndexedDB
    db.ts                  a small wrapper that makes IndexedDB easier to use
    rules.ts               what a valid card looks like; cleans imported files
    seed.json              the sample cards

  account/               (new) Google sign-in through Supabase
  sorting.ts             how the box is divided (by meal, stars, cuisine…)
  dates.ts               calendar maths
  photos.ts              shrinks a picked photo to two sizes, strips location data
  shareImage.ts          draws a card onto a canvas to save as a PNG
  exportRecipes.ts       save as .json / .md / .txt / .docx / .pdf
  styles.css             every style (colours and fonts are explained in DESIGN.md)

api/                     the only server code (Vercel functions)
  import.js                POST /api/import: read a recipe page someone pasted
  image.js                 GET /api/image: fetch a web photo so a canvas can use it
  _lib/safeFetch.js        refuses private/internal addresses, so it can't be used to attack
supabase/migrations/     (new) the cloud database tables and their access rules
public/                  files served as-is: textures, the jar images, icons, sw.js (offline)
vercel.json              hosting settings, including security headers
```

---

## 6. Follow one action through the code: rating a card 5 stars

Tracing one click end to end is the fastest way to learn a codebase. Open these files side by
side:

1. **`StarRating.tsx`**: you tap the fifth star on the front card. Its `onClick` works out the
   value (5), fires `confetti(x, y)` from `src/confetti.ts`, and calls the `onRate` prop it was given.
2. **`Rolodex.tsx`** passed that `onRate` down from `App`; it adds which card was rated.
3. **`App.tsx` → `onRate`** (search for `onRate={(recipe, rating)`):
   - sets `held`, so the box keeps its old order while the confetti falls;
   - updates the `recipes` state with `setRecipes` straight away, so the stars fill in at once
     (this is called an *optimistic update*: show it first, save in the background);
   - calls `api.update(id, { rating: 5 })` to save it, and puts the old card back if that fails;
   - after 1.1 seconds clears `held` and sets `follow.current = recipe.id`.
4. **`api.ts`** hands the call to `localStore.update`.
5. **`localStore.ts`**: `update` reads the card from IndexedDB, merges the change with
   `patchRecipe` from `rules.ts` (which also sets `updatedAt`) and writes it back.
6. Back in **`App.tsx`**: once `held` is cleared, `useMemo` re-sorts the cards into `items`. A
   `useLayoutEffect` sees `follow.current`, finds the card's new position, and calls
   `setIndex` to turn the rolodex there.
7. **`Rolodex.tsx`** gets the new `items` and `index` as props and draws the box turned to the card.

(Rating inside an open card takes a slightly different path: `Letter.tsx`'s `rate` calls its
`onSave` prop, which `App` handles the same way.)

Try the same with "paste a link on a new card": `Letter.tsx` (its `onImport` prop) → `importLink` in `App.tsx` → `api.importLink` → `fetch('/api/import')`
→ `api/import.js` → `api/_lib/importer.js`, which reads the recipe data most recipe sites embed.

---

## 7. Storage: why the `Store` interface matters

`src/store/types.ts` lists what a store must do:

```ts
export interface Store {
  list(): Promise<Recipe[]>;
  create(draft: Draft): Promise<Recipe>;
  update(id: string, patch: Draft): Promise<Recipe>;
  remove(id: string): Promise<void>;
  ...
}
```

An interface is a promise: "anything calling itself a Store has these functions."
`localStore.ts` keeps that promise using IndexedDB. A future `cloudStore.ts` will keep the same
promise using Supabase. Then `api.ts` picks one:

```ts
const store: Store = signedIn ? cloudStore : localStore;   // the plan
```

No component needs to change, because none of them know which store they're talking to.

---

## 8. Sign-in and sharing (what this branch adds)

### How "Sign in with Google" works (OAuth)
```
 you tap "sign in with Google"
   → the app sends you to Google (through Supabase)
   → you pick an account; Google tells Supabase who you are
   → Supabase sends you back to the rolodex with a one-time code in the address
   → the app swaps the code for a session (a signed token that says "this is <you>")
   → the token is kept in the browser and refreshed automatically
```
The app never sees your Google password. `flowType: 'pkce'` in `src/account/session.ts` is the
modern, safer way for a browser app to do this exchange.

### The files
- `src/account/config.ts` reads two keys from the environment. If they're missing, sign-in is
  switched off and the app behaves exactly as before.
- `src/account/session.ts` does sign in, sign out, and "tell me when the account changes".
  It loads the Supabase library only when needed (`import('@supabase/supabase-js')`), so people
  who never sign in don't download it.
- `src/account/useAccount.ts` is a custom hook any component can use to know who's signed in.
- `src/components/AccountRow.tsx` is the "your account" part of the jam jar.

### Who can see what: Row Level Security
In the cloud, every card is a row in a Postgres table with a `user_id`. The browser holds a
*public* key, so the protection can't live in the app; anyone could read the JavaScript.
Instead, the database itself checks every request against rules in
`supabase/migrations/0001_accounts_and_sharing.sql`:

```sql
create policy "own cards" on public.recipes
  for all using (user_id = auth.uid());          -- you can do anything with your own cards

create policy "cards shared with me" on public.recipes
  for select using (exists (select 1 from shares ...where shared_with = my_email()));
                                                  -- you can *read* cards someone shared with you
```

`auth.uid()` is the signed-in person, taken from their token, which can't be faked. Sharing is
just a row in `shares`: "owner X shares card Y (or the whole box) with friend@gmail.com".
Deleting the row unshares.

### Still to build
1. `cloudStore.ts`: the Store interface backed by the `recipes` table.
2. On first sign-in: "move my cards to my account".
3. A share screen, and a "shared with me" box (read-only cards).

Setup steps for the Google and Supabase side are in `docs/google-sign-in.md`.

---

## 9. How to learn by changing things

Run `npm install`, then `npm run dev`, and open http://localhost:5173. Saving a file updates
the page right away. Some small exercises, easiest first:

1. **Change words.** In `JamJar.tsx`, change `'casual script'` to something else and watch the
   settings update.
2. **Add a meal category.** Add `{ key: 'snacks', label: 'snacks' }` to `CATEGORIES` in
   `types.ts`. Note what TypeScript complains about in other files: those errors are a map of
   everything that depends on that list.
3. **Add a setting.** Add a field to `Settings` in `types.ts`, give it a default in
   `store/rules.ts`, add a checkbox in `JamJar.tsx` modelled on "flip sound", and use it in
   `App.tsx`. That's the full data-flows-down, events-flow-up loop.
4. **Trace a feature** of your choice the way section 6 does, writing down each file it passes through.

Useful commands:
- `npx tsc -b` checks types without running anything. Red errors here are TypeScript catching mistakes.
- `npm run build` does what Vercel does. If it passes locally, the deploy will build.

### Good next reads
- react.dev/learn: the official React tutorial (start with "Thinking in React").
- typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
- MDN's pages on `fetch`, `Promise` and IndexedDB.
- supabase.com/docs/guides/auth/social-login/auth-google
