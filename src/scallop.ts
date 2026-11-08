/**
 * The zigzag ("pinked") edge of a stamp for a meal eaten out: the same rectangle with its edges cut
 * in a row of small triangles, so it's easy to tell from a perforated, scalloped cooking stamp.
 */
export function zigzagPath(w: number, h: number, tooth = 3.6) {
  const nx = Math.max(3, Math.round(w / (tooth * 2)));
  const ny = Math.max(3, Math.round(h / (tooth * 2)));
  const sx = w / nx;
  const sy = h / ny;
  const f = (n: number) => +n.toFixed(2);
  let d = 'M0 0';
  for (let i = 0; i < nx; i++) d += `L${f((i + 0.5) * sx)} ${tooth}L${f((i + 1) * sx)} 0`;
  for (let j = 0; j < ny; j++) d += `L${f(w - tooth)} ${f((j + 0.5) * sy)}L${f(w)} ${f((j + 1) * sy)}`;
  for (let i = 0; i < nx; i++) d += `L${f(w - (i + 0.5) * sx)} ${f(h - tooth)}L${f(w - (i + 1) * sx)} ${f(h)}`;
  for (let j = 0; j < ny; j++) d += `L${tooth} ${f(h - (j + 0.5) * sy)}L0 ${f(h - (j + 1) * sy)}`;
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
