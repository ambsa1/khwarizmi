// The family code window, opened by the secret gesture on Siraj. The code is never stored on the device: it unlocks
// the sealed family data once, and only the derived key is kept.
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Sound } from '../audio/SoundManager';
import { unlockWithCode } from '../lib/family';
import { useApp } from '../state/store';

export function FamilyGate({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unlock = async () => {
    setBusy(true); setMsg(null);
    const r = await unlockWithCode(code);
    setBusy(false);
    if (!r) { setMsg('الكود ما اتطابق. جرّب تاني.'); return; }
    s.setFamilyKey(r.keyB64); s.setFamily(r.manifest); setCode('');
    Sound.play('star'); onClose();
  };
  const lock = () => { s.setFamilyKey(null); s.setFamily(null); if (s.current?.startsWith('m')) s.setCurrent(null); onClose(); };
  return (
    <>
      <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div role="dialog" aria-modal="true" aria-label="وضع الأسرة" className="sheet page family-gate"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
        <div className="sheet-grip" />
        <h2 className="t-h2">وضع الأسرة</h2>
        {s.family ? (
          <>
            <p>مفتوح في الجهاز دا. الأسماء والصور مشفّرة، وما بتظهر قبل الكود.</p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn paper" onClick={lock}>اقفل وضع الأسرة</button>
              <button className="btn paper" onClick={onClose}>رجوع</button>
            </div>
          </>
        ) : (
          <form className="row" style={{ flexWrap: 'wrap' }} onSubmit={e => { e.preventDefault(); if (code.trim()) void unlock(); }}>
            <input className="code" type="password" inputMode="text" autoComplete="off" autoFocus aria-label="كود الأسرة" placeholder="كود الأسرة" value={code} onChange={e => setCode(e.target.value)} />
            <button className="btn nile" disabled={busy || !code.trim()}>{busy ? '...' : 'افتح'}</button>
          </form>
        )}
        {msg && <p role="status">{msg}</p>}
      </motion.div>
    </>
  );
}
