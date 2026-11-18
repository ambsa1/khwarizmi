# Real-rock terrain mesh tools (pure numpy; no scipy on this machine):
#   cubic_resample  - Catmull-Rom resampling of the 30 m elevation onto a finer grid (smooth, no new shapes)
#   deblur          - undo the smoothing of 30 m sampling: steepen walls, deepen clefts; peaks may rise only a
#                     little above the highest recorded sample nearby (30 m samples under-read narrow summits)
#   martini         - error-bounded right-triangulated irregular network (port of Mapbox Martini): many small
#                     triangles on cliffs, few on flat ground
import numpy as np

def _cr_weights(t):
    t2, t3 = t * t, t * t * t
    return np.stack([(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2], -1)

def cubic_resample(src, rows, cols):
    """Sample src at fractional row/col coordinates (1-D arrays) with separable Catmull-Rom."""
    R, C = src.shape
    r0 = np.floor(rows).astype(int); wr = _cr_weights(rows - r0)
    c0 = np.floor(cols).astype(int); wc = _cr_weights(cols - c0)
    ri = np.clip(r0[:, None] + np.arange(-1, 3)[None], 0, R - 1)
    ci = np.clip(c0[:, None] + np.arange(-1, 3)[None], 0, C - 1)
    tmp = np.einsum('rk,rkc->rc', wr, src[ri])          # rows done: (len(rows), C)
    return np.einsum('ck,rck->rc', wc, tmp[:, ci])

def blur(a, sigma):
    r = max(int(sigma * 3), 1)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    p = np.pad(a, r, mode='edge')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 0, p)
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 1, p)

def local_max(a, r):
    out = a.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out = np.maximum(out, np.roll(np.roll(a, dy, 0), dx, 1))
    return out

def deblur(rel, cell_m, raise_cap=8.0, lower_cap=70.0):
    """Asymmetric, two-scale unsharp mask. Walls get steeper mostly by LOWERING the foot of each wall (concave side,
    up to lower_cap m); convex crowns may rise at most raise_cap m, so domes keep their rounded tops and the
    skyline stays on the data."""
    d = 1.1 * (rel - blur(rel, 30.0 / cell_m)) + 0.6 * (rel - blur(rel, 70.0 / cell_m))
    H = rel + np.clip(d, -lower_cap, raise_cap)
    H = np.minimum(H, local_max(rel, int(round(45 / cell_m))) + raise_cap)
    H = np.where(rel < 25, np.maximum(H, rel), H)                              # no moat at the foot
    # round off needle-thin spikes on the crowns (an artefact of the 30 m surface model on steep summits);
    # broad domes are untouched because their crown is already close to its local average
    H = np.minimum(H, blur(H, 22.0 / cell_m) + 14.0)
    return np.maximum(H, -3)

def martini(H, max_error):
    """H: (2^k+1)^2 heights. Returns (vertex indices into the grid, triangles as triplets of those indices)."""
    size = H.shape[0]; tile = size - 1
    assert H.shape == (size, size) and (tile & (tile - 1)) == 0
    T = H.ravel()
    num_tri = tile * tile * 2 - 2; num_parent = num_tri - tile * tile
    coords = np.zeros((num_tri, 4), np.int32)
    for i in range(num_tri):
        tid = i + 2
        ax = ay = bx = by = cx = cy = 0
        if tid & 1: bx = by = cx = tile
        else: ax = ay = cy = tile
        tid >>= 1
        while tid > 1:
            mx, my = (ax + bx) >> 1, (ay + by) >> 1
            if tid & 1: bx, by = ax, ay; ax, ay = cx, cy
            else: ax, ay = bx, by; bx, by = cx, cy
            cx, cy = mx, my
            tid >>= 1
        coords[i] = (ax, ay, bx, by)
    errors = np.zeros(size * size, np.float64)
    for i in range(num_tri - 1, -1, -1):
        ax, ay, bx, by = coords[i]
        mx, my = (ax + bx) >> 1, (ay + by) >> 1
        cx, cy = mx + my - ay, my + ax - mx
        mid = my * size + mx
        e = abs((T[ay * size + ax] + T[by * size + bx]) / 2 - T[mid])
        if i < num_parent:
            e = max(e, errors[((ay + cy) >> 1) * size + ((ax + cx) >> 1)], errors[((by + cy) >> 1) * size + ((bx + cx) >> 1)])
        if e > errors[mid]: errors[mid] = e
    tris = []
    def process(ax, ay, bx, by, cx, cy):
        mx, my = (ax + bx) >> 1, (ay + by) >> 1
        if abs(ax - cx) + abs(ay - cy) > 1 and errors[my * size + mx] > max_error:
            process(cx, cy, ax, ay, mx, my); process(bx, by, cx, cy, mx, my)
        else:
            tris.append((ay * size + ax, by * size + bx, cy * size + cx))
    process(0, 0, tile, tile, tile, 0)
    process(tile, tile, 0, 0, 0, tile)
    tris = np.array(tris, np.int64)
    used, inv = np.unique(tris.ravel(), return_inverse=True)
    return used, inv.reshape(-1, 3).astype(np.uint32)
