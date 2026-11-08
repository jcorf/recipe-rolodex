"""Generates hand-drawn pen variants (frames, header rules, stars, count circles) as a TS module."""
import math, random, sys, json

def f(v): return f"{v:.2f}".rstrip('0').rstrip('.')

def smooth(points, start=True):
    d = (f"M{f(points[0][0])} {f(points[0][1])}") if start else ""
    for i in range(1, len(points)):
        (ax, ay), (bx, by) = points[i - 1], points[i]
        d += f" Q{f(ax)} {f(ay)} {f((ax + bx) / 2)} {f((ay + by) / 2)}"
    d += f" L{f(points[-1][0])} {f(points[-1][1])}"
    return d

def side(rng, p0, p1, n, amp, drift):
    (x0, y0), (x1, y1) = p0, p1
    horizontal = abs(x1 - x0) > abs(y1 - y0)
    pts, off = [], 0.0
    for i in range(n + 1):
        t = i / n
        off += rng.uniform(-amp, amp) * 0.9
        off *= 0.78                      # wander, but keep returning
        bow = math.sin(t * math.pi) * drift
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        if horizontal: y += off + bow
        else: x += off + bow
        pts.append((x, y))
    return pts

def curl(rng, cx, cy, size, sx, sy):
    """small cursive entry loop ending at (cx, cy); sx/sy flip it into the right corner"""
    pts = []
    for k in range(7):
        a = math.pi * 0.25 + k * (math.pi * 1.55 / 6)
        r = size * (1 - k * 0.06)
        pts.append((cx + sx * (math.cos(a) * r - size * 0.2), cy + sy * (math.sin(a) * r * 1.4 + size * 0.5)))
    pts.append((cx, cy))
    return pts

def frame(seed):
    rng = random.Random(seed)
    amp = rng.uniform(0.6, 0.95)
    o = lambda: rng.uniform(0.6, 1.6)             # corner overshoot
    i = lambda: rng.uniform(2.2, 3.4)             # inset
    t, r, b, l = i(), 100 - i(), 100 - i(), i()
    sides = [
        side(rng, (l - o(), t), (r + o(), t + rng.uniform(-0.8, 0.8)), 14, amp, rng.uniform(-0.9, 0.9)),
        side(rng, (r, t - o()), (r + rng.uniform(-0.7, 0.7), b + o()), 11, amp, rng.uniform(-0.8, 0.8)),
        side(rng, (r + o(), b), (l - o(), b + rng.uniform(-0.8, 0.8)), 14, amp, rng.uniform(-0.9, 0.9)),
        side(rng, (l, b + o()), (l + rng.uniform(-0.7, 0.7), t - o()), 11, amp, rng.uniform(-0.8, 0.8)),
    ]
    main = " ".join(smooth(s) for s in sides)
    # lighter second pass over one or two partial sides, like going over it twice
    echo = []
    for k in rng.sample(range(4), rng.choice([1, 2])):
        s = sides[k]
        a = rng.randrange(1, len(s) // 2); z = rng.randrange(a + 3, len(s))
        echo.append(smooth([(x + rng.uniform(-0.5, 0.5), y + rng.uniform(-0.6, 0.6)) for x, y in s[a:z]]))
    return {"main": main, "echo": " ".join(echo)}

def rule(seed):
    """wobbly header divider, viewBox 0 0 100 6"""
    rng = random.Random(seed)
    pts, off = [], rng.uniform(-0.6, 0.6)
    n = 12
    for k in range(n + 1):
        off = (off + rng.uniform(-0.9, 0.9)) * 0.65
        pts.append((rng.uniform(-0.6, 0.6) + k * 100 / n, 3 + off + math.sin(k / n * math.pi) * rng.uniform(-0.4, 0.4)))
    pts[0] = (rng.uniform(0, 1.5), pts[0][1]); pts[-1] = (100 - rng.uniform(0, 1.5), pts[-1][1])
    if rng.random() < 0.5:                         # little lift-off flick at the end
        x, y = pts[-1]; pts.append((x + 0.8, y - rng.uniform(0.8, 1.6)))
    return smooth(pts)

def star(seed):
    """hand-drawn five-point star, viewBox 0 0 100 100"""
    rng = random.Random(seed)
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5 + rng.uniform(-0.11, 0.11)
        r = (45 if k % 2 == 0 else 19) * rng.uniform(0.84, 1.12)
        pts.append((50 + math.cos(a) * r, 52 + math.sin(a) * r))
    d = f"M{f(pts[0][0])} {f(pts[0][1])}"
    for k in range(1, 11):
        x, y = pts[k % 10]
        px, py = pts[k - 1]
        cx = (px + x) / 2 + rng.uniform(-2.6, 2.6); cy = (py + y) / 2 + rng.uniform(-2.6, 2.6)
        d += f" Q{f(cx)} {f(cy)} {f(x)} {f(y)}"
    x, y = pts[0]
    return d + f" L{f(x + rng.uniform(1, 3))} {f(y + rng.uniform(1, 3))}"   # pen runs a hair past the start

def circle(seed):
    """pen loop around a number: a little more than one turn, viewBox 0 0 100 100"""
    rng = random.Random(seed)
    turns, steps = rng.uniform(1.08, 1.22), 26
    start = rng.uniform(-2.2, -1.2)
    pts = []
    for k in range(steps + 1):
        a = start + k / steps * turns * 2 * math.pi
        rx = 40 * (1 + 0.05 * math.sin(a * 2 + seed)) + k * 0.12
        ry = 36 * (1 + 0.05 * math.cos(a * 3 + seed)) + k * 0.1
        pts.append((50 + math.cos(a) * rx, 50 + math.sin(a) * ry))
    return smooth(pts)

def tab(seed):
    """pen outline for a card tab, viewBox 0 0 100 100; bottom left open (it tucks into the card)"""
    rng = random.Random(seed)
    j = lambda a: rng.uniform(-a, a)
    l, r, t = 3 + j(1.5), 97 + j(1.5), 6 + j(2.5)
    pts = [(l + j(1.5), 104)]
    pts += [(l + j(1.8), 104 - k * (104 - t - 14) / 3) for k in range(1, 4)]       # left side, upward
    pts += [(l + 4 + j(1.5), t + 3 + j(2)), (l + 12, t + j(1.5))]                    # rounded shoulder
    pts += [(l + 12 + k * (r - l - 24) / 4, t + j(3.2)) for k in range(1, 4)]          # wobbly top
    pts += [(r - 12, t + j(1.5)), (r - 4 + j(1.5), t + 3 + j(2))]                    # shoulder
    pts += [(r + j(1.8), t + 14 + k * (104 - t - 14) / 3) for k in range(0, 4)]       # right side, down
    return smooth(pts)

def holder(seed):
    """cardboard index-card holder front, viewBox 0 0 1000 240, with a half-moon finger notch.
    Returns (mask path for public/holder-mask.svg, pen outline path)."""
    rng = random.Random(seed)
    j = lambda a: rng.uniform(-a, a)
    nl, nr, depth = 410, 590, 64                          # notch from x=410 to 590, 64 deep
    def edge(x0, x1, y, n, amp):
        return [(x0 + (x1 - x0) * k / n, y + j(amp)) for k in range(1, n + 1)]
    top_l = [(0, 4 + j(2))] + edge(0, nl, 4, 10, 1.8)
    top_r = edge(nr, 1000, 4, 10, 1.8)
    right = [(1000 - abs(j(2.5)), 4 + k * 236 / 6) for k in range(1, 7)]
    bottom = [(1000 - k * 1000 / 12, 240 - abs(j(2.5))) for k in range(1, 13)]
    left = [(abs(j(2.5)), 240 - k * 236 / 6) for k in range(1, 6)]
    mask = smooth(top_l) + f" A{(nr - nl) / 2} {depth} 0 0 0 {nr} {f(top_l[-1][1])}" + " " + \
        smooth(top_r + right + bottom + left, start=False) + " Z"
    # pen outline ~10 units inside, wobbling, following the notch
    o = []
    o += [(14 + k * (nl - 24) / 6, 14 + j(1.3)) for k in range(0, 7)]
    line1 = smooth(o)
    notch = f" Q{nl - 6} 14 {nl - 4} 20 Q{nl + 6} {14 + depth + 6} 500 {14 + depth + 8} Q{nr - 6} {14 + depth + 6} {nr + 4} 20 Q{nr + 6} 14 {nr + 10} 14"
    rest = [(nr + 10 + k * (986 - nr - 10) / 6, 14 + j(1.3)) for k in range(1, 7)]
    rest += [(986 + j(1.5), 14 + k * 212 / 5) for k in range(1, 6)]
    rest += [(986 - k * 972 / 9, 226 + j(1.5)) for k in range(1, 10)]
    rest += [(14 + j(1.5), 226 - k * 216 / 5) for k in range(1, 6)]
    outline = line1 + notch + smooth(rest, start=False)
    return mask, outline

out = {
    "FRAMES": [frame(s) for s in range(101, 109)],
    "RULES": [rule(s) for s in range(201, 209)],
    "STARS": [star(s) for s in range(301, 311)],
    "TABS": [tab(s) for s in range(501, 507)],
    "CIRCLES": [circle(s) for s in range(401, 405)],
    "HOLDER": holder(601)[1],
}
ts = "// Generated hand-drawn pen variants. Each card picks its own by a hash of its id,\n// so the rolodex never shows two identical borders side by side.\n\n"
for k, v in out.items():
    ts += f"export const {k} = {json.dumps(v, indent=2)};\n\n"
open(sys.argv[1], "w").write(ts)
# the holder's cut-out shape is a CSS mask, so it ships as a file
import os
mask_path = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "..", "..", "public", "holder-mask.svg")
open(mask_path, "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 240" preserveAspectRatio="none"><path d="{holder(601)[0]}" fill="#000"/></svg>')
print({k: len(v) for k, v in out.items()})
