# Builds one of the phase-4 worlds from real data (Kassala keeps its own build_kassala.py):
#   Copernicus GLO-30 elevation, the satellite picture of the place, OpenStreetMap, and a route along the real place.
# Inputs: private/references/<id>/ (fetched by private/references/_tools/fetch_world.py, never committed)
# Output: app/public/worlds/<id>/  world.json terrain.bin tint.bin massif.bin field.bin detail_*.png
#
# Nothing natural is a programmed shape:
#   ground height  = the elevation surface (smoothed where it records roofs and trees, deblurred where it is rock)
#   ground colour  = the satellite picture, per terrain vertex
#   water          = where the elevation surface is flattened water (rivers, sea) or the picture is lake water
#   palms / farms  = where the picture is green;   houses = where the surface stands up over the ground (roofs)
#   the path       = along the real shore / up the real slope, snapped to a fixed distance from the water
# Man-made station objects (saqiya, jetty, coral house, pyramid, terrace) come from kits.ts, modelled on photos.
#   python build_world.py <id>        (npm run worlds)
import json, math, random, sys
from pathlib import Path
import numpy as np
from PIL import Image
from terrain_mesh import cubic_resample, deblur, martini
Image.MAX_IMAGE_PIXELS = None

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
UNIT_M = 10.0

# ---------------------------------------------------------------- per-world configuration
CFG = {
    'saqiya': dict(
        area=(19.100, 30.430, 19.200, 30.530), water=('dem', 221.6), relief=None,
        route=[(19.1361, 30.482), (19.1514, 30.4814), (19.1667, 30.4802)], shore=(10, 'land'),
        kit='saqiya', kitSide='water', kits=[(0, 'saqiya', 'water')], beacon=('station', -1),
        palette={'waterA': '#7A6E52', 'waterB': '#4E7468', 'green': '#4E7E34', 'built': '#BFA27C', 'rock': '#CDB38C', 'street': '#D8BF96', 'curb': '#B08A62', 'side': '#CBB08A', 'road': '#D2B98F', 'fog': '#F1DDBA', 'ground': '#CDB38C', 'groundDark': '#A88B66',
                 'walls': '#C9A57C,#D5B48C,#BF9A70,#DCC09A,#C7A07A'},
        veg=dict(palms=900, trees=300, fields=160), houses=700, compounds=120, boats=10, grass=3000, shrubs=400,
    ),
    'mogran': dict(
        area=(15.575, 32.460, 15.665, 32.552), water=('dem', 371.4), relief=None,
        route=[(15.6084, 32.5159), (15.6102, 32.5075), (15.6142, 32.4991), (15.6229, 32.4943), (15.631, 32.4955), (15.6368, 32.5015)], shore=(9, 'land'), land=(15.6241, 32.5051),
        kit='mooring', kitSide='water', kits=[(0, 'mooring', 'water')], beacon=('latlon', 15.6125, 32.4985, 6),
        palette={'waterA': '#8C6A46', 'waterB': '#5C7F62', 'green': '#5E8A3A', 'built': '#B9A07E', 'rock': '#C9AE86', 'street': '#D9C6A2', 'curb': '#9C7652', 'side': '#CDB48E', 'fog': '#EFDDBE', 'ground': '#C9AE86', 'groundDark': '#9C8462'},
        veg=dict(palms=500, trees=900, fields=140), houses=1100, compounds=160, boats=26, grass=3200, shrubs=600,
    ),
    'suakin': dict(
        # the old coral-stone island in its harbour: mainland quays on the lagoon (Geyf) -> causeway -> around the island
        area=(19.088, 37.312, 19.134, 37.362), water=('dem', 0.35), relief=None, tintGain=1.15,
        route=[(19.1046, 37.3288), (19.1050, 37.3305), (19.1053, 37.3322), (19.1052, 37.3340), (19.1055, 37.3352), (19.1066, 37.3343), (19.1078, 37.3337), (19.1088, 37.3334), (19.1094, 37.3338), (19.1100, 37.3346),
               (19.1110, 37.3346), (19.1122, 37.3349), (19.1131, 37.3358), (19.1133, 37.3370), (19.1128, 37.3381), (19.1117, 37.3386),
               (19.1105, 37.3383), (19.1098, 37.3373), (19.1098, 37.3360)],
        kits=[(0, 'coralHouse', 'land'), (3, 'mooring', 'water'), (7, 'coralHouse', 'land')], kitScale=1.0, houseMask='land', houseHeight=2.2, beacon=('latlon', 19.1116, 37.3366, 4),
        palette={'waterA': '#2E8A8C', 'waterB': '#1F6E7E', 'green': '#7A8A4E', 'built': '#E2D8C4', 'rock': '#D9CBB0', 'street': '#E8DCC4', 'curb': '#B8A584', 'side': '#DDD0B6', 'fog': '#EADFC8', 'ground': '#D8C8A8', 'groundDark': '#B5A281',
                 'walls': '#EDE6D6,#E4DCCB,#F2ECE0,#D9CFBD,#E8DFCC'},
        veg=dict(palms=60, trees=140, fields=0), houses=600, compounds=90, boats=18, grass=1400, shrubs=500,
    ),
    'meroe': dict(
        # the royal city and Amun temple by the Nile -> the west cemetery -> across the plain -> the north cemetery on the hills
        area=(16.905, 33.700, 16.965, 33.770), water=('dem', 352.6), relief=dict(vexag=1.5), meshErr=1.6, tintGain=1.6,
        route=[(16.9372, 33.7128), (16.9352, 33.7170), (16.9335, 33.7225), (16.9318, 33.7270), (16.9340, 33.7320), (16.9350, 33.7380),
               (16.9360, 33.7430), (16.9372, 33.7465), (16.9383, 33.7480), (16.9393, 33.7502)],
        kits=[(0, 'pylonTemple', 'land'), (4, 'nubianPyramid', 'land')], kitScale=1.25, beacon=('latlon', 16.9387, 33.7491, 6),
        palette={'waterA': '#6E6A52', 'waterB': '#58705E', 'green': '#7A8A42', 'built': '#C9A57C', 'rock': '#9C6E4E', 'street': '#D9B98E', 'curb': '#A97C55', 'side': '#CFAE84', 'fog': '#F0D6B0', 'ground': '#C9965E', 'groundDark': '#8A5E3C',
                 'walls': '#C9A57C,#BF9A70,#D5B48C'},
        veg=dict(palms=120, trees=420, fields=40), houses=160, compounds=60, boats=0, grass=1800, shrubs=500,
        pyramids='osm', acacia=500, boulders=500,
    ),
    'marra': dict(
        # the hamlets Dolum and Tirba on the south-east flank -> up to the rim of the Deriba caldera -> down to its two lakes
        area=(12.895, 24.235, 12.975, 24.310), water=('lakes', [(12.95076, 24.25773, 0.10, 40), (12.96403, 24.27485, 0.07, 70)]), relief=dict(vexag=1.0), meshErr=5.0, tintGain=1.35,
        route=[(12.9040, 24.2935), (12.9100, 24.2915), (12.9150, 24.2885), (12.9205, 24.2840), (12.9255, 24.2790), (12.9300, 24.2745),
               (12.9345, 24.2715), (12.9395, 24.2700), (12.9450, 24.2705), (12.9505, 24.2720), (12.9555, 24.2740), (12.9590, 24.2760)],
        kits=[(0, 'terraceFarm', 'land')], kitScale=1.4, beacon=('lake', 1, 3),
        palette={'waterA': '#2A5560', 'waterB': '#3E7C9A', 'green': '#5A7A38', 'built': '#A08060', 'rock': '#7A6450', 'street': '#C9A87E', 'curb': '#8C6A4A', 'side': '#B89A72', 'fog': '#E4DCCB', 'ground': '#9C8466', 'groundDark': '#6E5A46',
                 'walls': '#B08A62,#A07C58'},
        veg=dict(palms=0, trees=900, fields=60), houses=0, compounds=0, boats=0, grass=3200, shrubs=900,
        tukuls='osm', acacia=300, boulders=900,
    ),
}

wid = sys.argv[1]; C = CFG[wid]
# station kits along the path: [(from station index, kit, side)]; side 'water' puts it on the shore, its working side out
KITS = C.get('kits') or [(0, C['kit'], C.get('kitSide', 'land'))]
def kit_of(i): return [k for k in KITS if k[0] <= i][-1]
REF = REPO / 'private' / 'references' / wid
OUT = REPO / 'app' / 'public' / 'worlds' / wid
OUT.mkdir(parents=True, exist_ok=True)
random.seed(11); rng = np.random.default_rng(11)

S, W, N, E = C['area']
LAT0, LON0 = (S + N) / 2, (W + E) / 2
KX = 111320 * math.cos(math.radians(LAT0)); KY = 111320.0
def X(lon): return (lon - LON0) * KX / UNIT_M
def Z(lat): return -(lat - LAT0) * KY / UNIT_M
def LON(x): return LON0 + np.asarray(x) * UNIT_M / KX
def LAT(z): return LAT0 - np.asarray(z) * UNIT_M / KY
x0, x1, z0, z1 = X(W), X(E), Z(N), Z(S)

# ---------------------------------------------------------------- inputs
dem = np.load(REF / 'dem' / 'crop.npy').astype(np.float64); dj = json.load(open(REF / 'dem' / 'crop.json'))
DR, DC = dem.shape
def dem_at(lat, lon):
    r = np.clip((dj['N'] - lat) / (dj['N'] - dj['S']) * DR - 0.5, 0, DR - 1.001); c = np.clip((lon - dj['W']) / (dj['E'] - dj['W']) * DC - 0.5, 0, DC - 1.001)
    return cubic_resample(dem, np.atleast_1d(r), np.atleast_1d(c)) if np.ndim(r) and np.ndim(c) and r.ndim == 1 and c.ndim == 1 else None
sat_f = sorted((REF / 'satellite').glob('esri_z*.jpg'))[0]; sm = json.load(open(sat_f.with_suffix('.json')))
sat = Image.open(sat_f).convert('RGB')
yy = lambda la: np.arcsinh(np.tan(np.radians(la)))
def sat_grid(xs, zs, img):
    """satellite colour (0..1) for a grid of scene points (xs columns, zs rows)"""
    a = np.asarray(img).astype(np.float32) / 255; h, w = a.shape[:2]
    px = np.clip(((LON(xs) - sm['W']) / (sm['E'] - sm['W']) * w).astype(int), 0, w - 1)
    py = np.clip(((yy(sm['N']) - yy(LAT(zs))) / (yy(sm['N']) - yy(sm['S'])) * h).astype(int), 0, h - 1)
    return a[py[:, None], px[None, :]]

# ---------------------------------------------------------------- analysis grid (2 units = 20 m): height, water, green, roofs
CELL = 2.0
ax = np.arange(x0, x1 + 1e-6, CELL); az = np.arange(z0, z1 + 1e-6, CELL)
AW, AH = len(ax), len(az)
rows = (dj['N'] - LAT(az)) / (dj['N'] - dj['S']) * DR - 0.5; cols = (LON(ax) - dj['W']) / (dj['E'] - dj['W']) * DC - 0.5
D = cubic_resample(dem, rows, cols)
def box_blur(a, r):
    if r < 1: return a
    k = 2 * r + 1; p = np.pad(a, r, mode='edge'); c = p.cumsum(0).cumsum(1); c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)
small = sat.resize((max(AW, 64), max(AH, 64)), Image.BOX)
RGB = sat_grid(ax, az, sat.resize((AW * 2, AH * 2), Image.BOX))
lum = RGB.mean(-1); vi = (RGB[..., 1] - RGB[..., 0]) / (RGB[..., 1] + RGB[..., 0] + 1e-3)
rough = np.abs(D - box_blur(D, 2))
kind, lvl = C['water']
lakes = []
AXg0, AZg0 = np.meshgrid(ax, az)
if kind == 'dem':
    water = ((D <= lvl) | ((D <= lvl + 1.0) & (rough < 0.35)))
    water = box_blur(water.astype(float), 1) > 0.5
else:
    water = np.zeros_like(D, bool)
    for la, lo, tol, R in lvl:
        ci, cj = int((X(lo) - x0) / CELL), int((Z(la) - z0) / CELL)
        # a crater lake is what looks like water in the picture (dark deep water, blue shallow water, or the seed's own
        # colour), connected to its seed and within its crater; the surface model is unreliable over water
        seedc = RGB[cj - 1:cj + 2, ci - 1:ci + 2].reshape(-1, 3).mean(0)
        bl = RGB[..., 2] - RGB[..., 0]
        looks = (np.abs(RGB - seedc).max(-1) < tol) | (lum < 0.09) | ((bl > 0.12) & (lum > 0.15))
        near = np.hypot(AXg0 - X(lo), AZg0 - Z(la)) < R
        comp = np.zeros_like(water); comp[cj, ci] = True; ok = looks & near
        for _ in range(3000):
            q = np.pad(comp, 1); nxt = (q[:-2, 1:-1] | q[2:, 1:-1] | q[1:-1, :-2] | q[1:-1, 2:] | comp) & ok
            if (nxt == comp).all(): break
            comp = nxt
        comp = box_blur(comp.astype(float), 1) > 0.4
        q = np.pad(comp, 1); edge = (q[:-2, 1:-1] | q[2:, 1:-1] | q[1:-1, :-2] | q[1:-1, 2:]) & ~comp
        lev = float(np.percentile(D[edge], 20))                 # the water line: the low part of its shore
        water |= comp; js, is_ = np.nonzero(comp)
        lakes.append({'level_m': lev, 'mask': comp, 'x0': float(ax[is_.min()]) - 6, 'x1': float(ax[is_.max()]) + 6, 'z0': float(az[js.min()]) - 6, 'z1': float(az[js.max()]) + 6, 'cx': float(ax[is_].mean()), 'cz': float(az[js].mean())})
        print(f'lake at {lev:.0f} m, {comp.sum() * CELL * CELL * 100 / 1e6:.2f} km2')
green = (vi > 0.02) & (lum < 0.42) & ~water
ground_s = box_blur(D, 6)                               # bare ground under roofs and trees (~250 m smoothing)
roofs = ((D - ground_s) > 2.5) & ~green & ~water & (lum > 0.25)
print(f'{wid}: grid {AW}x{AH}, water {water.mean():.3f}, green {green.mean():.3f}, roofs {roofs.mean():.3f}')

# the path keeps to one piece of land (an island, a bank): everything not connected to the anchor counts as shore
shore_mask = water.copy()
if C.get('land'):
    la, lo = C['land']; ci, cj = int((X(lo) - x0) / CELL), int((Z(la) - z0) / CELL)
    comp = np.zeros_like(water); comp[cj, ci] = True; land = ~water
    for _ in range(2000):
        p = np.pad(comp, 1); nxt = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | comp) & land
        if (nxt == comp).all(): break
        comp = nxt
    shore_mask = ~comp
    print(f'land piece {comp.mean():.3f} of the area')
# distance from water (land side), in units, up to ~120
dist = np.where(shore_mask, 0.0, 1e9)
wdist = np.where(water, 0.0, 1e9)            # distance from real water (banks, palms, jetties)
for _ in range(70):
    p = np.pad(wdist, 1, mode='edge')
    wdist = np.minimum.reduce([wdist, p[:-2, 1:-1] + CELL, p[2:, 1:-1] + CELL, p[1:-1, :-2] + CELL, p[1:-1, 2:] + CELL,
                               p[:-2, :-2] + CELL * 1.414, p[2:, 2:] + CELL * 1.414, p[:-2, 2:] + CELL * 1.414, p[2:, :-2] + CELL * 1.414])
for _ in range(70):
    p = np.pad(dist, 1, mode='edge')
    dist = np.minimum.reduce([dist, p[:-2, 1:-1] + CELL, p[2:, 1:-1] + CELL, p[1:-1, :-2] + CELL, p[1:-1, 2:] + CELL,
                              p[:-2, :-2] + CELL * 1.414, p[2:, 2:] + CELL * 1.414, p[:-2, 2:] + CELL * 1.414, p[2:, :-2] + CELL * 1.414])
outside = np.where(shore_mask, 1e9, 0.0)
for _ in range(70):
    p = np.pad(outside, 1, mode='edge')
    outside = np.minimum.reduce([outside, p[:-2, 1:-1] + CELL, p[2:, 1:-1] + CELL, p[1:-1, :-2] + CELL, p[1:-1, 2:] + CELL])
sdist = np.where(shore_mask, -np.minimum(outside, 140.0), np.minimum(dist, 140.0))
def grid_at(a, x, z):
    fx = np.clip((np.asarray(x) - x0) / CELL, 0, AW - 1.001); fz = np.clip((np.asarray(z) - z0) / CELL, 0, AH - 1.001)
    i, j = fx.astype(int), fz.astype(int); u, v = fx - i, fz - j
    return a[j, i] * (1 - u) * (1 - v) + a[j, i + 1] * u * (1 - v) + a[j + 1, i] * (1 - u) * v + a[j + 1, i + 1] * u * v
def is_water(x, z): return bool(grid_at(water.astype(float), x, z) > 0.5)

# ---------------------------------------------------------------- terrain height (true scale, 1 unit = 10 m)
BASE = lvl if kind == 'dem' else float(np.percentile(D, 1))
if C['relief'] is None:
    # river plain: the surface records palms and roofs, so the ground is the smoothed surface; banks stay low near water
    Hrel = np.clip(ground_s - BASE, 0, 40)
    Hrel = np.minimum(Hrel, 0.6 + wdist * 0.12)         # a gentle real bank (the smoothing would otherwise bury the river)
    Hgrid = np.where(water, -0.8 * UNIT_M, Hrel)
else:
    # hills and mountains: the real surface (desert and volcanic slopes carry few roofs), calibrated vertically
    vex = C['relief'].get('vexag', 1.0)
    Hgrid = np.clip(D - BASE, -20, 4000) * vex
    if kind == 'dem': Hgrid = np.where(water, -0.8 * UNIT_M, np.maximum(Hgrid, 0.6))
    for L_ in lakes:                                       # each crater lake: a bowl just under its own water level
        L_['level'] = (L_['level_m'] - BASE) * vex / UNIT_M
    for L_, m_ in zip(lakes, [None] * len(lakes)): pass
    for L_ in lakes:                                       # the lake bed sits just under its water line
        Hgrid = np.where(L_['mask'], (L_['level_m'] - BASE) * vex - 0.8 * UNIT_M, Hgrid)
Hs = Hgrid / UNIT_M                                     # scene units

# ---------------------------------------------------------------- the path: real waypoints, snapped to a fixed distance from the shore
pts = np.array([[X(lon), Z(lat)] for lat, lon in C['route']])
dense = []
for a, b in zip(pts, pts[1:]):
    n = max(1, int(np.hypot(*(b - a)) / 2))
    dense += [a + (b - a) * k / n for k in range(n)]
dense.append(pts[-1]); P = np.array(dense)
if C.get('shore'):
    target = C['shore'][0]
    for _ in range(90):
        d = grid_at(sdist, P[:, 0], P[:, 1])
        gxd = (grid_at(sdist, P[:, 0] + 2, P[:, 1]) - grid_at(sdist, P[:, 0] - 2, P[:, 1])) / 4
        gzd = (grid_at(sdist, P[:, 0], P[:, 1] + 2) - grid_at(sdist, P[:, 0], P[:, 1] - 2)) / 4
        gl = np.hypot(gxd, gzd) + 1e-6
        step = np.clip(target - d, -3, 3) * 0.5
        P[:] += np.stack([gxd, gzd], 1) / gl[:, None] * step[:, None]
        # keep it smooth (and keep spacing even) while it snaps
        P[1:-1] = P[1:-1] * 0.5 + (P[:-2] + P[2:]) * 0.25
# resample every 2 units
seg = np.hypot(*np.diff(P, axis=0).T); acc = np.concatenate([[0], np.cumsum(seg)]); L = acc[-1]
ss = np.arange(0, L, 2.0); P = np.stack([np.interp(ss, acc, P[:, 0]), np.interp(ss, acc, P[:, 1])], 1)
for _ in range(6): P[1:-1] = P[1:-1] * 0.5 + (P[:-2] + P[2:]) * 0.25
street = [[round(float(x), 2), round(float(z), 2)] for x, z in P]
print(f'path {L:.0f} units ({L * UNIT_M / 1000:.1f} km), min shore distance {grid_at(dist, P[:, 0], P[:, 1]).min():.1f}')
def street_dist(x, z): return float(np.min(np.hypot(P[:, 0] - x, P[:, 1] - z)))
# level the ground under the path and its verges (on the analysis grid): the path height is the smoothed ground along it
def nearest_k(px, pz):
    k_out = np.empty(len(px), int); d_out = np.empty(len(px))
    for a in range(0, len(px), 4000):
        dx = px[a:a + 4000, None] - P[None, :, 0]; dz = pz[a:a + 4000, None] - P[None, :, 1]
        dd = dx * dx + dz * dz; k = np.argmin(dd, axis=1)
        k_out[a:a + 4000] = k; d_out[a:a + 4000] = np.sqrt(dd[np.arange(len(k)), k])
    return k_out, d_out
AXg, AZg = np.meshgrid(ax, az)
PK, PD = (v.reshape(AH, AW) for v in nearest_k(AXg.ravel(), AZg.ravel()))
ph = grid_at(Hs, P[:, 0], P[:, 1]); kk = 9
ph = np.convolve(np.pad(ph, kk, mode='edge'), np.ones(2 * kk + 1) / (2 * kk + 1), mode='valid'); ph = np.maximum(ph, 0.5)
t = np.clip((PD - 7) / 7, 0, 1); Hs = ph[PK] * (1 - t) + Hs * t

# ---------------------------------------------------------------- terrain meshes
# a coarse grid (colour from the satellite, sits just under) + one adaptive mesh of the whole ground (Martini, like the
# Kassala massif): dense where the ground changes (shores, banks, path verges, slopes), sparse where it is flat
GW, GH = 129, int(round(129 * (z1 - z0) / (x1 - x0)))
gx = np.linspace(x0, x1, GW); gz = np.linspace(z0, z1, GH)
GXg, GZg = np.meshgrid(gx, gz)
height = (grid_at(Hs, GXg, GZg) - 0.35 - 2.5 * C.get('meshErr', 1.2) * (C['relief'] or {}).get('vexag', 1.0) / UNIT_M).astype(np.float32)   # always under the mesh
# ground colour: the app ships NO pixels of the satellite picture. The picture only decides the class of each spot
# (water and which kind, green, roofs, light or dark ground); the colours themselves are this world's own palette.
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
pal = C['palette']
sand_l, sand_d = hexrgb(pal['ground']), hexrgb(pal['groundDark'])
greenc, builtc, rockc = hexrgb(pal.get('green', '#6E8A42')), hexrgb(pal.get('built', '#BFA88A')), hexrgb(pal.get('rock', '#9C8466'))
bright = box_blur(lum, 3); q = np.clip((bright - np.percentile(bright, 10)) / (np.percentile(bright, 90) - np.percentile(bright, 10) + 1e-6), 0, 1)
q = np.round(q * 3) / 3                                        # four light levels only
cls = sand_d[None, None] * (1 - q[..., None]) + sand_l[None, None] * q[..., None]
vegf = box_blur(green.astype(float), 2)[..., None]; cls = cls * (1 - vegf * 0.85) + greenc * vegf * 0.85
roof = box_blur(roofs.astype(float), 2)[..., None]; cls = cls * (1 - roof * 0.6) + builtc * roof * 0.6
if C['relief']:
    sl = np.clip(np.hypot(*np.gradient(Hs, CELL)) * 2.5, 0, 1)[..., None]; cls = cls * (1 - sl * 0.5) + rockc * sl * 0.5
# water kinds: muddy (red > green, the Blue Nile in flood), green-grey (the White Nile, the Nile in the north), sea, crater lakes
wk = np.where(RGB[..., 0] > RGB[..., 1] + 0.01, 0, 1)
wk = np.round(box_blur(wk.astype(float), 4))
waterc = [hexrgb(pal.get('waterA', '#8A6A48')), hexrgb(pal.get('waterB', '#4F7A6C'))]
wcol = np.where(wk[..., None] > 0.5, waterc[1], waterc[0])
cls = np.where(water[..., None], wcol, cls)
cls = np.stack([box_blur(cls[..., c], 1) for c in range(3)], -1)
tint = cls[np.clip(((GZg - z0) / CELL).astype(int), 0, AH - 1), np.clip(((GXg - x0) / CELL).astype(int), 0, AW - 1)]

SIZE = 257; side = max(x1 - x0, z1 - z0); cx, cz = (x0 + x1) / 2, (z0 + z1) / 2; px0, pz0 = cx - side / 2, cz - side / 2
qx = px0 + np.arange(SIZE) * side / (SIZE - 1); qz = pz0 + np.arange(SIZE) * side / (SIZE - 1)
QX, QZ = np.meshgrid(qx, qz)
Hm = grid_at(Hs, QX, QZ) * UNIT_M                       # metres
rel_err = C.get('meshErr', 1.2) * (C['relief'] or {}).get('vexag', 1.0)
used_lo, tris_lo = martini(Hm, rel_err * 3.0); used, tris = martini(Hm, rel_err)
sm_H = box_blur(Hm, 3); shade = np.clip(1 + 0.06 * (Hm - sm_H), 0.55, 1.15)
def pack(used_, tris_):
    u2, inv_ = np.unique(tris_.ravel(), return_inverse=True); vid_ = used_[u2]; tris_ = inv_.reshape(-1, 3).astype(np.uint32)
    vj_, vi_ = np.divmod(vid_, SIZE)
    v_ = np.stack([qx[vi_], Hm.ravel()[vid_] / UNIT_M, qz[vj_]], 1).astype(np.float32)
    return v_, (shade.ravel()[vid_] / 1.15 * 255).astype(np.uint8), tris_
verts, vshade, tris = pack(used, tris); lo_verts, lo_shade, lo_tris = pack(used_lo, tris_lo)
gH = (Hm / UNIT_M)[::2, ::2].astype(np.float32)
# fine detail: the satellite picture's own light and dark (fields, rows of palms, roofs), high-passed, on the ground mesh
# fine detail from the elevation (ridges light, gullies dark) and the land classes (rows of green, roofs) - no picture pixels
DN_ = 1024; dq = np.linspace(px0, px0 + side, DN_); dz_ = np.linspace(pz0, pz0 + side, DN_)
DQX, DQZ = np.meshgrid(dq, dz_)
hd = grid_at(Hs, DQX, DQZ) * UNIT_M
detail = 0.5 + np.clip((hd - box_blur(hd, 5)) * 0.05, -0.18, 0.18)
gd = grid_at(green.astype(float), DQX, DQZ); rd = grid_at(roofs.astype(float), DQX, DQZ)
speck = rng.random(hd.shape)
detail += (gd > 0.5) * (speck - 0.5) * 0.22 + (rd > 0.5) * (speck - 0.5) * 0.16
detail = np.clip(detail, 0.25, 0.75)
Image.fromarray((detail * 255).astype(np.uint8), 'L').save(OUT / 'detail_ground.png', optimize=True)
patches = [{'name': 'ground', 'x0': float(px0), 'x1': float(px0 + side), 'z0': float(pz0), 'z1': float(pz0 + side), 'w': gH.shape[1], 'h': gH.shape[0],
            'H': gH, 'verts': verts, 'vshade': vshade, 'tris': tris, 'lo_verts': lo_verts, 'lo_shade': lo_shade, 'lo_tris': lo_tris, 'detail': 'detail_ground.png'}]
print(f'ground mesh {len(tris)} / {len(lo_tris)} triangles (high / low)')
def ground(x, z):
    fx = (x - px0) / side * (gH.shape[1] - 1); fz = (z - pz0) / side * (gH.shape[0] - 1)
    i, j = int(np.clip(math.floor(fx), 0, gH.shape[1] - 2)), int(np.clip(math.floor(fz), 0, gH.shape[0] - 2)); u, v = fx - i, fz - j
    return float(gH[j, i] * (1 - u) * (1 - v) + gH[j, i + 1] * u * (1 - v) + gH[j + 1, i] * (1 - u) * v + gH[j + 1, i + 1] * u * v)
plain_at = ground

# ---------------------------------------------------------------- stations along the path
NST = json.load(open(REPO / 'content' / 'worlds' / 'stations.json', encoding='utf-8'))['worlds'][wid]['stations']
gap = L / (NST + 0.6); plots = []
for i in range(NST):
    s = gap * (i + 0.8); k = min(int(s / 2), len(P) - 2)
    sx, sz = P[k]; tx, tz = P[k + 1] - P[k]; tl = math.hypot(tx, tz) or 1; nx, nz = -tz / tl, tx / tl
    # which side: toward the water for jetties/saqiyas, else alternate (never in the water)
    _, kit, kside = kit_of(i)
    sides = [1, -1]
    if kside == 'water':
        sides.sort(key=lambda sd: grid_at(wdist, sx + nx * sd * 8, sz + nz * sd * 8))
    elif i % 2: sides.reverse()
    sd = sides[0]; off = 7.0 if kside == 'water' else 8.0
    x, z = sx + nx * sd * off, sz + nz * sd * off
    if kside != 'water' and is_water(x, z):
        sd = -sd; x, z = sx + nx * sd * off, sz + nz * sd * off
        if is_water(x, z): off = 4.5; x, z = sx + nx * sd * off, sz + nz * sd * off
    face = math.atan2(sx - x, sz - z)                   # kit front (+z) toward the path
    if kside == 'water': face += math.pi                 # jetty / wheel side out over the water, its back to the path
    plots.append({'n': i + 1, 'zone': f'{wid}.s{i + 1}', 'skill': '', 'kit': kit, 'sx': round(float(sx), 2), 'sz': round(float(sz), 2),
                  'x': round(float(x), 2), 'z': round(float(z), 2), 'face': round(face, 3), 'y': round(ground(x, z), 2)})

# ---------------------------------------------------------------- revival field (same as Kassala): distance along the path, distance from it
arc = np.arange(len(P)) * 2.0
def nearest_s(px, pz):
    s_out = np.empty(len(px)); d_out = np.empty(len(px))
    for a in range(0, len(px), 4000):
        dx = px[a:a + 4000, None] - P[None, :, 0]; dz = pz[a:a + 4000, None] - P[None, :, 1]
        dd = dx * dx + dz * dz; k = np.argmin(dd, axis=1)
        s_out[a:a + 4000] = arc[k]; d_out[a:a + 4000] = np.sqrt(dd[np.arange(len(k)), k])
    return s_out, d_out
FW, FH = 172, int(round(172 * (z1 - z0) / (x1 - x0)))
FX, FZ = np.meshgrid(np.linspace(x0, x1, FW), np.linspace(z0, z1, FH))
fs, fd = nearest_s(FX.ravel(), FZ.ravel())
np.stack([fs, fd], 1).astype('<f4').tofile(OUT / 'field.bin')
plotS = [float(nearest_s(np.array([p['sx']]), np.array([p['sz']]))[0][0]) for p in plots]

# ---------------------------------------------------------------- life from the picture: palms, trees, farms, houses, boats, grass
occupied = []
def free(x, z, r):
    return all((x - a) ** 2 + (z - b) ** 2 > (r + c) ** 2 for a, b, c in occupied[-4000:])
near_station = lambda x, z: min(math.hypot(x - p['x'], z - p['z']) for p in plots) < 9.5
AX, AZ = np.meshgrid(ax, az)
PD = nearest_s(AX.ravel(), AZ.ravel())[1].reshape(AH, AW)       # distance from the path, per analysis cell
def sample(mask, n, dmax=1e9, dmin=3.2, r=1.2, tries=None, extra=lambda x, z: True, boat_ok=False):
    js, is_ = np.nonzero(mask & (PD < dmax + 2) & (PD > dmin - 2)); out = []
    if not len(js): return out
    order = rng.permutation(len(js))[: (tries or n * 12)]
    for k in order:
        x = ax[is_[k]] + rng.uniform(-1, 1); z = az[js[k]] + rng.uniform(-1, 1)
        sd = street_dist(x, z)
        if sd > dmax or sd < dmin or near_station(x, z) or not extra(x, z) or not free(x, z, r): continue
        if not boat_ok and (is_water(x, z) or ground(x, z) < 0.18): continue
        out.append((x, z)); occupied.append((x, z, r))
        if len(out) >= n: break
    return out
V = C['veg']
near_water = wdist < 45
palms = [[round(x, 2), round(z, 2), round(float(rng.uniform(0.8, 1.25)), 2), round(float(rng.uniform(0, 6.28)), 2)]
         for x, z in sample(green & near_water, V['palms'], dmax=260, r=1.0)]
trees = [[round(x, 2), round(z, 2), round(float(rng.uniform(0.7, 1.2)), 2)] for x, z in sample(green & ~near_water, V['trees'], dmax=320, r=1.4)]
fields = [[round(x, 2), round(z, 2), round(float(rng.uniform(0, 3.14)), 2), round(float(rng.uniform(0.8, 1.3)), 2), 1]
          for x, z in sample(green, V['fields'], dmax=140, dmin=6, r=3.0)]
houses = []
for x, z in sample(roofs if C.get('houseMask') != 'land' else ~water, C['houses'], dmax=420 if C.get('houseMask') != 'land' else 90, dmin=5, r=2.2):
    a, b = rng.uniform(2.2, 3.6), rng.uniform(2.0, 3.2)
    houses.append([round(x, 2), round(z, 2), round(float(rng.uniform(-0.3, 0.3)), 2), round(a, 2), round(b, 2), round(float(rng.uniform(0.7, 1.0) * C.get('houseHeight', 1.0)), 2)])
compounds = []
for x, z in sample(~water & ~green, C['compounds'], dmax=34, dmin=6, r=2.4):
    a, b = rng.uniform(2.6, 4.0), rng.uniform(2.4, 3.6)
    k = int(np.argmin(np.hypot(P[:, 0] - x, P[:, 1] - z))); t = P[min(k + 1, len(P) - 1)] - P[max(k - 1, 0)]
    compounds.append([round(x, 2), round(z, 2), round(math.atan2(t[0], t[1]), 2), round(a, 2), round(b, 2), round(float(rng.uniform(0.8, 1.1)), 2)])
open_water = water & (wdist == 0) & (box_blur(water.astype(float), 4) > 0.97)
boats = [[round(x, 2), round(z, 2), round(float(rng.uniform(0, 6.28)), 2), round(float(rng.uniform(0.9, 1.2)), 2)]
         for x, z in sample(open_water, C['boats'], dmax=160, dmin=6, r=5, boat_ok=True)]
grass = [[round(x, 2), round(z, 2), round(float(rng.uniform(0.6, 1.4)), 2)] for x, z in sample(~water, C['grass'], dmax=60, dmin=3.4, r=0.4, tries=C['grass'] * 6)]
shrubs = [[round(x, 2), round(z, 2), round(float(rng.uniform(0.6, 1.1)), 2), 1 if rng.random() < 0.25 else 0]
          for x, z in sample(~water, C['shrubs'], dmax=70, dmin=4.5, r=0.9)]
extra_layers = []
places = json.load(open(REF / 'osm' / 'places.json', encoding='utf-8'))['elements'] if (REF / 'osm' / 'places.json').exists() else []
def inside_area(x, z): return x0 + 5 < x < x1 - 5 and z0 + 5 < z < z1 - 5
if C.get('pyramids') == 'osm':
    pyr = []
    for e in places:
        t = e.get('tags', {}); c = e.get('center') or e
        if (t.get('historic') == 'tomb' or t.get('name') == 'Pyramid' or 'Pyramid beg' in t.get('name', '')) and 'lat' in c:
            x, z = X(c['lon']), Z(c['lat'])
            if inside_area(x, z) and near_station(x, z) is False and all(math.hypot(x - a, z - b) > 2.2 for a, b, *_ in pyr):
                pyr.append([round(x, 2), round(z, 2), round(float(rng.uniform(-0.1, 0.1)), 2), round(float(rng.uniform(0.7, 1.3)), 2)])
    extra_layers.append({'kit': 'pyramid', 'mode': 'static', 'colors': ['#B5835A', '#A87650', '#BF8D62'], 'items': pyr})
    print(f'real pyramids/tombs from the map: {len(pyr)}')
if C.get('tukuls') == 'osm':
    huts = []
    seeds = [(X(c['lon']), Z(c['lat'])) for e in places for c in [e.get('center') or e] if e.get('tags', {}).get('place') in ('hamlet', 'village', 'isolated_dwelling') and 'lat' in c]
    seeds = [(x, z) for x, z in seeds if inside_area(x, z)]
    # small hamlets beside the path too (the real ones on the flank are where the path starts)
    seeds += [tuple(P[k]) + np.array([12, 0]) for k in range(0, len(P), max(1, len(P) // 6))]
    for cx_, cz_ in seeds:
        for _ in range(9):
            a_, r_ = rng.uniform(0, 6.28), rng.uniform(3, 14); x, z = cx_ + math.cos(a_) * r_, cz_ + math.sin(a_) * r_
            if inside_area(x, z) and not is_water(x, z) and street_dist(x, z) > 5 and not near_station(x, z) and free(x, z, 1.8):
                occupied.append((x, z, 1.8)); huts.append([round(x, 2), round(z, 2), round(float(rng.uniform(0, 6.28)), 2), round(float(rng.uniform(1.0, 1.4)), 2)])
    extra_layers.append({'kit': 'tukul', 'mode': 'build', 'items': huts})
    print(f'round huts (tukuls) at {len(seeds)} hamlets: {len(huts)}')
if C.get('acacia'):
    ac = [[round(x, 2), round(z, 2), round(float(rng.uniform(0, 6.28)), 2), round(float(rng.uniform(0.8, 1.4)), 2)]
          for x, z in sample(~water, C['acacia'], dmax=200, dmin=5, r=2.0)]
    extra_layers.append({'kit': 'acacia', 'mode': 'grow', 'items': ac})
boulders = []
if C.get('boulders'):
    slope = np.hypot(*np.gradient(Hs, CELL))
    boulders = [[round(x, 2), round(z, 2), round(float(rng.uniform(0.6, 2.2)), 2)] for x, z in sample((slope > 0.12) & ~water, C['boulders'], dmax=240, dmin=5, r=1.2)]
print(f'palms {len(palms)}, trees {len(trees)}, fields {len(fields)}, houses {len(houses)}, compounds {len(compounds)}, boats {len(boats)}, grass {len(grass)}, shrubs {len(shrubs)}')

# water cells (4 units) for the living water surface
WC = 4.0; wcells = []
for z in np.arange(z0 + WC / 2, z1, WC):
    for x in np.arange(x0 + WC / 2, x1, WC):
        if grid_at(water.astype(float), x, z) > 0.4: wcells.append([round(float(x), 1), round(float(z), 1)])

# ---------------------------------------------------------------- beacon (what the finale shot looks at)
bk = C['beacon']
if bk[0] == 'station': b = plots[bk[1]]; beacon = {'x': b['x'], 'z': b['z'], 'y': round(ground(b['x'], b['z']) + 3, 2)}
elif bk[0] == 'lake': L_ = lakes[bk[1]]; beacon = {'x': round(L_['cx'], 2), 'z': round(L_['cz'], 2), 'y': round(L_['level'] + bk[2], 2)}
else: bx, bz = X(bk[2]), Z(bk[1]); beacon = {'x': round(bx, 2), 'z': round(bz, 2), 'y': round(max(ground(bx, bz), 0) + bk[3], 2)}

# ---------------------------------------------------------------- write
height.astype('<f4').tofile(OUT / 'terrain.bin')
(np.clip(tint, 0, 1) * 255).astype(np.uint8).tofile(OUT / 'tint.bin')
with open(OUT / 'massif.bin', 'wb') as f:
    off = 0
    def put(arr):
        global off
        start = off; f.write(arr.tobytes()); off += arr.nbytes
        pad = (-off) % 4; f.write(b'\x00' * pad); off += pad
        return start
    for q in patches:
        q['vertsOffset'] = put(q['verts'].astype('<f4')); q['shadeOffset'] = put(q['vshade'])
        q['trisOffset'] = put(q['tris'].astype('<u4')); q['offset'] = put(q['H'].astype('<f4'))
        q['vertCount'] = len(q['verts']); q['triCount'] = len(q['tris'])
        q['lo'] = {'vertsOffset': put(q['lo_verts'].astype('<f4')), 'shadeOffset': put(q['lo_shade']), 'trisOffset': put(q['lo_tris'].astype('<u4')),
                   'vertCount': len(q['lo_verts']), 'triCount': len(q['lo_tris'])}
world = {
    'version': 3, 'unitMetres': UNIT_M, 'heightScale': 1 / UNIT_M, 'plain': round(BASE, 1),
    'geo': {'lat0': LAT0, 'lon0': LON0, 'kx': KX, 'ky': KY},
    'bounds': {'x0': round(gx[0], 2), 'x1': round(gx[-1], 2), 'z0': round(gz[0], 2), 'z1': round(gz[-1], 2)},
    'grid': {'w': GW, 'h': GH, 'file': 'terrain.bin'}, 'tint': 'tint.bin',
    'massif': {'file': 'massif.bin', 'patches': [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in q.items() if k in ('name', 'x0', 'x1', 'z0', 'z1', 'w', 'h', 'offset', 'shadeOffset', 'vertsOffset', 'trisOffset', 'vertCount', 'triCount', 'lo', 'detail')} for q in patches]},
    'river': [], 'riverLine': [], 'route': [{'zone': f'{wid}.path', 'points': street}], 'plots': plots, 'beacon': beacon, 'roads': [],
    'houses': houses, 'trees': trees, 'palms': palms, 'boulders': boulders, 'grass': grass, 'yardTrees': [], 'landmarks': {},
    'compounds': compounds, 'shops': [], 'posts': [[], []], 'jars': [], 'alleys': [], 'shadeTrees': [], 'shrubs': shrubs,
    'plotS': [round(v, 2) for v in plotS], 'streetLength': round(float(arc[-1]), 2),
    'field': {'file': 'field.bin', 'w': FW, 'h': FH},
    'stationKit': KITS[0][1], 'palette': C['palette'], 'riverUntil': -999,
    'water': {'cell': WC, 'cells': [], 'kind': 'lake' if lakes else 'river', 'level': 0.0,
              'planes': [{'level': round(L_['level'], 2), 'x0': round(L_['x0'], 1), 'x1': round(L_['x1'], 1), 'z0': round(L_['z0'], 1), 'z1': round(L_['z1'], 1)} for L_ in lakes]},
    'kitScale': C.get('kitScale', 1.6),
    'layers': [{'kit': 'field', 'mode': 'grow', 'colors': ['#5E9A3A', '#6EA845', '#4E8A34', '#86A84A'], 'items': fields},
               {'kit': 'boat', 'mode': 'grow', 'items': [[x, z, r, s] for x, z, r, s in boats]}] + extra_layers,
    'credits': ['Elevation: Copernicus GLO-30 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA',
                'Map data: (c) OpenStreetMap contributors, ODbL'],
}
(OUT / 'world.json').write_text(json.dumps(world, separators=(',', ':')), encoding='utf-8')
sizes = {f.name: f.stat().st_size // 1024 for f in OUT.iterdir()}
print(f'stations {len(plots)} gap {gap:.1f}, water cells {len(wcells)}, beacon {beacon}; files KB {sizes}')
