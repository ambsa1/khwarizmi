# The Taka / Totil / Mokram massif as ONE continuous rock surface taken directly from the real elevation
# (Copernicus GLO-30, one sample every 30 m). No programmed domes, ellipses or towers.
# Only skyline-safe detail is added:
#   - clefts between the domes are deepened (height can only go DOWN where the surface is concave)
#   - granite joints and cracks are carved IN (down only)
#   - the foot of the rock gets lumpy talus (only below 60 m above the plain, far under the skyline)
#   - shading: crack darkness, concave hollows, down-slope water streaks, steep faces
# All lengths in real metres.
import math
import numpy as np

def _hash(ix, iz, seed):
    h = (ix * 374761393 + iz * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return (h ^ (h >> 16)) / 0xFFFFFFFF

def value_noise(x, z, cell, seed):
    gx, gz = x / cell, z / cell
    ix, iz = np.floor(gx).astype(np.int64), np.floor(gz).astype(np.int64)
    fx, fz = gx - ix, gz - iz
    sx, sz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    a, b = _hash(ix, iz, seed), _hash(ix + 1, iz, seed)
    c, d = _hash(ix, iz + 1, seed), _hash(ix + 1, iz + 1, seed)
    return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz

def fbm(x, z, cell, seed, octaves=4, ridged=False):
    out, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        n = value_noise(x, z, cell / (2 ** o), seed + o * 17)
        if ridged: n = 1 - abs(n * 2 - 1)
        out = out + n * amp; norm += amp; amp *= 0.5
    return out / norm

def worley(x, z, cell, seed, jitter=0.85):
    gx, gz = x / cell, z / cell
    ix, iz = np.floor(gx).astype(np.int64), np.floor(gz).astype(np.int64)
    f1 = np.full(x.shape, 9.0); f2 = np.full(x.shape, 9.0)
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            cx, cz = ix + dx, iz + dz
            px = cx + 0.5 + (_hash(cx, cz, seed) - 0.5) * jitter
            pz = cz + 0.5 + (_hash(cx, cz, seed + 7) - 0.5) * jitter
            d = np.hypot(gx - px, gz - pz)
            closer = d < f1
            f2 = np.where(closer, f1, np.minimum(f2, d)); f1 = np.where(closer, d, f1)
    return f1, f2

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def blur(a, r=2):
    k = np.exp(-0.5 * (np.arange(-2 * r, 2 * r + 1) / r) ** 2); k /= k.sum()
    p = np.pad(a, 2 * r, mode='edge')
    p = np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), 0, p)
    p = np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), 1, p)
    return p[2 * r:-2 * r, 2 * r:-2 * r]

def rock_surface(X, Z, rel, cell_m, seed=11):
    """X, Z: metre grids aligned with the elevation samples. rel: real height above the plain (m).
    Returns (height m, shade 0..1.15, rock mask, talus mask). Height never exceeds the real height except in the talus."""
    rock = smoothstep(25, 90, rel)
    # 1. deepen clefts between domes (concave only -> the skyline is untouched)
    concave = np.minimum(rel - blur(rel, 2), 0)
    H = rel + 0.9 * concave * rock
    # 2. granite joints carved in
    f1, f2 = worley(X, Z, 110.0, seed); crack = 1 - smoothstep(0.0, 0.06, f2 - f1)
    g1, g2 = worley(X + 37, Z - 11, 45.0, seed + 3); crack2 = 1 - smoothstep(0.0, 0.08, g2 - g1)
    H = H - (crack * 9.0 + crack2 * 4.0) * rock * smoothstep(0.2, 0.6, 1 - rel / max(rel.max(), 1) * 0.3)
    H = H - fbm(X, Z, 70.0, seed + 5, 3, ridged=True) * 4.0 * rock
    # 3. rough foot: lumps and rubble in the low talus band only
    talus = smoothstep(9, 16, rel) * (1 - smoothstep(40, 70, rel))
    H = H + (fbm(X, Z, 28.0, seed + 9, 3) - 0.3) * 7.0 * talus
    # 4. shading
    gz, gx = np.gradient(H, cell_m)
    slope = np.hypot(gx, gz)
    aspect = np.arctan2(gz, gx)
    across = X * -np.sin(aspect) + Z * np.cos(aspect)               # coordinate across the fall line
    streak = smoothstep(0.62, 0.85, value_noise(across, np.zeros_like(across), 9.0, seed + 21)) * smoothstep(0.6, 1.4, slope)
    lap = (np.roll(H, 1, 0) + np.roll(H, -1, 0) + np.roll(H, 1, 1) + np.roll(H, -1, 1) - 4 * H)
    shade = (1 - 0.45 * np.maximum(crack, crack2 * 0.7) * rock - np.clip(lap * 0.01, -0.12, 0.3)
             - 0.3 * streak * rock - 0.12 * smoothstep(0.8, 2.0, slope) + (fbm(X, Z, 40.0, seed + 31, 2) - 0.5) * 0.18 * rock)
    return H, np.clip(shade, 0.3, 1.15), rock, talus

def granite_detail(X, Z, H, rel, cell_m, seed=11):
    """Detail on an already deblurred real surface. Height changes are skyline-safe: cracks only cut IN (<= 3 m),
    talus lumps only in the low band at the foot. Returns (height m, shade, rock mask, talus mask)."""
    rock = smoothstep(25, 90, rel)
    f1, f2 = worley(X, Z, 110.0, seed); crack = 1 - smoothstep(0.0, 0.05, f2 - f1)
    g1, g2 = worley(X + 37, Z - 11, 45.0, seed + 3); crack2 = 1 - smoothstep(0.0, 0.07, g2 - g1)
    H = H - (crack * 3.0 + crack2 * 1.5) * rock
    talus = smoothstep(9, 16, rel) * (1 - smoothstep(40, 70, rel))
    H = H + (fbm(X, Z, 24.0, seed + 9, 3) - 0.3) * 6.0 * talus
    gz, gx = np.gradient(H, cell_m)
    slope = np.hypot(gx, gz); aspect = np.arctan2(gz, gx)
    across = X * -np.sin(aspect) + Z * np.cos(aspect)
    streak = smoothstep(0.6, 0.85, value_noise(across, np.zeros_like(across), 7.0, seed + 21)) * smoothstep(0.7, 1.6, slope)
    lap = (np.roll(H, 1, 0) + np.roll(H, -1, 0) + np.roll(H, 1, 1) + np.roll(H, -1, 1) - 4 * H)
    shade = (1 - 0.5 * np.maximum(crack, crack2 * 0.7) * rock - np.clip(lap * 0.02, -0.12, 0.3)
             - 0.32 * streak * rock - 0.1 * smoothstep(0.9, 2.2, slope) + (fbm(X, Z, 40.0, seed + 31, 2) - 0.5) * 0.18 * rock)
    return H, np.clip(shade, 0.3, 1.15), rock, talus

def granite_map(X, Z, H, cell_m, seed=31):
    """Baked granite detail (0..1, 0.5 = neutral), projected from above: fine joints and cracks, dark water streaks
    running down the fall line (they stretch vertically on the steep walls), exfoliation bands and lichen blotches."""
    rock = smoothstep(4, 35, H)
    gz, gx = np.gradient(H, cell_m); slope = np.hypot(gx, gz); aspect = np.arctan2(gz, gx)
    across = X * -np.sin(aspect) + Z * np.cos(aspect)
    streak = smoothstep(0.55, 0.9, value_noise(across, np.zeros_like(across), 3.5, seed + 1)) * smoothstep(0.35, 1.2, slope)
    streak2 = smoothstep(0.7, 0.95, value_noise(across, np.zeros_like(across), 1.6, seed + 2)) * smoothstep(0.5, 1.5, slope)
    f1, f2 = worley(X, Z, 34.0, seed + 3); crack = 1 - smoothstep(0.0, 0.05, f2 - f1)
    g1, g2 = worley(X + 13, Z - 7, 13.0, seed + 4); crack2 = 1 - smoothstep(0.0, 0.07, g2 - g1)
    blot = fbm(X, Z, 22.0, seed + 5, 3)
    bands = 0.5 + 0.5 * np.sin(H / 5.5 + fbm(X, Z, 40.0, seed + 6, 2) * 4)
    out = 0.5 + rock * (-0.3 * streak - 0.18 * streak2 - 0.3 * crack - 0.14 * crack2 + 0.2 * (blot - 0.5) + 0.06 * (bands - 0.5))
    return out
