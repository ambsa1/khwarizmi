"""Step 2 of the heritage pattern: seamless embossed tiles from the icon masks (tools/heritage-render.mjs).
usage: python tools/heritage-tiles.py <maskDir>   -> public/art/heritage/{all,all-night,east,north,center,west}.webp + grain.webp

Each tile repeats without a seam. Rows are offset by half a cell; no icon touches a copy of itself, and in the
all-Sudan tile no two icons of the same region touch. The relief (light from the upper left) is baked in:
a soft dark shadow below-right, a light edge above-left, then the ink body."""
import random, sys, os
from PIL import Image, ImageChops, ImageFilter
import numpy as np

MASKS = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', 'heritage')
os.makedirs(OUT, exist_ok=True)
K = 1.1                                   # tiles are drawn at 1.1x (CSS sizes them at 1x on desktop)
GX, GY, BOX = int(205 * K), int(165 * K), int(120 * K)   # dense: no empty patches on quiet screens
REGIONS = {
    'east': 'suakin-gate khulal kassala-mountain khanjar iron-jabana'.split(),
    'west': 'nugara hashab tabag ali-dinar-palace qutiya'.split(),
    'north': 'meroe-pyramids nubian-door nubian-plate nubian-birish nile-boat'.split(),
    'center': 'burj-alfateh republican-palace sudan-railways blue-nile-bridge cotton-boll'.split(),
}
REGION_OF = {n: r for r, ns in REGIONS.items() for n in ns}

def neighbours(r, c, R, C):
    """same row left/right, and the two touching cells in the rows above and below (odd rows sit half a cell right)"""
    out = [(r, (c - 1) % C), (r, (c + 1) % C)]
    for dr in (-1, 1):
        rr = (r + dr) % R
        out += [(rr, c), (rr, (c - 1) % C)] if r % 2 == 0 else [(rr, c), (rr, (c + 1) % C)]
    return out

def arrange(names, R, C, key, seed=7, spread=False, rows=False):
    """backtracking search for a grid where neighbours never share key(name); every name used equally often"""
    rnd = random.Random(seed)
    cells = [(r, c) for r in range(R) for c in range(C)]
    left = {n: (R * C) // len(names) for n in names}
    g = {}
    def go(i):
        if i == len(cells): return True
        r, c = cells[i]
        opts = [n for n in names if left[n] > 0]; rnd.shuffle(opts)
        for n in opts:
            if any(key(g[m]) == key(n) for m in neighbours(r, c, R, C) if m in g): continue
            # spread: two copies of the same icon never sit within two steps of each other
            # rows: every row shows each icon once
            if rows and any(g.get((r, cc)) == n for cc in range(C)): continue
            if spread and any(g.get(m2) == n for m in neighbours(r, c, R, C) for m2 in neighbours(*m, R, C)): continue
            g[(r, c)] = n; left[n] -= 1
            if go(i + 1): return True
            del g[(r, c)]; left[n] += 1
        return False
    if not go(0): raise SystemExit(f'no arrangement found for {R}x{C}')
    return g

def mask(name):
    m = Image.open(os.path.join(MASKS, name + '.png')).getchannel('A')
    bb = m.getbbox(); w, h = bb[2] - bb[0], bb[3] - bb[1]
    m = m.crop(bb)
    wide = w / h > 1.6
    s = (BOX * (1.45 if wide else 1)) / max(w, h)
    return m.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)

def tile(grid, R, C):
    W, H = C * GX, R * GY
    a = Image.new('L', (W, H), 0)
    for (r, c), n in grid.items():
        m = mask(n)
        cx = (c + 0.5 + (0.5 if r % 2 else 0)) * GX
        cy = (r + 0.5) * GY
        for dx in (-W, 0, W):
            for dy in (-H, 0, H):
                x, y = round(cx - m.width / 2 + dx), round(cy - m.height / 2 + dy)
                if x > W or y > H or x + m.width < 0 or y + m.height < 0: continue
                layer = Image.new('L', (W, H), 0); layer.paste(m, (x, y))
                a = ImageChops.lighter(a, layer)
    return a

def roll(img, dx, dy):
    return Image.fromarray(np.roll(np.roll(np.asarray(img), dy, 0), dx, 1))

def emboss(a, body, light, dark, la=0.85, da=0.5):
    """RGBA: light edge up-left, soft shadow down-right, ink body on top (all wrap around the tile edges)"""
    A = np.asarray(a).astype(np.float32) / 255
    hi = np.asarray(roll(a, -2, -2)).astype(np.float32) / 255 * la
    sh = np.asarray(roll(a, 3, 3).filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32) / 255 * da
    def over(dst_rgb, dst_a, rgb, al):
        out_a = al + dst_a * (1 - al)
        out = (np.array(rgb, np.float32)[None, None, :] * al[..., None] + dst_rgb * dst_a[..., None] * (1 - al[..., None])) / np.maximum(out_a, 1e-6)[..., None]
        return out, out_a
    H, W = A.shape
    rgb, al = np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32)
    rgb, al = over(rgb, al, dark, sh)
    rgb, al = over(rgb, al, light, hi)
    rgb, al = over(rgb, al, body, A)
    return Image.fromarray(np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
CREAM, INK = hexrgb('#FFFBF3'), hexrgb('#2B2118')
all_names = [n for ns in REGIONS.values() for n in ns]
g_all = arrange(all_names, 4, 10, lambda n: REGION_OF[n], spread=True)   # 40 cells: every icon twice
a_all = tile(g_all, 4, 10)
jobs = [('all', a_all, '#8A5A3B', CREAM, INK), ('all-night', a_all, '#F8D288', hexrgb('#FFF3D0'), (0, 0, 0))]
for reg, names in REGIONS.items():
    g = arrange(names, 4, 5, lambda n: n, rows=True)                        # 20 cells: every icon four times
    col = {'east': '#954E3A', 'north': '#A25810', 'center': '#163E70', 'west': '#2A6532'}[reg]
    jobs.append((reg, tile(g, 4, 5), col, CREAM, INK))
for name, a, body, light, dark in jobs:
    im = emboss(a, hexrgb(body), light, dark, la=0.55 if name == 'all-night' else 0.9, da=0.7 if name == 'all-night' else 0.45)
    p = os.path.join(OUT, name + '.webp')
    im.save(p, 'WEBP', quality=56, method=6, alpha_quality=58)
    print(name, im.size, os.path.getsize(p) // 1024, 'KB')

# paper grain: a small seamless noise tile, drawn with plain opacity (no blend mode: cheap on weak phones)
rng = np.random.default_rng(3)
n = rng.normal(0, 1, (256, 256)).astype(np.float32)
n = np.asarray(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)
dark = ((128 - n).clip(0, None) / 128 * 255 * 0.9).astype(np.uint8)
g = Image.fromarray(np.dstack([np.full_like(dark, 43), np.full_like(dark, 33), np.full_like(dark, 24), dark]), 'RGBA')
g.save(os.path.join(OUT, 'grain.webp'), 'WEBP', quality=70, alpha_quality=60)
print('grain', os.path.getsize(os.path.join(OUT, 'grain.webp')) // 1024, 'KB')
