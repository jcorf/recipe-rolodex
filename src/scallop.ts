/**
 * A round stamp for a meal eaten out: a circle whose edge is bitten away in a ring of small
 * half-circles, like a scalloped seal. Centred on (cx, cy) with outer radius `r`.
 */
export function circleScallopPath(cx: number, cy: number, r: number, bites = 20) {
  const f = (n: number) => +n.toFixed(2);
  const bite = r * Math.sin(Math.PI / bites); // half the gap between neighbouring points
  const at = (i: number) => {
    const a = (i / bites) * Math.PI * 2 - Math.PI / 2;
    return `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  };
  let d = `M${at(0)}`;
  for (let i = 1; i <= bites; i++) d += `A${f(bite)} ${f(bite)} 0 0 0 ${at(i % bites)}`;
  return d + 'Z';
}

/**
 * The outline of a postage stamp: a w × h rectangle whose edges are bitten away in a row of
 * little half-circles, like perforations. Used as an SVG path and, through Path2D, on a canvas,
 * so the stamp looks the same on the page and in a shared picture.
 */
export function scallopPath(w: number, h: number, bite = 5) {
  const nx = Math.max(2, Math.round(w / (bite * 2)));
  const ny = Math.max(2, Math.round(h / (bite * 2)));
  const sx = w / nx;
  const sy = h / ny;
  const f = (n: number) => +n.toFixed(2);
  let d = 'M0 0';
  for (let i = 0; i < nx; i++) d += `A${f(sx / 2)} ${f(sx / 2)} 0 0 0 ${f((i + 1) * sx)} 0`; // top, left → right
  for (let j = 0; j < ny; j++) d += `A${f(sy / 2)} ${f(sy / 2)} 0 0 0 ${f(w)} ${f((j + 1) * sy)}`; // right, down
  for (let i = 0; i < nx; i++) d += `A${f(sx / 2)} ${f(sx / 2)} 0 0 0 ${f(w - (i + 1) * sx)} ${f(h)}`; // bottom, right → left
  for (let j = 0; j < ny; j++) d += `A${f(sy / 2)} ${f(sy / 2)} 0 0 0 0 ${f(h - (j + 1) * sy)}`; // left, up
  return d + 'Z';
}
