---
name: My Recipes
description: A personal recipe box of handmade cotton cards, written in pen and filed by meal.
colors:
  ink: "#3d3c40"
  ink-soft: "#6f6d70"
  pencil: "#a39d96"
  desk: "#f5f3ee"
  cotton: "#f6f5f1"
  letter-paper: "#fffefa"
  glow-warm: "#f7d7c7"
  glow-sage: "#dae4d2"
  divider-breakfast: "#f6e7b0"
  divider-small-plates: "#f5d6c4"
  divider-drinks: "#cfe3ef"
  divider-lunch: "#d7e8cd"
  divider-dinner: "#ded5ec"
  divider-dessert: "#f4d2de"
  divider-unsorted: "#e4e2dd"
  kraft: "#cfae7e"
  kraft-light: "#dcc196"
  kraft-deep: "#a5845a"
  enamel: "#b5303a"
  enamel-deep: "#8a1f28"
  sticky-note: "#fcefb4"
  selection-blush: "#f2c3c0"
typography:
  display:
    fontFamily: "La Belle Aurore, cursive"
    fontSize: "clamp(2rem, 3.6vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "La Belle Aurore, cursive"
    fontSize: "calc(var(--card-h) * 0.17)"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "La Belle Aurore, cursive"
    fontSize: "clamp(1.2rem, 3.4vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "La Belle Aurore, cursive"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.6
  handwriting:
    fontFamily: "Zeyada, cursive"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Mukta Malar, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Mukta Malar, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.35
  fruit:
    fontFamily: "KR Fruitsy"
    fontSize: "1.15em"
    fontWeight: 400
    lineHeight: 1
rounded:
  input: "2px"
  tag: "3px 8px 8px 3px"
spacing:
  card-pad-y: "1.45rem"
  card-pad-x: "2.2rem"
  gutter: "clamp(1rem, 4vw, 3rem)"
components:
  button-primary:
    backgroundColor: "{colors.enamel}"
    textColor: "#fff4ea"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0.5rem 0.95rem 0.5rem 1.55rem"
  button-secondary:
    backgroundColor: "{colors.kraft-light}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0.5rem 0.95rem 0.5rem 1.55rem"
  input-link:
    backgroundColor: "{colors.letter-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "0.65rem 0.9rem"
  input-find:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0.3rem 0.1rem"
  index-card:
    backgroundColor: "{colors.cotton}"
    textColor: "{colors.ink}"
    padding: "1.45rem 2.2rem 1.25rem"
    width: "min(38rem, 88vw)"
  divider-card:
    backgroundColor: "{colors.divider-lunch}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
---

# Design System: My Recipes

## Overview

**Creative North Star: "Grandma's Recipe Box"**

A worn, well-loved box of handwritten cards on a quiet desk. Every surface is something you could hold: cotton-rag index cards with torn (deckled) edges, pastel divider stock, and the card you pull out to read, standing in a die-cut cardboard holder. Every line is drawn by a pen held in a hand: borders wobble, header lines drift, corners overshoot, stars are lopsided, and a count is circled rather than badged. Nothing is machine-perfect, and no two cards are alike.

The feel is **handmade and tactile**. Delight comes from the craft (the grain, the ink, a cherry beside the title) rather than from interface chrome. The page around the box stays calm: an off-white desk with a soft warm light that drifts toward the cursor. Density on a card is tight, like a real index card someone filled edge to edge, and the card in front grows to show the whole recipe instead of truncating it.

The interface is for one person browsing at home, often zoomed in. It must stay fully usable at large browser zoom: nothing cut off, nothing covered.

**Key Characteristics:**
- Cotton-paper cards with deckled edges, a per-card grain (one of six, rotated and at its own strength) and a hand-inked border.
- Two handwriting voices: La Belle Aurore for anything that names or labels, Zeyada for the recipe itself (lowercase). Mukta Malar, light, for the app's own controls.
- Pastel divider cards per meal (breakfast → appetizers → drinks → lunch → dinner → dessert), with a KR Fruitsy fruit beside each name.
- A front-facing rolodex: cards behind fan upward with their tabs showing, and the front card flips forward to reveal the next.
- Dark grey pen ink, never pure black.

## Colors

A warm off-white desk, cotton-white cards, pastel divider stock and dark grey pen ink, with kraft and a single red enamel kept for the tags and the open card's craft details.

### Primary
- **Grandma's Pen** (ink): every word and every drawn line: titles, borders, stars, rules, circles. It's a dark grey, not black, so handwriting reads as ink on cotton.
- **Faded Pen** (ink-soft): secondary writing: time · serves · cuisine, ingredient amounts, step numbers, placeholder text on the desk.
- **Pencil** (pencil): empty states and form placeholders on paper ("none written down yet").

### Secondary
- **Divider Pastels** (divider-breakfast butter, divider-small-plates peach, divider-drinks sky, divider-lunch sage, divider-dinner lavender, divider-dessert blush, divider-unsorted stone): the stock of each meal's divider card and its tab. These are owner-editable in settings (`data/settings.json`); the frontmatter holds the defaults.

### Tertiary
- **Kraft** (kraft, kraft-light, kraft-deep): the action tags and the cardboard card holder.
- **Red Enamel** (enamel, enamel-deep): the primary tag button ("make a card", "file it in the rolodex"), focus rings, the gingham bow and the heart seal. Destructive confirmation uses enamel-deep.

### Neutral
- **Desk** (desk): the page itself.
- **Cotton** (cotton): recipe card stock, under a multiplied grain layer.
- **Letter Paper** (letter-paper): tag labels and the fruit picker's highlight.
- **Warm Glow / Sage Glow** (glow-warm, glow-sage): the two soft lights in the desk background; warm follows the cursor, sage drifts opposite.
- **Sticky Note** (sticky-note): the yellow note on the open card that says what an import found.
- **Selection Blush** (selection-blush): highlighted text.

### Named Rules
**The Pen-Not-Printer Rule.** Text and drawn lines use the ink greys. Pure black (#000) never appears; neither does a saturated colour on text.

**The Pastel-Only-for-Meals Rule.** Divider pastels mark a meal and nothing else. Recipe cards stay cotton white so the dividers read as section breaks.

**The One Red Rule.** Red enamel is reserved for the single primary action on screen, focus, and the open card's craft stickers (gingham bow, heart patch). Never a second red button.

## Typography

**Display / Naming Font:** La Belle Aurore (cursive)
**Recipe Hand:** Zeyada (cursive), always lowercase. Settings can switch it to Caveat ("casual script", a larger, rounder hand) or to printed Mukta Malar
**Interface Font:** Mukta Malar (system-ui fallback), light 300 for text, 500 for button labels
**Ornament Font:** KR Fruitsy (Kat's Fun Fonts, freeware for non-commercial use), a fruit dingbat face, self-hosted at `public/fonts/kr-fruitsy.ttf`

**Character:** Two people's handwriting share the box. La Belle Aurore is the neat, slanted hand that names things; Zeyada is the quicker hand that wrote the recipe down. Mukta Malar is the quiet printed voice of the app's own controls, and stays out of the cards.

### Hierarchy
- **Display** (400, clamp(2rem, 3.6vw, 2.75rem), 1): the "my recipes" wordmark, centred with the cherry fruit, tilted −2°. The name is the owner's to change: click it and it becomes a line to write on (Enter keeps it, Escape puts the old one back); saved as `siteTitle`.
- **Headline** (400, 17% of card height, 1.5): a divider's meal name, centred, with its fruit.
- **Title** (400, clamp(1.2rem, 3.4vw, 1.5rem), 1.5): a recipe card's name, always lowercase (on the rolodex card and the open card; never prefixed with "dear"); it wraps rather than truncates, with room below for deep descenders (0.25em). The stored title keeps its original case; lowercase is a display rule.
- **Meta** (400, 0.85rem, 1.6): "20 min · serves 2 · korean" in La Belle Aurore; each part optional.
- **Handwriting** (400, 1.25rem on rolodex cards / 1.45rem on the open card, 1.1–1.2): ingredients, directions and the review note, lowercase, tight. Edit fields use the same hand.
- **Body** (300, 1rem, 1.35, −0.005em): desk inputs, edit-field labels, notices.
- **Label** (500, 0.9rem): tag button labels.
- **Fruit** (KR Fruitsy, 1.15em of the divider name and sitting on its baseline, tilted −6°; 1.3em beside the wordmark): one fruit beside the wordmark (cherries, `h`) and beside each divider name (strawberry, grapes, citrus slice, pear, persimmon, pineapple, apple core). Each letter is a fruit; the map lives in `DIVIDER_FRUIT`.

### Named Rules
**The Two Hands Rule.** La Belle Aurore names (title, meta, section headings, tabs, counts); Zeyada writes the recipe (ingredients, directions). Never swap them, and never set recipe content in Mukta Malar.

**The Descender Rule.** Any La Belle Aurore line keeps at least 0.25em below it and is never clipped to one line; its g, y and j hang deep.

## Layout

The wordmark (with its fruit) alone in the header; below it one row on the desk: the blank-card stack, the rolodex, the find slip. Page gutters are clamp(1rem, 4vw, 3rem).

The rolodex stage is the card width (min(38rem, 88vw)) plus 6rem, viewed front-on in 3D (perspective 1500px). Up to six cards fan out behind the front one, each 1.05rem higher and slightly tilted back, so their tabs stay visible and clickable. The front card is anchored at its top and grows downward to its full content; the cards behind keep the base height (62% of width on desktop, 110% on narrow screens) and clip with a soft fade.

On a card: header (title; meta with the stars to its right), a drawn rule, then two columns, ingredients (0.8fr) and directions (1.2fr), with a 1.2rem gap. Below 40rem the columns stack.

The open card is the same layout enlarged (max 46rem) and unruled: title, then stars, then the details line, the note, a drawn rule, the two columns, and the "xo, from …" sign-off. Its photo is a mini polaroid beside the title so it never adds height. Its actions float in a column of tags just right of the card, vertically centred in the window; below 70rem (narrow windows, high zoom) they become a row pinned to the bottom, and the page gains bottom padding so nothing hides behind them.

## Elevation & Depth

Depth is physical, not interface depth: paper sits on a desk and casts a soft shadow, and the fan of cards recedes in 3D. Shadows are always offset and blurred, never zero-offset halos.

### Shadow Vocabulary
- **Card at rest** (`0 1px 2px rgb(60 55 50 / 0.2), 0 8px 14px rgb(60 55 50 / 0.15)`): any card behind the front.
- **Front card** (`0 2px 3px rgb(60 55 50 / 0.2), 0 16px 26px rgb(60 55 50 / 0.2)`): the card being read.
- **Tag** (`0 1px 1px rgb(70 50 30 / 0.25), 0 3px 8px rgb(70 50 30 / 0.15)`): buttons, lifting on hover.
- **Open card** (`0 2px 3px rgb(60 55 50 / 0.2), 0 18px 32px rgb(60 55 50 / 0.22)`): the card pulled out to read.
- **Card holder** (`drop-shadow(0 -1px 2px rgb(60 40 20 / 0.2)) drop-shadow(0 10px 18px rgb(60 40 20 / 0.22))`): the cardboard front; acceptable because the desk light pauses while a card is open.

### Named Rules
**The Paper-Shadow Rule.** A card's shadow is a soft box-shadow tucked just inside its torn edge (inset ~0.3rem), so the deckle overhangs it and no hard rectangle shows. Never put `filter: drop-shadow` on the rolodex cards: it re-renders on every frame the desk light moves (it halved the frame rate).

## Shapes

Edges are torn, not rounded. Cards and their tabs use a deckled mask (irregular, slightly nibbled edges); the cardboard holder is die-cut with a half-moon finger notch and slightly rough edges. Corners are whatever the tear makes them. The only regular radii belong to the small kraft action tags (8px 8px 6px 6px).

Drawn shapes come from a pen: the border wobbles along each side and its corners overshoot; one or two sides get a fainter second pass; the header rule drifts and sometimes flicks up at its end; stars are uneven five-point shapes that each lean and size differently; counts sit in a loop that runs a little past where it started. Each card picks its own border, rule, stars, tab outline, grain, grain angle and grain strength from a hash of its id, so it always looks the same and never like its neighbour.

## Components

### Buttons (action tags)
- **Character:** small kraft tags with a punched hole and a pen-drawn symbol (`PenIcon`); used for the open card's actions. There are no text buttons on the desk.
- **Primary:** red enamel (save). **Danger:** deep enamel (confirm tear up). **Quiet:** pale paper, no shadow (tear up).
- **Hover / Focus:** lifts and tilts −3° with a deeper shadow, and the tag names itself on a paper label. No coloured focus ring.

### Desk Objects (add and find)
- **Blank card stack** (left of the rolodex): three blank cotton cards, fanned and tilted −5°, "new card" written on top. Hover/focus lifts the top card. Clicking pulls it out as a new open card whose first line reads "paste a link, or write a name…": a pasted link (anything starting `http`) fills the card from the page ("fetching…" in pen while it works; a failure leaves a sticky note and keeps the link as the original recipe); a name starts a card written by hand.
- **Find slip** (right of the rolodex): a cotton slip tilted 3°, "find…" in La Belle Aurore on a drawn line; what you type is Zeyada, lowercase, and filters the rolodex live (name, meal, cuisine, ingredient). A pen × clears it. **/** jumps to it from anywhere on the desk.
- **Narrow windows / zoom (below 72rem):** both sit side by side above the rolodex, smaller.

### Inputs / Fields
- **On the open card:** transparent fields with a dashed pencil underline (single line) or a dashed outline on hover (multi-line); focus turns the underline solid ink.

### Index Card (signature)
- **Stock:** cotton with a multiplied grain layer; deckled edge; hand-inked border inset ~0.3rem; padding 1.45rem 2.2rem 1.25rem.
- **Header:** title in La Belle Aurore; meta below it; drawn stars to the right of the meta line, or of the title if there's no meta. A wobbly drawn rule closes the header.
- **Body:** ingredients (amount in faded pen | name) and numbered directions in Zeyada, lowercase, tightly set with no row lines.
- **Tab:** a small blank tab with a deckled top and its own pen outline, tucked into the card so there's no gap at the seam.
- **Behaviour:** click the front card to open it; click a card behind to bring it forward; scroll, or the arrow keys and Home/End from anywhere on the desk (no click needed first) flip. The front card's stars rate it in place, halves included, with a hover preview.

### Divider Card (signature)
- **Stock:** the meal's pastel, same grain, deckle and pen border as recipe cards.
- **Face:** the meal name centred in La Belle Aurore with its KR Fruitsy fruit; the recipe count circled in pen at the top right.
- **Tab:** wider, with the meal name in La Belle Aurore; tabs step left to right in menu order.

### The Open Card (signature)
- **Character:** the rolodex card pulled out of the box and enlarged: same cotton stock, grain, deckle, pen border and drawn rule, standing in a cardboard index-card holder. It slides up out of the holder when opened.
- **Header:** lowercase title (no "dear"), hand-drawn stars beneath it (the rolodex's front card rates the same way, with a hover preview) (half stars allowed: each star's left half sets n − ½, its right half n; click the same value again to clear), then time · serves · cuisine, then the note in the recipe hand.
- **Photo:** a mini polaroid (5.5rem) with a small gingham bow, tilted beside the title; while editing with no photo it reads "add a photo" and jumps to the photo-link field.
- **Holder:** kraft cardboard with grain, a half-moon finger notch, a pen outline that follows the notch, and the embroidered heart patch on its front.
- **Closing:** click anywhere off the card (or press Esc) to tuck it back; while editing, outside clicks do nothing so changes can't be lost.
- **Actions:** kraft tags with a punched hole and a pen-drawn symbol: pencil (edit), check (save, the one red tag), cross (never mind), torn page (tear up, quiet). Each names itself on hover or focus. Tearing up asks once ("tear it up?" with check / cross) before deleting.

### Cooked Stamps & the Calendar (signature)
- **Marking a dish cooked:** the open card's stamp tag ("I cooked this") opens a small cotton month over the page. Clicking a day stamps this recipe on it; clicking a stamped day lifts the stamp off. Dates are stored on the recipe as `cooked` (YYYY-MM-DD, in the owner's own time zone, never UTC). Surprise me counts a recipe with no stars *and* no cooked days as new.
- **The stamp:** a postage stamp cut from the recipe's photo: a scalloped paper edge (a row of half-circle bites, `scallopPath`), the photo inset with an uneven pen line, and three faint wavy cancel lines across a corner. With no photo it is the meal's pastel with its fruit, so every cooked day still gets one. Each stamp leans by a random angle (up to 8°) that is re-rolled every time the calendar opens or turns a page, so a recipe never leans the same way twice; a shared picture keeps the lean you were looking at. "Grainy stamps" is a pen-circled option written beneath the month on the calendar page (not in the jar): it wears the print with paper-coloured speckles in uneven patches and a few ink flecks.
- **The spoon:** a kraft tag with a pen-drawn spoon, laid at the desk's top-right corner, opens the calendar (its label, "what I cooked", opens to the left).
- **The calendar page:** the open card's cotton sheet at the same width: month name in La Belle Aurore with the year in the recipe hand, "n dishes cooked" beneath, a drawn rule, weekday initials, then hand-numbered days on dashed pencil rows. Today's number gets a faint pen underline (never a circle, which reads as "selected"). One month at a time: pen chevrons or ← → flip it. Two dishes on a day overlap as two stamps; more show as "+n". Clicking a stamp opens that recipe.

### Shared Pictures
- **What:** a recipe card or a calendar month drawn onto a canvas in the same cotton, grain, torn edge, pen border and handwriting as the page, on the desk with a soft shadow and a small "from my recipe rolodex" signature, at 2× size. Photos from other sites come through the app's own `/api/image` so the picture can be saved.
- **Share sheet:** the picture over the blurred desk with kraft tags to hand it on: share (only where the browser offers a share sheet), copy picture, save picture (.png), close. A taped note says "copied" or "saved". Escape closes the sheet, not the card under it.
- **Link previews** need a public address; while the app runs only on the owner's computer, the picture is what gets shared.

### Pop-up Cards
- **Character:** small cotton cards (deckled, grain, soft drop shadow) that open beside what you clicked; a click elsewhere or Escape closes them.
- **Choice marking:** the current option is circled in pen (`PenCircle`), never highlighted with a fill or colour.
- **Fruit picker:** the fruit beside "my recipes" and the fruit on each divider can be changed: hovering lights a soft round glow behind it; clicking opens every KR Fruitsy fruit in a 6-column grid. The choice is saved in settings (`titleFruit`, `dividerFruits` per divider). The picker opens over the page (a portal), flipping above when there's no room below.

### Jam Jar (settings)
- **Character:** a small watercolour jar of strawberry jam with a gingham cloth lid, set down at the desk's bottom-right corner; it is the way into settings.
- **Rest:** 4.75rem wide, tilted −9°, at 40% opacity so it stays out of the way.
- **Hover / Focus:** fills to full opacity, straightens to −6°, and the lid tips open 45° from its right end (0.55s ease-out).
- **Open (clicked):** the lid stays open and a pop-up card above it offers **sort the box by**: meal (default), stars (5 → 1, then not rated; a half star rounds down, so 4½ files under 4), time (under 30 min, under an hour, under 2 hours, 2 hours +, time unknown), cuisine (A–Z), or a – z (a divider only for letters that have cards, showing just the letter, drawn large). Star sorting shows only the star levels that have cards. Saved in settings (`sortBy`). Non-meal dividers cycle through the meal pastels and fruits; star dividers draw their stars instead of a fruit.
- **More settings on the card:** recipe writing (handwritten = Zeyada, printed = Mukta Malar, for ingredients, directions and notes everywhere); on the desk (show or put away the blank-card stack and the find slip); export (all recipes as one dated .json file). Each open card also has an export tag for that one recipe.
- **Narrow screens / high zoom:** stops floating and sits at the end of the page, so it never covers a card.

## Do's and Don'ts

### Do:
- **Do** draw every line as pen: wobble, overshoot, vary it per card (generate new variants with `npm run ink`).
- **Do** keep cards cotton white and let pastels mean "meal" (divider-*), editable in settings.
- **Do** let the front card grow to show the whole recipe instead of truncating it.
- **Do** make new desk controls objects (a card, a slip, a tag, a jar), never form boxes or text buttons.
- **Do** keep La Belle Aurore lines unclipped with 0.25em below for descenders.
- **Do** write every recipe title in lowercase.
- **Do** use dark grey ink (ink #3d3c40) for all text and drawn lines.
- **Do** give every new card-like surface a deckled edge, cotton grain and a pen border.

### Don't:
- **Don't** use straight CSS borders, border-radius rounding, or perfect geometric shapes on paper surfaces.
- **Don't** set recipe content in Mukta Malar or a printed face; Mukta Malar is only for the app's controls.
- **Don't** use pure black, saturated text colours, or a second red primary action.
- **Don't** add icon fonts or emoji; symbols are pen-drawn SVG (`PenIcon`), and ornament comes from the drawn ink, the stickers and the KR Fruitsy fruit.
- **Don't** reuse one border, rule or grain for every card; sameness breaks the handmade illusion.
- **Don't** add usage hints or instructions on the desk; the rolodex should explain itself.
- **Don't** add coloured focus rings; keyboard focus reuses each control's hover cue (lift, grow, darker underline).
- **Don't** set CSS custom properties on `<html>` from animation frames, or add `mix-blend-mode` / `filter` to the cards: everything under the moving desk light must stay cheap to composite. Grain tiles are ink-on-transparent for this reason.
