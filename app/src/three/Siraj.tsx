// Siraj in 3D, built from rounded primitives. ~6k triangles, no external model file.
// Lantern head with a bulb whose glow follows the child's progress, a face screen with 8 expressions,
// copper capsule body with a Sudanese pattern band, floating hands, and the woven palm-frond passport satchel.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COVERS_BODY, Outfit, type OutfitId } from './outfits';
import { bandTexture, blobTexture, faceTexture, glowTexture, wovenTexture, type Face } from './textures';

export type SirajAction = 'idle' | 'hop' | 'wave' | 'cheer' | 'think' | 'point' | 'sad' | 'sleepy' | 'celebrate' | 'look';

const FACE_OF: Record<SirajAction, Face> = {
  idle: 'idle', hop: 'happy', wave: 'happy', cheer: 'cheer', think: 'think', point: 'excited',
  sad: 'sad', sleepy: 'sleepy', celebrate: 'cheer', look: 'idle',
};

type Props = {
  action?: SirajAction;
  glow?: number;          // 0..1 bulb brightness (world progress)
  stamps?: number;        // stamps shown on the satchel (0..6)
  scale?: number;
  moving?: boolean;       // hop while travelling
  movingRef?: { current: boolean }; // live version of `moving` for scenes that move Siraj every frame
  shadow?: boolean;
  /** regional clothes (see outfits.tsx); his body, head and face never change */
  outfit?: OutfitId;
} & JSX.IntrinsicElements['group'];

const COPPER = '#C9783F', COPPER_DARK = '#9C5A2C', CREAM = '#FFF4DE', BRASS = '#E2A43C';
const STAMP_COLORS = ['#C98B7A', '#1F4E8C', '#E89A4B', '#2EC4C4', '#2E7D4F', '#C46A3C'];

export function Siraj({ action = 'idle', glow = 0.6, stamps = 0, scale = 1, moving = false, movingRef, shadow = true, outfit = 'none', ...rest }: Props) {
  const covered = COVERS_BODY[outfit];
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const handL = useRef<THREE.Mesh>(null!);
  const handR = useRef<THREE.Mesh>(null!);
  const bulb = useRef<THREE.MeshStandardMaterial>(null!);
  const halo = useRef<THREE.Sprite>(null!);
  const faceMat = useRef<THREE.MeshBasicMaterial>(null!);
  const blob = useRef<THREE.Mesh>(null!);
  const blinkAt = useRef(2 + Math.random() * 3);
  const since = useRef({ action, t: -1 });

  const mats = useMemo(() => ({
    copper: new THREE.MeshStandardMaterial({ color: COPPER, roughness: 0.42, metalness: 0.25 }),
    copperDark: new THREE.MeshStandardMaterial({ color: COPPER_DARK, roughness: 0.5, metalness: 0.2 }),
    cream: new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.35, metalness: 0.45 }),
    glass: new THREE.MeshStandardMaterial({ color: '#FFF6D8', roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false }),
    band: new THREE.MeshStandardMaterial({ map: bandTexture(), roughness: 0.5, metalness: 0.2 }),
    woven: new THREE.MeshStandardMaterial({ map: wovenTexture(), roughness: 0.85 }),
    strap: new THREE.MeshStandardMaterial({ color: '#B07A3A', roughness: 0.8 }),
  }), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const g = THREE.MathUtils.clamp(glow, 0, 1);
    if (since.current.action !== action || since.current.t < 0) since.current = { action, t };
    const held = t - since.current.t;
    // breathing + per-action body language
    let bodyY = Math.sin(t * 2.2) * 0.03, bodyRotZ = 0, headRotZ = Math.sin(t * 1.1) * 0.04, headRotX = 0, headRotY = 0;
    let lx = -0.62, ly = 0.55 + Math.sin(t * 2.2 + 1) * 0.04, rx = 0.62, ry = 0.55 + Math.sin(t * 2.2) * 0.04;
    let face: Face = FACE_OF[action];
    switch (action) {
      case 'wave': ry = 1.35 + Math.sin(t * 10) * 0.08; rx = 0.72 + Math.sin(t * 10) * 0.12; headRotZ = -0.1; break;
      case 'cheer': case 'celebrate': {
        const j = Math.abs(Math.sin(t * (action === 'celebrate' ? 7 : 5)));
        bodyY = j * (action === 'celebrate' ? 0.45 : 0.25); ly = ry = 1.45 + j * 0.15; lx = -0.75; rx = 0.75;
        if (action === 'celebrate') body.current.rotation.y += dt * 4; break;
      }
      case 'think': rx = 0.3; ry = 1.02; headRotZ = 0.18 + Math.sin(t * 1.5) * 0.04; headRotX = -0.08; break;
      case 'point': rx = 0.95; ry = 0.95; headRotY = 0.25; headRotZ = -0.06; break;
      // short gentle sadness, then he looks up and smiles again (never stays sad)
      case 'sad': if (held < 1.4) { bodyY = -0.05; headRotX = 0.22; ly = ry = 0.35; } else face = 'happy'; break;
      case 'sleepy': headRotZ = 0.3 + Math.sin(t * 0.8) * 0.08; headRotX = 0.15; ly = ry = 0.4; bodyY = Math.sin(t * 0.8) * 0.02; break;
      case 'look': headRotY = Math.sin(t * 0.6) * 0.35; break;
      case 'hop': default: break;
    }
    if (moving || movingRef?.current || action === 'hop') { const h = Math.abs(Math.sin(t * 9)); bodyY = h * 0.28; bodyRotZ = Math.sin(t * 9) * 0.06; face = 'happy'; }
    if (action !== 'celebrate') body.current.rotation.y = THREE.MathUtils.damp(body.current.rotation.y, 0, 6, dt);
    body.current.position.y = THREE.MathUtils.damp(body.current.position.y, bodyY, 14, dt);
    body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, bodyRotZ, 10, dt);
    head.current.rotation.z = THREE.MathUtils.damp(head.current.rotation.z, headRotZ, 8, dt);
    head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, headRotX, 8, dt);
    head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, headRotY, 6, dt);
    handL.current.position.x = THREE.MathUtils.damp(handL.current.position.x, lx, 12, dt);
    handL.current.position.y = THREE.MathUtils.damp(handL.current.position.y, ly, 12, dt);
    handR.current.position.x = THREE.MathUtils.damp(handR.current.position.x, rx, 12, dt);
    handR.current.position.y = THREE.MathUtils.damp(handR.current.position.y, ry, 12, dt);
    // blink every few seconds
    let blink = false;
    if (t > blinkAt.current) { blink = true; if (t > blinkAt.current + 0.12) blinkAt.current = t + 2.5 + Math.random() * 3; }
    const tex = faceTexture(face, blink && face !== 'sleepy');
    if (faceMat.current.map !== tex) { faceMat.current.map = tex; faceMat.current.needsUpdate = true; }
    // bulb + halo follow progress, with a gentle flicker
    const flick = 1 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 3.1) * 0.02;
    bulb.current.emissiveIntensity = (0.6 + g * 2.2) * flick;
    halo.current.scale.setScalar((0.9 + g * 1.4) * flick);
    (halo.current.material as THREE.SpriteMaterial).opacity = 0.35 + g * 0.6;
    if (blob.current) blob.current.scale.setScalar(1 - body.current.position.y * 0.6);
  });

  const stampList = Array.from({ length: Math.min(6, stamps) }, (_, i) => i);
  return (
    <group ref={root} scale={scale} {...rest}>
      {shadow && (
        <mesh ref={blob} rotation-x={-Math.PI / 2} position-y={0.01} renderOrder={-1}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} />
        </mesh>
      )}
      <group ref={body}>
        {/* feet */}
        <mesh material={mats.copperDark} position={[-0.2, 0.09, 0.05]} scale={[1, 0.6, 1.25]}><sphereGeometry args={[0.15, 16, 12]} /></mesh>
        <mesh material={mats.copperDark} position={[0.2, 0.09, 0.05]} scale={[1, 0.6, 1.25]}><sphereGeometry args={[0.15, 16, 12]} /></mesh>
        {/* body */}
        <mesh material={mats.copper} position-y={0.62}><capsuleGeometry args={[0.38, 0.3, 8, 20]} /></mesh>
        {!covered && <mesh material={mats.band} position-y={0.6}><cylinderGeometry args={[0.395, 0.395, 0.13, 28, 1, true]} /></mesh>}
        {!covered && <mesh material={mats.cream} position={[0, 0.66, 0.33]} scale={[1, 1, 0.45]}><sphereGeometry args={[0.16, 16, 12]} /></mesh>}
        <Outfit id={outfit} />
        {/* satchel strap + woven palm-frond passport bag */}
        <mesh material={mats.strap} position={[0, 0.72, 0]} rotation={[0, 0, 0.75]} scale={covered ? 1.1 : 1}><torusGeometry args={[0.42, 0.025, 6, 28]} /></mesh>
        <group position={covered ? [0.42, 0.42, 0.2] : [0.36, 0.42, 0.16]} rotation={[0, 0.5, -0.12]}>
          <mesh material={mats.woven}><boxGeometry args={[0.3, 0.26, 0.12]} /></mesh>
          <mesh material={mats.woven} position={[0, 0.1, 0.045]} rotation-x={-0.35}><boxGeometry args={[0.31, 0.1, 0.04]} /></mesh>
          {stampList.map(i => (
            <mesh key={i} position={[-0.09 + (i % 3) * 0.09, -0.04 - Math.floor(i / 3) * 0.07, 0.065]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.03, 0.03, 0.01, 12]} />
              <meshStandardMaterial color={STAMP_COLORS[i]} roughness={0.6} />
            </mesh>
          ))}
        </group>
        {/* floating hands */}
        <mesh ref={handL} material={mats.cream} position={[-0.62, 0.55, 0.05]}><sphereGeometry args={[0.12, 16, 12]} /></mesh>
        <mesh ref={handR} material={mats.cream} position={[0.62, 0.55, 0.05]}><sphereGeometry args={[0.12, 16, 12]} /></mesh>
        {/* head: rounded lantern housing with face screen, glass cap and bulb */}
        <group ref={head} position-y={1.25}>
          <mesh material={mats.cream} scale={[1.15, 0.92, 0.95]}><sphereGeometry args={[0.42, 28, 20]} /></mesh>
          <mesh position={[0, -0.01, 0.405]} scale={[1, 0.82, 1]}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial ref={faceMat} map={faceTexture('idle')} toneMapped={false} />
          </mesh>
          {/* brass bezel framing the face screen */}
          <mesh material={mats.brass} position={[0, -0.01, 0.4]} scale={[1, 0.82, 1]}><torusGeometry args={[0.305, 0.03, 8, 36]} /></mesh>
          {/* ears = little brass bolts */}
          <mesh material={mats.brass} position={[-0.48, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.06, 14]} /></mesh>
          <mesh material={mats.brass} position={[0.48, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.06, 14]} /></mesh>
          {/* lantern cap */}
          <mesh material={mats.brass} position-y={0.37}><cylinderGeometry args={[0.16, 0.2, 0.06, 20]} /></mesh>
          <mesh position-y={0.52}>
            <sphereGeometry args={[0.11, 20, 16]} />
            <meshStandardMaterial ref={bulb} color="#FFE7A0" emissive="#FFB627" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh material={mats.glass} position-y={0.53}><sphereGeometry args={[0.17, 20, 16]} /></mesh>
          <mesh material={mats.brass} position-y={0.71}><coneGeometry args={[0.1, 0.1, 16]} /></mesh>
          <mesh material={mats.brass} position-y={0.79}><torusGeometry args={[0.04, 0.012, 6, 16]} /></mesh>
          <sprite ref={halo} position-y={0.53} scale={1.2}>
            <spriteMaterial map={glowTexture()} blending={THREE.AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
          </sprite>
        </group>
      </group>
    </group>
  );
}
