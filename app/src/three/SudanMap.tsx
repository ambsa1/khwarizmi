// Sudan as a small hand-made table model: the land, the Nile (White, Blue and the great bend north) and the
// Red Sea coast. No political border lines are drawn. The six landmarks sit at their real places, each with
// a ring that fills with the child's progress. Tapping a landmark chooses that world.
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { T, type WorldId } from '../lib/tokens';
import { Landmark } from './Diorama';
import { skyMaterial } from './kit';

const C = { lon: 30.2, lat: 15.3 };
const P = (lon: number, lat: number) => new THREE.Vector2(lon - C.lon, lat - C.lat);
const to3 = (lon: number, lat: number, y = 0) => new THREE.Vector3(lon - C.lon, y, -(lat - C.lat));
const LAND_TOP = 0.5;
// Label offsets where real places sit close together (Meroe, Suakin and Kassala are all in the east).
const LABEL_AT: Partial<Record<WorldId, [number, number, number]>> = { meroe: [0.2, 0, -1.75], suakin: [0.3, 0, -1.7] };

// Simplified, softened outline of the land (longitude, latitude).
const OUTLINE: [number, number][] = [
  [24.0, 20.0], [25.0, 20.0], [25.0, 22.0], [31.3, 22.0], [36.9, 22.0], [37.15, 21.0], [37.3, 20.2], [37.22, 19.6], [37.35, 19.1],
  [37.6, 18.7], [38.1, 18.3], [38.6, 18.0], [37.9, 17.4], [37.0, 16.9], [36.5, 15.2], [36.45, 14.3], [36.1, 12.7], [35.3, 11.9],
  [34.9, 10.9], [34.3, 10.5], [33.95, 9.6], [33.2, 10.3], [32.9, 11.8], [32.2, 12.1], [31.5, 11.4], [30.4, 10.1], [29.4, 9.7],
  [27.9, 9.6], [26.6, 10.1], [25.3, 10.3], [24.5, 9.4], [23.6, 9.0], [23.0, 9.9], [22.5, 11.0], [22.8, 12.4], [22.1, 13.2],
  [22.2, 13.9], [22.7, 14.6], [22.9, 15.6], [23.6, 15.9], [24.0, 17.2], [24.0, 19.5],
];
const RED_SEA: [number, number][] = [[36.9, 22.0], [37.15, 21.0], [37.3, 20.2], [37.22, 19.6], [37.35, 19.1], [37.6, 18.7], [38.1, 18.3], [38.6, 18.0], [39.6, 17.6], [42, 17.6], [42, 23.5], [35.6, 23.5]];
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

function Sea() {
  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(RED_SEA.map(([a, b]) => P(a, b))));
    g.rotateX(-Math.PI / 2); return g;
  }, []);
  const ref = useRef<THREE.MeshLambertMaterial>(null!);
  useFrame(s => { ref.current.emissiveIntensity = 0.18 + Math.sin(s.clock.elapsedTime * 1.2) * 0.05; });
  return <mesh geometry={geo} position-y={0.12}><meshLambertMaterial ref={ref} color="#2EC4C4" emissive="#1C8F9F" emissiveIntensity={0.2} /></mesh>;
}

function Ring({ value, color, dim }: { value: number; color: string; dim: boolean }) {
  const arc = Math.max(0.0001, Math.min(1, value)) * Math.PI * 2;
  return (
    <group rotation-x={-Math.PI / 2} position-y={LAND_TOP + 0.04}>
      <mesh><ringGeometry args={[0.95, 1.18, 48]} /><meshBasicMaterial color={dim ? '#BFAE92' : '#FFF4DE'} transparent opacity={0.9} /></mesh>
      {value > 0 && <mesh rotation-z={Math.PI / 2} position-z={0.005}><ringGeometry args={[0.95, 1.18, 48, 1, 0, arc]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>}
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
    const dist = Math.max(14 / 2 / t, 18 / 2 / (t * aspect)) * 1.04;
    const target = new THREE.Vector3(0.4, dist * 0.8, dist * 0.6);
    cam.position.lerp(target, 1 - Math.exp(-dt * 4));
    cam.lookAt(0.4, 0, 0.6);
  });
  return null;
}

/** labels: 'all' on wide screens; on portrait phones only the listed worlds (the cards below name the rest). */
export function SudanMapScene({ spots, onPick, labels = 'all' }: { spots: MapSpot[]; onPick: (id: WorldId) => void; labels?: 'all' | WorldId[] }) {
  const bg = useMemo(() => skyMaterial('#F4E3C1', '#FFF6E6'), []);
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
      <mesh material={bg} scale={200}><sphereGeometry args={[1, 16, 8]} /></mesh>
      <hemisphereLight args={['#FFF1D6', '#9A7456', 1.3]} />
      <directionalLight position={[-8, 14, 10]} intensity={1.5} color="#FFE1B0" />
      {/* the table under the model */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05}><circleGeometry args={[34, 48]} /><meshLambertMaterial color="#E7C98F" /></mesh>
      <Sea />
      <Land />
      <Rivers />
      {spots.map(s => {
        const [lon, lat] = MAP_PLACES[s.id];
        const c = T.worlds[s.id];
        return (
          <group key={s.id} position={to3(lon, lat, 0)}
            onClick={e => { e.stopPropagation(); onPick(s.id); }}
            onPointerOver={e => { e.stopPropagation(); setHover(s.id); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHover(null); document.body.style.cursor = ''; }}>
            <Ring value={s.value} color={s.id === 'suakin' ? '#2EC4C4' : c.primary} dim={s.locked} />
            <group ref={g => (lift.current[s.id] = g)} position-y={LAND_TOP} scale={0.5}><Landmark world={s.id} /></group>
            {/* invisible, generous tap target for small fingers */}
            <mesh position-y={1} visible={false}><cylinderGeometry args={[1.5, 1.5, 2.6, 12]} /></mesh>
            {(labels === 'all' || labels.includes(s.id)) && (
              <Html position={labels === 'all' ? LABEL_AT[s.id] ?? [0, 0, 1.6] : [0, 0, 1.6]} center zIndexRange={[10, 0]} wrapperClass="html-anchor" style={{ pointerEvents: 'none' }}>
                <span className={'map-label' + (s.current ? ' current' : '') + (s.locked ? ' locked' : '')}>{s.name}</span>
              </Html>
            )}
          </group>
        );
      })}
      <Rig />
    </group>
  );
}
