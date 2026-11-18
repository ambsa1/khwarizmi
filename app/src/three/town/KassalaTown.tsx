// Kassala from a drone: the real town, the Gash and the Taka/Totil massif (real elevation surface, granite height
// calibrated to the reference photos), built by app/tools/world/build_kassala.py.
// One continuous street carries the 37 lessons. The world starts as grey, dry desert; every finished lesson builds its
// house and revives the street behind Siraj: colour returns, palms, orchards and grass grow, the Gash fills with water,
// birds circle, lamps light. Ahead of Siraj everything stays grey and silent. After the 37th house the whole town turns
// into a green oasis and the drone climbs for the wide shot. (Mechanic: revive.ts)
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { skyMaterial } from '../kit';
import { outfitFor } from '../outfits';
import { Siraj, type SirajAction } from '../Siraj';
import {
  alleyGeometry, awningGeometry, bgHouseGeometry, boulderGeometry, compoundGeometry, DOOR, doorGeometry, grassGeometry, jarGeometry,
  lessonHouseGeometry, massifGeometry, mosqueGeometry, PAL, palmGeometry, plotGeometry, postGeometry, ribbons, riverGeometry,
  scaffoldGeometry, shadeTreeGeometry, shopGeometry, shrubGeometry, terrainGeometry, treeGeometry, usePalette, WALLS, waterGeometry, wireGeometry,
} from './geom';
import { BG, KITS } from './kits';
import { glowMaterial, lifeWaterMaterial, makeReviveUniforms, revivable, waterMaterial, type ReviveOpts, type ReviveUniforms } from './revive';
import { useWorld, type World } from './world';

export const TOWN_FOG: [string, number, number] = [PAL.fog, 280, 1300];
export const TOWN_FAR = 2600;

type Props = {
  /** which world (public/worlds/<id>) */
  world?: string;
  mastered: number; density?: number; interactive?: boolean; sirajAction?: SirajAction; onSirajTap?: () => void;
  /** perf page / review: fly the camera to a fixed distance along the street (0..1) instead of following Siraj */
  focus?: number | null;
};

const m4 = (x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(sx, sy, sz));

type MatOpts = ReviveOpts & { offset?: number; double?: boolean };
function useMat(u: ReviveUniforms, o: MatOpts = {}) {
  return useMemo(() => revivable(new THREE.MeshLambertMaterial({
    vertexColors: true, side: o.double ? THREE.DoubleSide : THREE.FrontSide,
    ...(o.offset ? { polygonOffset: true, polygonOffsetFactor: -o.offset, polygonOffsetUnits: -o.offset } : {}),
  }), u, o), [u, o.grow, o.build, o.appear, o.sway, o.green, o.offset, o.double, o.detail]);
}
const glowTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(0.35, 'rgba(255,200,110,0.55)'); gr.addColorStop(1, 'rgba(255,190,100,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
};
const AWNINGS = ['#C2416E', '#2F7FD8', '#1A7F50', '#E2A43C', '#D9643A', '#7A4FB8'];
const BOUGAIN = ['#D23C8E', '#E0559E', '#B8327A'];

function Instanced({ geo, mats, mat, colors }: { geo: THREE.BufferGeometry; mats: THREE.Matrix4[]; mat: THREE.Material; colors?: THREE.Color[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const m = ref.current;
    mats.forEach((x, i) => m.setMatrixAt(i, x));
    if (colors) colors.forEach((c, i) => m.setColorAt(i, c));
    m.count = mats.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [mats, colors]);
  return <instancedMesh ref={ref} args={[geo, mat, Math.max(mats.length, 1)]} frustumCulled={false} />;
}

function Static({ w, u, water, density }: { w: World; u: ReviveUniforms; water: THREE.ShaderMaterial; density: number }) {
  const g = useMemo(() => {
    usePalette(w.palette);
    const route = w.route.map(r => ({ w: 5.0, points: r.points }));
    const curb = w.route.map(r => ({ w: 6.4, points: r.points }));
    return {
      terrain: terrainGeometry(w), river: riverGeometry(w), massifs: w.patches.map(p => massifGeometry(density >= 1 ? p : p.low, w.tintData ? w.tintAt : undefined)), water: waterGeometry(w),
      sidewalk: ribbons(w.route.map(r => ({ w: 9.2, points: r.points })), w.ground, 0.24, PAL.side, 1.5), alleys: alleyGeometry(w.alleys, w.plain),
      compound: compoundGeometry(), shop: shopGeometry(), awning: awningGeometry(), post: postGeometry(), jar: jarGeometry(),
      shadeTree: shadeTreeGeometry(), shrub: shrubGeometry(), wires: wireGeometry(w.posts, w.ground),
      roads: ribbons(w.roads, w.plain, 0.22, PAL.road),
      curb: ribbons(curb, w.ground, 0.3, PAL.curb, 1.5), street: ribbons(route, w.ground, 0.38, PAL.street, 1.5),
      boulder: boulderGeometry(), house: bgHouseGeometry(), tree: treeGeometry(), palm: palmGeometry(), grass: grassGeometry(), mosque: mosqueGeometry(),
    };
  }, [w, density]);
  const details = useMemo(() => w.patches.map(p => { const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}worlds/${w.id}/${p.detail}`); t.anisotropy = 4; return { t, box: new THREE.Vector4(p.x0, p.z0, p.x1, p.z1) }; }), [w]);
  const M = {
    ground: useMat(u, { green: w.tint ? 'soft' : true }), plain: useMat(u), river: useMat(u, { offset: 1 }), roads: useMat(u, { offset: 2 }),
    curb: useMat(u, { offset: 3 }), street: useMat(u, { offset: 4 }), rock: useMat(u),
    tree: useMat(u, { grow: true, sway: 0.03 }), palm: useMat(u, { grow: true, sway: 0.025 }), grass: useMat(u, { grow: true, sway: 0.12, double: true }),
    build: useMat(u, { build: true }), shrub: useMat(u, { grow: true, sway: 0.05 }), side: useMat(u, { offset: 2 }), alley: useMat(u, { offset: 3, appear: true }),
    rock0: useMat(u, { detail: details[0]?.t, detailBox: details[0]?.box }), rock1: useMat(u, { detail: details[1]?.t, detailBox: details[1]?.box }),
  };
  const wireMat = useMemo(() => revivable(new THREE.LineBasicMaterial({ color: '#2E2620' }), u, { appear: true }), [u]);
  const glow = useMemo(() => glowMaterial(u, glowTex(), 2.6), [u]);
  const lanterns = useMemo(() => { const b = new THREE.BufferGeometry(); const pts: number[] = [];
    for (const side of w.posts) for (const [x, z, r] of side) pts.push(x + Math.sin(r) * 0.9, w.ground(x, z) + 3.75, z + Math.cos(r) * 0.9);
    b.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return b; }, [w]);
  const compounds = useMemo(() => w.compounds.filter((_, i) => density >= 1 || i % 2 === 0), [w, density]);
  const compoundMats = useMemo(() => compounds.map(([x, z, r, a, b, h]) => m4(x, w.ground(x, z), z, r, a, h * 1.6, b)), [compounds, w]);
  const windows = useMemo(() => { const b = new THREE.BufferGeometry(); const pts: number[] = [];
    compounds.forEach(([x, z, r, a, bb, h], i) => { if (i % 5 > 1) return;
      for (const sx of [-0.26, 0.26]) { const lx = sx * a, lz = 0.07 * bb; pts.push(x + lx * Math.cos(r) + lz * Math.sin(r), w.ground(x, z) + h * 1.6 * 0.62, z - lx * Math.sin(r) + lz * Math.cos(r)); } });
    b.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return b; }, [compounds, w]);
  const winGlow = useMemo(() => glowMaterial(u, glowTex(), 0.9), [u]);
  const compoundCols = useMemo(() => compounds.map((_, i) => new THREE.Color(WALLS[(i * 5 + 2) % WALLS.length])), [compounds]);
  const shops = useMemo(() => w.shops.map(([x, z, r]) => m4(x, w.ground(x, z), z, r)), [w]);
  const awnCols = useMemo(() => w.shops.map(s => new THREE.Color(AWNINGS[s[3] % AWNINGS.length])), [w]);
  const posts = useMemo(() => w.posts.flat().map(([x, z, r]) => m4(x, w.ground(x, z), z, r)), [w]);
  const jars = useMemo(() => w.jars.map(([x, z, r]) => m4(x, w.ground(x, z), z, r)), [w]);
  const shade = useMemo(() => w.shadeTrees.filter((_, i) => density >= 1 || i % 3 === 0).map(([x, z, s], i) => m4(x, w.ground(x, z), z, i * 1.7, s, s, s)), [w, density]);
  const shrubList = useMemo(() => w.shrubs.filter((_, i) => density >= 1 || i % 3 === 0), [w, density]);
  const shrubMats = useMemo(() => shrubList.map(([x, z, s], i) => m4(x, w.ground(x, z), z, i, s, s, s)), [shrubList, w]);
  const shrubCols = useMemo(() => shrubList.map(([, , , b], i) => new THREE.Color(b ? BOUGAIN[i % 3] : (i % 2 ? '#4E8A3A' : '#6A9A45'))), [shrubList]);
  const keep = (i: number) => density >= 1 || i % 2 === 0;
  const boulders = useMemo(() => w.boulders.filter((_, i) => density >= 1 || i % 4 === 0).map(([x, z, s], i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 1.3, i * 2.1, i * 0.7));
    return new THREE.Matrix4().compose(new THREE.Vector3(x, w.ground(x, z) + s * 0.25, z), q, new THREE.Vector3(s, s * 0.7, s * 0.9));
  }), [w, density]);
  const houses = useMemo(() => w.houses.filter((_, i) => keep(i)), [w, density]);
  const houseMats = useMemo(() => houses.map(([x, z, r, a, b, h]) => m4(x, w.ground(x, z), z, r, a, h, b)), [houses, w]);
  const houseCols = useMemo(() => houses.map((_, i) => new THREE.Color(WALLS[(i * 7) % WALLS.length])), [houses]);
  const trees = useMemo(() => w.trees.filter((_, i) => density >= 1 || i % 4 === 0).map(([x, z, s]) => m4(x, w.ground(x, z), z, s * 3, s, s, s)), [w, density]);
  const palms = useMemo(() => w.palms.map(([x, z, s, r]) => m4(x, w.ground(x, z), z, r, s, s, s)), [w]);
  const yard = useMemo(() => w.yardTrees.filter((_, i) => density >= 1 || i % 3 === 0).map(([x, z, s], i) => m4(x, w.ground(x, z), z, i * 2.3, s, s, s)), [w, density]);
  const grass = useMemo(() => w.grass.filter((_, i) => density >= 1 || i % 3 === 0).map(([x, z, s], i) => m4(x, w.ground(x, z), z, i, s, s, s)), [w, density]);
  const mq = w.landmarks.mosque;
  return (
    <group>
      <mesh geometry={g.terrain} material={M.ground} />
      <mesh geometry={g.river} material={M.river} />
      <mesh geometry={g.water} material={water} renderOrder={2} userData={{ water: true }} />
      <mesh geometry={g.roads} material={M.roads} />
      <mesh geometry={g.curb} material={M.curb} />
      <mesh geometry={g.street} material={M.street} />
      {g.massifs.map((m, i) => <mesh key={i} geometry={m} material={i === 0 ? M.rock0 : M.rock1} />)}
      <mesh geometry={g.sidewalk} material={M.side} />
      <mesh geometry={g.alleys} material={M.alley} />
      <Instanced geo={g.compound} mats={compoundMats} mat={M.build} colors={compoundCols} />
      <Instanced geo={g.shop} mats={shops} mat={M.build} />
      <Instanced geo={g.awning} mats={shops} mat={M.build} colors={awnCols} />
      <Instanced geo={g.post} mats={posts} mat={M.build} />
      <lineSegments geometry={g.wires} material={wireMat} />
      <points geometry={lanterns} material={glow} />
      <points geometry={windows} material={winGlow} />
      <Instanced geo={g.jar} mats={jars} mat={M.build} />
      <Instanced geo={g.shadeTree} mats={shade} mat={M.tree} />
      <Instanced geo={g.shrub} mats={shrubMats} mat={M.shrub} colors={shrubCols} />
      <Instanced geo={g.boulder} mats={boulders} mat={M.rock} />
      <Instanced geo={g.house} mats={houseMats} mat={M.plain} colors={houseCols} />
      <Instanced geo={g.tree} mats={trees} mat={M.tree} />
      <Instanced geo={g.palm} mats={palms} mat={M.palm} />
      <Instanced geo={g.tree} mats={yard} mat={M.tree} />
      <Instanced geo={g.grass} mats={grass} mat={M.grass} />
      {mq && <mesh geometry={g.mosque} material={M.plain} position={[mq.x, mq.y, mq.z]} rotation={[0, Math.PI / 2, 0]} scale={0.62} />}
    </group>
  );
}

/** The 37 lesson houses: empty plot -> scaffold (current lesson) -> warm house with a painted door, a tree in the
 *  yard and its lamp lit. Doors take their zone's colour. */
function Lessons({ w, u, mastered }: { w: World; u: ReviveUniforms; mastered: number }) {
  const g = useMemo(() => ({ house: lessonHouseGeometry(), door: doorGeometry(), scaffold: scaffoldGeometry(), plot: plotGeometry(), tree: treeGeometry() }), []);
  const mat = useMat(u), grow = useMat(u, { grow: true, sway: 0.03 });
  const sets = useMemo(() => {
    const out = { house: [] as THREE.Matrix4[], door: [] as THREE.Matrix4[], doorCol: [] as THREE.Color[], scaffold: [] as THREE.Matrix4[], plot: [] as THREE.Matrix4[], tree: [] as THREE.Matrix4[], lamps: [] as number[] };
    w.plots.forEach((p, i) => {
      const base = m4(p.x, w.ground(p.x, p.z), p.z, p.face);
      if (i < mastered) {
        out.house.push(base); out.door.push(base); out.doorCol.push(new THREE.Color(DOOR[p.zone] ?? '#2F7FD8'));
        out.tree.push(base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(1.4, 0, 2.4), new THREE.Quaternion(), new THREE.Vector3(0.8, 0.8, 0.8))));
        const v = new THREE.Vector3(0, 2.35, 1.2).applyMatrix4(base); out.lamps.push(v.x, v.y, v.z);
      } else if (i === mastered) out.scaffold.push(base);
      else out.plot.push(base);
    });
    return out;
  }, [w, mastered]);
  const glow = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(0.35, 'rgba(255,200,110,0.55)'); gr.addColorStop(1, 'rgba(255,190,100,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }, []);
  const lampGeo = useMemo(() => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(sets.lamps.length ? sets.lamps : [0, -999, 0], 3)); return b; }, [sets]);
  return (
    <group>
      <Instanced geo={g.house} mats={sets.house} mat={mat} />
      <Instanced geo={g.door} mats={sets.door} mat={mat} colors={sets.doorCol} />
      <Instanced geo={g.scaffold} mats={sets.scaffold} mat={mat} />
      <Instanced geo={g.plot} mats={sets.plot} mat={mat} />
      <Instanced geo={g.tree} mats={sets.tree} mat={grow} />
      <points geometry={lampGeo}><pointsMaterial map={glow} size={4.2} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    </group>
  );
}

/** Small flocks circling over the revived street: life returns with the water and the trees. */
function Birds({ w, mastered }: { w: World; mastered: number }) {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.7, 0, 0.2, 0, 0, -0.3, 0, 0.05, 0.25, 0, 0, -0.3, 0.7, 0, 0.2, 0, 0.05, 0.25], 3)); g.computeVertexNormals(); return g; }, []);
  const flocks = useMemo(() => {
    if (mastered <= 0) return [];
    const picks = [...new Set([0, Math.floor((mastered - 1) / 2), mastered - 1])];
    return picks.map((i, k) => { const p = w.plots[i]; return { x: p.x, z: p.z, y: w.ground(p.x, p.z) + 16 + k * 3, r: 9 + k * 2, sp: 0.35 + k * 0.07 }; });
  }, [w, mastered]);
  const refs = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flocks.forEach((f, k) => {
      const grp = refs.current[k]; if (!grp) return;
      grp.children.forEach((b, j) => {
        const a = t * f.sp + j * 0.45 + k;
        b.position.set(f.x + Math.cos(a) * (f.r + j * 0.8), f.y + Math.sin(t * 2 + j) * 0.6, f.z + Math.sin(a) * (f.r + j * 0.8));
        b.rotation.y = -a; b.scale.setScalar(1 + 0.25 * Math.sin(t * 9 + j));
      });
    });
  });
  return (
    <group>
      {flocks.map((_, k) => (
        <group key={k} ref={el => { if (el) refs.current[k] = el; }}>
          {Array.from({ length: 6 }, (_, j) => <mesh key={j} geometry={geo}><meshBasicMaterial color="#3B2E26" side={THREE.DoubleSide} /></mesh>)}
        </group>
      ))}
    </group>
  );
}

function Beacon({ w, lit }: { w: World; lit: boolean }) {
  const b = w.beacon;
  return (
    <group position={[b.x, b.y - 0.5, b.z]}>
      <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.9, 1.3, 3.2, 10]} /><meshLambertMaterial color="#E8D6B8" /></mesh>
      <mesh position={[0, 3.9, 0]}><sphereGeometry args={[1.0, 14, 10]} /><meshBasicMaterial color={lit ? '#FFE9A8' : '#8F887E'} toneMapped={false} /></mesh>
      <mesh position={[0, 5.2, 0]}><coneGeometry args={[1.2, 1.4, 10]} /><meshLambertMaterial color="#C9875A" /></mesh>
    </group>
  );
}

function Sky() {
  const mat = useMemo(() => skyMaterial(PAL.skyTop, PAL.skyBottom, new THREE.Vector3(-0.9, 0.18, 0.35).normalize()), []);
  return <mesh material={mat} scale={2200}><sphereGeometry args={[1, 24, 12]} /></mesh>;
}

/**
 * Drone camera. Behind Siraj, facing the Totil summit. The pitch is solved every frame so the summit sits near
 * the top of the frame while Siraj stays in the lower half; if both cannot fit, Siraj wins.
 */
type Celebrate = { t: number; houseS: number };
function DroneRig({ w, s, zoom, finale, riverUntil, cel }: { w: World; s: React.MutableRefObject<number>; zoom: React.MutableRefObject<number>; finale: boolean; riverUntil: number; cel: React.MutableRefObject<Celebrate> }) {
  const cam = useThree(st => st.camera) as THREE.PerspectiveCamera;
  const size = useThree(st => st.size);
  const look = useMemo(() => new THREE.Vector3(), []), pos = useMemo(() => new THREE.Vector3(), []), first = useRef(true), lift = useRef(1);
  useFrame((_, dt) => {
    const portrait = size.width / size.height < 0.9;
    const fov = portrait ? 60 : 44, half = THREE.MathUtils.degToRad(fov / 2);
    if (Math.abs(cam.fov - fov) > 0.1) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const p = w.at(s.current), py = w.ground(p.x, p.z) + 1.4;
    let dx = w.beacon.x - p.x, dz = w.beacon.z - p.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    // along the Gash bank: turn ~30 degrees south so the river (filling from upstream) is in view with the summit
    const turn = (portrait ? 0.2 : 0.52) * (1 - THREE.MathUtils.smoothstep(s.current, riverUntil - 10, riverUntil + 50));
    if (turn > 0.001) { const c = Math.cos(turn), sn = Math.sin(turn); [dx, dz] = [dx * c - dz * sn, dx * sn + dz * c]; }
    // world complete: the drone climbs high over the middle of the street to show the whole lit town under Taka
    lift.current = THREE.MathUtils.damp(lift.current, finale ? 3.4 : 1, 0.9, dt);
    const z = zoom.current * lift.current, climb = Math.max(py - 2, 0) * 0.5;
    let back = (portrait ? 30 : 36) * z, up = (portrait ? 19 : 15) * z + climb;
    // never inside or behind a granite tower: pull in and rise until the view is clear
    for (let k = 0; k < 8; k++) {
      pos.set(p.x - dx * back, py + up, p.z - dz * back);
      let hit = pos.y < w.ground(pos.x, pos.z) + 5;
      for (let q = 1; q < 10 && !hit; q++) {          // line of sight from the drone to Siraj must clear the rock
        const u = q / 10, lx = pos.x + (p.x - pos.x) * u, lz = pos.z + (p.z - pos.z) * u, ly = pos.y + (py - pos.y) * u;
        if (w.ground(lx, lz) > ly - 0.5) hit = true;
      }
      if (!hit) break;
      back *= 0.8; up *= 1.15;
    }
    pos.y = Math.max(pos.y, w.ground(pos.x, pos.z) + 6);
    const hs = Math.hypot(w.beacon.x - pos.x, w.beacon.z - pos.z), angS = Math.atan2(w.beacon.y + 4 - pos.y, hs);
    const angP = Math.atan2(py - pos.y, Math.hypot(p.x - pos.x, p.z - pos.z));
    let pitch = angS - 0.72 * half;                     // summit near the top edge
    if ((angP - pitch) / half < -0.78) pitch = angP + 0.62 * half;   // never lose Siraj
    if (first.current) { cam.position.copy(pos); first.current = false; } else cam.position.lerp(pos, 1 - Math.exp(-dt * 3.2));
    look.set(cam.position.x + dx * Math.cos(pitch) * 50, cam.position.y + Math.sin(pitch) * 50, cam.position.z + dz * Math.cos(pitch) * 50);
    // after a finished lesson: swing round from just ahead of the new house and look BACK along the street while the
    // houses rise and the palms grow behind Siraj, then return to face the summit and the grey road ahead
    const c = cel.current;
    if (c.t >= 0) {
      c.t += dt;
      const k = THREE.MathUtils.smoothstep(c.t, 0, 1.1) * (1 - THREE.MathUtils.smoothstep(c.t, 4.6, 6.0));
      if (c.t > 6) c.t = -1;
      const a = w.at(c.houseS + 24), b = w.at(Math.max(c.houseS - 26, 0));
      const side = (portrait ? 9 : 14);
      const cp = new THREE.Vector3(a.x - a.tz * side, w.ground(a.x, a.z) + (portrait ? 26 : 22), a.z + a.tx * side);
      const ct = new THREE.Vector3(b.x, w.ground(b.x, b.z) + 1, b.z);
      cam.position.lerp(cp, k);
      look.lerp(ct, k);
      cam.lookAt(look);
    } else cam.lookAt(look);
  });
  return null;
}

/**
 * Review only (?cam=lat,lon,metresAboveGround,headingDeg,pitchDeg,fovDeg): stand exactly where a reference photo was
 * taken and look the same way, without haze, to compare skylines 1:1. Heading 0 = north, 90 = east.
 */
function reviewCam(): number[] | null {
  const c = new URLSearchParams(location.search).get('cam');
  const v = c?.split(',').map(Number);
  return v && v.length >= 5 && v.every(Number.isFinite) ? v : null;
}
function ReviewRig({ w, cam: c }: { w: World; cam: number[] }) {
  const cam = useThree(st => st.camera) as THREE.PerspectiveCamera;
  const scene = useThree(st => st.scene);
  useEffect(() => {
    const [lat, lon, hm, hd, pd, fov = 50] = c;
    const p = w.toScene(lat, lon), h = THREE.MathUtils.degToRad(hd), pt = THREE.MathUtils.degToRad(pd);
    // photo GPS can be tens of metres off: if that lands on rock, step back (away from the view) to flat ground
    let moved = 0;
    while (w.ground(p.x, p.z) - w.plain(p.x, p.z) > 0.3 && moved < 40) { p.x -= Math.sin(h); p.z += Math.cos(h); moved++; }
    console.info(`[review] camera moved ${moved * w.unitMetres} m back to flat ground`);
    scene.fog = null;
    cam.fov = fov; cam.far = 6000; cam.near = 0.05; cam.updateProjectionMatrix();
    cam.position.set(p.x, w.ground(p.x, p.z) + Math.max(hm, 5) / w.unitMetres, p.z);   // eye above the street strips
    cam.lookAt(cam.position.x + Math.sin(h) * Math.cos(pt) * 100, cam.position.y + Math.sin(pt) * 100, cam.position.z - Math.cos(h) * Math.cos(pt) * 100);
  }, [w, c, cam, scene]);
  return null;
}

/** Generic worlds: extra instanced layers (vegetation, buildings, boats), water cells, landmark models. */
function Generic({ w, u, life, density }: { w: World; u: ReviveUniforms; life: THREE.ShaderMaterial; density: number }) {
  const mats = {
    static: useMat(u), grow: useMat(u, { grow: true, sway: 0.03 }), build: useMat(u, { build: true }),
  };
  const layers = useMemo(() => (w.layers ?? []).map(L => {
    const items = L.items.filter((_, i) => density >= 1 || i % 2 === 0);
    const geo = BG[L.kit]?.() ?? null;
    return { L, geo, mats: items.map(([x, z, r, s, sy]) => m4(x, w.ground(x, z), z, r ?? 0, s ?? 1, sy ?? s ?? 1, s ?? 1)),
      colors: L.colors ? items.map((_, i) => new THREE.Color(L.colors![i % L.colors!.length])) : undefined };
  }), [w, density]);
  // one water surface at the real water level; the real ground rises out of it, so the shore follows the land
  const waterGeo = useMemo(() => {
    const W = w.water; if (!W) return null;
    // rivers and sea: one surface at the water level; crater lakes: one surface per lake at its own level
    const planes = W.planes?.length ? W.planes : [{ ...w.bounds, level: W.level ?? 0 }];
    return mergeGeometries(planes.map(p => {
      const g = new THREE.PlaneGeometry(p.x1 - p.x0, p.z1 - p.z0, 1, 1);
      g.rotateX(-Math.PI / 2); g.translate((p.x0 + p.x1) / 2, p.level + 0.15, (p.z0 + p.z1) / 2); return g;
    }));
  }, [w]);
  const marks = useMemo(() => (w.landmarkList ?? []).map(m => ({ geo: BG[m.kit]?.() ?? null, mat: m4(m.x, w.ground(m.x, m.z), m.z, m.rot, m.s, m.s, m.s) })), [w]);
  return (
    <group>
      {waterGeo && <mesh geometry={waterGeo} material={life} renderOrder={2} />}
      {layers.map(({ L, geo, mats: ms, colors }, i) => geo && <Instanced key={i} geo={geo} mats={ms} mat={L.mode === 'grow' ? mats.grow : L.mode === 'build' ? mats.build : mats.static} colors={colors} />)}
      {marks.map((m, i) => m.geo && <Instanced key={`m${i}`} geo={m.geo} mats={[m.mat]} mat={mats.static} />)}
    </group>
  );
}

/** Stations of a generic world, drawn with their kits (a world can change kit along its path) in their four looks
 *  (plot, scaffold, built, thriving). */
function KitStations({ w, u, mastered }: { w: World; u: ReviveUniforms; mastered: number }) {
  const kits = useMemo(() => [...new Set(w.plots.map(p => p.kit ?? w.stationKit!))], [w]);
  return <>{kits.map(k => <KitSet key={k} w={w} u={u} mastered={mastered} kitId={k} />)}</>;
}
function KitSet({ w, u, mastered, kitId }: { w: World; u: ReviveUniforms; mastered: number; kitId: string }) {
  const kit = useMemo(() => KITS[kitId]?.(), [kitId]);
  const mat = useMat(u), grow = useMat(u, { grow: true, sway: 0.03 }), spin = useMat(u, { spin: 0.9 });
  const sets = useMemo(() => {
    const o = { plot: [] as THREE.Matrix4[], scaffold: [] as THREE.Matrix4[], built: [] as THREE.Matrix4[], extra: [] as THREE.Matrix4[], spin: [] as THREE.Matrix4[] };
    w.plots.forEach((p, i) => {
      if ((p.kit ?? w.stationKit) !== kitId) return;
      const k = w.kitScale ?? 1, base = m4(p.x, w.ground(p.x, p.z), p.z, p.face, k, k, k);
      if (i < mastered) {
        o.built.push(base); o.extra.push(base);
        if (kit?.spin) o.spin.push(base.clone().multiply(new THREE.Matrix4().makeTranslation(...kit.spin.at)));
      } else if (i === mastered) o.scaffold.push(base);
      else o.plot.push(base);
    });
    return o;
  }, [w, mastered, kit, kitId]);
  if (!kit) return null;
  return (
    <group>
      <Instanced geo={kit.plot} mats={sets.plot} mat={mat} />
      <Instanced geo={kit.scaffold} mats={sets.scaffold} mat={mat} />
      <Instanced geo={kit.built} mats={sets.built} mat={mat} />
      <Instanced geo={kit.extra} mats={sets.extra} mat={grow} />
      {kit.spin && <Instanced geo={kit.spin.geo} mats={sets.spin} mat={spin} />}
    </group>
  );
}

export function KassalaTown({ world = 'kassala', mastered, density = 1, interactive = true, sirajAction = 'idle', onSirajTap, focus = null }: Props) {
  const w = useWorld(world);
  if (!w) return null;
  return <Town w={w} mastered={Math.min(mastered, w.plots.length)} density={density} interactive={interactive} sirajAction={sirajAction} onSirajTap={onSirajTap} focus={focus} />;
}

export const WorldTown = KassalaTown;

function Town({ w, mastered, density, interactive, sirajAction, onSirajTap, focus }: Required<Omit<Props, 'onSirajTap' | 'world'>> & { w: World; onSirajTap?: () => void }) {
  const total = w.plots.length, done = mastered >= total;
  const review = useMemo(reviewCam, []);
  const end = w.streetLen[w.streetLen.length - 1];
  // Siraj waits on the street a little before the next plot (the scaffold); at the end he stands by the last house.
  const target = Math.max(w.plotSRoute[Math.min(mastered, total - 1)] - 3, 0);
  const sCur = useRef(target), sCam = useRef(target), drag = useRef(0), zoom = useRef(1);
  const siraj = useRef<THREE.Group>(null!), moving = useRef(false);
  useEffect(() => { drag.current = 0; }, [mastered]);

  // revival: the front sits just past the last finished house; it travels there slowly so the child sees the wave
  const u = useMemo(() => makeReviveUniforms(w), [w]);
  const water = useMemo(() => waterMaterial(u), [u]);
  if (import.meta.env.DEV) (window as unknown as { __town: unknown }).__town = { u, water, w };
  const front = mastered > 0 ? w.plotS[mastered - 1] + 12 : -40;
  const gashLessons = w.plots.filter(p => p.zone === w.plots[0].zone).length;
  const fill = Math.min(mastered / gashLessons, 1);
  const life = useMemo(() => {
    let tex: THREE.DataTexture | undefined;
    if (w.tintData) {
      const n = w.grid.w * w.grid.h, rgba = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) { rgba[i * 4] = w.tintData[i * 3]; rgba[i * 4 + 1] = w.tintData[i * 3 + 1]; rgba[i * 4 + 2] = w.tintData[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
      tex = new THREE.DataTexture(rgba, w.grid.w, w.grid.h, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    }
    return lifeWaterMaterial(u, tex);
  }, [u, w]);
  const first = useRef(true);
  const cel = useRef<Celebrate>({ t: -1, houseS: 0 });
  const lastM = useRef(mastered);
  useEffect(() => {
    if (mastered > lastM.current && !done && focus == null) cel.current = { t: 0, houseS: w.plotSRoute[mastered - 1] };
    lastM.current = mastered;
  }, [mastered, done, focus, w]);
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    u.uProg.value = front; u.uAll.value = done ? 1 : 0; water.uniforms.uFill.value = fill * 1.02;
  }, [u, water, front, done, fill]);

  useFrame((_, dt) => {
    u.uTime.value += dt;
    u.uProg.value = THREE.MathUtils.damp(u.uProg.value, front, 0.9, dt);
    u.uAll.value = THREE.MathUtils.damp(u.uAll.value, done ? 1 : 0, 0.55, dt);
    water.uniforms.uFill.value = THREE.MathUtils.damp(water.uniforms.uFill.value, fill * 1.02, 0.7, dt);
    life.uniforms.uLife.value = THREE.MathUtils.damp(life.uniforms.uLife.value, done ? 1 : Math.min(1, 0.15 + 0.85 * mastered / Math.max(total, 1)), 0.8, dt);

    const prev = sCur.current;
    sCur.current = THREE.MathUtils.damp(sCur.current, target, 1.6, dt);
    moving.current = Math.abs(sCur.current - target) > 0.5;
    const p = w.at(sCur.current);
    siraj.current.position.set(p.x, w.ground(p.x, p.z) + 0.45, p.z);
    // walking: face along the street; waiting: turn toward the camera (which sits behind him, away from the summit)
    const face = moving.current && sCur.current !== prev ? Math.atan2(p.tx, p.tz) : Math.atan2(-(w.beacon.x - p.x), -(w.beacon.z - p.z));
    const r = siraj.current.rotation, diff = Math.atan2(Math.sin(face - r.y), Math.cos(face - r.y));
    r.y += diff * (1 - Math.exp(-dt * 5));
    const camTarget = focus != null ? focus * end : done ? end * 0.42 : THREE.MathUtils.clamp(sCur.current + drag.current, 0, end);
    sCam.current = THREE.MathUtils.damp(sCam.current, camTarget, 2.4, dt);
  });

  // one finger drags along the street (up = forward); two fingers or the wheel zoom
  const gl = useThree(st => st.gl);
  useEffect(() => {
    if (!interactive) return;
    const el = gl.domElement, pts = new Map<number, { x: number; y: number }>();
    let y0 = 0, x0 = 0, d0 = 0, pinch0 = 0, z0 = 1;
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { y0 = e.clientY; x0 = e.clientX; d0 = drag.current; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = zoom.current; }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; zoom.current = THREE.MathUtils.clamp(z0 * pinch0 / Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1), 0.6, 1.9); return; }
      const d = ((y0 - e.clientY) + (x0 - e.clientX) * 0.4) / Math.max(320, el.clientHeight) * 160;
      drag.current = THREE.MathUtils.clamp(d0 + d, -sCur.current, end - sCur.current);
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); };
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoom.current = THREE.MathUtils.clamp(zoom.current * (1 + Math.sign(e.deltaY) * 0.08), 0.6, 1.9); };
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }, [gl, interactive, end]);

  return (
    <group>
      <Sky />
      {/* golden late afternoon (Asr): warm sun low in the west-south-west, raking across the granite */}
      <hemisphereLight args={['#FFE9C9', '#7A5A3E', 1.15]} />
      <directionalLight position={[-300, 110, 170]} intensity={2.6} color="#FFD8A0" />
      <Static w={w} u={u} water={water} density={density} />
      <Generic w={w} u={u} life={life} density={density} />
      {w.stationKit ? <KitStations w={w} u={u} mastered={mastered} /> : <Lessons w={w} u={u} mastered={mastered} />}
      <Birds w={w} mastered={mastered} />
      {w.id === 'kassala' && <Beacon w={w} lit={done} />}
      <group ref={siraj} onClick={onSirajTap}>
        <Siraj action={sirajAction} movingRef={moving} glow={total ? mastered / total : 0} stamps={0} scale={1.35} outfit={outfitFor(w.id)} />
      </group>
      {review ? <ReviewRig w={w} cam={review} /> : <DroneRig w={w} s={sCam} zoom={zoom} finale={done && focus == null} riverUntil={w.riverUntil ?? (w.id === 'kassala' ? w.plotSRoute[gashLessons - 1] ?? 0 : -999)} cel={cel} />}
    </group>
  );
}
