// Isolated previews for design review and screenshots:  ?view=siraj[&outfit=east|none][&action=wave] | kassala | map
import { OrbitControls } from '@react-three/drei';
import { useState } from 'react';
import type { OutfitId } from '../three/outfits';
import { Siraj, type SirajAction } from '../three/Siraj';
import { Stage } from '../three/Stage';

const ACTIONS: SirajAction[] = ['idle', 'wave', 'cheer', 'think', 'point', 'sad', 'sleepy', 'celebrate', 'hop', 'look'];

export function SirajPreview() {
  const q = new URLSearchParams(location.search);
  const [action, setAction] = useState<SirajAction>((q.get('action') as SirajAction) || 'wave');
  const [glow, setGlow] = useState(+(q.get('glow') ?? 0.7));
  const [outfit, setOutfit] = useState<OutfitId>((q.get('outfit') as OutfitId) || 'east');
  return (
    <div className="screen sand">
      <div className="grow" style={{ position: 'relative' }}>
        <Stage camera={{ position: [0, 1.3, 4.2], fov: 35 }} transparent label="سراج">
          <hemisphereLight args={['#FFE6C2', '#8A6A4A', 1.1]} />
          <directionalLight position={[3, 5, 4]} intensity={1.6} color="#FFD9A6" />
          <Siraj action={action} glow={glow} stamps={3} position={[0, -0.05, 0]} outfit={outfit} />
          <OrbitControls target={[0, 0.9, 0]} enablePan={false} minDistance={2.5} maxDistance={7} />
        </Stage>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, padding: 16, justifyContent: 'center' }}>
        {ACTIONS.map(a => <button key={a} className={'btn ' + (a === action ? 'nile' : 'paper')} style={{ minHeight: 48, fontSize: 18 }} onClick={() => setAction(a)}>{a}</button>)}
        {(['east', 'none'] as OutfitId[]).map(o => <button key={o} className={'btn ' + (o === outfit ? 'nile' : 'paper')} style={{ minHeight: 48, fontSize: 18 }} onClick={() => setOutfit(o)}>{o === 'east' ? 'زي الشرق' : 'بلا زي'}</button>)}
        <label className="chip">glow <input type="range" min={0} max={1} step={0.05} value={glow} onChange={e => setGlow(+e.target.value)} /></label>
      </div>
    </div>
  );
}
