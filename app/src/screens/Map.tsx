// Map of Sudan with the five worlds (and Siraj's water wheel for the little ones). Tap a world to travel there.
import { useEffect, useState } from 'react';
import { SHORT_NAME, stationCount, subjectName, WORLDS } from '../lib/content';
import { useNum } from '../lib/num';
import type { WorldId } from '../lib/tokens';
import { masteredIn, useLearning } from '../data/learning';
import { useApp, useProfile } from '../state/store';
import { Stage } from '../three/Stage';
import { SudanMapScene, type MapSpot } from '../three/SudanMap';
import { Bubble, TabBar, say, useGuard } from '../ui/kit';
import { IconLock } from '../ui/Icons';
import { T } from '../lib/tokens';
import { currentWorld } from './Path';

export { SHORT_NAME };

export function MapScreen() {
  const p = useProfile();
  const go = useApp(s => s.go), setWorld = useApp(s => s.setWorld), chosen = useApp(s => s.world), learners = useLearning(s => s.learners);
  const num = useNum();
  const [line, setLine] = useState<string | null>(null);
  const [picked, setPicked] = useState<WorldId | null>(null);
  const portrait = usePortrait();
  const guard = useGuard(700);
  if (!p) return null;
  const cur = currentWorld(p.id, p.age, chosen);
  const spots: MapSpot[] = WORLDS.map(w => {
    const total = Math.max(1, stationCount(w.id));
    const ages = w.ages as { min: number; max?: number };
    const locked = p.age < ages.min || (ages.max !== undefined && p.age > ages.max + 1);
    return { id: w.id as WorldId, name: subjectName(w.id), value: masteredIn(learners[p.id], w.id) / total, locked, current: w.id === cur };
  });
  const pick = (id: WorldId) => {
    setPicked(id);
    const s = spots.find(x => x.id === id)!;
    const ages = WORLDS.find(x => x.id === id)!.ages as { min: number; max?: number };
    if (s.locked) {
      setLine(p.age < ages.min ? `عالم ${subjectName(id)} لمّا تكبر شويّة، من ${num(ages.min)} سنين` : say(p, 'إنت كبرت على الساقية!', 'إنتِ كبرتي على الساقية!'));
      setTimeout(() => setLine(null), 2200);
      return;
    }
    setWorld(p.id, id);
    setLine(`يلا على عالم ${subjectName(id)}!`);
    setTimeout(() => go('path'), 700);
  };
  return (
    <div className="screen sand has-rail map">
      <div className="main col grow" style={{ position: 'relative' }}>
        <header className="map-head"><h1 className="t-h1" style={{ margin: 0 }}>خريطة السودان</h1></header>
        <div className="grow" style={{ position: 'relative' }}>
          <Stage camera={{ position: [0.6, 24, 16], fov: 40 }} label="خريطة السودان بالعوالم الخمسة">
            <SudanMapScene spots={spots} onPick={pick} labels={portrait ? [cur, ...(picked && picked !== cur ? [picked] : [])] : 'all'} />
          </Stage>
          {line && <div className="window-line"><Bubble>{line}</Bubble></div>}
        </div>
        <div className="world-cards">
          {spots.map(s => {
            const c = T.worlds[s.id]; const ring = s.id === 'suakin' ? '#2EC4C4' : c.primary;
            return (
              <button key={s.id} className={'world-card card' + (s.current ? ' current' : '') + (s.locked ? ' locked' : '')} onClick={guard(() => pick(s.id))}>
                <span className="world-ring" style={{ background: `conic-gradient(${ring} ${Math.round(s.value * 360)}deg, var(--c-sandLine) 0)` }}>
                  <span aria-label={s.locked ? 'مقفول' : `${num(Math.round(s.value * 100))} بالمية`}>{s.locked ? <IconLock size={22} /> : null}</span>
                </span>
                <b>{s.name}</b>
              </button>
            );
          })}
        </div>
      </div>
      <TabBar current="map" />
    </div>
  );
}

/** Portrait phones: the world cards name every world, so the map only labels the current (and just-tapped) one. */
function usePortrait() {
  const q = '(orientation: portrait)';
  const [v, setV] = useState(() => matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const on = () => setV(m.matches); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return v;
}
