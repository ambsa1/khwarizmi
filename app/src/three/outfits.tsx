// Siraj's regional outfits. Siraj keeps his fixed body, lantern head and face in every world; only his clothes change
// with the region of the world he is in. Each outfit is a group of pieces fitted over his body (body centre y 0.62,
// radius 0.38, shoulders at about y 1.0). The lantern head is never covered: it carries his face and his light.
//
// To dress Siraj for a new region: add an entry to OUTFITS and map the world to it in OUTFIT_OF_WORLD.
import { useMemo } from 'react';
import * as THREE from 'three';

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
/** Eastern sideiri: deep indigo cloth with gold and red geometric embroidery along the hem and the front edges. */
function sideiriTexture() {
  if (sideiriTex) return sideiriTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#1F2B4A'; g.fillRect(0, 0, 512, 256);
  // fine woven texture
  g.globalAlpha = 0.08; g.fillStyle = '#ffffff';
  for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 512, 1);
  g.globalAlpha = 1;
  // embroidery band along the hem (bottom of the texture = bottom of the vest)
  const band = (y: number, h: number) => {
    g.fillStyle = '#C9302C'; g.fillRect(0, y, 512, h);
    g.fillStyle = '#E8B83C';
    for (let x = 0; x < 512; x += 16) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 8, y + 2); g.lineTo(x + 16, y + h); g.closePath(); g.fill(); }
    g.fillStyle = '#F4E6C2'; for (let x = 8; x < 512; x += 16) g.fillRect(x - 1, y + h - 6, 2, 2);
  };
  band(222, 26);
  band(0, 14);
  // embroidered panels down both front edges (texture edges = the open front)
  for (const x0 of [0, 488]) {
    g.fillStyle = '#C9302C'; g.fillRect(x0, 0, 24, 256);
    g.fillStyle = '#E8B83C'; for (let y = 6; y < 256; y += 18) { g.beginPath(); g.moveTo(x0 + 12, y); g.lineTo(x0 + 20, y + 8); g.lineTo(x0 + 12, y + 16); g.lineTo(x0 + 4, y + 8); g.closePath(); g.fill(); }
  }
  // scattered small motifs on the back
  g.fillStyle = '#E8B83C';
  for (let y = 60; y < 200; y += 46) for (let x = 120; x < 400; x += 70) { g.save(); g.translate(x + (y % 92 ? 35 : 0), y); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore(); }
  sideiriTex = new THREE.CanvasTexture(c); sideiriTex.colorSpace = THREE.SRGBColorSpace; sideiriTex.anisotropy = 4;
  return sideiriTex;
}

const lathe = (pts: [number, number][], seg = 28, phiStart = 0, phiLength = Math.PI * 2) =>
  // profile points are listed top -> bottom; the lathe needs them bottom -> top for outward-facing surfaces
  new THREE.LatheGeometry([...pts].reverse().map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLength);

/** Eastern Sudan: white jalabiya, embroidered eastern sideiri open at the front, a straight sword in its leather
 *  sheath carried on the back over the right shoulder. No turban, so the lantern head stays fully visible. */
function EastOutfit() {
  const g = useMemo(() => ({
    jalabiya: lathe([[0.2, 1.03], [0.33, 0.96], [0.405, 0.82], [0.41, 0.6], [0.43, 0.36], [0.47, 0.17], [0.46, 0.14]]),
    collar: lathe([[0.2, 1.03], [0.205, 1.06], [0.18, 1.07]]),
    // sideiri: open at the front (a gap of ~0.9 rad centred on +z)
    sideiri: lathe([[0.36, 0.99], [0.425, 0.88], [0.43, 0.7], [0.44, 0.52]], 28, 0.45, Math.PI * 2 - 0.9),
  }), []);
  const m = useMemo(() => ({
    white: new THREE.MeshStandardMaterial({ color: '#F7F4EC', roughness: 0.75 }),
    vest: new THREE.MeshStandardMaterial({ map: sideiriTexture(), roughness: 0.7, side: THREE.DoubleSide }),
    leather: new THREE.MeshStandardMaterial({ color: '#5A3A22', roughness: 0.6 }),
    grip: new THREE.MeshStandardMaterial({ color: '#2E1E14', roughness: 0.7 }),
    silver: new THREE.MeshStandardMaterial({ color: '#D9D6CF', roughness: 0.3, metalness: 0.7 }),
    brass: new THREE.MeshStandardMaterial({ color: '#E2A43C', roughness: 0.35, metalness: 0.5 }),
  }), []);
  return (
    <group>
      <mesh geometry={g.jalabiya} material={m.white} />
      <mesh geometry={g.collar} material={m.white} />
      <mesh geometry={g.sideiri} material={m.vest} />
      {/* sword on the back: sheath runs from behind the left hip up over the right shoulder, hilt above it */}
      <group position={[0.02, 0.72, -0.44]} rotation={[0.08, 0, -0.62]}>
        <mesh material={m.leather} position-y={-0.05}><boxGeometry args={[0.075, 0.82, 0.04]} /></mesh>
        <mesh material={m.silver} position-y={-0.48}><coneGeometry args={[0.045, 0.09, 4]} /></mesh>
        <mesh material={m.silver} position-y={0.17}><boxGeometry args={[0.085, 0.03, 0.05]} /></mesh>
        <mesh material={m.brass} position-y={0.37}><boxGeometry args={[0.32, 0.035, 0.05]} /></mesh>
        <mesh material={m.grip} position-y={0.47}><cylinderGeometry args={[0.025, 0.028, 0.17, 8]} /></mesh>
        <mesh material={m.brass} position-y={0.57}><sphereGeometry args={[0.04, 10, 8]} /></mesh>
      </group>
    </group>
  );
}

export function Outfit({ id }: { id: OutfitId }) {
  if (id === 'east') return <EastOutfit />;
  return null;
}
