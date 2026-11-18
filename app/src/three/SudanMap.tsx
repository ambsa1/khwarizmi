// Sudan as a small hand-made table model: the real land outline, the Nile (White, Blue and the great bend north) and
// the real Red Sea. No political border lines are drawn. The six landmarks sit at their real places, each with
// a ring that fills with the child's progress. Tapping a landmark chooses that world.
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { WorldId } from '../lib/tokens';
import { Landmark } from './Diorama';
import { SUBJECT_COLOR } from '../screens/Map';

const C = { lon: 30.2, lat: 15.3 };
const P = (lon: number, lat: number) => new THREE.Vector2(lon - C.lon, lat - C.lat);
const to3 = (lon: number, lat: number, y = 0) => new THREE.Vector3(lon - C.lon, y, -(lat - C.lat));
const LAND_TOP = 0.5;
// Label offsets where real places sit close together (Meroe, Suakin and Kassala are all in the east).
const LABEL_AT: Partial<Record<WorldId, [number, number, number]>> = { meroe: [0.2, 0, -1.75], suakin: [0.3, 0, -1.7] };

// The real outline of Sudan and the real Red Sea (Natural Earth, public domain; simplified to ~140 and ~90 points).
import MAPDATA from './sudan-map.json';
const OUTLINE = MAPDATA.sudan as [number, number][];
const RED_SEA = MAPDATA.redSea as [number, number][];
const NILES: [number, number][][] = [
  [[32.75, 12.0], [32.66, 13.17], [32.3, 13.99], [32.4, 14.9], [32.53, 15.6]],                               // White Nile
  [[34.9, 10.95], [34.38, 11.8], [33.9, 12.8], [33.6, 13.55], [33.52, 14.4], [33.1, 15.1], [32.53, 15.6]],       // Blue Nile
  [[32.53, 15.6], [33.0, 16.2], [33.43, 16.69], [33.98, 17.7], [33.98, 18.3], [33.32, 19.53], [32.6, 19.0], [31.82, 18.5],
    [30.9, 18.7], [30.47, 19.17], [30.4, 19.7], [30.6, 20.6], [31.35, 21.8], [31.45, 22.0]],                     // main Nile and the great bend
];
export const MAP_PLACES: Record<WorldId, [number, number]> = {
  kassala: [36.0, 15.45], mogran: [32.0, 15.1], meroe: [34.3, 17.1], suakin: [36.6, 19.3], marra: [24.3, 13.0], saqiya: [29.5, 19.4],
};

function Land() {
  const geo = useMemo(() => {
    const shape = new THREE.Shape(OUTLINE.map(([a, b]) => P(a, b)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: LAND_TOP - 0.2, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.35, bevelSegments: 3, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    // Gentle colour by latitude: desert gold in the north, savanna green in the south; darker sides.
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const north = new THREE.Color('#EDC98A'), mid = new THREE.Color('#D9C07A'), south = new THREE.Color('#9DBF6A'), side = new THREE.Color('#C49A63'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const lat = -pos.getZ(i) + C.lat;
      const k = THREE.MathUtils.clamp((lat - 10) / 10, 0, 1);
      c.copy(south).lerp(mid, Math.min(1, k * 1.6)).lerp(north, Math.max(0, k - 0.5) * 2);
      if (pos.getY(i) < LAND_TOP - 0.05) c.lerp(side, 0.65);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return <mesh geometry={geo}><meshLambertMaterial vertexColors /></mesh>;
}

function Rivers() {
  const tubes = useMemo(() => NILES.map((line, i) => {
    const curve = new THREE.CatmullRomCurve3(line.map(([a, b]) => to3(a, b, 0)), false, 'centripetal');
    const g = new THREE.TubeGeometry(curve, 120, i === 2 ? 0.17 : 0.13, 6, false);
    g.scale(1, 0.25, 1); g.translate(0, LAND_TOP + 0.01, 0);
    return g;
  }), []);
  return <group>{tubes.map((g, i) => <mesh key={i} geometry={g}><meshLambertMaterial color={i === 1 ? '#2F6FC0' : '#4FA3D1'} emissive="#1F5FAD" emissiveIntensity={0.15} /></mesh>)}</group>;
}

/** The Red Sea along the real coast: a flat sheet of water at sea level (no frame, no raised rim), natural blue that
 *  deepens away from the shores and fades softly where it runs off the map to the north and south. */
function Sea() {
  const { geo, tex } = useMemo(() => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(RED_SEA.map(([a, b]) => P(a, b))), 8);
    g.rotateX(-Math.PI / 2);
    const lon0 = Math.min(...RED_SEA.map(p => p[0])), lon1 = Math.max(...RED_SEA.map(p => p[0]));
    const lat0 = Math.min(...RED_SEA.map(p => p[1])), lat1 = Math.max(...RED_SEA.map(p => p[1]));
    const W = 512, H = Math.round(W * (lat1 - lat0) / (lon1 - lon0)), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d')!, X = (lon: number) => (lon - lon0) / (lon1 - lon0) * W, Y = (lat: number) => (lat1 - lat) / (lat1 - lat0) * H;
    const path = () => { x.beginPath(); RED_SEA.forEach(([a, b], i) => (i ? x.lineTo(X(a), Y(b)) : x.moveTo(X(a), Y(b)))); x.closePath(); };
    x.fillStyle = '#2C86B4'; path(); x.fill();
    x.save(); path(); x.clip(); x.filter = 'blur(14px)'; x.strokeStyle = '#8FD9DF'; x.lineWidth = 46; path(); x.stroke(); x.restore();
    // soft ends where the sea leaves the map (north of Egypt's border, south past Eritrea)
    x.globalCompositeOperation = 'destination-in';
    const fade = x.createLinearGradient(0, Y(25.2), 0, Y(13.6));
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.18, 'rgba(0,0,0,1)'); fade.addColorStop(0.82, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = fade; x.fillRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    // ShapeGeometry uvs are the shape coordinates (lon - C.lon, lat - C.lat): map them onto the canvas
    t.repeat.set(1 / (lon1 - lon0), 1 / (lat1 - lat0)); t.offset.set(-(lon0 - C.lon) / (lon1 - lon0), -(lat0 - C.lat) / (lat1 - lat0));
    return { geo: g, tex: t };
  }, []);
  return <mesh geometry={geo} position-y={LAND_TOP - 0.3}><meshLambertMaterial map={tex} transparent depthWrite={false} /></mesh>;
}

/** soft shadow under the floating map (a radial texture, no box) */
function Shadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
    const g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(120,80,40,0.38)'); g.addColorStop(1, 'rgba(120,80,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }, []);
  return <mesh rotation-x={-Math.PI / 2} position={[0.4, -0.6, 0.8]} scale={[22, 20, 1]}><planeGeometry /><meshBasicMaterial map={tex} transparent depthWrite={false} /></mesh>;
}

/** a 3D map pin in the world's colour; the selected one glows with Siraj's golden aura and bobs */
function Pin({ color, selected, dim }: { color: string; selected: boolean; dim: boolean }) {
  const g = useRef<THREE.Group>(null!), halo = useRef<THREE.Sprite>(null!);
  const glow = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,226,140,1)'); gr.addColorStop(0.4, 'rgba(255,200,90,0.5)'); gr.addColorStop(1, 'rgba(255,190,80,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }, []);
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    g.current.position.y = THREE.MathUtils.damp(g.current.position.y, selected ? 3.3 + Math.sin(t * 2.6) * 0.15 : 2.6, 6, dt);
    const k = THREE.MathUtils.damp(halo.current.scale.x, selected ? 3.2 + Math.sin(t * 3) * 0.3 : 0.001, 6, dt); halo.current.scale.set(k, k, 1);
  });
  return (
    <group ref={g} position-y={2.6}>
      <sprite ref={halo}><spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
      <mesh><sphereGeometry args={[0.5, 20, 14]} /><meshLambertMaterial color={dim ? '#BFAE92' : color} emissive={selected ? '#FFB840' : '#000000'} emissiveIntensity={selected ? 0.35 : 0} /></mesh>
      <mesh position-y={-0.75} rotation-x={Math.PI}><coneGeometry args={[0.32, 0.9, 16]} /><meshLambertMaterial color={dim ? '#BFAE92' : color} /></mesh>
      <mesh position-y={0.08}><sphereGeometry args={[0.2, 12, 10]} /><meshBasicMaterial color="#FFF8E8" /></mesh>
    </group>
  );
}

export type MapSpot = { id: WorldId; name: string; value: number; locked: boolean; current: boolean };

/** Fits the whole country on any screen shape, tilted like looking down at a table model. */
function Rig() {
  const cam = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const size = useThree(s => s.size);
  useFrame((_, dt) => {
    const aspect = size.width / size.height;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(16.5 / 2 / t, 19.5 / 2 / (t * aspect)) * (aspect < 1 ? 1.12 : 1.06);   // the whole country with a margin, also on narrow phones
    const target = new THREE.Vector3(0.4, dist * 0.8, dist * 0.6);
    cam.position.lerp(target, 1 - Math.exp(-dt * 4));
    cam.lookAt(0.4, 0, 0.6);
  });
  return null;
}

/** labels: 'all' on wide screens; on portrait phones only the listed worlds (the cards below name the rest). */
export function SudanMapScene({ spots, onPick, labels = 'all', selected }: { spots: MapSpot[]; onPick: (id: WorldId) => void; labels?: 'all' | WorldId[]; selected?: WorldId }) {
  const [hover, setHover] = useState<WorldId | null>(null);
  const lift = useRef<Record<string, THREE.Group | null>>({});
  useFrame((s, dt) => {
    for (const sp of spots) {
      const g = lift.current[sp.id]; if (!g) continue;
      const k = hover === sp.id || sp.current ? 0.62 : 0.5;
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, k, 8, dt));
      g.position.y = LAND_TOP + (sp.current ? 0.12 + Math.sin(s.clock.elapsedTime * 2.4) * 0.08 : 0);
    }
  });
  return (
    <group>
      <hemisphereLight args={['#FFF1D6', '#9A7456', 1.3]} />
      <directionalLight position={[-8, 14, 10]} intensity={1.5} color="#FFE1B0" />
      <Shadow />
      <Sea />
      <Land />
      <Rivers />
      {spots.map(s => {
        const [lon, lat] = MAP_PLACES[s.id];
        return (
          <group key={s.id} position={to3(lon, lat, 0)}
            onClick={e => { e.stopPropagation(); onPick(s.id); }}
            onPointerOver={e => { e.stopPropagation(); setHover(s.id); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHover(null); document.body.style.cursor = ''; }}>
            <Pin color={SUBJECT_COLOR[s.id]} selected={selected === s.id} dim={s.locked} />
            <group ref={g => (lift.current[s.id] = g)} position-y={LAND_TOP} scale={0.5}><Landmark world={s.id} /></group>
            {/* invisible, generous tap target for small fingers */}
            <mesh position-y={1} visible={false}><cylinderGeometry args={[1.5, 1.5, 2.6, 12]} /></mesh>
            {(labels === 'all' || labels.includes(s.id)) && (
              <Html position={labels === 'all' ? LABEL_AT[s.id] ?? [0, 0, 1.6] : [0, 0, 1.6]} center zIndexRange={[10, 0]} wrapperClass="html-anchor" style={{ pointerEvents: 'none' }}>
                <span className={'map-label' + (selected === s.id ? ' current' : '') + (s.locked ? ' locked' : '')}>{s.name}</span>
              </Html>
            )}
          </group>
        );
      })}
      <Rig />
    </group>
  );
}
