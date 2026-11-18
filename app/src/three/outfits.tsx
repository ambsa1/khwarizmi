// Siraj's regional outfits. Siraj keeps his fixed body, lantern head and face in every world; only his clothes change
// with the region of the world he is in. Each outfit is a group of pieces fitted over his body (body centre y 0.62,
// radius 0.38, shoulders at about y 1.0). The lantern head is never covered: it carries his face and his light.
//
// To dress Siraj for a new region: add an entry to OUTFITS and map the world to it in OUTFIT_OF_WORLD.
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type OutfitId = 'none' | 'east';

/** Which outfit Siraj wears in each world. Worlds not listed keep his plain copper body until their outfit is designed. */
export const OUTFIT_OF_WORLD: Record<string, OutfitId> = {
  kassala: 'east',   // eastern Sudan
  suakin: 'east',    // eastern Sudan, Red Sea coast
};
export const outfitFor = (world?: string): OutfitId => (world && OUTFIT_OF_WORLD[world]) || 'none';

/** Does the outfit hide the copper body (so the body band and chest plate are not drawn)? */
export const COVERS_BODY: Record<OutfitId, boolean> = { none: false, east: true };

// ---------- textures ----------
let sideiriTex: THREE.CanvasTexture | null = null;
/** Beja sideiri (from reference photos of Beja men in eastern Sudan): plain dark cloth, no coloured embroidery,
 *  only tone-on-tone stitching along the edges and the hem. */
function sideiriTexture() {
  if (sideiriTex) return sideiriTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#2E2925'; g.fillRect(0, 0, 512, 256);
  g.globalAlpha = 0.06; g.fillStyle = '#ffffff';
  for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 512, 1);
  g.globalAlpha = 1;
  // tone-on-tone stitched piping along the hem and both front edges
  g.strokeStyle = '#4A423B'; g.lineWidth = 3; g.setLineDash([7, 5]);
  g.beginPath(); g.moveTo(0, 240); g.lineTo(512, 240); g.stroke();
  g.beginPath(); g.moveTo(12, 0); g.lineTo(12, 256); g.moveTo(500, 0); g.lineTo(500, 256); g.stroke();
  g.setLineDash([]);
  sideiriTex = new THREE.CanvasTexture(c); sideiriTex.colorSpace = THREE.SRGBColorSpace; sideiriTex.anisotropy = 4;
  return sideiriTex;
}

const lathe = (pts: [number, number][], seg = 28, phiStart = 0, phiLength = Math.PI * 2) =>
  // profile points are listed top -> bottom; the lathe needs them bottom -> top for outward-facing surfaces
  new THREE.LatheGeometry([...pts].reverse().map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLength);

// ---------- merged, vertex-coloured parts (each outfit costs only a few draw calls) ----------
function tint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  return g;
};

/** The Beja kaskara as ONE geometry: long straight blade in a leather scabbard widening toward its metal-capped tip,
 *  red leather amulets, a long straight cross guard, leather-wrapped grip and a black tassel. */
function kaskaraGeometry() {
  const pts: [number, number][] = [[0.032, 0.5], [0.034, 0.1], [0.036, -0.25], [0.055, -0.4], [0.05, -0.47], [0.012, -0.52]];
  const scab = new THREE.LatheGeometry(pts.reverse().map(([r, y]) => new THREE.Vector2(r, y)), 10); scab.scale(1, 1, 0.42);
  const parts = [
    tint(scab, '#7A4A2A'),
    tint(at(new THREE.ConeGeometry(0.03, 0.08, 6), 0, -0.55, 0, Math.PI), '#D9D6CF'),
    tint(at(new THREE.CylinderGeometry(0.038, 0.036, 0.05, 10), 0, 0.5, 0), '#D9D6CF'),
    ...[0.22, -0.02].flatMap(y => [
      tint(at(new THREE.ConeGeometry(0.05, 0.1, 3), 0.045, y, 0, 0, 0, -0.2), '#B8322A'),
      tint(at(new THREE.SphereGeometry(0.014, 8, 6), 0.045, y + 0.02, 0.022), '#E2A43C'),
    ]),
    tint(at(new THREE.BoxGeometry(0.36, 0.03, 0.035), 0, 0.56, 0), '#C9C6BF'),
    tint(at(new THREE.CylinderGeometry(0.022, 0.026, 0.17, 8), 0, 0.66, 0), '#2E1E14'),
    tint(at(new THREE.CylinderGeometry(0.045, 0.03, 0.03, 10), 0, 0.765, 0), '#C9C6BF'),
    tint(at(new THREE.ConeGeometry(0.05, 0.16, 7), 0, 0.72, 0.03, 0.5), '#141414'),
  ];
  return mergeGeometries(parts)!;
}

/** Eastern Sudan (Beja), from reference photos: long white jalabiya, plain dark sideiri open at the front and falling to
 *  the hips, with side pockets and a few buttons; the kaskara slung from a leather baldric across the chest, carried
 *  upright at the left side. No turban: the lantern head stays fully visible. */
function EastOutfit() {
  const g = useMemo(() => {
    const edge = (y: number) => { const a = -0.35, r = 0.445; return [Math.sin(a) * r, y, Math.cos(a) * r] as const; };
    // white robe + collar, and the small dark details (buttons, pockets) + the leather baldric, each merged
    const robe = mergeGeometries([
      tint(lathe([[0.2, 1.03], [0.33, 0.96], [0.405, 0.82], [0.415, 0.6], [0.44, 0.36], [0.48, 0.16], [0.47, 0.12]]), '#F7F4EC'),
      tint(lathe([[0.2, 1.03], [0.205, 1.06], [0.18, 1.07]]), '#F7F4EC'),
    ])!;
    const details = mergeGeometries([
      ...[0.86, 0.74, 0.62].map(y => tint(at(new THREE.SphereGeometry(0.018, 8, 6), ...edge(y)), '#8C7A62')),
      ...[-1, 1].map(sd => tint(at(new THREE.BoxGeometry(0.15, 0.12, 0.01), Math.sin(0.95 * sd) * 0.455, 0.53, Math.cos(0.95 * sd) * 0.455, 0, 0.95 * sd), '#25211E')),
      tint(at(new THREE.TorusGeometry(0.475, 0.022, 6, 32), 0, 0.72, 0, 0.1, 0, -0.85), '#8E3B24'),
    ])!;
    return {
      robe, details, sword: kaskaraGeometry(),
      // sideiri: open at the front (a gap of ~0.7 rad centred on +z), down to the hips
      sideiri: lathe([[0.37, 0.99], [0.43, 0.88], [0.44, 0.66], [0.452, 0.46], [0.458, 0.4]], 28, 0.35, Math.PI * 2 - 0.7),
    };
  }, []);
  const m = useMemo(() => ({
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 }),
    vest: new THREE.MeshStandardMaterial({ map: sideiriTexture(), roughness: 0.8, side: THREE.DoubleSide }),
  }), []);
  return (
    <group>
      <mesh geometry={g.robe} material={m.cloth} />
      <mesh geometry={g.sideiri} material={m.vest} />
      <mesh geometry={g.details} material={m.cloth} />
      {/* the kaskara carried upright at the LEFT side: hilt and guard clear of the head, plainly visible from the front */}
      <mesh geometry={g.sword} material={m.metal} position={[-0.62, 0.68, 0.06]} rotation={[-0.32, 0.1, 0.24]} scale={0.92} />
    </group>
  );
}

export function Outfit({ id }: { id: OutfitId }) {
  if (id === 'east') return <EastOutfit />;
  return null;
}
