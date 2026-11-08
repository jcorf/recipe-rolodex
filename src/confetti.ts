// A small handful of paper confetti, thrown up from a point on the page and left to fall: for a five-star
// rating. Plain elements and the Web Animations API, no library; nothing at all when motion is turned down.

const COLOURS = ['#b5303a', '#dcc196', '#cfae7e', '#f2c6c2', '#cfe0c3', '#f3e1a6', '#c9d9ec'];
const PIECES = 26;

export function confetti(x: number, y: number) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const done: Promise<unknown>[] = [];
  for (let i = 0; i < PIECES; i++) {
    const bit = document.createElement('span');
    const w = 5 + Math.random() * 4;
    bit.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w * (0.45 + Math.random() * 0.5)}px;background:${COLOURS[i % COLOURS.length]};${Math.random() < 0.3 ? 'border-radius:50%;' : ''}`;
    layer.appendChild(bit);
    // up and out in a fan, then down past where it started, turning as it goes
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const reach = 50 + Math.random() * 70;
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach;
    const spin = (Math.random() - 0.5) * 900;
    const anim = bit.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(calc(-50% + ${dx * 1.4}px), calc(-50% + ${dy + 110 + Math.random() * 60}px)) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' },
    );
    done.push(anim.finished.catch(() => {}));
  }
  Promise.all(done).then(() => layer.remove());
}
