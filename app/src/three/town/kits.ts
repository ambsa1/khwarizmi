// Station kits for the worlds beyond Kassala. Every station has four looks, chosen by progress:
//   plot (not started) -> scaffold (current station) -> built (all its lessons done) -> extra (thriving: plants, life)
// Shapes follow the real things in the reference photos of each place (man-made objects are geometric in reality;
// natural terrain never is - that comes from the elevation data). Front of every kit faces +z (toward the path).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const C = (hex: string) => new THREE.Color(hex);
function paint(g: THREE.BufferGeometry, color: string) {
  if (g.attributes.uv) g.deleteAttribute('uv');
  const ng = g.index ? g.toNonIndexed() : g, c = C(color), a = new Float32Array(ng.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3)); return ng;
}
const put = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) =>
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(...s)));
const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string, ry = 0) => paint(put(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, 0, ry), c);
const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, c: string, seg = 8, rx = 0, rz = 0) => paint(put(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, 0, rz), c);
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts)!;
const stones = (w: number, d: number, c = '#8C7860', n = 18) => merge(Array.from({ length: n }, (_, i) => {
  const t = i / n * 4, side = Math.floor(t), u = t - side;
  const [x, z] = [[-w / 2 + w * u, -d / 2], [w / 2, -d / 2 + d * u], [w / 2 - w * u, d / 2], [-w / 2, d / 2 - d * u]][side];
  return box(0.3, 0.22, 0.3, x, 0, z, c);
}));

export type Kit = { plot: THREE.BufferGeometry; scaffold: THREE.BufferGeometry; built: THREE.BufferGeometry; extra: THREE.BufferGeometry;
  /** an optional part that turns when the station is alive (the saqiya wheel), around its local X axis at `spinAt` */
  spin?: { geo: THREE.BufferGeometry; at: [number, number, number] } };

// ---------- the saqiya (Nile water wheel): vertical wheel with clay pots over the well, horizontal gear, draw beam ----------
function saqiya(): Kit {
  const wood = '#7A5A3C', dark = '#5E4430', mud = '#B8946A', pot = '#B5643A', water = '#3E8FC0', crop = '#6E9A3A';
  const wheel = (() => {
    const rim = paint(new THREE.TorusGeometry(1.6, 0.09, 6, 20), wood);
    const spokes = merge([0, 1, 2, 3].map(i => paint(put(new THREE.BoxGeometry(0.08, 3.2, 0.08), 0, 0, 0, 0, 0, i * Math.PI / 4), dark)));
    const pots = merge(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return paint(put(new THREE.CylinderGeometry(0.13, 0.09, 0.28, 6), Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0, 0, 0, a), pot); }));
    return put(merge([rim, spokes, pots]), 0, 0, 0, 0, Math.PI / 2, 0);   // wheel plane faces the path (+z) sideways
  })();
  const base = [
    box(2.4, 0.5, 2.4, 0, 0, -0.6, mud),                                  // well head
    box(0.25, 2.6, 0.25, 0, 0, -1.6, wood), box(0.25, 2.6, 0.25, 0, 0, 0.4, wood), // uprights of the wheel axle
    cyl(1.3, 1.3, 0.12, 2.2, 1.4, -0.6, wood, 14),                         // horizontal gear wheel
    box(0.12, 0.12, 3.6, 2.2, 1.6, 1.2, wood),                             // draw beam
    box(4.4, 0.18, 0.6, 3.6, 0.1, 2.2, mud), box(4.4, 0.06, 0.4, 3.6, 0.2, 2.2, water), // channel to the field
  ];
  const field = merge(Array.from({ length: 5 }, (_, i) => box(4.0, 0.25, 0.4, 6.2, 0, 0.2 + i * 0.9, crop)));
  return {
    plot: stones(5, 5),
    scaffold: merge([box(2.4, 0.5, 2.4, 0, 0, -0.6, mud), box(0.25, 2.6, 0.25, 0, 0, -1.6, wood), box(0.25, 2.6, 0.25, 0, 0, 0.4, wood)]),
    built: merge(base),
    extra: merge([field, cyl(0.12, 0.18, 3.4, 8.6, 1.7, -1.2, '#7A5A3C', 5), paint(put(new THREE.ConeGeometry(1.4, 1.2, 7), 8.6, 3.6, -1.2), '#5E8F3A')]),
    spin: { geo: wheel, at: [0, 2.3, -0.6] },
  };
}

// ---------- the Nile mooring: plank jetty on posts out over the water, with a sailing boat (felucca) ----------
function mooring(): Kit {
  const wood = '#7A5A3C', plank = '#A07A52', hull = '#2F6FA8', sail = '#F4EFE4';
  const posts = Array.from({ length: 6 }, (_, i) => box(0.2, 2.2, 0.2, i % 2 ? 0.9 : -0.9, -1.4, 1.2 + Math.floor(i / 2) * 2.2, wood));
  const deck = box(2.2, 0.15, 6.8, 0, 0.5, 3.4, plank);
  const boatHull = paint(put(new THREE.CylinderGeometry(0.75, 0.35, 5.2, 8, 1, false, 0, Math.PI), 2.6, 0.2, 4.4, Math.PI / 2, 0, Math.PI), hull);
  const mast = cyl(0.06, 0.08, 5.0, 2.6, 2.7, 4.6, wood, 5);
  const sailG = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([2.6, 5.1, 4.6, 2.6, 0.9, 2.0, 2.6, 0.9, 6.6], 3)); g.computeVertexNormals(); return paint(g, sail); })();
  return {
    plot: merge([box(0.2, 1.0, 0.2, -0.9, 0, 1.2, wood), box(0.2, 1.0, 0.2, 0.9, 0, 1.2, wood)]),
    scaffold: merge(posts),
    built: merge([...posts, deck, boatHull, mast, sailG]),
    extra: merge([cyl(0.2, 0.3, 2.2, -3.2, 1.1, -1.5, '#6B4A2E', 5), paint(put(new THREE.IcosahedronGeometry(1.8, 0), -3.2, 3.0, -1.5, 0, 0, 0, [1.3, 0.8, 1.3]), '#3E7334'),
      ...Array.from({ length: 3 }, (_, i) => box(1.6, 0.3, 0.5, 2.8 + i * 0.0, 0, -2.4 - i * 0.8, '#6E9A3A'))]),
  };
}

// ---------- Suakin coral house: coral-stone block, upper floor with a wooden rawshan (projecting screened window) ----------
function coralHouse(): Kit {
  const coral = '#EDE6D6', ruin = '#C9BFAA', wood = '#6B4A32', door = '#3E6E8E';
  const walls = [box(5, 3.0, 4, 0, 0, -0.5, coral), box(5, 2.6, 4, 0, 3.0, -0.5, coral), box(5.3, 0.25, 4.3, 0, 5.6, -0.5, coral)];
  const rawshan = [box(2.6, 1.8, 0.7, 0, 3.4, 1.85, wood), box(2.8, 0.15, 0.9, 0, 5.2, 1.85, wood), box(2.8, 0.15, 0.9, 0, 3.3, 1.85, wood)];
  return {
    plot: merge([box(5, 0.8, 0.4, 0, 0, 1.3, ruin), box(0.4, 1.4, 3.6, -2.3, 0, -0.5, ruin), box(1.6, 0.5, 0.4, 1.6, 0, -2.3, ruin)]),
    scaffold: merge([box(5, 2.2, 4, 0, 0, -0.5, ruin), ...[-2.6, 2.6].flatMap(x => [box(0.12, 5.4, 0.12, x, 0, 1.7, '#8C8274'), box(0.12, 5.4, 0.12, x, 0, -2.7, '#8C8274')])]),
    built: merge([...walls, ...rawshan, box(1.1, 2.0, 0.1, 1.4, 0, 1.52, door)]),
    extra: merge([box(0.5, 0.6, 0.5, -1.6, 0, 2.2, '#B5643A'), paint(put(new THREE.IcosahedronGeometry(0.6, 0), -1.6, 0.9, 2.2), '#4E8A3A'), box(5.2, 0.1, 0.1, 0, 5.85, 1.5, '#E2A43C')]),
  };
}

// ---------- Meroe: steep Nubian pyramid (~70 degree faces) with its small pylon chapel on the east (front) side ----------
function nubianPyramid(): Kit {
  const stone = '#B5835A', light = '#C99A6C', sand = '#D8B98C';
  const pyr = (h: number) => paint(put(new THREE.ConeGeometry(2.6 * (h / 7.2), h, 4, 1), 0, h / 2, -1.2, 0, Math.PI / 4, 0), stone);
  const chapel = [box(2.2, 1.6, 2.0, 0, 0, 2.2, light), box(0.8, 2.4, 0.5, -0.8, 0, 3.4, light), box(0.8, 2.4, 0.5, 0.8, 0, 3.4, light)];
  return {
    plot: merge([paint(put(new THREE.SphereGeometry(2.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0, -0.6, -1.2, 0, 0, 0, [1, 0.45, 1]), sand), box(0.6, 0.5, 0.6, 1.8, 0, 1.2, stone), box(0.5, 0.4, 0.5, -1.5, 0, 1.6, stone)]),
    scaffold: merge([pyr(3.2), box(2.2, 0.6, 2.0, 0, 0, 2.2, light)]),
    built: merge([pyr(7.2), ...chapel]),
    extra: merge([cyl(0.14, 0.2, 1.6, 3.2, 0.8, 2.6, '#6B4A2E', 5), paint(put(new THREE.IcosahedronGeometry(1.4, 0), 3.2, 2.0, 2.6, 0, 0, 0, [1.4, 0.55, 1.4]), '#5E8A3A')]),
  };
}

// ---------- Jebel Marra: dry-stone terrace with a green field, and a round tukul with a thatched cone roof ----------
function terraceFarm(): Kit {
  const wall = '#8E7E6A', soil = '#8A6A4A', crop = '#5E9A3A', mud = '#B08A62', thatch = '#C9A66B';
  const arc = (r: number, h: number, c: string) => merge(Array.from({ length: 7 }, (_, i) => { const a = -0.7 + i * 0.233; return box(1.3, h, 0.5, Math.sin(a) * r, 0, Math.cos(a) * r - r + 1.5, c, a); }));
  const tukul = [cyl(1.3, 1.35, 1.8, -2.6, 0.9, -2.0, mud, 10), paint(put(new THREE.ConeGeometry(1.75, 1.8, 10), -2.6, 2.7, -2.0), thatch)];
  return {
    plot: arc(5, 0.35, wall),
    scaffold: merge([arc(5, 0.9, wall), box(6, 0.3, 3, 0, 0, -0.4, soil)]),
    built: merge([arc(5, 0.9, wall), box(6, 0.35, 3, 0, 0, -0.4, crop), ...tukul]),
    extra: merge([cyl(0.15, 0.22, 1.8, 2.6, 0.9, -2.2, '#6B4A2E', 5), paint(put(new THREE.IcosahedronGeometry(1.2, 0), 2.6, 2.4, -2.2), '#3E7A34'),
      paint(put(new THREE.IcosahedronGeometry(0.3, 0), 3.0, 2.2, -1.6), '#E8A33C')]),
  };
}

export const KITS: Record<string, () => Kit> = { saqiya, mooring, coralHouse, nubianPyramid, terraceFarm };

// ---------- background kits (instanced across each world) ----------
export const BG: Record<string, () => THREE.BufferGeometry> = {
  /** round hut with thatched cone roof (Darfur, also northern farms' store huts) */
  tukul: () => merge([cyl(1, 1.05, 1.4, 0, 0.7, 0, '#B08A62', 9), paint(put(new THREE.ConeGeometry(1.35, 1.4, 9), 0, 2.1, 0), '#C9A66B')]),
  /** coral-stone house shell (Suakin), white when restored */
  coralBlock: () => merge([box(1, 1, 1, 0, 0, 0, '#ffffff')]),
  /** small ruined pyramid (the field of pyramids around the path) */
  pyramid: () => paint(put(new THREE.ConeGeometry(1, 2.6, 4, 1), 0, 1.3, 0, 0, Math.PI / 4, 0), '#ffffff'),
  /** acacia: thin trunk, flat wide crown */
  acacia: () => merge([cyl(0.12, 0.18, 1.6, 0, 0.8, 0, '#6B4A2E', 5), paint(put(new THREE.IcosahedronGeometry(1.5, 0), 0, 1.9, 0, 0, 0, 0, [1.4, 0.35, 1.4]), '#5E8A3A')]),
  /** crop field patch (flat, green rows) */
  field: () => merge(Array.from({ length: 4 }, (_, i) => box(3.4, 0.15, 0.6, 0, 0, -1.2 + i * 0.8, '#ffffff'))),
  /** small felucca on the water */
  boat: () => merge([paint(put(new THREE.CylinderGeometry(0.5, 0.25, 3.4, 8, 1, false, 0, Math.PI), 0, 0.15, 0, Math.PI / 2, 0, Math.PI), '#7A5A3C'),
    cyl(0.04, 0.05, 3.2, 0, 1.7, 0, '#6B4A2E', 5), (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 3.2, 0, 0, 0.6, -1.6, 0, 0.6, 1.4], 3)); g.computeVertexNormals(); return paint(g, '#F4EFE4'); })()]),
};
