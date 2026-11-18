// A small placeholder diorama for worlds whose full scene arrives in later phases (Phase 2 builds Kassala only).
// Same lighting and Siraj, a rounded island in the world's colours, and its summit object, so the screen still
// reads as "your world" for the 3-6 year olds in Saqiya and for anyone who picks another world on the map.
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { T, type WorldId } from '../lib/tokens';
import { skyMaterial } from './kit';
import { outfitFor } from './outfits';
import { Siraj } from './Siraj';

export function Landmark({ world, scale = 1 }: { world: WorldId; scale?: number }) {
  const c = T.worlds[world];
  const wheel = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (wheel.current) wheel.current.rotation.z += dt * 0.6; });
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
      return (
        <group scale={scale}>
          <mesh position-y={1.2}><cylinderGeometry args={[0.32, 0.5, 2.4, 12]} /><meshLambertMaterial color="#EAF2F6" /></mesh>
          <mesh position-y={2.55}><sphereGeometry args={[0.42, 16, 12]} /><meshLambertMaterial color="#7FB8E6" emissive="#1F5FAD" emissiveIntensity={0.3} /></mesh>
          <mesh position={[0, 0.06, 0.9]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.6, 0.5]} /><meshLambertMaterial color={c.primary} /></mesh>
          <mesh position={[0, 0.065, 1.25]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.6, 0.3]} /><meshLambertMaterial color={c.water} /></mesh>
        </group>
      );
    case 'meroe':
      return (
        <group scale={scale}>
          {[[0, 0, 2.6, 0.9], [-1.1, 0.4, 1.8, 0.62], [1.1, 0.3, 1.9, 0.66], [-0.4, 1, 1.4, 0.5]].map(([x, z, h, r], i) => (
            <mesh key={i} position={[x, h / 2, z]} rotation-y={Math.PI / 4}><coneGeometry args={[r, h, 4]} /><meshLambertMaterial color={i ? c.secondary : c.primary} flatShading /></mesh>
          ))}
        </group>
      );
    case 'suakin':
      return (
        <group scale={scale}>
          {[[0, 0, 1.2, 1.4], [-0.95, 0.4, 0.8, 0.9], [0.95, 0.35, 0.8, 1], [0.2, 0.9, 0.7, 0.7]].map(([x, z, w, h], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position-y={h / 2}><boxGeometry args={[w, h, w * 0.9]} /><meshLambertMaterial color={c.primary} /></mesh>
              <mesh position={[0, h * 0.6, w * 0.46]}><boxGeometry args={[w * 0.3, h * 0.3, 0.05]} /><meshLambertMaterial color={c.secondary} /></mesh>
            </group>
          ))}
        </group>
      );
    case 'marra':
      return (
        <group scale={scale}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <mesh key={i} position-y={0.17 + i * 0.32}><cylinderGeometry args={[1.5 - i * 0.2, 1.6 - i * 0.2, 0.34, 18]} /><meshLambertMaterial color={i % 2 ? '#4E9A45' : c.primary} /></mesh>
          ))}
          <mesh position-y={2.06}><cylinderGeometry args={[0.38, 0.38, 0.04, 16]} /><meshLambertMaterial color={c.water} /></mesh>
        </group>
      );
    case 'saqiya':
    default:
      return (
        <group scale={scale}>
          <group ref={wheel} position={[0.9, 1.05, 0.2]}>
            <mesh><torusGeometry args={[0.8, 0.08, 6, 20]} /><meshLambertMaterial color="#8A5A3B" /></mesh>
            {[0, 1, 2, 3].map(i => <mesh key={i} rotation-z={(i * Math.PI) / 4}><boxGeometry args={[1.6, 0.08, 0.08]} /><meshLambertMaterial color="#A8764F" /></mesh>)}
          </group>
          <mesh position={[-0.6, 0.45, 0]}><boxGeometry args={[1.1, 0.9, 0.9]} /><meshLambertMaterial color={c.primary} /></mesh>
          <mesh position={[-0.6, 0.3, 0.46]}><boxGeometry args={[0.32, 0.6, 0.02]} /><meshLambertMaterial color="#1F5FAD" /></mesh>
          <mesh position={[-0.2, 1.6, -1]}><sphereGeometry args={[0.75, 12, 10]} /><meshLambertMaterial color={c.secondary} flatShading /></mesh>
          <mesh position={[-0.2, 0.8, -1]}><cylinderGeometry args={[0.1, 0.14, 1, 6]} /><meshLambertMaterial color="#7A5236" /></mesh>
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
