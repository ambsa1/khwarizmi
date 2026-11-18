# Builds the Kassala drone-view world from real data:
#   Copernicus GLO-30 elevation, OpenStreetMap streets + the Gash riverbed, and the approved 37-plot route.
# Inputs live in ../private/references/kassala (fetched in step A, never committed).
# Output: app/public/worlds/kassala/world.json, terrain.bin, massif.bin   (shipped with the app, works offline)
#
# Scale: 1 scene unit = 10 real metres, heights at TRUE scale (1:1 skyline), houses at toy scale.
# The Taka/Totil and Mokram massifs are the real elevation surface itself, one sample every 30 m (see massif.py).
#   npm run world   (from app/)
import json, math, random
from pathlib import Path
import numpy as np
from massif import granite_detail, granite_map, smoothstep
from terrain_mesh import cubic_resample, deblur, martini

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
REF = REPO / 'private' / 'references' / 'kassala'
OUT = REPO / 'app' / 'public' / 'worlds' / 'kassala'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(7)

UNIT_M = 10.0               # real metres per scene unit
VEXAG = 1.0                 # the town and plain at true height
ROCK_VEXAG = 1.5            # granite massif calibrated to the reference photos (approved option 3):
                            # 30 m elevation data under-reads the near-vertical domes
VSCALE = VEXAG / UNIT_M     # scene units per real metre of height
S, W, N, E = 15.392, 36.375, 15.488, 36.455   # world bounds (route, Gash, Taka, Mokram)
LAT0, LON0 = 15.438, 36.410                    # scene origin
KX = 111320 * math.cos(math.radians(LAT0)); KY = 111320.0
def X(lon): return (lon - LON0) * KX / UNIT_M
def Z(lat): return -(lat - LAT0) * KY / UNIT_M
def LON(x): return LON0 + x * UNIT_M / KX
def LAT(z): return LAT0 - z * UNIT_M / KY

# ---------- elevation ----------
DS, DW, DN, DE = 15.38, 36.30, 15.52, 36.50
dem = np.load(REF / 'dem' / 'kassala_crop.npy').astype(np.float64)
DR, DC = dem.shape
PLAIN = float(np.percentile(dem, 20))
def dem_bilinear(lat, lon):
    r = np.clip((DN - lat) / (DN - DS) * (DR - 1), 0, DR - 1.001); c = np.clip((lon - DW) / (DE - DW) * (DC - 1), 0, DC - 1.001)
    r0, c0 = np.floor(r).astype(int), np.floor(c).astype(int); fr, fc = r - r0, c - c0
    return (dem[r0, c0] * (1 - fr) * (1 - fc) + dem[r0, c0 + 1] * (1 - fr) * fc + dem[r0 + 1, c0] * fr * (1 - fc) + dem[r0 + 1, c0 + 1] * fr * fc)

water = json.load(open(REF / 'osm' / 'water_gash.json', encoding='utf-8'))['elements']
bed = max((e for e in water if e.get('tags', {}).get('water') == 'river'), key=lambda e: len(e.get('geometry', [])))
bed_xz = np.array([[X(g['lon']), Z(g['lat'])] for g in bed['geometry']])
def inside(poly, pts):
    x, z = pts[:, 0][:, None], pts[:, 1][:, None]
    x1, z1 = poly[:, 0][None], poly[:, 1][None]; x2, z2 = np.roll(poly[:, 0], -1)[None], np.roll(poly[:, 1], -1)[None]
    cross = ((z1 > z) != (z2 > z)) & (x < (x2 - x1) * (z - z1) / (z2 - z1 + 1e-12) + x1)
    return cross.sum(axis=1) % 2 == 1

# ---------- massifs: the real surface, resampled finely, deblurred, meshed adaptively ----------
# (see terrain_mesh.py and massif.py: no programmed shapes; height only from the elevation data)
PATCHES_LL = [('taka', 15.392, 15.452, 36.402, 36.455, 513), ('mokram', 15.456, 15.488, 36.418, 36.452, 257)]
MAX_ERR_M = float(__import__('os').environ.get('MAX_ERR_M', '6.3'))
patches = []
for name, ps, pn, pw, pe, size in PATCHES_LL:
    cx, cz = (X(pw) + X(pe)) / 2, (Z(pn) + Z(ps)) / 2
    side = max(X(pe) - X(pw), Z(ps) - Z(pn))                      # square tile, scene units
    x0, z0 = cx - side / 2, cz - side / 2
    gx = x0 + np.arange(size) * side / (size - 1); gz = z0 + np.arange(size) * side / (size - 1)
    rows = (DN - LAT(gz)) / (DN - DS) * (DR - 1); cols = (LON(gx) - DW) / (DE - DW) * (DC - 1)
    rel = cubic_resample(dem, rows, cols) - PLAIN
    cell_m = side / (size - 1) * UNIT_M
    GXu, GZu = np.meshgrid(gx, gz)
    Hm = deblur(rel, cell_m)
    Hm, shade, rock, talus = granite_detail(GXu * UNIT_M, GZu * UNIT_M, Hm, rel, cell_m, seed=11 + len(patches))
    # the elevation model also records roofs and trees: below ~10 m over the plain it is town, not rock
    town = rel < 9
    Hm = np.where(town, -8.0, Hm * smoothstep(9, 14, rel) * ROCK_VEXAG)
    edge = np.minimum(np.minimum(np.arange(size)[None, :], (size - 1 - np.arange(size))[None, :]), np.minimum(np.arange(size)[:, None], (size - 1 - np.arange(size))[:, None]))
    Hm = np.where(edge < 2, -8.0, Hm)
    used_lo, tris_lo = martini(Hm, MAX_ERR_M * 3.0)
    used, tris = martini(Hm, MAX_ERR_M)
    # drop triangles that are entirely town (under the plain)
    Hu = Hm.ravel()[used]
    keep = ~np.all(Hu[tris] < -1, axis=1)
    tris = tris[keep]
    used2, inv = np.unique(tris.ravel(), return_inverse=True)
    vid = used[used2]; tris = inv.reshape(-1, 3).astype(np.uint32)
    vj, vi = np.divmod(vid, size)
    verts = np.stack([gx[vi], Hm.ravel()[vid] * VSCALE, gz[vj]], 1).astype(np.float32)
    vshade = (np.clip(shade.ravel()[vid], 0, 1.15) / 1.15 * 255).astype(np.uint8)
    # a coarser copy of the rock heights for ground queries (placing houses, Siraj, the camera)
    step = (size - 1) // 128
    gH = (np.maximum(Hm, -8.0) * VSCALE)[::step, ::step].astype(np.float32)
    def pack(used_, tris_):
        Hu_ = Hm.ravel()[used_]; k_ = ~np.all(Hu_[tris_] < -1, axis=1); tris_ = tris_[k_]
        u2, inv_ = np.unique(tris_.ravel(), return_inverse=True); vid_ = used_[u2]; tris_ = inv_.reshape(-1, 3).astype(np.uint32)
        vj_, vi_ = np.divmod(vid_, size)
        v_ = np.stack([gx[vi_], Hm.ravel()[vid_] * VSCALE, gz[vj_]], 1).astype(np.float32)
        return v_, (np.clip(shade.ravel()[vid_], 0, 1.15) / 1.15 * 255).astype(np.uint8), tris_
    lo_verts, lo_shade, lo_tris = pack(used_lo, tris_lo)
    # granite detail map (top-down projected: on steep walls it stretches into vertical streaks, like the real rock)
    DN_ = 1024
    dg = np.linspace(0, size - 1, DN_)
    Hd = cubic_resample(Hm, dg, dg)
    Xd, Zd = np.meshgrid(x0 + dg / (size - 1) * side, z0 + dg / (size - 1) * side)
    detail = granite_map(Xd * UNIT_M, Zd * UNIT_M, Hd, side / (DN_ - 1) * UNIT_M, seed=31 + len(patches))
    from PIL import Image
    Image.fromarray((np.clip(detail, 0, 1) * 255).astype(np.uint8), 'L').save(OUT / f'granite_{name}.png', optimize=True)
    patches.append({'name': name, 'x0': float(x0), 'x1': float(x0 + side), 'z0': float(z0), 'z1': float(z0 + side),
                    'lo_verts': lo_verts, 'lo_shade': lo_shade, 'lo_tris': lo_tris, 'detail': f'granite_{name}.png',
                    'w': gH.shape[1], 'h': gH.shape[0], 'H': gH, 'verts': verts, 'vshade': vshade, 'tris': tris,
                    'rock': rock[::step, ::step], 'talus': talus[::step, ::step], 'rel_true_max': float(rel.max()), 'built_max': float(Hm.max()),
                    'cell_m': cell_m})
    print(f'{name}: {size}x{size} at {cell_m:.1f} m, {len(verts)} vertices, {len(tris)} triangles (max error {MAX_ERR_M} m), '
          f'true max {rel.max():.0f} m, built max {Hm.max():.0f} m')
def patch_at(p, x, z):
    fx = (x - p['x0']) / (p['x1'] - p['x0']) * (p['w'] - 1); fz = (z - p['z0']) / (p['z1'] - p['z0']) * (p['h'] - 1)
    if fx < 0 or fz < 0 or fx > p['w'] - 1 or fz > p['h'] - 1: return None
    i, j = min(int(fx), p['w'] - 2), min(int(fz), p['h'] - 2); u, v = fx - i, fz - j; Hh = p['H']
    return float(Hh[j, i] * (1 - u) * (1 - v) + Hh[j, i + 1] * u * (1 - v) + Hh[j + 1, i] * (1 - u) * v + Hh[j + 1, i + 1] * u * v)

# ---------- plain terrain (coarse; the massifs are drawn on top) ----------
GW, GH = 73, 91
xs = np.linspace(X(W), X(E), GW); zs = np.linspace(Z(N), Z(S), GH)
GX, GZ = np.meshgrid(xs, zs)
height = VSCALE * np.clip(dem_bilinear(LAT(GZ), LON(GX)) - PLAIN, -3, 4)
for p in patches:                                  # sit just under the rock so it never pokes through
    for j in range(GH):
        for i in range(GW):
            v = patch_at(p, xs[i], zs[j])
            if v is not None and v > 0.6: height[j, i] = min(height[j, i], v - 0.6)
in_bed = inside(bed_xz, np.stack([GX.ravel(), GZ.ravel()], 1)).reshape(GH, GW)
height[in_bed] -= 0.6
def plain_at(x, z):
    fx = (x - xs[0]) / (xs[-1] - xs[0]) * (GW - 1); fz = (z - zs[0]) / (zs[-1] - zs[0]) * (GH - 1)
    i, j = int(np.clip(math.floor(fx), 0, GW - 2)), int(np.clip(math.floor(fz), 0, GH - 2)); u, v = fx - i, fz - j
    return float(height[j, i] * (1 - u) * (1 - v) + height[j, i + 1] * u * (1 - v) + height[j + 1, i] * (1 - u) * v + height[j + 1, i + 1] * u * v)
def ground(x, z):
    g = plain_at(x, z)
    for p in patches:
        v = patch_at(p, x, z)
        if v is not None and v > g: g = v
    return g
height.astype('<f4').tofile(OUT / 'terrain.bin')
with open(OUT / 'massif.bin', 'wb') as f:
    off = 0
    def put(arr):
        global off
        start = off; f.write(arr.tobytes()); off += arr.nbytes
        pad = (-off) % 4; f.write(b'\x00' * pad); off += pad
        return start
    for p in patches:
        p['vertsOffset'] = put(p['verts'].astype('<f4')); p['shadeOffset'] = put(p['vshade'])
        p['trisOffset'] = put(p['tris'].astype('<u4')); p['offset'] = put(p['H'].astype('<f4'))
        p['vertCount'] = len(p['verts']); p['triCount'] = len(p['tris'])
        p['lo'] = {'vertsOffset': put(p['lo_verts'].astype('<f4')), 'shadeOffset': put(p['lo_shade']), 'trisOffset': put(p['lo_tris'].astype('<u4')),
                   'vertCount': len(p['lo_verts']), 'triCount': len(p['lo_tris'])}

# Totil summit: highest rock within ~300 m of the mapped Totil top
TOTIL = (15.4168, 36.4283)
tp = patches[0]; best = (-1.0, 0.0, 0.0)
for j in range(tp['h']):
    for i in range(tp['w']):
        x = tp['x0'] + i / (tp['w'] - 1) * (tp['x1'] - tp['x0']); z = tp['z0'] + j / (tp['h'] - 1) * (tp['z1'] - tp['z0'])
        if math.hypot(x - X(TOTIL[1]), z - Z(TOTIL[0])) < 30 and tp['H'][j, i] > best[0]: best = (float(tp['H'][j, i]), x, z)
beacon = {'x': round(best[1], 2), 'z': round(best[2], 2), 'y': round(best[0], 2)}

# ---------- route + plots (approved layout from step A) ----------
route = json.load(open(REF / 'layout' / 'route.json', encoding='utf-8'))
plots = json.load(open(REF / 'layout' / 'plots.json', encoding='utf-8'))
segs = []
for sgm in route['segments']:
    pts = [[round(X(lo), 2), round(Z(la), 2)] for la, lo in sgm['points']]
    clean = [pts[0]]
    for p in pts[1:]:
        if math.dist(p, clean[-1]) > 0.6: clean.append(p)
    segs.append({'zone': sgm['zone'], 'points': clean})
street = [p for s in segs for p in s['points']]
streetA = np.array(street)
def street_dist(x, z): return float(np.min(np.hypot(streetA[:, 0] - x, streetA[:, 1] - z)))

lesson = []
for p in plots:
    sx, sz = X(p['street'][1]), Z(p['street'][0])
    dx, dz = X(p['lon']) - sx, Z(p['lat']) - sz; d = math.hypot(dx, dz) or 1
    hx, hz = sx + dx / d * 7.5, sz + dz / d * 7.5
    lesson.append({'n': p['n'], 'zone': p['zone'], 'skill': p['skill'], 'sx': round(sx, 2), 'sz': round(sz, 2),
                   'x': round(hx, 2), 'z': round(hz, 2), 'face': round(math.atan2(-dx, -dz), 3), 'y': round(ground(hx, hz), 2)})
lesson_xy = np.array([[l['x'], l['z']] for l in lesson])
def near_lesson(x, z): return float(np.min(np.hypot(lesson_xy[:, 0] - x, lesson_xy[:, 1] - z)))
def on_rock(x, z): return ground(x, z) - plain_at(x, z) > 0.25

# ---------- streets near the route, background houses, orchards ----------
roads = json.load(open(REF / 'osm' / 'roads.json', encoding='utf-8'))['elements']
KEEP = {'trunk': 2.2, 'primary': 2.2, 'secondary': 1.8, 'tertiary': 1.6, 'unclassified': 1.2, 'residential': 1.1, 'living_street': 1.0}
near_roads = []
for el in roads:
    w = KEEP.get(el['tags'].get('highway'))
    if not w: continue
    pts = [(X(g['lon']), Z(g['lat'])) for g in el['geometry']]
    if not any(street_dist(x, z) < 70 for x, z in pts[:: max(1, len(pts) // 6)] + [pts[-1]]): continue
    near_roads.append({'w': w, 'points': [[round(x, 1), round(z, 1)] for x, z in pts]})

taken = set(); bg = []
def free(x, z, r=3.2):
    key = (int(x // r), int(z // r))
    return all((key[0] + dx, key[1] + dz) not in taken for dx in (-1, 0, 1) for dz in (-1, 0, 1))
for rd in near_roads:
    pts = rd['points']
    for (x1, z1), (x2, z2) in zip(pts, pts[1:]):
        L = math.hypot(x2 - x1, z2 - z1)
        if L < 1e-3: continue
        tx, tz = (x2 - x1) / L, (z2 - z1) / L; nx, nz = -tz, tx
        t = random.uniform(0, 3)
        while t < L:
            for side in (-1, 1):
                if random.random() < 0.22: continue
                off = rd['w'] / 2 + 2.6
                x, z = x1 + tx * t + nx * off * side, z1 + tz * t + nz * off * side
                sd = street_dist(x, z)
                if sd > 75 or sd < 7.0 or near_lesson(x, z) < 9 or on_rock(x, z) or abs(plain_at(x, z)) > 1.2 or not free(x, z): continue
                taken.add((int(x // 3.2), int(z // 3.2)))
                bg.append([round(x, 2), round(z, 2), round(math.atan2(tx, tz), 2), round(random.uniform(2.4, 3.6), 2), round(random.uniform(2.2, 3.2), 2), round(random.uniform(1.1, 1.8), 2)])
            t += random.uniform(5.2, 7.5)
bed_in = inside(bed_xz, np.array([[b[0], b[1]] for b in bg])) if bg else []
bg = [b for b, ib in zip(bg, bed_in) if not ib][:2200]

river_line = max((e for e in water if e.get('tags', {}).get('waterway') == 'river'), key=lambda e: len(e.get('geometry', [])))
rl = np.array([[X(g['lon']), Z(g['lat'])] for g in river_line['geometry']])
trees = []; tries = 0
zlo, zhi = Z(15.447), Z(15.418)
while len(trees) < 900 and tries < 60000:
    tries += 1
    z = random.uniform(zlo, zhi); x = random.uniform(X(36.388), X(36.405))
    j = np.argmin(np.abs(rl[:, 1] - z)); d = x - rl[j, 0]
    if d < 9 or d > 55 or inside(bed_xz, np.array([[x, z]]))[0] or street_dist(x, z) < 6 or near_lesson(x, z) < 7: continue
    trees.append([round(x, 2), round(z, 2), round(random.uniform(0.8, 1.35), 2)])

# palms on both sides of the lesson street, so a child can follow it from the Gash to Totil
palms = []; acc = 0.0; SP = 6.0
for (x1, z1), (x2, z2) in zip(street, street[1:]):
    L = math.hypot(x2 - x1, z2 - z1)
    if L < 1e-3: continue
    tx, tz = (x2 - x1) / L, (z2 - z1) / L; nx, nz = -tz, tx; t = (SP - acc) % SP
    while t < L:
        for side in (-1, 1):
            x, z = x1 + tx * t + nx * 4.6 * side, z1 + tz * t + nz * 4.6 * side
            if street_dist(x, z) < 3.8 or near_lesson(x, z) < 7.2 or on_rock(x, z): continue
            palms.append([round(x, 2), round(z, 2), round(random.uniform(0.85, 1.2), 2), round(random.uniform(0, 6.28), 2)])
        t += SP
    acc = (acc + L) % SP

# boulders: rubble on the talus band at the foot of the rock
boulders = []
rngb = np.random.default_rng(3)
for p in patches:
    js, is_ = np.nonzero((p['talus'] > 0.3) | ((p['rock'] > 0.05) & (p['rock'] < 0.4)))
    for k in rngb.choice(len(js), size=min(len(js), 650 if p['name'] == 'taka' else 180), replace=False):
        x = p['x0'] + is_[k] / (p['w'] - 1) * (p['x1'] - p['x0']) + random.uniform(-1.2, 1.2)
        z = p['z0'] + js[k] / (p['h'] - 1) * (p['z1'] - p['z0']) + random.uniform(-1.2, 1.2)
        if street_dist(x, z) < 5 or near_lesson(x, z) < 7.5: continue
        boulders.append([round(x, 2), round(z, 2), round(random.uniform(0.8, 3.0), 2)])

# ---------- revival field: for every point, distance ALONG the lesson street to its nearest street point (s)
# and distance FROM the street (d). The app revives everything whose s is behind the child's progress. ----------
dense = []
for (x1, z1), (x2, z2) in zip(street, street[1:]):
    n = max(1, int(math.hypot(x2 - x1, z2 - z1)))
    for k in range(n): dense.append((x1 + (x2 - x1) * k / n, z1 + (z2 - z1) * k / n))
dense.append(tuple(street[-1]))
dense = np.array(dense)
arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(dense, axis=0).T))])
def nearest_s(px, pz):
    s_out = np.empty(len(px)); d_out = np.empty(len(px))
    for a in range(0, len(px), 4000):
        dx = px[a:a + 4000, None] - dense[None, :, 0]; dz = pz[a:a + 4000, None] - dense[None, :, 1]
        dd = dx * dx + dz * dz; k = np.argmin(dd, axis=1)
        s_out[a:a + 4000] = arc[k]; d_out[a:a + 4000] = np.sqrt(dd[np.arange(len(k)), k])
    return s_out, d_out
FW, FH = 172, 214
fx = np.linspace(X(W), X(E), FW); fz = np.linspace(Z(N), Z(S), FH)
FXg, FZg = np.meshgrid(fx, fz)
fs, fd = nearest_s(FXg.ravel(), FZg.ravel())
np.stack([fs, fd], 1).astype('<f4').tofile(OUT / 'field.bin')
plotS = [float(nearest_s(np.array([l['sx']]), np.array([l['sz']]))[0][0]) for l in lesson]

# the Gash centre line, upstream (south) first: water flows in from the south as the first lessons are done
# centre line + width from the detailed riverbed outline (scanline crossings), every 4 units, upstream (south) first
rl_pts = []
ex1, ez1 = bed_xz[:, 0], bed_xz[:, 1]; ex2, ez2 = np.roll(ex1, -1), np.roll(ez1, -1)
for zc in np.arange(min(ez1.max(), Z(S)) - 1, max(ez1.min(), Z(N)) + 1, -4.0):
    hit = (ez1 > zc) != (ez2 > zc)
    xs_ = np.sort(ex1[hit] + (zc - ez1[hit]) * (ex2[hit] - ex1[hit]) / (ez2[hit] - ez1[hit]))
    if len(xs_) < 2: continue
    pairs = [(xs_[k], xs_[k + 1]) for k in range(0, len(xs_) - 1, 2)]
    x0b, x1b = max(pairs, key=lambda q: q[1] - q[0])
    if x1b - x0b < 4: continue
    rl_pts.append([round(float(x0b + x1b) / 2, 1), round(float(zc), 1), round(float(x1b - x0b) * 0.45, 1)])


yard = []
for i, (x, z, r, a, b, h) in enumerate(bg):
    if random.random() < 0.38:
        ox, oz = random.choice([(-1, 1), (1, 1), (1, -1), (-1, -1)])
        yard.append([round(x + ox * (a / 2 + 1.0), 2), round(z + oz * (b / 2 + 1.0), 2), round(random.uniform(0.7, 1.15), 2)])

# ---------- the rich town that is built as the child progresses ----------
# road occupancy (so nothing is planted or built on a street)
road_cells = set()
for rd in near_roads:
    pts = rd['points']
    for (x1, z1), (x2, z2) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x2 - x1, z2 - z1) / 1.0))
        for k in range(n + 1):
            x = x1 + (x2 - x1) * k / n; z = z1 + (z2 - z1) * k / n
            r = rd['w'] / 2 + 0.6
            for ox in (-r, 0, r):
                for oz in (-r, 0, r): road_cells.add((int((x + ox) // 1.5), int((z + oz) // 1.5)))
def on_road(x, z): return (int(x // 1.5), int(z // 1.5)) in road_cells
def in_bed(x, z): return bool(inside(bed_xz, np.array([[x, z]]))[0])
def clear(x, z, street_min=3.6): return street_dist(x, z) >= street_min and near_lesson(x, z) >= 7.5 and not on_rock(x, z) and not on_road(x, z) and not in_bed(x, z)

# walled compounds filling the empty lots near the lesson street (two rows back from every nearby road)
compounds = []
for rd in near_roads:
    pts = rd['points']
    for (x1, z1), (x2, z2) in zip(pts, pts[1:]):
        L = math.hypot(x2 - x1, z2 - z1)
        if L < 1e-3: continue
        tx, tz = (x2 - x1) / L, (z2 - z1) / L; nx, nz = -tz, tx
        t = random.uniform(0, 2)
        while t < L:
            for side in (-1, 1):
                for row in (0, 1, 2):
                    off = rd['w'] / 2 + 3.4 + row * 7.2
                    x, z = x1 + tx * t + nx * off * side, z1 + tz * t + nz * off * side
                    sd = street_dist(x, z)
                    if sd > 85 or sd < 8.5 or not clear(x, z) or not free(x, z): continue
                    taken.add((int(x // 3.2), int(z // 3.2)))
                    compounds.append([round(x, 2), round(z, 2), round(math.atan2(tx, tz) + (math.pi if side < 0 else 0), 2),
                                      round(random.uniform(2.4, 3.4), 2), round(random.uniform(2.4, 3.2), 2), round(random.uniform(1.2, 1.9), 2)])
            t += random.uniform(4.6, 5.8)
random.shuffle(compounds); compounds = compounds[:1300]

# shops with awnings, lamp posts (with wires) and zeer water jars along the lesson street
shops, posts, jars, alleys = [], [[], []], [], []
acc_shop = acc_post = acc_alley = 0.0
for (x1, z1), (x2, z2) in zip(street, street[1:]):
    L = math.hypot(x2 - x1, z2 - z1)
    if L < 1e-3: continue
    tx, tz = (x2 - x1) / L, (z2 - z1) / L; nx, nz = -tz, tx
    for t in np.arange((8.5 - acc_shop) % 8.5, L, 8.5):
        for side in (-1, 1):
            x, z = x1 + tx * t + nx * 7.0 * side, z1 + tz * t + nz * 7.0 * side
            if street_dist(x, z) < 6.2 or near_lesson(x, z) < 8.0 or on_rock(x, z) or in_bed(x, z) or random.random() < 0.25: continue
            shops.append([round(x, 2), round(z, 2), round(math.atan2(-nx * side, -nz * side), 2), random.randrange(6)])
            if random.random() < 0.45: jars.append([round(x + tx * 1.9, 2), round(z + tz * 1.9, 2), round(math.atan2(-nx * side, -nz * side), 2)])
    for t in np.arange((13.0 - acc_post) % 13.0, L, 13.0):
        for si, side in enumerate((-1, 1)):
            x, z = x1 + tx * t + nx * 3.75 * side, z1 + tz * t + nz * 3.75 * side
            if street_dist(x, z) < 3.3 or near_lesson(x, z) < 4.5: continue
            posts[si].append([round(x, 2), round(z, 2), round(math.atan2(-nx * side, -nz * side), 2)])
    for t in np.arange((24.0 - acc_alley) % 24.0, L, 24.0):
        side = random.choice((-1, 1)); ln = random.uniform(10, 20)
        a = (x1 + tx * t + nx * 3.4 * side, z1 + tz * t + nz * 3.4 * side); b = (a[0] + nx * ln * side, a[1] + nz * ln * side)
        if near_lesson(*b) < 7 or on_rock(*b) or in_bed(*b) or near_lesson(*a) < 6: continue
        alleys.append([[round(a[0], 2), round(a[1], 2)], [round((a[0] + b[0]) / 2 + random.uniform(-1, 1), 2), round((a[1] + b[1]) / 2 + random.uniform(-1, 1), 2)], [round(b[0], 2), round(b[1], 2)]])
    acc_shop = (acc_shop + L) % 8.5; acc_post = (acc_post + L) % 13.0; acc_alley = (acc_alley + L) % 24.0
for c in random.sample(compounds, min(90, len(compounds))):   # jars at some compound gates too
    jars.append([round(c[0] + math.sin(c[2]) * (c[4] / 2 + 1.2), 2), round(c[1] + math.cos(c[2]) * (c[4] / 2 + 1.2), 2), c[2]])

# vegetation: shade trees, shrubs and bougainvillea, denser grass, all in the living corridor
def scatter(n, dmax, test, tries=60000):
    out = []; k = 0
    while len(out) < n and k < tries:
        k += 1; i = random.randrange(len(dense))
        x = dense[i, 0] + random.uniform(-dmax, dmax); z = dense[i, 1] + random.uniform(-dmax, dmax)
        if test(x, z): out.append((x, z))
    return out
shade_trees = [[round(x, 2), round(z, 2), round(random.uniform(0.9, 1.4), 2)] for x, z in scatter(340, 75, lambda x, z: clear(x, z, 6) and free(x, z))]
shrubs = []
for c in compounds:
    if random.random() < 0.55:
        ang = c[2] + random.choice((0.6, -0.6, 2.4, -2.4)); r = max(c[3], c[4]) / 2 + 1.1
        shrubs.append([round(c[0] + math.sin(ang) * r, 2), round(c[1] + math.cos(ang) * r, 2), round(random.uniform(0.6, 1.1), 2), 1 if random.random() < 0.45 else 0])
for x, z in scatter(500, 60, lambda x, z: clear(x, z, 4.5)):
    shrubs.append([round(x, 2), round(z, 2), round(random.uniform(0.5, 1.0), 2), 1 if random.random() < 0.2 else 0])
grass = [[round(x, 2), round(z, 2), round(random.uniform(0.6, 1.4), 2)] for x, z in scatter(5200, 55, lambda x, z: clear(x, z, 3.4))]

# ---------- landmarks ----------
def place(lat, lon, **kw): x, z = X(lon), Z(lat); return dict(x=round(x, 2), z=round(z, 2), y=round(ground(x, z), 2), **kw)
landmarks = {'mosque': place(15.4318, 36.4218, rot=0.0), 'well': place(15.4288, 36.4267), 'market': place(15.4491, 36.4147), 'bridge': place(15.4484, 36.3900)}

world = {
    'version': 2, 'unitMetres': UNIT_M, 'heightScale': VSCALE, 'plain': round(PLAIN, 1),
    'geo': {'lat0': LAT0, 'lon0': LON0, 'kx': KX, 'ky': KY},
    'bounds': {'x0': round(xs[0], 2), 'x1': round(xs[-1], 2), 'z0': round(zs[0], 2), 'z1': round(zs[-1], 2)},
    'grid': {'w': GW, 'h': GH, 'file': 'terrain.bin'},
    'massif': {'file': 'massif.bin', 'patches': [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in p.items() if k in ('name', 'x0', 'x1', 'z0', 'z1', 'w', 'h', 'offset', 'shadeOffset', 'vertsOffset', 'trisOffset', 'vertCount', 'triCount', 'lo', 'detail')} for p in patches]},
    'river': [[round(x, 1), round(z, 1)] for x, z in bed_xz],
    'route': segs, 'plots': lesson, 'beacon': beacon, 'roads': near_roads,
    'houses': bg, 'trees': trees, 'palms': palms, 'boulders': boulders, 'grass': grass, 'yardTrees': yard, 'landmarks': landmarks,
    'compounds': compounds, 'shops': shops, 'posts': posts, 'jars': jars, 'alleys': alleys, 'shadeTrees': shade_trees, 'shrubs': shrubs,
    'riverLine': rl_pts, 'plotS': [round(v, 2) for v in plotS], 'streetLength': round(float(arc[-1]), 2),
    'field': {'file': 'field.bin', 'w': FW, 'h': FH},
    'credits': ['Elevation: Copernicus GLO-30 (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA',
                'Streets and river: (c) OpenStreetMap contributors, ODbL'],
}
(OUT / 'world.json').write_text(json.dumps(world, separators=(',', ':')), encoding='utf-8')
print(f'beacon {beacon}; roads {len(near_roads)}, houses {len(bg)}, trees {len(trees)}, palms {len(palms)}, boulders {len(boulders)}')
sizes = {f: (OUT / f).stat().st_size // 1024 for f in ('world.json', 'terrain.bin', 'massif.bin', 'field.bin')}
print(f'grass {len(grass)}, river line {len(rl_pts)} pts, street {arc[-1]:.0f} units')
print(f'compounds {len(compounds)}, shops {len(shops)}, posts {len(posts[0])}+{len(posts[1])}, jars {len(jars)}, alleys {len(alleys)}, shade trees {len(shade_trees)}, shrubs {len(shrubs)}')
print('rock triangles high/low: ' + ', '.join(f"{p['name']} {p['triCount']}/{p['lo']['triCount']}" for p in patches))
print('files KB', sizes)
