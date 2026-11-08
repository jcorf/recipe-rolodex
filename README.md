# Recipe Rolodex

A personal recipe journal. Flip through recipes on a desk rolodex; open one and it slides out of its envelope as a handwritten letter.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

To try the production build locally: `npm run build && npm run preview` → http://localhost:4173

Deploys to Vercel as is: a static Vite site (`dist`) plus two small functions in `api/`.

## Where things live

- **Your cards stay in your browser.** Recipes, settings and photos are kept in this browser's IndexedDB (`src/store/localStore.ts`), on this device only. Back them up with the jam jar → export → `.json` (photos are included) and add them back with import. A brand-new browser starts with the sample cards in `src/store/seed.json`.
- `src/store/` is where cards are kept: `types.ts` (the `Store` interface the page talks to), `rules.ts` (what a valid card and settings look like), `db.ts` (IndexedDB). A signed-in store can slot in beside the local one later.
- `src/photos.ts` shrinks a picked photo to a 1200px copy and a 320px thumbnail and lets the original go (it never leaves the device, and its location data goes with it).
- `api/import.js` reads a recipe link ("paste a link" on a new card). It reads the schema.org recipe data most recipe sites embed (NYT Cooking, Bon Appétit, many blogs). Sites that block apps, or that don't publish that data (e.g. Instagram), fall back to the page's name, photo and link so you can finish the card by hand. `api/image.js` passes a web photo through so it can be drawn into a shared picture. Both only reach public web addresses (`api/_lib/safeFetch.js`). `npm run dev` serves the same code through `vite.config.ts`.
- `src/components/Rolodex.tsx` is the front-on card file (scroll, arrow keys, knobs, A–Z tabs).
- `src/components/Letter.tsx` is the recipe card as a torn, lined letter with a star rating, review and photo.
- `src/components/Stickers.tsx` holds the gold-foil stars, gingham bow, embroidered heart seal and googly eyes, all drawn in SVG.

### Moving cards from the old server

Before this version, cards lived in `data/recipes.json` behind an Express server. The first time a browser opens `npm run dev`, it copies those cards and settings in (read-only). Once they show up, export a `.json` backup; `data/` can then be deleted.
