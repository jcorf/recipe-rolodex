import { useId, useState } from 'react';
import { scallopPath, zigzagPath } from '../scallop';
import { stampGrainUrl } from '../stampGrain';
import { PATHS } from './PenIcons';
import type { StampFinish } from '../types';
import { usePhotoSrc } from '../usePhoto';

/**
 * A postage stamp cut from a recipe's photo: scalloped paper edge, the picture inset with a pen
 * line around it, and a few wavy cancel lines across one corner. With no photo (or one that won't
 * load) it's the meal's pastel with its fruit, so every cooked day still gets a stamp.
 */
export const STAMP_W = 72;
export const STAMP_H = 88;
export const STAMP_PAPER = '#fffefa';
export const STAMP_INSET = 7;
/** How much paper shows through a "faded" stamp: a slight veil over the picture. */
export const STAMP_VEIL = 0.3;

const OUTLINE = scallopPath(STAMP_W, STAMP_H, 4.6);
/** A meal eaten out is cut with pinking shears instead of perforated. */
export const ZIGZAG_OUTLINE = zigzagPath(STAMP_W, STAMP_H, 3.6);
/** The pen line around the picture: a little uneven on every side. */
export const STAMP_PEN =
  'M7.4 7.3 Q22 6.5 36 6.9 Q50 7.3 64.7 7.2 Q65.5 30 64.9 44 Q64.3 62 65 80.8 Q50 81.6 36 81.1 Q22 80.6 7.2 80.9 Q6.6 62 7.1 44 Q7.6 30 7.4 7.3Z';
/** Cancel lines: wavy strokes running up across the lower-right corner. */
export const STAMP_CANCEL = 'M38 76c6-3 11 3 17 0s9 1 14-1 M36 69.5c6-3 11 3 17 0s9 1 16-1.5 M40 82.5c5-2.5 10 2.5 15 0s9 .5 14-1.5';

export function Stamp({
  image: link, photo, fill, fruit, label, finish = 'plain', zigzag = false, ateOut = false, className = '',
}: { image?: string; photo?: string; fill: string; fruit: string; label: string; finish?: StampFinish; zigzag?: boolean; ateOut?: boolean; className?: string }) {
  const id = useId();
  const image = usePhotoSrc({ photo, image: link }, 'thumb');
  const [broken, setBroken] = useState(false);
  const showImage = !!image && !broken;
  const inner = STAMP_W - STAMP_INSET * 2;
  const innerH = STAMP_H - STAMP_INSET * 2;
  return (
    <svg className={`stamp ${className}`} viewBox={`0 0 ${STAMP_W} ${STAMP_H}`} role="img" aria-label={label}>
      <defs>
        <clipPath id={`${id}c`}>
          <rect x={STAMP_INSET} y={STAMP_INSET} width={inner} height={innerH} />
        </clipPath>
      </defs>
      <path d={zigzag ? ZIGZAG_OUTLINE : OUTLINE} fill={STAMP_PAPER} />
      {showImage ? (
        <image
          href={image}
          x={STAMP_INSET} y={STAMP_INSET} width={inner} height={innerH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${id}c)`}
          onError={() => setBroken(true)}
        />
      ) : (
        <>
          <rect x={STAMP_INSET} y={STAMP_INSET} width={inner} height={innerH} fill={fill} />
          {ateOut ? (
            // a meal eaten out with no photo: a fork, drawn in pen
            <path d={PATHS.fork} transform={`translate(${STAMP_W / 2 - 19} ${STAMP_H / 2 - 17}) scale(1.6)`} fill="none" stroke="#3d3c40" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <text x={STAMP_W / 2} y={STAMP_H / 2 + 14} textAnchor="middle" fontSize="44" fill="#3d3c40" style={{ fontFamily: "'KR Fruitsy'" }}>
              {fruit}
            </text>
          )}
        </>
      )}
      {finish === 'faded' && (
        <rect x={STAMP_INSET} y={STAMP_INSET} width={inner} height={innerH} fill={STAMP_PAPER} opacity={STAMP_VEIL} />
      )}
      {finish === 'grainy' && (
        <image
          href={stampGrainUrl()}
          x={STAMP_INSET} y={STAMP_INSET} width={inner} height={innerH}
          preserveAspectRatio="none"
          clipPath={`url(#${id}c)`}
        />
      )}
      <path d={STAMP_PEN} fill="none" stroke="#3d3c40" strokeWidth="0.9" strokeLinejoin="round" opacity="0.75" />
      <path d={STAMP_CANCEL} fill="none" stroke="#3d3c40" strokeWidth="1" strokeLinecap="round" opacity="0.32" clipPath={`url(#${id}c)`} />
    </svg>
  );
}
