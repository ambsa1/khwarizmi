// One wrapper for every 3D view: picks the device tier, caps frame rate on weaker phones,
// lowers resolution when frames drop, pauses when hidden, and exposes live stats for the perf overlay.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { guessTier, SETTINGS, type Tier } from '../lib/tier';
import { useApp } from '../state/store';
import { logError } from '../ui/ErrorBoundary';

export const stats = { fps: 0, ms: 0, calls: 0, tris: 0, dpr: 1, tier: 'high' as Tier, gpu: '' };
(window as unknown as { __stats: typeof stats }).__stats = stats;

function Meter() {
  const { gl } = useThree();
  const acc = useRef({ n: 0, t: 0 });
  useFrame((_, dt) => {
    acc.current.n++; acc.current.t += dt;
    if (acc.current.t >= 0.5) {
      stats.fps = Math.round(acc.current.n / acc.current.t);
      stats.ms = +(1000 * acc.current.t / acc.current.n).toFixed(1);
      stats.calls = gl.info.render.calls; stats.tris = gl.info.render.triangles; stats.dpr = +gl.getPixelRatio().toFixed(2);
      acc.current = { n: 0, t: 0 };
    }
  });
  return null;
}

/** On low tier, render at 30 fps (smooth, cooler, kinder to the battery). Stops entirely when the tab is hidden. */
function Limiter({ fps }: { fps: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    let id = 0, last = 0;
    const loop = (t: number) => {
      id = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (t - last >= 1000 / fps - 2) { last = t; invalidate(); }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [fps, invalidate]);
  return null;
}

export function useTier(): Tier {
  const override = useApp(s => s.tierOverride);
  const measured = useApp(s => s.measuredTier);
  const guess = useMemo(guessTier, []);
  return override !== 'auto' ? override : measured ?? guess;
}

/** First run only: watch the first 2 seconds of real rendering (after a 1 s warm-up) and save the tier. */
function Probe() {
  const measured = useApp(s => s.measuredTier), save = useApp(s => s.setMeasuredTier);
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    if (measured) return;
    const a = acc.current; a.t += dt;
    if (a.t < 1) return;
    a.n++;
    if (a.t >= 3) save(a.n / (a.t - 1) >= 40 && guessTier() === 'high' ? 'high' : 'low');
  });
  return null;
}

type Props = { children: ReactNode; camera?: { position: [number, number, number]; fov?: number; far?: number }; className?: string; transparent?: boolean; fog?: [string, number, number]; label?: string };

export function Stage({ children, camera = { position: [0, 2, 6], fov: 40 }, className, transparent, fog, label }: Props) {
  const tier = useTier();
  const s = SETTINGS[tier];
  const [dpr, setDpr] = useState(Math.min(s.dpr[1], window.devicePixelRatio || 1));
  const [canvasKey, setCanvasKey] = useState(0);
  stats.tier = tier;
  return (
    <Canvas
      key={canvasKey}
      className={className}
      aria-label={label}
      role="img"
      dpr={dpr}
      frameloop={tier === 'low' ? 'demand' : 'always'}
      gl={{ antialias: s.antialias, alpha: !!transparent, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: false }}
      camera={{ position: camera.position, fov: camera.fov ?? 40, near: camera.far ? 0.5 : 0.1, far: camera.far ?? 400 }}
      onCreated={({ gl, scene }) => {
        const el = gl.domElement; let timer = 0;
        el.addEventListener('webglcontextlost', e => { e.preventDefault(); void logError('WebGL context lost', '3d'); timer = window.setTimeout(() => setCanvasKey(k => k + 1), 2500); }, { once: true });
        el.addEventListener('webglcontextrestored', () => { clearTimeout(timer); setCanvasKey(k => k + 1); }, { once: true });
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
        try {
          const ctx = gl.getContext(); const ext = ctx.getExtension('WEBGL_debug_renderer_info');
          stats.gpu = String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '');
        } catch { /* ignore */ }
      }}
    >
      <PerformanceMonitor
        bounds={() => (tier === 'low' ? [24, 31] : [45, 61])}
        onDecline={() => setDpr(d => Math.max(s.dpr[0], +(d - 0.15).toFixed(2)))}
        onIncline={() => setDpr(d => Math.min(s.dpr[1], Math.min(window.devicePixelRatio || 1, +(d + 0.1).toFixed(2))))}
        flipflops={3}
      />
      {tier === 'low' && <Limiter fps={30} />}
      <Meter />
      {tier === 'high' && <Probe />}
      {children}
    </Canvas>
  );
}
