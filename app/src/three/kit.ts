// Shared building blocks for the hand-made diorama worlds: rounded domes, sky dome, shimmering water,
// streaked granite, and a ribbon path. Everything is generated in code (no model files) and uses cheap
// Lambert / Basic materials so older Mali and Adreno phones stay at a steady 30 fps.
import * as THREE from 'three';

const texCache = new Map<string, THREE.Texture>();
function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  if (texCache.has(key)) return texCache.get(key)!;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Height of a smooth "Taka finger" dome at radius r (bullet shaped: steep sides, rounded top). */
export function domeHeight(r: number, R: number, H: number, p = 2.6) {
  if (r >= R) return 0;
  return H * Math.pow(1 - Math.pow(r / R, p), 0.55);
}

/** Lathe dome with pre-baked shading in vertex colours: darker at the foot, warm light at the top. */
export function domeGeometry(R: number, H: number, base: string, seg = 28, rings = 18, p = 2.6) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= rings; i++) {
    const r = R * (1 - i / rings);
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), domeHeight(r * 0.999, R, H, p)));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  const c0 = new THREE.Color(base), dark = c0.clone().multiplyScalar(0.72), light = c0.clone().lerp(new THREE.Color('#FFE6CC'), 0.28);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.clamp(pos.getY(i) / H, 0, 1);
    tmp.copy(dark).lerp(c0, Math.min(1, k * 1.6)).lerp(light, Math.max(0, k - 0.55) * 1.4);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Vertical rain streaks on granite: dark soft lines, tileable around the dome. */
export const streakTexture = () => {
  const t = canvasTex('streaks', 256, 128, g => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 256, 128);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 256, w = 1.5 + rnd() * 4, top = 10 + rnd() * 60;
      const gr = g.createLinearGradient(0, top, 0, 128);
      gr.addColorStop(0, 'rgba(90,60,55,0)'); gr.addColorStop(0.3, `rgba(90,60,55,${0.18 + rnd() * 0.2})`); gr.addColorStop(1, 'rgba(90,60,55,.05)');
      g.fillStyle = gr; g.fillRect(x, top, w, 128 - top);
    }
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
};

/** Animated shimmer for the river (offset scrolls in useFrame). */
export const waterTexture = () => {
  const t = canvasTex('water', 256, 256, g => {
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 256, 256);
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * 256, y = rnd() * 256, w = 12 + rnd() * 40;
      g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.5})`;
      g.beginPath(); g.ellipse(x, y, w / 2, 1.6, 0, 0, Math.PI * 2); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1.5);
  return t;
};

/** Sky dome: two-colour gradient plus a soft low sun. Drawn behind everything, ignores fog. */
export function skyMaterial(top: string, bottom: string, sunDir = new THREE.Vector3(0.25, 0.12, -1).normalize()) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) }, sun: { value: sunDir } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sun; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y*1.6+0.08,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.8));
        float s = max(dot(normalize(vDir), sun), 0.0); c += vec3(1.0,0.85,0.55) * (pow(s, 380.0)*1.4 + pow(s, 12.0)*0.22);
        gl_FragColor = vec4(c,1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Flat ribbon that follows a curve (the winding road). Width in world units. */
export function ribbonGeometry(curve: THREE.Curve<THREE.Vector3>, width: number, samples = 220, lift = 0.04, height?: (x: number, z: number) => number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const u = i / samples, p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    side.crossVectors(tan, up).normalize().multiplyScalar(width / 2);
    const ax = p.x - side.x, az = p.z - side.z, bx = p.x + side.x, bz = p.z + side.z;
    const ay = height ? height(ax, az) : p.y, by = height ? height(bx, bz) : p.y;
    pos.push(ax, ay + lift, az, bx, by + lift, bz);
    uv.push(0, u * 40, 1, u * 40);
    if (i < samples) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Deterministic random numbers so every device and screenshot builds the same world. */
export function rng(seed: number) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
