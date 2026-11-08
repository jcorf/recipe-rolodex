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
  rule-blue: "#cdd9e8"
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
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
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
  ruled-line: "1.7rem"
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

A worn, well-loved box of handwritten cards on a quiet desk. Every surface is something you could hold: cotton-rag index cards with torn (deckled) edges, pastel divider stock, a torn sheet of college-ruled letter paper tucked into a kraft envelope. Every line is drawn by a pen held in a hand: borders wobble, header lines drift, corners overshoot, stars are lopsided, and a count is circled rather than badged. Nothing is machine-perfect, and no two cards are alike.

The feel is **handmade and tactile**. Delight comes from the craft (the grain, the ink, a cherry beside the title) rather than from interface chrome. The page around the box stays calm: an off-white desk with a soft warm light that drifts toward the cursor. Density on a card is tight, like a real index card someone filled edge to edge, and the card in front grows to show the whole recipe instead of truncating it.

The interface is for one person browsing at home, often zoomed in. It must stay fully usable at large browser zoom: nothing cut off, nothing covered.

**Key Characteristics:**
- Cotton-paper cards with deckled edges, a per-card grain (one of six, rotated and at its own strength) and a hand-inked border.
- Two handwriting voices: La Belle Aurore for anything that names or labels, Zeyada for the recipe itself (lowercase). Figtree, light, for the app's own controls.
- Pastel divider cards per meal (breakfast → small plates → drinks → lunch → dinner → dessert), with a KR Fruitsy fruit beside each name.
- A front-facing rolodex: cards behind fan upward with their tabs showing, and the front card flips forward to reveal the next.
- Dark grey pen ink, never pure black.

## Colors

A warm off-white desk, cotton-white cards, pastel divider stock and dark grey pen ink, with kraft and a single red enamel kept for the tags and the letter's craft details.

### Primary
- **Grandma's Pen** (ink): every word and every drawn line: titles, borders, stars, rules, circles. It's a dark grey, not black, so handwriting reads as ink on cotton.
- **Faded Pen** (ink-soft): secondary writing: time · serves · cuisine, ingredient amounts, step numbers, placeholder text on the desk.
- **Pencil** (pencil): empty states and form placeholders on paper ("none written down yet").

### Secondary
- **Divider Pastels** (divider-breakfast butter, divider-small-plates peach, divider-drinks sky, divider-lunch sage, divider-dinner lavender, divider-dessert blush, divider-unsorted stone): the stock of each meal's divider card and its tab. These are owner-editable in settings (`data/settings.json`); the frontmatter holds the defaults.

### Tertiary
- **Kraft** (kraft, kraft-light, kraft-deep): gift-tag buttons, the envelope, and its back.
- **Red Enamel** (enamel, enamel-deep): the primary tag button ("make a card", "file it in the rolodex"), focus rings, the gingham bow and the heart seal. Destructive confirmation uses enamel-deep.

### Neutral
- **Desk** (desk): the page itself.
- **Cotton** (cotton): recipe card stock, under a multiplied grain layer.
- **Letter Paper** (letter-paper): the open recipe letter and the link input strip.
- **Ruled Blue** (rule-blue): college-ruled lines on the letter only.
- **Warm Glow / Sage Glow** (glow-warm, glow-sage): the two soft lights in the desk background; warm follows the cursor, sage drifts opposite.
- **Sticky Note** (sticky-note): the yellow note on the letter that says what an import found.
- **Selection Blush** (selection-blush): highlighted text.

### Named Rules
**The Pen-Not-Printer Rule.** Text and drawn lines use the ink greys. Pure black (#000) never appears; neither does a saturated colour on text.

**The Pastel-Only-for-Meals Rule.** Divider pastels mark a meal and nothing else. Recipe cards stay cotton white so the dividers read as section breaks.

**The One Red Rule.** Red enamel is reserved for the single primary action on screen, focus, and the letter's craft stickers. Never a second red button.

## Typography

**Display / Naming Font:** La Belle Aurore (cursive)
**Recipe Hand:** Zeyada (cursive), always lowercase
**Interface Font:** Figtree (system-ui fallback), light 300 for text, 500 for button labels
**Ornament Font:** KR Fruitsy (Kat's Fun Fonts, freeware for non-commercial use), a fruit dingbat face, self-hosted at `public/fonts/kr-fruitsy.ttf`

**Character:** Two people's handwriting share the box. La Belle Aurore is the neat, slanted hand that names things; Zeyada is the quicker hand that wrote the recipe down. Figtree is the quiet printed voice of the app's own controls, and stays out of the cards.

### Hierarchy
- **Display** (400, clamp(2rem, 3.6vw, 2.75rem), 1): the "my recipes" wordmark, centred with the cherry fruit, tilted −2°.
- **Headline** (400, 17% of card height, 1.5): a divider's meal name, centred, with its fruit.
- **Title** (400, clamp(1.2rem, 3.4vw, 1.5rem), 1.5): a recipe card's name, always lowercase (on the card and in the letter's "dear …,"); it wraps rather than truncates, with room below for deep descenders (0.25em). The stored title keeps its original case; lowercase is a display rule.
- **Meta** (400, 0.85rem, 1.6): "20 min · serves 2 · korean" in La Belle Aurore; each part optional.
- **Handwriting** (400, 1.25rem on cards / 1.65rem in the letter, 1.1): ingredients and directions, lowercase, tight.
- **Body** (300, 1rem, 1.35, −0.005em): inputs, notices, the letter's review note.
- **Label** (500, 0.9rem): tag button labels.
- **Fruit** (KR Fruitsy, 1.15em of the divider name and sitting on its baseline, tilted −6°; 1.3em beside the wordmark): one fruit beside the wordmark (cherries, `h`) and beside each divider name (strawberry, grapes, citrus slice, pear, persimmon, pineapple, apple core). Each letter is a fruit; the map lives in `DIVIDER_FRUIT`.

### Named Rules
**The Two Hands Rule.** La Belle Aurore names (title, meta, section headings, tabs, counts); Zeyada writes the recipe (ingredients, directions). Never swap them, and never set recipe content in Figtree.

**The Descender Rule.** Any La Belle Aurore line keeps at least 0.25em below it and is never clipped to one line; its g, y and j hang deep.

## Layout

A single centred column on the desk: the wordmark, then the link strip ("paste a recipe link…", make a card, write one by hand), then find, then the rolodex. Page gutters are clamp(1rem, 4vw, 3rem).

The rolodex stage is the card width (min(38rem, 88vw)) plus 6rem, viewed front-on in 3D (perspective 1500px). Up to six cards fan out behind the front one, each 1.05rem higher and slightly tilted back, so their tabs stay visible and clickable. The front card is anchored at its top and grows downward to its full content; the cards behind keep the base height (62% of width on desktop, 110% on narrow screens) and clip with a soft fade.

On a card: header (title; meta with the stars to its right), a drawn rule, then two columns, ingredients (0.8fr) and directions (1.2fr), with a 1.2rem gap. Below 40rem the columns stack. The open letter is college ruled at 1.7rem.

## Elevation & Depth

Depth is physical, not interface depth: paper sits on a desk and casts a soft shadow, and the fan of cards recedes in 3D. Shadows are always offset and blurred, never zero-offset halos.

### Shadow Vocabulary
- **Card at rest** (`drop-shadow(0 1px 1px rgb(60 55 50 / 0.18)) drop-shadow(0 8px 14px rgb(60 55 50 / 0.14))`): any card behind the front.
- **Front card** (`drop-shadow(0 1px 1px rgb(60 55 50 / 0.2)) drop-shadow(0 14px 24px rgb(60 55 50 / 0.2))`): the card being read.
- **Tag** (`0 1px 1px rgb(70 50 30 / 0.25), 0 3px 8px rgb(70 50 30 / 0.15)`): buttons, lifting on hover.
- **Letter** (`drop-shadow(0 2px 2px rgb(50 35 25 / 0.18)) drop-shadow(0 12px 22px rgb(50 35 25 / 0.2))`): the open letter.

### Named Rules
**The Paper-Shadow Rule.** Shadows follow the paper's torn silhouette (drop-shadow on the masked card), never a rectangle around it.

## Shapes

Edges are torn, not rounded. Cards and their tabs use a deckled mask (irregular, slightly nibbled edges); the letter has a torn top edge. Corners are whatever the tear makes them. The only regular radii belong to the desk controls: the link strip (2px) and gift-tag buttons (3px on the punched end, 8px on the free end).

Drawn shapes come from a pen: the border wobbles along each side and its corners overshoot; one or two sides get a fainter second pass; the header rule drifts and sometimes flicks up at its end; stars are uneven five-point shapes that each lean and size differently; counts sit in a loop that runs a little past where it started. Each card picks its own border, rule, stars, tab outline, grain, grain angle and grain strength from a hash of its id, so it always looks the same and never like its neighbour.

## Components

### Buttons (gift tags)
- **Character:** kraft gift tags with a punched hole, lifted off the desk.
- **Shape:** tag radius (3px 8px 8px 3px), with a 0.42rem punched hole 0.6rem from the left.
- **Primary:** red enamel with warm white text: "make a card", "file it in the rolodex", "save card".
- **Secondary:** kraft-light with ink text: "write one by hand", "tuck it back", "edit card".
- **Quiet:** no fill, underlined, faded pen ("tear up card").
- **Hover / Focus:** lifts 1px and tilts −1.5° with a deeper shadow; focus is a 2px dashed enamel outline.

### Inputs / Fields
- **Link strip:** a strip of letter paper (2px radius), tilted −0.6°, with a paper shadow.
- **Find:** borderless, with a 1px faded-pen underline that turns enamel on focus.
- **On the letter:** transparent fields with a dashed pencil underline (single line) or a dashed outline on hover (multi-line); focus is dashed enamel.

### Index Card (signature)
- **Stock:** cotton with a multiplied grain layer; deckled edge; hand-inked border inset ~0.3rem; padding 1.45rem 2.2rem 1.25rem.
- **Header:** title in La Belle Aurore; meta below it; drawn stars to the right of the meta line, or of the title if there's no meta. A wobbly drawn rule closes the header.
- **Body:** ingredients (amount in faded pen | name) and numbered directions in Zeyada, lowercase, tightly set with no row lines.
- **Tab:** a small blank tab with a deckled top and its own pen outline, tucked into the card so there's no gap at the seam.
- **Behaviour:** click the front card to open the letter; click a card behind to bring it forward; scroll, arrow keys, Home/End flip.

### Divider Card (signature)
- **Stock:** the meal's pastel, same grain, deckle and pen border as recipe cards.
- **Face:** the meal name centred in La Belle Aurore with its KR Fruitsy fruit; the recipe count circled in pen at the top right.
- **Tab:** wider, with the meal name in La Belle Aurore; tabs step left to right in menu order.

### The Letter (signature)
- **Character:** the full recipe as a love letter: "dear gochujang butter noodles," on torn, college-ruled paper, sliding up out of a kraft envelope sealed with an embroidered heart.
- **Stickers:** googly eyes that follow the cursor, a polaroid of the dish with a gingham bow, the heart seal.
- **Rating:** drawn stars beside the salutation; click to rate, click again to clear.

## Do's and Don'ts

### Do:
- **Do** draw every line as pen: wobble, overshoot, vary it per card (generate new variants with `npm run ink`).
- **Do** keep cards cotton white and let pastels mean "meal" (divider-*), editable in settings.
- **Do** let the front card grow to show the whole recipe instead of truncating it.
- **Do** keep La Belle Aurore lines unclipped with 0.25em below for descenders.
- **Do** write every recipe title in lowercase.
- **Do** use dark grey ink (ink #3d3c40) for all text and drawn lines.
- **Do** give every new card-like surface a deckled edge, cotton grain and a pen border.

### Don't:
- **Don't** use straight CSS borders, border-radius rounding, or perfect geometric shapes on paper surfaces.
- **Don't** set recipe content in Figtree or a printed face; Figtree is only for the app's controls.
- **Don't** use pure black, saturated text colours, or a second red primary action.
- **Don't** add icon fonts or emoji; ornament comes from the drawn ink, the stickers and the KR Fruitsy fruit.
- **Don't** reuse one border, rule or grain for every card; sameness breaks the handmade illusion.
- **Don't** add usage hints or instructions on the desk; the rolodex should explain itself.
