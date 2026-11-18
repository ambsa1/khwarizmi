// Small textures drawn once in code (no image files): glow sprite, Siraj's faces, woven palm frond, pattern band.
import * as THREE from 'three';

// Older browsers (some Huawei / Android 10 builds) lack roundRect: draw it ourselves.
type RR = (x: number, y: number, w: number, h: number, r?: number) => void;
const proto = (globalThis as { CanvasRenderingContext2D?: { prototype: { roundRect?: RR } } }).CanvasRenderingContext2D?.prototype;
if (proto && !proto.roundRect) {
  proto.roundRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 0) {
    const k = Math.min(r, w / 2, h / 2);
    this.moveTo(x + k, y); this.arcTo(x + w, y, x + w, y + h, k); this.arcTo(x + w, y + h, x, y + h, k);
    this.arcTo(x, y + h, x, y, k); this.arcTo(x, y, x + w, y, k); this.closePath();
  };
}

const cache = new Map<string, THREE.Texture>();
function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  if (cache.has(key)) return cache.get(key)!;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  cache.set(key, t);
  return t;
}

/** Soft round glow for lamps and Siraj's bulb (used with additive blending). */
export const glowTexture = () => canvasTex('glow', 128, 128, g => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,240,190,1)'); r.addColorStop(0.25, 'rgba(255,214,120,.75)');
  r.addColorStop(0.6, 'rgba(255,182,39,.18)'); r.addColorStop(1, 'rgba(255,182,39,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});

/** Soft contact shadow under characters (cheaper than real shadows, looks better on toys). */
export const blobTexture = () => canvasTex('blob', 128, 128, g => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(60,35,20,.45)'); r.addColorStop(.6, 'rgba(60,35,20,.18)'); r.addColorStop(1, 'rgba(60,35,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});

export type Face = 'idle' | 'happy' | 'cheer' | 'think' | 'surprised' | 'sad' | 'sleepy' | 'excited';

/** Siraj's face screen: big friendly eyes on a deep night-blue screen. */
export const faceTexture = (face: Face, blink = false) => canvasTex('face-' + face + (blink ? '-b' : ''), 256, 192, g => {
  const bg = g.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, '#24305A'); bg.addColorStop(1, '#141B36');
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, 256, 192, 56); g.fill();
  g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.ellipse(90, 40, 80, 18, -0.2, 0, Math.PI * 2); g.fill();
  const eye = '#FFE08A', cheek = 'rgba(255,140,120,.55)';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const L = 88, R = 168, Y = 86;
  const dot = (x: number, y: number, rx: number, ry: number) => {
    g.fillStyle = eye; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x - rx * .35, y - ry * .4, rx * .32, ry * .28, 0, 0, Math.PI * 2); g.fill();
  };
  const arc = (x: number, y: number, up: boolean, w = 20) => { g.strokeStyle = eye; g.lineWidth = 11; g.beginPath(); g.arc(x, y + (up ? 8 : -8), w, up ? Math.PI * 1.15 : Math.PI * .15, up ? Math.PI * 1.85 : Math.PI * .85); g.stroke(); };
  if (blink || face === 'sleepy') { g.strokeStyle = eye; g.lineWidth = 10; [L, R].forEach(x => { g.beginPath(); g.moveTo(x - 18, Y + 4); g.quadraticCurveTo(x, Y + 14, x + 18, Y + 4); g.stroke(); }); }
  else if (face === 'happy' || face === 'cheer' || face === 'excited') { arc(L, Y, true); arc(R, Y, true); }
  else if (face === 'sad') { dot(L, Y + 4, 15, 17); dot(R, Y + 4, 15, 17); g.strokeStyle = eye; g.lineWidth = 7; g.beginPath(); g.moveTo(L - 22, Y - 26); g.lineTo(L + 10, Y - 32); g.moveTo(R + 22, Y - 26); g.lineTo(R - 10, Y - 32); g.stroke(); }
  else if (face === 'surprised') { dot(L, Y, 19, 23); dot(R, Y, 19, 23); }
  else if (face === 'think') { dot(L, Y + 2, 15, 18); dot(R + 4, Y - 6, 15, 18); g.strokeStyle = eye; g.lineWidth = 7; g.beginPath(); g.moveTo(R - 14, Y - 38); g.lineTo(R + 18, Y - 30); g.stroke(); }
  else { dot(L, Y, 16, 20); dot(R, Y, 16, 20); }
  // cheeks
  g.fillStyle = cheek; [[L - 26, Y + 34], [R + 26, Y + 34]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 16, 9, 0, 0, Math.PI * 2); g.fill(); });
  // mouth
  g.strokeStyle = eye; g.fillStyle = eye; g.lineWidth = 8;
  g.beginPath();
  if (face === 'cheer' || face === 'excited') { g.moveTo(104, 128); g.quadraticCurveTo(128, 168, 152, 128); g.closePath(); g.fill(); }
  else if (face === 'surprised') { g.ellipse(128, 142, 11, 14, 0, 0, Math.PI * 2); g.fill(); }
  else if (face === 'sad') { g.moveTo(108, 150); g.quadraticCurveTo(128, 134, 148, 150); g.stroke(); }
  else if (face === 'sleepy') { g.moveTo(116, 142); g.quadraticCurveTo(128, 148, 140, 142); g.stroke(); }
  else if (face === 'think') { g.moveTo(112, 142); g.lineTo(144, 136); g.stroke(); }
  else { g.moveTo(106, 134); g.quadraticCurveTo(128, 156, 150, 134); g.stroke(); }
});

/** Woven palm-frond (سعف) pattern for the passport satchel. */
export const wovenTexture = () => {
  const t = canvasTex('woven', 128, 128, g => {
    g.fillStyle = '#D9A75E'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const odd = (x + y) % 2;
      g.fillStyle = odd ? '#E8BE76' : '#C48E45';
      g.beginPath(); g.roundRect(x * 16 + 1, y * 16 + 1, odd ? 14 : 14, 14, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x * 16 + 3, y * 16 + 3, odd ? 10 : 3, odd ? 3 : 10);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1.5);
  return t;
};

/** Gold band with Sudanese diamond motif around Siraj's waist. */
export const bandTexture = () => {
  const t = canvasTex('band', 256, 32, g => {
    g.fillStyle = '#E8A93A'; g.fillRect(0, 0, 256, 32);
    for (let i = 0; i < 16; i++) {
      const x = i * 16 + 8;
      g.fillStyle = i % 2 ? '#B5571F' : '#2B6FB8';
      g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 7, 16); g.lineTo(x, 26); g.lineTo(x - 7, 16); g.closePath(); g.fill();
    }
    g.fillStyle = '#FFE08A'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 29, 256, 3);
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
};
