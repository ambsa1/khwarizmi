// Device performance tier. Decides render resolution, shadows, antialiasing and scene density.
// First guess from the GPU name and memory, then the live scene can lower it if frames drop (see Stage).

export type Tier = 'low' | 'high';
export type TierSettings = { dpr: [number, number]; antialias: boolean; shadows: boolean; density: number; label: string };

export const SETTINGS: Record<Tier, TierSettings> = {
  low: { dpr: [0.85, 1.25], antialias: false, shadows: false, density: 0.6, label: 'low' },
  high: { dpr: [1, 1.5], antialias: true, shadows: true, density: 1, label: 'high' },
};

export function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch { return 'none'; }
}

export function hasWebGL2(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

/** Heuristic first guess. Older/mid Mali, Adreno 5xx/6xx below 640, PowerVR and Kirin's Mali-G52/G57 start on low. */
export function guessTier(): Tier {
  const g = gpuName().toLowerCase();
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (/apple|m1|m2|m3|a1[4-9]/.test(g)) return 'high';
  if (/swiftshader|llvmpipe|software/.test(g)) return 'low';
  if (/mali-g(3|5|6|7)[0-9]|mali-t|powervr|adreno \(tm\) (3|4|5)\d\d|adreno \(tm\) 6[0-3]\d/.test(g)) return 'low';
  if (mem <= 3 || cores <= 4) return 'low';
  return 'high';
}
