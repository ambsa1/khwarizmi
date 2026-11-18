// Map symbols: each world's landmark in miniature, built from the same station objects as the world itself.
// The small diorama below is the fallback scene when a world's 3D files are not downloaded yet.
// Same lighting and Siraj, a rounded island in the world's colours, and its summit object, so the screen still
// reads as "your world" for the 3-6 year olds in Saqiya and for anyone who picks another world on the map.
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { T, type WorldId } from '../lib/tokens';
import { skyMaterial } from './kit';
import { outfitFor } from './outfits';
import { Siraj } from './Siraj';
import { KITS, steppedPyramid } from './town/kits';

const kitMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
/** a station kit in miniature (the same objects the child builds in that world) */
function KitMesh({ geo, position, scale, rotY = 0 }: { geo: THREE.BufferGeometry; position: [number, number, number]; scale: number; rotY?: number }) {
  return <mesh geometry={geo} material={kitMat} position={position} scale={scale} rotation-y={rotY} />;
}

export function Landmark({ world, scale = 1 }: { world: WorldId; scale?: number }) {
  const wheel = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (wheel.current) wheel.current.rotation.x += dt * 0.6; });
  const kits = useMemo(() => ({ mooring: KITS.mooring(), coral: KITS.coralHouse(), terrace: KITS.terraceFarm(), saqiya: KITS.saqiya(), pyr: steppedPyramid(3.6, 6.0, 12, 6.0) }), []);
  switch (world) {
    case 'kassala':
      return (
        <group scale={scale}>
          {/* Taka / Totil in miniature: a joined cluster of uneven, steep granite domes on a rubble base */}
          <mesh position={[0, 0.18, 0.1]} scale={[1.9, 0.36, 1.2]}><dodecahedronGeometry args={[1, 0]} /><meshLambertMaterial color="#9C8174" flatShading /></mesh>
          {([[0, 0, 0, 0.62, 2.3], [-0.85, 0, 0.25, 0.5, 1.6], [0.8, 0, 0.1, 0.48, 1.85], [-0.3, 0, -0.45, 0.42, 1.25], [0.35, 0, 0.55, 0.36, 1.0]] as const).map(([x, y, z, r, h], i) => (
            <mesh key={i} position={[x, y + h / 2, z]} scale={[r, h / 2, r * 0.85]} rotation={[0, i * 1.3, 0.05 * (i - 2)]}>
              <sphereGeometry args={[1, 9, 7]} /><meshLambertMaterial color={i % 2 ? '#A88C7E' : '#B79A8A'} flatShading />
            </mesh>
          ))}
          <mesh position-y={2.42}><cylinderGeometry args={[0.1, 0.14, 0.3, 8]} /><meshLambertMaterial color="#FFF4DE" /></mesh>
        </group>
      );
    case 'mogran':
      // the meeting of the two Niles, each in its own colour, with a jetty and a felucca (as on Tuti island)
      return (
        <group scale={scale}>
          <mesh position={[-0.75, 0.05, 0.2]} rotation={[-Math.PI / 2, 0, 0.5]}><planeGeometry args={[2.6, 0.75]} /><meshLambertMaterial color="#8C6A46" /></mesh>
          <mesh position={[0.75, 0.05, 0.2]} rotation={[-Math.PI / 2, 0, -0.5]}><planeGeometry args={[2.6, 0.75]} /><meshLambertMaterial color="#5C8A7A" /></mesh>
          <mesh position={[0, 0.06, -0.85]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.95, 1.6]} /><meshLambertMaterial color="#6E8070" /></mesh>
          <KitMesh geo={kits.mooring.built} position={[0, 0, 0.3]} scale={0.26} rotY={Math.PI} />
        </group>
      );
    case 'meroe':
      return (
        <group scale={scale}>
          <KitMesh geo={kits.pyr} position={[0, 0, 0]} scale={0.42} />
          <KitMesh geo={kits.pyr} position={[-1.1, 0, 0.5]} scale={0.3} />
          <KitMesh geo={kits.pyr} position={[1.05, 0, 0.35]} scale={0.33} />
        </group>
      );
    case 'suakin':
      return (
        <group scale={scale}>
          <KitMesh geo={kits.coral.built} position={[0, 0, 0]} scale={0.34} />
          <mesh position={[0, 0.04, 1.2]} rotation-x={-Math.PI / 2}><planeGeometry args={[3, 0.9]} /><meshLambertMaterial color="#2E8A8C" /></mesh>
        </group>
      );
    case 'marra':
      return (
        <group scale={scale}>
          <KitMesh geo={kits.terrace.built} position={[0, 0, 0]} scale={0.34} />
          <mesh position={[0.9, 0.06, -0.6]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.45, 14]} /><meshLambertMaterial color="#3E7C9A" /></mesh>
        </group>
      );
    case 'saqiya':
    default:
      return (
        <group scale={scale}>
          <KitMesh geo={kits.saqiya.built} position={[-0.6, 0, 0]} scale={0.42} />
          <group ref={wheel} position={[-0.6, 2.3 * 0.42, -0.6 * 0.42]}><KitMesh geo={kits.saqiya.spin!.geo} position={[0, 0, 0]} scale={0.42} /></group>
        </group>
      );
  }
}

function Rig() {
  const cam = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const size = useThree(s => s.size);
  useFrame(() => {
    const portrait = size.width / size.height < 1;
    cam.position.set(0, portrait ? 3.2 : 2.6, portrait ? 9.5 : 7.5);
    cam.lookAt(0, 1.4, 0);
  });
  return null;
}

export function DioramaScene({ world, progress, sirajAction = 'idle' }: { world: WorldId; progress: number; sirajAction?: Parameters<typeof Siraj>[0]['action'] }) {
  const c = T.worlds[world];
  const sky = useMemo(() => skyMaterial(c.skyTop, c.skyBottom), [c]);
  return (
    <group>
      <mesh material={sky} scale={120}><sphereGeometry args={[1, 20, 10]} /></mesh>
      <hemisphereLight args={['#FFF1D6', '#8A6A4A', 1.3]} />
      <directionalLight position={[6, 8, 6]} intensity={1.6} color="#FFE1B0" />
      <mesh position-y={-0.3}><cylinderGeometry args={[6, 5.4, 0.6, 40]} /><meshLambertMaterial color={c.ground} /></mesh>
      <mesh position={[0, 0.005, 3.6]} rotation-x={-Math.PI / 2} scale={[5.2, 1, 1]}><circleGeometry args={[1, 32]} /><meshLambertMaterial color={c.water} /></mesh>
      <group position={[0, 0, -2.2]}><Landmark world={world} scale={1.3} /></group>
      <Siraj action={sirajAction} glow={progress} position={[1.4, 0, 1.6]} scale={0.7} outfit={outfitFor(world)} />
      <Rig />
    </group>
  );
}
