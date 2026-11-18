// Geometry for the drone-view worlds, built once from the generated world data.
// Everything is merged or instanced so a whole town stays within the low-tier draw-call budget.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../kit';
import type { RockMesh, World } from './world';
export { PAL as CLAY };

/** Living colours of Kassala at golden hour. The revival shader turns everything not yet reached into dusty grey. */
export const PAL = {
  ground: '#D8B98C', groundDark: '#C29B6C', bed: '#EAD6AE', rock: '#A98F82', rockDark: '#5F4C45', rockLight: '#CDB8AA',
  street: '#F2E4C8', curb: '#9C7652', road: '#E0C9A0', house: '#E2C49C', lesson: '#EDD3AA', plot: '#8C7860',
  tree: '#3F7A35', palm: '#5E8F3A', trunk: '#7A5A3C', grass: '#86A84A',
  skyTop: '#8DB8DA', skyBottom: '#FFDDA8', fog: '#F3D9B4', glow: '#FFD27A',
};
/** Sudanese painted doors, one colour per zone of the street. */
export const DOOR: Record<string, string> = {
  'kassala.gash': '#2F7FD8', 'kassala.orchards': '#1A7F50', 'kassala.houses': '#D9643A', 'kassala.souq': '#C2416E',
  'kassala.crafts': '#7A4FB8', 'kassala.ascent': '#E2A43C', 'kassala.upper': '#1FA3A3',
};
/** Mud-plaster and lime-wash tones for the town houses. */
export const WALLS = ['#E2C49C', '#D9B486', '#EBD7B5', '#CFA27A', '#F1E6D2', '#E6BE95', '#D6AE8A'];

const col = (hex: string) => new THREE.Color(hex);
function paint(g: THREE.BufferGeometry, c: THREE.Color | ((i: number, p: THREE.Vector3) => THREE.Color)) {
  const pos = g.attributes.position, arr = new Float32Array(pos.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const k = typeof c === 'function' ? c(i, v) : c; arr.set([k.r, k.g, k.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Terrain: the real elevation grid, shaded darker on slopes and lighter in the sandy riverbed. */
export function terrainGeometry(w: World) {
  const { x0, x1, z0, z1 } = w.bounds, { w: gw, h: gh } = w.grid;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, gw - 1, gh - 1);
  g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, w.heights[i]);
  g.computeVertexNormals();
  const base = col(PAL.ground), dark = col(PAL.groundDark), bed = col(PAL.bed), n = g.attributes.normal;
  paint(g, (i, p) => {
    const slope = 1 - n.getY(i), c = base.clone();
    if (p.y < -0.35) return c.lerp(bed, 0.85);
    return c.lerp(dark, Math.min(slope * 2.2, 0.8));
  });
  return g;
}

/** A massif: the real rock surface (adaptive mesh from the elevation data). Smooth-shaded like bald granite;
 *  joints, cracks and dark water streaks are carried in the vertex colour. */
export function massifGeometry(p: RockMesh) {
  const rock = col(PAL.rock), dark = col(PAL.rockDark), light = col(PAL.rockLight), apron = col(PAL.groundDark), c = new THREE.Color();
  const colr = new Float32Array(p.vertCount * 3);
  for (let v = 0; v < p.vertCount; v++) {
    const y = p.verts[v * 3 + 1], s = p.shade[v] / 255 * 1.15;
    c.copy(apron).lerp(rock, Math.min(Math.max((y - 0.9) / 3, 0), 1)).lerp(light, Math.min(Math.max((y - 25) / 35, 0), 0.5));
    c.lerp(dark, Math.min(Math.max(1 - s, 0) * 1.6, 0.85)).multiplyScalar(Math.min(s, 1) * 0.25 + 0.75);
    colr[v * 3] = c.r; colr[v * 3 + 1] = c.g; colr[v * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p.verts), 3));
  g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(p.tris), 1));
  g.computeVertexNormals();
  return g;
}

/** The Gash riverbed as a flat sand shape laid on the ground. */
export function riverGeometry(w: World) {
  const shape = new THREE.Shape(w.river.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, w.ground(pos.getX(i), pos.getZ(i)) + 0.12);
  g.computeVertexNormals();
  return paint(g, col(PAL.bed));
}

/** Flat ribbons along polylines, draped on the ground (streets). */
export function ribbons(lines: { w: number; points: [number, number][] }[], ground: (x: number, z: number) => number, lift: number, color: string, step = Infinity) {
  const pos: number[] = [], idx: number[] = [];
  for (const ln of lines) {
    const p = ln.points, hw = ln.w / 2;
    // subdivide long pieces so the ribbon hugs rough ground (the trail up the rock)
    const q: [number, number][] = [p[0]];
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
      for (let k = 1; k <= n; k++) q.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    for (let i = 0; i < q.length - 1; i++) {
      const [ax, az] = q[i], [bx, bz] = q[i + 1], L = Math.hypot(bx - ax, bz - az);
      if (L < 1e-3) continue;
      const nx = -(bz - az) / L * hw, nz = (bx - ax) / L * hw, base = pos.length / 3;
      // extend each piece a little so joints overlap without gaps
      const ex = (bx - ax) / L * hw * 0.8, ez = (bz - az) / L * hw * 0.8;
      for (const [x, z] of [[ax - ex + nx, az - ez + nz], [ax - ex - nx, az - ez - nz], [bx + ex + nx, bz + ez + nz], [bx + ex - nx, bz + ez - nz]]) pos.push(x, ground(x, z) + lift, z);
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return paint(g, col(color));
}

// ---------- houses ----------
const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); g.deleteAttribute('uv'); return paint(g, col(c));
};

/** A Kassala courtyard house (front faces +z): flat-roofed mud-brick block with parapet, walled yard, door. */
export function lessonHouseGeometry() {
  const L = PAL.lesson, D = '#6E4B32';
  const parts = [
    box(5.2, 3.0, 3.8, 0, 0, -0.9, L),
    box(5.6, 0.35, 0.3, 0, 3.0, -2.65, L), box(5.6, 0.35, 0.3, 0, 3.0, 0.85, L), box(0.3, 0.35, 3.8, -2.65, 3.0, -0.9, L), box(0.3, 0.35, 3.8, 2.65, 3.0, -0.9, L),
    box(0.25, 1.4, 2.8, -2.55, 0, 2.3, L), box(0.25, 1.4, 2.8, 2.55, 0, 2.3, L), box(1.9, 1.4, 0.25, -1.65, 0, 3.6, L), box(1.9, 1.4, 0.25, 1.65, 0, 3.6, L),
  ];
  void D;
  return mergeGeometries(parts)!;
}
/** The same house half built: low walls and a timber scaffold. */
export function scaffoldGeometry() {
  const L = PAL.lesson, T = '#8C8274';
  const parts = [box(5.2, 1.3, 3.8, 0, 0, -0.9, L)];
  for (const x of [-2.9, 0, 2.9]) for (const z of [-3.0, 1.2]) parts.push(box(0.14, 3.6, 0.14, x, 0, z, T));
  parts.push(box(6.0, 0.12, 0.14, 0, 2.2, 1.2, T), box(6.0, 0.12, 0.14, 0, 3.4, 1.2, T), box(6.0, 0.12, 0.14, 0, 2.2, -3.0, T));
  return mergeGeometries(parts)!;
}
/** An empty plot marked out with small stones. */
export function plotGeometry() {
  const parts: THREE.BufferGeometry[] = [], R = rng(5);
  for (let i = 0; i < 22; i++) {
    const t = i / 22, per = t * 4, side = Math.floor(per), u = per - side;
    const [x, z] = [[-2.8 + 5.6 * u, -3.0], [2.8, -3.0 + 6.6 * u], [2.8 - 5.6 * u, 3.6], [-2.8, 3.6 - 6.6 * u]][side];
    const s = 0.28 + R() * 0.18; parts.push(box(s, s * 0.8, s, x, 0, z, PAL.plot));
  }
  return mergeGeometries(parts)!;
}
/** Painted door and two window shutters of a lesson house (instanced with the zone's colour). */
export function doorGeometry() {
  const parts = [box(1.0, 1.9, 0.12, 0, 0, 1.0, '#ffffff'), box(0.9, 0.7, 0.1, -1.6, 1.4, 1.0, '#ffffff'), box(0.9, 0.7, 0.1, 1.6, 1.4, 1.0, '#ffffff'),
    box(5.7, 0.18, 0.34, 0, 2.86, -2.65, '#ffffff'), box(5.7, 0.18, 0.34, 0, 2.86, 0.85, '#ffffff')];
  return mergeGeometries(parts)!;
}
/** Grass tuft: three crossed blades. */
export function grassGeometry() {
  const pos: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI, c = Math.cos(a) * 0.45, s = Math.sin(a) * 0.45;
    pos.push(-c, 0, -s, c, 0, s, 0, 0.9, 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return paint(g, col(PAL.grass));
}
/** The Gash water ribbon along the river's centre line; uv.x runs upstream (0) to downstream (1). */
export function waterGeometry(w: World) {
  const p = w.riverLine, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let L = 0; const acc = [0];
  for (let i = 1; i < p.length; i++) { L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); acc.push(L); }
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(i - 1, 0)], b = p[Math.min(i + 1, p.length - 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const width = Math.max(p[i][2], 6);
    const nx = -(b[1] - a[1]) / tl * width / 2, nz = (b[0] - a[0]) / tl * width / 2;
    for (const sd of [-1, 1]) { const x = p[i][0] + nx * sd, z = p[i][1] + nz * sd; pos.push(x, w.ground(x, z) + 0.45, z); uv.push(acc[i] / L, sd < 0 ? 0 : 1); }
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
export function bgHouseGeometry() { return box(1, 1, 1, 0, 0, 0, '#ffffff'); }
export function boulderGeometry() { const g = new THREE.IcosahedronGeometry(1, 0); return paint(g, col(PAL.rock)); }
/** Date palm: slim trunk and a crown of drooping fronds (lines the lesson street). */
export function palmGeometry() {
  const trunk = new THREE.CylinderGeometry(0.13, 0.2, 3.6, 5, 1, true); trunk.translate(0, 1.8, 0); trunk.deleteAttribute('uv'); paint(trunk, col(PAL.trunk));
  const parts: THREE.BufferGeometry[] = [trunk.toNonIndexed()];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.ConeGeometry(0.32, 2.3, 3, 1, true); f.deleteAttribute('uv');
    f.translate(0, 1.15, 0); f.rotateZ(-1.15); f.rotateY(i / 7 * Math.PI * 2); f.translate(0, 3.55, 0);
    parts.push(paint(f.toNonIndexed(), col(PAL.palm)));
  }
  return mergeGeometries(parts)!;
}
export function treeGeometry() {
  const trunk = new THREE.CylinderGeometry(0.16, 0.22, 1.3, 5, 1, true); trunk.translate(0, 0.65, 0); trunk.deleteAttribute('uv'); paint(trunk, col('#6B4A2E'));
  const crown = new THREE.IcosahedronGeometry(1.25, 0); crown.scale(1, 0.85, 1); crown.translate(0, 2.05, 0); crown.deleteAttribute('uv'); paint(crown, col(PAL.tree));
  return mergeGeometries([trunk.toNonIndexed(), crown.index ? crown.toNonIndexed() : crown])!;
}

/** El-Hassan mosque, Khatmiyya: brick block, tall truncated dome with a ring of niches, arcade, slim minaret. */
export function mosqueGeometry() {
  const M = '#C9875A', Dk = '#8A4F2E', parts: THREE.BufferGeometry[] = [];
  parts.push(box(14, 4.2, 10, 0, 0, 0, M));
  const dome = new THREE.LatheGeometry([0, 1, 2, 3, 4, 5, 6].map(i => new THREE.Vector2(4.6 - Math.pow(i / 6, 1.6) * 1.6, 4.2 + i * 0.95)), 24);
  dome.deleteAttribute('uv'); parts.push(paint(dome, col(M)));
  const cap = new THREE.CircleGeometry(3.0, 24); cap.rotateX(-Math.PI / 2); cap.translate(0, 9.9, 0); cap.deleteAttribute('uv'); parts.push(paint(cap, col(M)));
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const g = box(0.6, 1.0, 0.2, 0, 0, 0, Dk); g.rotateY(-a); g.translate(Math.sin(a) * 4.45, 6.0, Math.cos(a) * 4.45); parts.push(g); }
  for (let i = 0; i < 6; i++) parts.push(box(0.7, 3.2, 0.7, -6.2 + i * 2.48, 0, 5.6, M));
  parts.push(box(14.4, 0.8, 1.6, 0, 3.2, 5.6, M));
  const tower = new THREE.CylinderGeometry(0.75, 1.05, 12, 12); tower.translate(8.5, 6, -3.5); tower.deleteAttribute('uv'); parts.push(paint(tower, col(M)));
  const cone = new THREE.ConeGeometry(0.85, 2.4, 12); cone.translate(8.5, 13.2, -3.5); cone.deleteAttribute('uv'); parts.push(paint(cone, col(M)));
  return mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)))!;
}

// ---------- the rich town (built as the child progresses) ----------
/** Quad helper for open shells (no hidden bottoms). */
function quads(list: number[][], color: string) {
  const pos: number[] = [];
  for (const [ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz] of list) pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return paint(g, col(color));
}
const shell = (w: number, h: number, d: number, x = 0, z = 0, c = '#ffffff') => {
  const a = x - w / 2, b = x + w / 2, f = z + d / 2, k = z - d / 2;
  return quads([
    [a, 0, f, b, 0, f, b, h, f, a, h, f], [b, 0, k, a, 0, k, a, h, k, b, h, k],
    [b, 0, f, b, 0, k, b, h, k, b, h, f], [a, 0, k, a, 0, f, a, h, f, a, h, k],
    [a, h, f, b, h, f, b, h, k, a, h, k],
  ], c);
};
/** A walled compound (front +z): house block at the back, a low yard wall in front, a dark gate. Unit size,
 *  scaled per instance; wall colour comes from the instance. */
export function compoundGeometry() {
  return mergeGeometries([
    shell(1, 1, 0.55, 0, -0.22),
    shell(0.06, 0.42, 0.5, -0.47, 0.25), shell(0.06, 0.42, 0.5, 0.47, 0.25), shell(0.36, 0.42, 0.06, -0.3, 0.48), shell(0.36, 0.42, 0.06, 0.3, 0.48),
    shell(0.22, 0.34, 0.03, 0, 0.5, '#6B4A32'),
  ])!;
}
/** Small street shop: plastered box with a dark doorway; the awning is a separate instanced mesh (coloured). */
export function shopGeometry() {
  return mergeGeometries([shell(2.4, 2.1, 2.0, 0, 0, '#EFE2C8'), shell(1.0, 1.5, 0.05, 0, 1.0, '#5A3E2B')])!;
}
export function awningGeometry() {
  const g = quads([[-1.35, 2.05, 1.0, 1.35, 2.05, 1.0, 1.35, 1.55, 2.0, -1.35, 1.55, 2.0]], '#ffffff');
  return g;
}
/** Street lamp post: pole, arm and lantern housing (the light itself is a glow sprite). */
export function postGeometry() {
  const pole = new THREE.CylinderGeometry(0.07, 0.1, 4.2, 5, 1, true); pole.translate(0, 2.1, 0); pole.deleteAttribute('uv'); paint(pole, col('#4A3A2E'));
  const arm = new THREE.BoxGeometry(0.08, 0.08, 1.0); arm.translate(0, 4.1, 0.45); arm.deleteAttribute('uv'); paint(arm, col('#4A3A2E'));
  const lan = new THREE.CylinderGeometry(0.18, 0.12, 0.42, 6); lan.translate(0, 3.8, 0.9); lan.deleteAttribute('uv'); paint(lan, col('#E9C77A'));
  return mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed(), lan.toNonIndexed()])!;
}
/** Zeer water jars on a wooden stand under a little shade. */
export function jarGeometry() {
  const jar = new THREE.LatheGeometry([[0, 0], [0.32, 0.1], [0.42, 0.45], [0.36, 0.8], [0.2, 0.92], [0.22, 1.0]].map(([x, y]) => new THREE.Vector2(x, y)), 7);
  jar.translate(-0.45, 0.35, 0); jar.deleteAttribute('uv'); paint(jar, col('#B5643A'));
  const jar2 = jar.clone(); jar2.translate(0.9, 0, 0);
  const stand = box(1.5, 0.35, 0.6, 0, 0, 0, '#7A5A3C');
  const posts = [box(0.08, 1.7, 0.08, -0.75, 0, -0.35, '#6B4A2E'), box(0.08, 1.7, 0.08, 0.75, 0, -0.35, '#6B4A2E')];
  const roof = box(1.8, 0.08, 1.0, 0, 1.7, 0, '#C9A66B');
  return mergeGeometries([jar.toNonIndexed(), jar2.toNonIndexed(), stand.toNonIndexed(), ...posts.map(p => p.toNonIndexed()), roof.toNonIndexed()])!;
}
/** Broad shade tree (neem / ficus): short trunk, wide flat crown. */
export function shadeTreeGeometry() {
  const trunk = new THREE.CylinderGeometry(0.22, 0.32, 1.8, 5, 1, true); trunk.translate(0, 0.9, 0); trunk.deleteAttribute('uv'); paint(trunk, col('#5E4430'));
  const c1 = new THREE.IcosahedronGeometry(2.0, 0); c1.scale(1.25, 0.62, 1.25); c1.translate(0, 2.7, 0); c1.deleteAttribute('uv'); paint(c1, col('#3E7334'));
  const c2 = new THREE.IcosahedronGeometry(1.3, 0); c2.scale(1.1, 0.7, 1.1); c2.translate(0.7, 3.3, -0.4); c2.deleteAttribute('uv'); paint(c2, col('#4C8A3B'));
  return mergeGeometries([trunk.toNonIndexed(), c1, c2])!;
}
/** Low shrub (instance colour: green, or bougainvillea pink/magenta). */
export function shrubGeometry() {
  const g = new THREE.IcosahedronGeometry(0.9, 0); g.scale(1.2, 0.75, 1.2); g.translate(0, 0.55, 0);
  return paint(g, col('#ffffff'));
}
/** A narrow paved alley (flat ribbon). */
export function alleyGeometry(lines: [number, number][][], ground: (x: number, z: number) => number) {
  return ribbons(lines.map(p => ({ w: 1.6, points: p })), ground, 0.26, '#D8C29C', 1.2);
}
/** Electric wires between consecutive lamp posts on each side, sagging between poles. */
export function wireGeometry(sides: [number, number, number][][], ground: (x: number, z: number) => number) {
  const pos: number[] = [];
  for (const posts of sides) for (let i = 1; i < posts.length; i++) {
    const [ax, az, ar] = posts[i - 1], [bx, bz, br] = posts[i];
    if (Math.hypot(bx - ax, bz - az) > 30) continue;
    const A = new THREE.Vector3(ax + Math.sin(ar) * 0.9, ground(ax, az) + 4.12, az + Math.cos(ar) * 0.9);
    const B = new THREE.Vector3(bx + Math.sin(br) * 0.9, ground(bx, bz) + 4.12, bz + Math.cos(br) * 0.9);
    let prev = A;
    for (let k = 1; k <= 6; k++) {
      const t = k / 6, p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * 0.55;
      pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z); prev = p;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
