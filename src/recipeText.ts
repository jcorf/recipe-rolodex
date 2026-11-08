const AMOUNT =
  /^((?:[\d½¼¾⅓⅔⅛]+(?:[\s/.–-]+[\d½¼¾⅓⅔⅛]+)*)\s*(?:(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|cloves?|cans?|sticks?|pinch(?:es)?)\b\.?)?)\s+(.+)$/i;

/** "1 1/4 cups bread flour" → ["1 1/4 cups", "bread flour"]: the amount gets its own column on a card. */
export function splitAmount(line: string): [string, string] {
  const m = AMOUNT.exec(line.trim());
  return m ? [m[1].trim(), m[2]] : ['', line];
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
