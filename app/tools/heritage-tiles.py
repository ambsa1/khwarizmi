"""Step 2 of the heritage pattern: embossed sprite sheets from the icon masks (tools/heritage-render.mjs).
usage: python tools/heritage-tiles.py <maskDir>   -> public/art/heritage/{all,all-night,east,north,center,west}.webp + grain.webp

One cell per icon; ui/Backdrop.tsx places them on a grid fitted to the screen. The relief (light from the upper left)
is baked in: a soft dark shadow below-right, a light edge above-left, then the ink body."""
import sys, os
from PIL import Image, ImageFilter
import numpy as np

MASKS = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', 'heritage')
os.makedirs(OUT, exist_ok=True)
REGIONS = {
    'east': 'suakin-gate khulal kassala-mountain khanjar iron-jabana'.split(),
    'west': 'nugara hashab tabag ali-dinar-palace qutiya'.split(),
    'north': 'meroe-pyramids nubian-door nubian-plate nubian-birish nile-boat'.split(),
    'center': 'burj-alfateh republican-palace sudan-railways blue-nile-bridge cotton-boll'.split(),
}

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
# Sprite sheets (one cell per icon), laid out by the app on a grid that fits each screen, so no icon is ever cut at
# the edge. Order must match ui/Backdrop.tsx: all = east, west, north, centre interleaved; a region = its five icons.
CELL = 200                                 # icons are shown at 64-96 px: 2x for sharp phones
ALL_ORDER = [n for t in zip(*REGIONS.values()) for n in t]
def sprite(names, cols):
    rows = (len(names) + cols - 1) // cols
    a = Image.new('L', (cols * CELL, rows * CELL), 0)
    for i, n in enumerate(names):
        m = Image.open(os.path.join(MASKS, n + '.png')).getchannel('A'); m = m.crop(m.getbbox())
        k = CELL * 0.84 / max(m.width, m.height); m = m.resize((max(1, round(m.width * k)), max(1, round(m.height * k))), Image.LANCZOS)
        x, y = (i % cols) * CELL + (CELL - m.width) // 2, (i // cols) * CELL + (CELL - m.height) // 2
        a.paste(m, (x, y))
    return a
a_all = sprite(ALL_ORDER, 5)
jobs = [('all', a_all, '#8A5A3B', CREAM, INK), ('all-night', a_all, '#F8D288', hexrgb('#FFF3D0'), (0, 0, 0))]
for reg, names in REGIONS.items():
    col = {'east': '#954E3A', 'north': '#A25810', 'center': '#163E70', 'west': '#2A6532'}[reg]
    jobs.append((reg, sprite(names, 5), col, CREAM, INK))
for name, a, body, light, dark in jobs:
    im = emboss(a, hexrgb(body), light, dark, la=0.55 if name == 'all-night' else 0.9, da=0.7 if name == 'all-night' else 0.45)
    p = os.path.join(OUT, name + '.webp')
    im.save(p, 'WEBP', quality=72, method=6, alpha_quality=72)
    print(name, im.size, os.path.getsize(p) // 1024, 'KB')

# paper grain: a small seamless noise tile, drawn with plain opacity (no blend mode: cheap on weak phones)
rng = np.random.default_rng(3)
n = rng.normal(0, 1, (256, 256)).astype(np.float32)
n = np.asarray(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)
dark = ((128 - n).clip(0, None) / 128 * 255 * 0.9).astype(np.uint8)
g = Image.fromarray(np.dstack([np.full_like(dark, 43), np.full_like(dark, 33), np.full_like(dark, 24), dark]), 'RGBA')
g.save(os.path.join(OUT, 'grain.webp'), 'WEBP', quality=70, alpha_quality=60)
print('grain', os.path.getsize(os.path.join(OUT, 'grain.webp')) // 1024, 'KB')
