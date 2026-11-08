# Recipe Rolodex

A personal, self-hosted recipe journal. Flip through recipes on a desk rolodex; open one and it slides out of its envelope as a handwritten letter.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173 (API on :5174)
```

For a single-process build: `npm run build && npm start` → http://localhost:5174

## Where things live

- `data/recipes.json` holds your recipes, so back it up or copy it like any file. It is created from `server/seed.json` (six sample cards) on first run and is git-ignored.
- `server/importer.js` handles "make a card" from a link. It reads the schema.org recipe data most recipe sites embed (NYT Cooking, Bon Appétit, many blogs). Sites that block apps, or that don't publish that data (e.g. Instagram), fall back to the page's name, photo and link so you can finish the card by hand.
- `src/components/Rolodex.tsx` is the front-on card file (scroll, arrow keys, knobs, A–Z tabs).
- `src/components/Letter.tsx` is the recipe card as a torn, lined letter with a star rating and review.
- `src/components/Stickers.tsx` holds the gold-foil stars, gingham bow, embroidered heart seal and googly eyes, all drawn in SVG.
