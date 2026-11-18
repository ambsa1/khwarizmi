// The live window on the child's current world. Kassala is the full Phase 2 scene; other worlds use the
// small diorama until their scenes are built. Without WebGL, a pre-rendered picture of the same scene is shown.
import { useMemo } from 'react';
import { SETTINGS, hasWebGL2 } from '../lib/tier';
import { worldSkills } from '../lib/content';
import type { WorldId } from '../lib/tokens';
import { T } from '../lib/tokens';
import { DioramaScene } from './Diorama';
import { KassalaTown, TOWN_FAR, TOWN_FOG } from './town/KassalaTown';
import type { SirajAction } from './Siraj';
import { Stage, useTier } from './Stage';

type Props = { world: WorldId; mastered: number; total: number; action?: SirajAction; interactive?: boolean; label?: string; onSirajTap?: () => void };

export function WorldWindow({ world, mastered, total, action = 'idle', interactive = true, label, onSirajTap }: Props) {
  const tier = useTier();
  const webgl = useMemo(hasWebGL2, []);
  const zones = useMemo(() => worldSkills(world).map(s => s.zone), [world]);
  const c = T.worlds[world];
  if (!webgl) {
    return (
      <div role="img" aria-label={label} style={{ position: 'absolute', inset: 0, background: `linear-gradient(${c.skyTop}, ${c.skyBottom} 60%, ${c.ground} 60%)` }}>
        <img src={`fallback/${world}.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
      </div>
    );
  }
  if (world === 'kassala') {
    return (
      <Stage fog={TOWN_FOG} camera={{ position: [-300, 60, -60], fov: 50, far: TOWN_FAR }} label={label}>
        <KassalaTown mastered={Math.min(mastered, zones.length)} density={SETTINGS[tier].density} interactive={interactive} sirajAction={action} onSirajTap={onSirajTap} />
      </Stage>
    );
  }
  return (
    <Stage camera={{ position: [0, 3, 9], fov: 45 }} label={label}>
      <DioramaScene world={world} progress={total ? mastered / total : 0} sirajAction={action} />
    </Stage>
  );
}
