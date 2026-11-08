const AMOUNT =
  /^((?:[\d½¼¾⅓⅔⅛]+(?:[\s/.–-]+[\d½¼¾⅓⅔⅛]+)*)\s*(?:(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|cloves?|cans?|sticks?|pinch(?:es)?)\b\.?)?)\s+(.+)$/i;

const UNIT_ABBR: Record<string, string> = {
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tbl: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
  ounce: 'oz', ounces: 'oz', ozs: 'oz',
  pound: 'lb', pounds: 'lb', lbs: 'lb',
  gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg', kgs: 'kg',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml', mls: 'ml',
};
const UNIT_WORDS = new RegExp(`([\\d½¼¾⅓⅔⅛])(\\s*)(${[...Object.keys(UNIT_ABBR), 'tbsp', 'tsp', 'oz', 'lb', 'kg', 'ml'].sort((a, b) => b.length - a.length).join('|')})\\b\\.?`, 'gi');

/** Units are always short: "2 tablespoons butter" → "2 tbsp butter" (only after a number, so "a pound cake" is safe). */
export function abbreviateUnits(line: string) {
  return line.replace(UNIT_WORDS, (_, num: string, _space: string, unit: string) => `${num} ${UNIT_ABBR[unit.toLowerCase()] ?? unit.toLowerCase()}`);
}

/** "1 1/4 cups bread flour" → ["1 1/4 cups", "bread flour"]: the amount gets its own column on a card. */
export function splitAmount(line: string): [string, string] {
  const m = AMOUNT.exec(abbreviateUnits(line).trim());
  return m ? [m[1].trim(), m[2]] : ['', abbreviateUnits(line)];
}

/** 3.5 → "3½ stars", 1 → "1 star", 0 → "not rated". */
export function ratingLabel(rating: number) {
  if (!rating) return 'not rated';
  const whole = Math.floor(rating);
  const text = rating % 1 ? `${whole || ''}½` : `${whole}`;
  return `${text} star${rating === 1 ? '' : 's'}`;
}

/** "Serves 2" stays "serves 2"; "4" becomes "serves 4". */
export function servesLabel(servings?: string) {
  if (!servings) return '';
  return /^serves\b/i.test(servings) ? servings.toLowerCase() : `serves ${servings}`;
}

/** The card numbers its steps itself, so "1. Preheat" shows as "Preheat" (also "2)", "Step 3:"). */
export function stepText(step: string) {
  return step.replace(/^\s*(?:step\s*)?\d+\s*[.):-](?!\d)\s*/i, '');
}
