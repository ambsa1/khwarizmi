// Two full-screen gates and the developer panel.
//   family: opened by holding Siraj for four seconds on the first screen; the code field sits in the top half so the
//           keyboard never covers it; the right code shows the four children.
//   dev:    opened by holding the version number for four seconds (menu > about). The developer code is checked
//           against a slow salted hash; with the cloud set up it also signs in to the developer account, which is
//           what actually protects the children's data and the error reports on the server.
import { useEffect, useMemo, useState } from 'react';
import { Sound } from '../audio/SoundManager';
import { checkDevCode, devFetch, devSignIn, explainError, summarize, type CloudError, type ProgressRow } from '../cloud/cloud';
import { CLOUD, cloudOn } from '../cloud/config';
import { useLearning } from '../data/learning';
import { unlockWithCode, unlockWithKey, unwrapFamilyKey, wrapFamilyKey, type FamilyManifest } from '../lib/family';
import { useNum } from '../lib/num';
import { subjectName, WORLDS } from '../lib/content';
import { useApp } from '../state/store';
import { readErrors, type ErrorEntry } from '../ui/ErrorBoundary';
import { IconBack } from '../ui/Icons';

function GateShell({ title, children, onBack }: { title: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="screen sand gate">
      <header className="topbar">
        <button className="icon-btn" aria-label="رجوع" onClick={onBack}><IconBack /></button>
        <div className="topbar-title">{title}</div>
        <span style={{ width: 52 }} />
      </header>
      <div className="gate-body">{children}</div>
    </div>
  );
}

export function FamilyPage() {
  const s = useApp();
  // stage: 'word' (first time on this device, or forgotten code) -> 'create' -> unlocked; or 'pin' when a personal code exists
  const [stage, setStage] = useState<'word' | 'create' | 'pin'>(s.familyWrap ? 'pin' : 'word');
  const [code, setCode] = useState(''), [code2, setCode2] = useState(''), [msg, setMsg] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ keyB64: string; manifest: FamilyManifest } | null>(null);
  const done = (keyB64: string, manifest: FamilyManifest) => { s.setFamilyKey(keyB64); s.setFamily(manifest); Sound.play('star'); s.go('entry'); };
  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      if (stage === 'word') {
        const r = await unlockWithCode(code);
        if (!r) { setMsg('كلمة التفعيل ما اتطابقت. جرّب تاني.'); Sound.play('close'); return; }
        setPending(r); setStage('create'); setCode('');
      } else if (stage === 'create') {
        if (code.trim().length < 4) { setMsg('الكود الشخصي لازم يكون ٤ حروف أو أرقام على الأقل.'); return; }
        if (code !== code2) { setMsg('الكودين ما متطابقين. اكتبوه تاني.'); return; }
        s.setFamilyWrap(await wrapFamilyKey(pending!.keyB64, code)); done(pending!.keyB64, pending!.manifest);
      } else {
        const key = await unwrapFamilyKey(s.familyWrap!, code);
        const m = key ? await unlockWithKey(key) : null;
        if (!key || !m) { setMsg('الكود الشخصي ما اتطابق. جرّب تاني.'); Sound.play('close'); return; }
        done(key, m);
      }
    } finally { setBusy(false); }
  };
  const lock = () => { s.setFamilyKey(null); s.setFamily(null); if (s.current?.startsWith('m')) s.setCurrent(null); s.go('entry'); };
  const label = stage === 'word' ? 'كلمة تفعيل الأسرة' : stage === 'create' ? 'اعملوا كودكم الشخصي (للأب أو الأم)' : 'الكود الشخصي';
  return (
    <GateShell title="وضع الأسرة" onBack={() => s.go('entry')}>
      <section className="card gate-card family-gate">
        {s.family ? (
          <>
            <p>وضع الأسرة مفتوح الآن.</p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => s.go('entry')}>اختار اللاعب</button>
              <button className="btn paper" onClick={lock}>اقفل وضع الأسرة</button>
            </div>
            <LegacyLink />
          </>
        ) : (
          <form className="col" style={{ gap: 14 }} onSubmit={e => { e.preventDefault(); if (code.trim()) void submit(); }}>
            <label htmlFor="fam-code" className="t-h2">{label}</label>
            <input id="fam-code" key={stage} className="code" type="password" autoComplete="off" autoFocus dir="rtl" aria-label={label} value={code} onChange={e => setCode(e.target.value)} />
            {stage === 'create' && <>
              <label htmlFor="fam-code2" className="t-body">أكّدوا الكود</label>
              <input id="fam-code2" className="code" type="password" autoComplete="off" dir="rtl" aria-label="تأكيد الكود الشخصي" value={code2} onChange={e => setCode2(e.target.value)} />
              <p className="t-small soft">الكود دا محفوظ في الجهاز دا بس، وبيُطلب كل مرة يتفتح فيها وضع الأسرة.</p>
            </>}
            <button className="btn big wide" disabled={busy || !code.trim() || (stage === 'create' && !code2.trim())}>{busy ? '...' : stage === 'create' ? 'احفظ وادخل' : 'افتح'}</button>
            {stage === 'pin' && <button type="button" className="btn ghost" onClick={() => { setStage('word'); setCode(''); setMsg(null); }}>نسيت الكود الشخصي؟</button>}
            {msg && <p role="status">{msg}</p>}
          </form>
        )}
      </section>
    </GateShell>
  );
}

/** v2 progress (archived on this device) linked to one of the four children - only here, behind the family code */
function LegacyLink() {
  const L = useLearning(), family = useApp(st => st.family);
  const [msg, setMsg] = useState<string | null>(null);
  const waiting = L.legacy.filter(x => !x.linkedTo && x.levels > 0);
  if (!family) return null;
  // after the last link the list is empty, but the confirmation stays
  if (!waiting.length) return msg ? <div className="col legacy-link"><p className="t-small" role="status">{msg}</p></div> : null;
  return (
    <div className="col legacy-link" style={{ gap: 8 }}>
      <p className="t-small soft">تقدّم من النسخة السابقة ينتظر ربطه بأحد الأبناء:</p>
      {waiting.map(w => (
        <div key={w.legacyId} className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="t-small"><b>{w.name || 'لاعب'}</b> · {w.levels} مرحلة برمجة</span>
          <select className="code" style={{ flex: 'none', minWidth: 140 }} defaultValue="" onChange={e => { if (e.target.value) { L.linkLegacy(w.legacyId, e.target.value); setMsg('اتربط التقدّم القديم.'); } }}>
            <option value="" disabled>اربطه بـ…</option>
            {family.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      ))}
      {msg && <p className="t-small" role="status">{msg}</p>}
    </div>
  );
}

// ---------- developer ----------
type ErrItem = { at: string; device: string; place: string; msg: string; version: string; src: string };
type ErrGroup = { key: string; place: string; msg: string; count: number; at: string; version: string; devices: string[] };
/** "1.10.2" vs "1.9.0" (numbers, part by part) */
export function cmpVersion(a: string, b: string) {
  const x = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0), y = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return Math.sign(d); }
  return 0;
}
/** identical reports become one card: how many times, the latest time and version, and which devices */
function groupErrors(list: ErrItem[]): ErrGroup[] {
  const m = new Map<string, ErrGroup>();
  for (const e of list) {
    const key = `${e.place}|${e.msg.replace(/\d+x\d+$/, '')}`;
    const g = m.get(key);
    if (!g) { m.set(key, { key, place: e.place, msg: e.msg, count: 1, at: e.at, version: e.version, devices: [e.device] }); continue; }
    g.count++;
    if (e.at > g.at) { g.at = e.at; g.msg = e.msg; }
    if (cmpVersion(e.version, g.version) > 0) g.version = e.version;
    if (!g.devices.includes(e.device)) g.devices.push(e.device);
  }
  return [...m.values()].sort((a, b) => b.at.localeCompare(a.at));
}
/** a ready-to-paste English prompt for Claude Code with every active issue (updates live with the list) */
function claudePrompt(groups: ErrGroup[]) {
  if (!groups.length) return `Khwarizmi app v${__APP_VERSION__}: no active issues reported. Nothing to fix.`;
  const lines = groups.map((g, i) => `${i + 1}. [${g.place}] ${g.msg}\n   - seen ${g.count}x, last ${g.at}, version ${g.version}\n   - devices: ${g.devices.join('; ')}`);
  return [
    `Fix the following active issues reported by devices running the Khwarizmi app (current version ${__APP_VERSION__}).`,
    `Identical reports are merged; issues from older versions are excluded.`,
    ``,
    ...lines,
    ``,
    `For each issue: find the root cause in the code, fix it, and add or update a check in tools/check.mjs so it cannot come back.`,
    `Layout issues include the screen name, the element (tag.class) and the viewport size: reproduce at that size.`,
    `Then run npm run release and deploy only if every check passes.`,
  ].join('\n');
}
function ClaudePrompt({ groups }: { groups: ErrGroup[] }) {
  const text = claudePrompt(groups);
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [text]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setCopied(true);
  };
  return (
    <section className="card dev-prompt">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <b>طلب جاهز لـ Claude Code</b>
        <button className="btn" onClick={() => void copy()}>{copied ? 'اتنسخ ✓' : 'انسخ الطلب'}</button>
      </div>
      <textarea className="ltr" dir="ltr" readOnly value={text} rows={Math.min(18, text.split('\n').length + 1)} aria-label="Claude Code prompt" onFocus={e => e.currentTarget.select()} />
    </section>
  );
}
const fmtTime = (iso: string | number | null) => (iso ? new Date(iso).toLocaleString('ar-SD', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function DevPage() {
  const go = useApp(s => s.go);
  const [code, setCode] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const enter = async () => {
    setBusy(true); setMsg(null);
    const good = await checkDevCode(code);
    if (!good) { setBusy(false); setMsg('الرمز ما اتطابق.'); return; }
    // the panel opens at once with this device's data; the cloud sign-in finishes in the background
    setBusy(false); setOk(true);
    if (cloudOn()) {
      setMsg('جاري الاتصال بالسحابة…');
      void devSignIn(code).catch(() => null).then(t => { setToken(t); setMsg(t ? null : 'ما قدرنا نسجّل الدخول للسحابة (الإنترنت أو حساب المطوّر). المعروض الآن بيانات هذا الجهاز فقط.'); });
    }
  };
  if (!ok) return (
    <GateShell title="وضع المطوّر" onBack={() => go('entry')}>
      <section className="card gate-card">
        <form className="col" style={{ gap: 14 }} onSubmit={e => { e.preventDefault(); if (code.trim()) void enter(); }}>
          <label htmlFor="dev-code" className="t-h2">رمز المطوّر</label>
          <input id="dev-code" className="code ltr" type="password" autoComplete="off" autoFocus aria-label="رمز المطوّر" value={code} onChange={e => setCode(e.target.value)} />
          <button className="btn big wide" disabled={busy || !code.trim()}>{busy ? '...' : 'ادخل'}</button>
          {msg && <p role="status">{msg}</p>}
        </form>
      </section>
    </GateShell>
  );
  return <DevPanel token={token} note={msg} onExit={() => go('entry')} />;
}

function DevPanel({ token, note, onExit }: { token: string | null; note: string | null; onExit: () => void }) {
  const [tab, setTab] = useState<'kids' | 'errors' | 'archive'>('kids');
  const [cloud, setCloud] = useState<{ progress: ProgressRow[]; errors: CloudError[] } | null>(null);
  const [local, setLocal] = useState<ErrorEntry[]>([]);
  const family = useApp(s => s.family), learners = useLearning(s => s.learners);
  const num = useNum();
  useEffect(() => { void readErrors().then(setLocal); if (token) void devFetch(token).then(setCloud).catch(() => setCloud(null)); }, [token]);
  // children: cloud rows when signed in, else this device's own data; names only from the unlocked family on this device
  const kids = useMemo(() => {
    const names = new Map((family?.members ?? []).map(m => [m.id, m.name]));
    const rows = cloud?.progress.length
      ? cloud.progress.map(r => ({ id: r.member, device: r.device, at: r.updated_at, s: r.summary }))
      : Object.keys(learners).filter(id => /^m\d$/.test(id)).map(id => ({ id, device: 'هذا الجهاز', at: null as string | null, s: summarize(learners[id]) }));
    return rows.map(r => ({ ...r, name: names.get(r.id) ?? `الطفل ${r.id.slice(1)}` })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [cloud, family, learners]);
  const all = [
    ...(cloud?.errors ?? []).map(e => ({ at: e.at, device: e.device, place: e.place, msg: e.message, version: e.version, src: 'سحابة' })),
    ...local.map(e => ({ at: new Date(e.t).toISOString(), device: 'هذا الجهاز', place: e.where, msg: e.msg, version: __APP_VERSION__, src: 'محلي' })),
  ];
  const groups = groupErrors(all);
  const active = groups.filter(g => cmpVersion(g.version, __APP_VERSION__) >= 0), archived = groups.filter(g => cmpVersion(g.version, __APP_VERSION__) < 0);
  return (
    <div className="screen sand gate dev">
      <header className="topbar">
        <button className="icon-btn" aria-label="خروج" onClick={onExit}><IconBack /></button>
        <div className="topbar-title">لوحة المطوّر</div>
        <span style={{ width: 52 }} />
      </header>
      <div className="seg dev-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'kids'} className={tab === 'kids' ? 'on' : ''} onClick={() => setTab('kids')}>متابعة الأبناء</button>
        <button role="tab" aria-selected={tab === 'errors'} className={tab === 'errors' ? 'on' : ''} onClick={() => setTab('errors')}>الأخطاء الحالية ({num(active.length)})</button>
        <button role="tab" aria-selected={tab === 'archive'} className={tab === 'archive' ? 'on' : ''} onClick={() => setTab('archive')}>المحلولة والأرشيف ({num(archived.length)})</button>
      </div>
      <div className="scroll grow dev-body">
        <p className="t-small soft">{cloudOn() ? (token ? 'متصل بالسحابة كمطوّر.' : note ?? 'غير متصل بالسحابة.') : 'السحابة لسه ما اتربطت: البيانات من هذا الجهاز فقط.'}{!family && ' افتح وضع الأسرة في هذا الجهاز لتظهر الأسماء.'}</p>
        {tab === 'kids' ? kids.map(k => (
          <section key={k.id} className="card dev-kid">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <b className="t-h2">{k.name}</b>
              <span className="t-small soft">آخر نشاط: {fmtTime(k.s.last)} · {k.device}</span>
            </div>
            <p>دروس اليوم: <b>{num(k.s.today)}</b> · مهارات متقنة: <b>{num(k.s.mastered)}</b></p>
            <div className="dev-worlds">
              {WORLDS.map(w => { const v = k.s.worlds[w.id]; return v ? <span key={w.id} className="chip">{subjectName(w.id)}: {num(v.done)} من {num(v.total)}</span> : null; })}
            </div>
            {k.s.stumbles.length > 0 && <>
              <p className="t-small"><b>نقاط التعثّر:</b></p>
              <ul className="t-small">{k.s.stumbles.map((t, i) => <li key={i}>{t.skill}: {num(t.misses)} مرة ما زبطت من {num(t.attempts)} محاولة</li>)}</ul>
            </>}
          </section>
        )) : (tab === 'errors' ? active : archived).map(g => (
          <section key={g.key} className={'card dev-err' + (tab === 'archive' ? ' old' : '')}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <b>{explainError(g.msg)}</b>
              <span className="chip dev-count">تكرّر {num(g.count)} {g.count === 1 ? 'مرة' : 'مرات'}</span>
            </div>
            <span className="t-small soft">آخر مرة: {fmtTime(g.at)} · الإصدار <span className="ltr">{g.version}</span> · {g.devices.join('، ')}</span>
            <code className="ltr t-small">{g.place}: {g.msg}</code>
          </section>
        ))}
        {tab === 'kids' && !kids.length && <p>لا توجد بيانات للأبناء بعد.</p>}
        {tab === 'errors' && !active.length && <p>لا توجد أخطاء في هذا الإصدار. ممتاز!</p>}
        {tab === 'archive' && !archived.length && <p>الأرشيف فاضي.</p>}
        {tab === 'errors' && <ClaudePrompt groups={active} />}
        <p className="t-small soft">{CLOUD.url ? <span className="ltr">{CLOUD.url}</span> : null}</p>
      </div>
    </div>
  );
}
