import { useState } from 'react';
import { ratingLabel } from '../recipeText';
import { Star, starFill } from './Stickers';
import { confetti } from '../confetti';

/**
 * Five hand-drawn stars you can rate with, in halves: each star's left half sets n − ½, its
 * right half n; the same value again clears it. Hovering (or focusing) a half previews it.
 * Giving something all five stars throws a little confetti.
 */
export function StarRating({
  rating, onRate, variant, className = '',
}: { rating: number; onRate: (value: number) => void; variant: number; className?: string }) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? rating;
  return (
    <fieldset
      className={`rating ${className}`}
      onMouseLeave={() => setPreview(null)}
      // ratings live on top of cards that open or flip when clicked
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <legend className="visually-hidden">Your rating: {ratingLabel(rating)}</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="star-cell">
          <Star fill={starFill(shown, n)} variant={variant + n} />
          {[n - 0.5, n].map((value, half) => (
            <button
              key={value}
              type="button"
              className={`star-half ${half ? 'is-right' : 'is-left'}`}
              aria-label={ratingLabel(value)}
              aria-pressed={rating === value}
              onClick={(e) => {
                const next = value === rating ? 0 : value;
                if (next === 5) {
                  const box = e.currentTarget.getBoundingClientRect();
                  confetti(box.left + box.width / 2, box.top + box.height / 2);
                }
                onRate(next);
                setPreview(null);
              }}
              onMouseEnter={() => setPreview(value)}
              onFocus={() => setPreview(value)}
              onBlur={() => setPreview(null)}
            />
          ))}
        </span>
      ))}
    </fieldset>
  );
}
