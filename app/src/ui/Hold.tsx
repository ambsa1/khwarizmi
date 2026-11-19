// A long press that works the same with a mouse (desktop) and a finger: the pointer is captured so small movements
// never cancel it, text selection and image dragging are blocked, and a soft ring fills during the hold.
import { useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react';

export function useHold(ms: number, onDone: () => void) {
  const [p, setP] = useState(0);
  const raf = useRef(0), t0 = useRef(0), fired = useRef(false);
  const stop = () => { cancelAnimationFrame(raf.current); setP(0); };
  const start = (e: RPE<HTMLElement>) => {
    if (e.button !== undefined && e.button > 0) return;                 // left mouse button or touch only
    e.preventDefault();                                                  // no text selection, no drag
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable: still works without */ }
    fired.current = false; t0.current = performance.now();
    const tick = () => {
      const k = (performance.now() - t0.current) / ms;
      if (k >= 1) { if (!fired.current) { fired.current = true; setP(0); onDone(); } return; }
      setP(k); raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const handlers = {
    onPointerDown: start, onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(), onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };
  return { p, handlers };
}

/** the progress ring shown while holding (hidden at rest) */
export function HoldRing({ p, size = 72, style }: { p: number; size?: number; style?: React.CSSProperties }) {
  if (p <= 0) return null;
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <svg className="hold-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={style}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.7)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2B53A" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

/** a holdable area with its ring centred over it */
export function HoldArea({ ms, onDone, className, children, ring = 72, label }: { ms: number; onDone: () => void; className?: string; children: ReactNode; ring?: number; label?: string }) {
  const { p, handlers } = useHold(ms, onDone);
  return (
    <div className={'hold-area ' + (className ?? '')} {...handlers} aria-label={label}>
      {children}
      <HoldRing p={p} size={ring} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
    </div>
  );
}
