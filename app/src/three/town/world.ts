// Loads a generated drone-view world (public/worlds/<id>/world.json + terrain.bin + massif.bin) and gives the scene
// what it needs: ground height anywhere (plain or real rock), the street as one polyline with distances,
// each plot's place on it, and a lat/lon -> scene conversion for review cameras placed at real photo positions.
import { useEffect, useState } from 'react';

export type Plot = { n: number; zone: string; skill: string; sx: number; sz: number; x: number; z: number; face: number; y: number };
type MeshInfo = { vertsOffset: number; shadeOffset: number; trisOffset: number; vertCount: number; triCount: number };
export type PatchInfo = { name: string; x0: number; x1: number; z0: number; z1: number; w: number; h: number; offset: number;
  shadeOffset: number; vertsOffset: number; trisOffset: number; vertCount: number; triCount: number; lo: MeshInfo; detail: string };
export type RockMesh = { verts: Float32Array; shade: Uint8Array; tris: Uint32Array; vertCount: number; triCount: number };
/** H: coarse rock heights for ground queries; verts/shade/tris: the adaptive rock mesh itself. */
export type Patch = PatchInfo & RockMesh & { H: Float32Array; low: RockMesh };
export type WorldData = {
  version: number; unitMetres: number; heightScale: number;
  geo: { lat0: number; lon0: number; kx: number; ky: number };
  bounds: { x0: number; x1: number; z0: number; z1: number };
  grid: { w: number; h: number; file: string };
  massif: { file: string; patches: PatchInfo[] };
  river: [number, number][];
  route: { zone: string; points: [number, number][] }[];
  plots: Plot[];
  beacon: { x: number; y: number; z: number };
  roads: { w: number; points: [number, number][] }[];
  houses: [number, number, number, number, number, number][]; // x z rot width depth height
  trees: [number, number, number][];                            // x z scale
  palms: [number, number, number, number][];                    // x z scale rot
  boulders: [number, number, number][];                         // x z size
  grass: [number, number, number][];                            // x z scale
  yardTrees: [number, number, number][];                        // x z scale (courtyard trees, grow in the finale)
  compounds: [number, number, number, number, number, number][]; // x z rot width depth height (built as you progress)
  shops: [number, number, number, number][];                    // x z rot awningColour
  posts: [number, number, number][][];                          // lamp posts per street side: x z rot
  jars: [number, number, number][];                             // zeer water jars: x z rot
  alleys: [number, number][][];                                 // side alleys
  shadeTrees: [number, number, number][];                       // x z scale
  shrubs: [number, number, number, number][];                   // x z scale bougainvillea(1)/green(0)
  riverLine: [number, number, number][];                        // Gash centre line x z width, upstream first
  plotS: number[];                                              // each plot's distance along the street (field units)
  streetLength: number;
  field: { file: string; w: number; h: number };                // revival field: (s, d) per cell
  landmarks: Record<string, { x: number; y: number; z: number; rot?: number }>;
};

export type World = WorldData & {
  heights: Float32Array;
  patches: Patch[];
  plain: (x: number, z: number) => number;
  ground: (x: number, z: number) => number;
  toScene: (lat: number, lon: number) => { x: number; z: number };
  street: [number, number][];
  streetLen: number[];          // cumulative length at each street point
  at: (s: number) => { x: number; z: number; tx: number; tz: number };
  plotSRoute: number[];         // distance along the runtime street polyline of each plot's door (Siraj, camera)
  fieldData: Float32Array;
};

function bilinear(arr: ArrayLike<number>, w: number, h: number, fx: number, fz: number) {
  fx = Math.min(Math.max(fx, 0), w - 1.001); fz = Math.min(Math.max(fz, 0), h - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, A = (a: number, b: number) => arr[b * w + a];
  return A(i, j) * (1 - u) * (1 - v) + A(i + 1, j) * u * (1 - v) + A(i, j + 1) * (1 - u) * v + A(i + 1, j + 1) * u * v;
}

function build(d: WorldData, heights: Float32Array, massif: ArrayBuffer, fieldData: Float32Array): World {
  const { x0, x1, z0, z1 } = d.bounds, { w, h } = d.grid;
  const patches: Patch[] = d.massif.patches.map(p => ({
    ...p, H: new Float32Array(massif, p.offset, p.w * p.h), verts: new Float32Array(massif, p.vertsOffset, p.vertCount * 3),
    shade: new Uint8Array(massif, p.shadeOffset, p.vertCount), tris: new Uint32Array(massif, p.trisOffset, p.triCount * 3),
    low: { verts: new Float32Array(massif, p.lo.vertsOffset, p.lo.vertCount * 3), shade: new Uint8Array(massif, p.lo.shadeOffset, p.lo.vertCount),
      tris: new Uint32Array(massif, p.lo.trisOffset, p.lo.triCount * 3), vertCount: p.lo.vertCount, triCount: p.lo.triCount },
  }));
  const plain = (x: number, z: number) => bilinear(heights, w, h, (x - x0) / (x1 - x0) * (w - 1), (z - z0) / (z1 - z0) * (h - 1));
  const ground = (x: number, z: number) => {
    let g = plain(x, z);
    for (const p of patches) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      const v = bilinear(p.H, p.w, p.h, (x - p.x0) / (p.x1 - p.x0) * (p.w - 1), (z - p.z0) / (p.z1 - p.z0) * (p.h - 1));
      if (v > g) g = v;
    }
    return g;
  };
  const toScene = (lat: number, lon: number) => ({ x: (lon - d.geo.lon0) * d.geo.kx / d.unitMetres, z: -(lat - d.geo.lat0) * d.geo.ky / d.unitMetres });
  const street: [number, number][] = [];
  for (const seg of d.route) for (const p of seg.points) {
    const last = street[street.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.3) street.push(p);
  }
  const streetLen = [0];
  for (let i = 1; i < street.length; i++) streetLen.push(streetLen[i - 1] + Math.hypot(street[i][0] - street[i - 1][0], street[i][1] - street[i - 1][1]));
  const total = streetLen[streetLen.length - 1];
  const at = (s: number) => {
    s = Math.min(Math.max(s, 0), total);
    let lo = 0, hi = streetLen.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (streetLen[m] <= s) lo = m; else hi = m; }
    const a = street[lo], b = street[hi], L = streetLen[hi] - streetLen[lo] || 1, u = (s - streetLen[lo]) / L;
    return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
  };
  const plotSRoute = d.plots.map(p => {
    let best = 0, bd = Infinity;
    for (let i = 1; i < street.length; i++) {
      const [ax, az] = street[i - 1], [bx, bz] = street[i];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const u = Math.min(Math.max(((p.sx - ax) * dx + (p.sz - az) * dz) / L2, 0), 1);
      const qx = ax + dx * u, qz = az + dz * u, dd = (qx - p.sx) ** 2 + (qz - p.sz) ** 2;
      if (dd < bd) { bd = dd; best = streetLen[i - 1] + Math.sqrt(L2) * u; }
    }
    return best;
  });
  return { ...d, heights, patches, plain, ground, toScene, street, streetLen, at, plotSRoute, fieldData };
}

const cache = new Map<string, Promise<World>>();
export function loadWorld(id: string): Promise<World> {
  if (!cache.has(id)) {
    const base = `${import.meta.env.BASE_URL}worlds/${id}/`;
    cache.set(id, (async () => {
      const d: WorldData = await (await fetch(base + 'world.json')).json();
      const [heights, massif, field] = await Promise.all([
        fetch(base + d.grid.file).then(r => r.arrayBuffer()).then(b => new Float32Array(b)),
        fetch(base + d.massif.file).then(r => r.arrayBuffer()),
        fetch(base + d.field.file).then(r => r.arrayBuffer()).then(b => new Float32Array(b)),
      ]);
      return build(d, heights, massif, field);
    })());
  }
  return cache.get(id)!;
}

export function useWorld(id: string): World | null {
  const [w, setW] = useState<World | null>(null);
  useEffect(() => { let live = true; loadWorld(id).then(x => live && setW(x)); return () => { live = false; }; }, [id]);
  return w;
}
