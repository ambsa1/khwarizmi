// The live window on the child's current world. Kassala is the full drone-view scene; other worlds use the small diorama
// until their scenes are built. A world's 3D files are downloaded once (with progress, inside this window) and then work
// with no internet. Without WebGL, or offline before the first download, a pre-rendered picture of the world is shown.
import { useEffect, useMemo, useState } from 'react';
import { usePacks } from '../data/packs';
import { SETTINGS, hasWebGL2 } from '../lib/tier';
import type { WorldId } from '../lib/tokens';
import { T } from '../lib/tokens';
import { DioramaScene } from './Diorama';
import { WorldTown, TOWN_FAR, TOWN_FOG } from './town/KassalaTown';
import type { SirajAction } from './Siraj';
import { Stage, useTier } from './Stage';

type Props = { world: WorldId; mastered: number; total: number; action?: SirajAction; interactive?: boolean; label?: string; onSirajTap?: () => void };

function Picture({ world, label, children }: { world: WorldId; label?: string; children?: React.ReactNode }) {
  const c = T.worlds[world];
  return (
    <div role="img" aria-label={label} style={{ position: 'absolute', inset: 0, background: `linear-gradient(${c.skyTop}, ${c.skyBottom} 60%, ${c.ground} 60%)` }}>
      <img src={`fallback/${world}.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
      {children && <div className="world-gate">{children}</div>}
    </div>
  );
}

/** Downloads the world on first visit (online), shows progress, and only then mounts the 3D scene. */
function useWorldReady(world: WorldId) {
  const st = usePacks(s => s.worlds[world]), check = usePacks(s => s.check), download = usePacks(s => s.download);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false); addEventListener('online', on); addEventListener('offline', off); return () => { removeEventListener('online', on); removeEventListener('offline', off); }; }, []);
  useEffect(() => { void check(world).then(s => { if (s === 'missing' && navigator.onLine) void download(world); }); }, [world, check, download]);
  useEffect(() => { if (online && (st?.state === 'missing' || st?.state === 'error')) void download(world); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  return { st, online, retry: () => void download(world) };
}

export function WorldWindow({ world, mastered, total, action = 'idle', interactive = true, label, onSirajTap }: Props) {
  const tier = useTier();
  const webgl = useMemo(hasWebGL2, []);
  const { st, online, retry } = useWorldReady(world);
  if (!webgl) return <Picture world={world} label={label} />;
  if (!st || st.state === 'unknown') return <Picture world={world} label={label} />;
  if (st.state !== 'ready') {
    const pct = st.bytes ? Math.round(st.got / st.bytes * 100) : 0;
    return (
      <Picture world={world} label={label}>
        {st.state === 'downloading' && <>
          <p>سراج بيجهّز العالم…</p>
          <span className="gate-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></span>
        </>}
        {st.state !== 'downloading' && (online
          ? <><p>ما قدرنا ننزّل العالم.</p><button className="btn paper" onClick={retry}>جرّب تاني</button></>
          : <p>العالم دا محتاج إنترنت أول مرة بس.</p>)}
      </Picture>
    );
  }
  if (st.bytes > 0) {
    return (
      <Stage fog={TOWN_FOG} camera={{ position: [-300, 60, -60], fov: 50, far: TOWN_FAR }} label={label}>
        <WorldTown world={world} mastered={mastered} density={SETTINGS[tier].density} interactive={interactive} sirajAction={action} onSirajTap={onSirajTap} />
      </Stage>
    );
  }
  return (
    <Stage camera={{ position: [0, 3, 9], fov: 45 }} label={label}>
      <DioramaScene world={world} progress={total ? mastered / total : 0} sirajAction={action} />
    </Stage>
  );
}
