// Passport (stamps), the parents' corner (family code, numerals, motion, quality) and the performance page.
import { useEffect, useMemo, useState } from 'react';
import { placeName, stationCount, subjectName, WORLDS, worldSkills } from '../lib/content';
import { fmt, useNum } from '../lib/num';
import { gpuName, guessTier, hasWebGL2, SETTINGS } from '../lib/tier';
import type { WorldId } from '../lib/tokens';
import { dayKey, isMastered, masteredIn, useLearning } from '../data/learning';
import { imageUrl } from '../lib/family';
import { lowSpace, mb, usePacks, worldBytes } from '../data/packs';
import { CONTENT } from '../lib/content';
import { useApp, useProfile, type Profile } from '../state/store';
import { KassalaTown, TOWN_FAR, TOWN_FOG } from '../three/town/KassalaTown';
import { Stage, stats, useTier } from '../three/Stage';
import { IconBack, IconStar } from '../ui/Icons';
import { back, useModalBack } from '../ui/nav';
import { Avatar, gradeLabel, PlayerPhoto, playerName, TabBar, usePlayerImage } from '../ui/kit';
import { saveCertificate } from '../ui/certificate';
import { Sound } from '../audio/SoundManager';
import { TopBar } from '../ui/TopBar';
import { SHORT_NAME } from './Map';

const RANKS: [number, string][] = [[0, 'مستكشف صغير'], [5, 'رحّال'], [20, 'مستكشف ماهر'], [50, 'حارس الخريطة'], [100, 'خوارزمي']];
/** each world's stamp (public/art/stamps, tools/stamps-render.mjs): its ink, and a small natural tilt (-5 to +6 degrees) */
export const STAMP_INK: Record<string, string> = { kassala: '#A8432A', saqiya: '#5B3FA0', mogran: '#1F4E8C', suakin: '#12807F', meroe: '#A87508', marra: '#18774A' };
const TILT: Record<string, number> = { kassala: -4, saqiya: 5, mogran: -2, suakin: 6, meroe: -5, marra: 3 };
export const stampUrl = (id: string) => import.meta.env.BASE_URL + `art/stamps/${id}.webp`;
type Me = ReturnType<typeof useLearning.getState>['learners'][string] | undefined;
/** the day a world was finished: the last day any of its skills was practised */
const doneOn = (me: Me, id: string) => Math.max(0, ...worldSkills(id).map(k => me?.skills[k.id]?.last ?? 0));
export const dateAr = (t: number) => new Date(t || Date.now()).toLocaleDateString('ar-SD', { day: 'numeric', month: 'long', year: 'numeric' });
/** a stable passport number for the player: KHW-<year of the first lesson>-<three digits from the player id> */
function passNo(id: string, me: Me) {
  let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const first = Math.min(Date.now(), ...Object.values(me?.skills ?? {}).map(s => s.first || Date.now()));
  return `KHW-${new Date(first).getFullYear()}-${String(h % 1000).padStart(3, '0')}`;
}
const RANK_LATIN: Record<string, string> = { 'مستكشف صغير': 'YOUNG', 'رحّال': 'TRAVELLER', 'مستكشف ماهر': 'SKILLED', 'حارس الخريطة': 'MAPKEEPER', 'خوارزمي': 'KHWARIZMI' };
/** two decorative machine-readable lines (playful, not the format of any real document) */
function Mrz({ no, rank, grade, sealed }: { no: string; rank: string; grade: number | null | undefined; sealed: number }) {
  const pad = (t: string, n = 32) => (t + '<'.repeat(n)).slice(0, n);
  const l1 = pad(`KHW<EXPLORER<<${RANK_LATIN[rank] ?? 'EXPLORER'}<<SIRAJ`);
  const l2 = pad(`${no.replace(/-/g, '')}<${grade ? 'G' + grade : 'KG'}<<${sealed}<6<<SUDAN<MAP`);
  return (
    <svg className="pp-mrz" viewBox="0 0 640 64" preserveAspectRatio="none" aria-hidden>
      <text x="8" y="26" textLength="624" lengthAdjust="spacingAndGlyphs" fontSize="22">{l1}</text>
      <text x="8" y="56" textLength="624" lengthAdjust="spacingAndGlyphs" fontSize="22">{l2}</text>
    </svg>
  );
}

/** The explorer's passport, open: a warm leather cover with gold edges around two facing pages joined by a shaded
 *  spine (side by side on a wide screen, one above the other on a phone): the data page (3:4 photo in a guilloche
 *  frame, the fields in a passport grid, overall progress, decorative machine lines) and the stamps page (six visa
 *  boxes; a finished world's ink stamp lands on the page with a stamp-slam). */
export function Passport() {
  const p = useProfile();
  const learners = useLearning(s => s.learners);
  const num = useNum();
  const [open, setOpen] = useState<WorldId | null>(null);
  const reduced = useApp(s => s.motion) === 'reduced';
  const me = p ? learners[p.id] : undefined;
  const sealedIds = WORLDS.filter(w => { const t = stationCount(w.id as WorldId); return t > 0 && masteredIn(me, w.id) >= t; }).map(w => w.id);
  // the stamp thump: once per opening, when the first finished stamp lands
  useEffect(() => {
    if (!sealedIds.length || reduced) return;
    const t = setTimeout(() => Sound.play('stamp'), 520);
    return () => clearTimeout(t);
  }, [sealedIds.length, reduced]);
  if (!p) return null;
  const stations = WORLDS.reduce((a, w) => a + masteredIn(me, w.id), 0);
  const stars = WORLDS.reduce((a, w) => a + worldSkills(w.id).filter(k => isMastered(me?.skills[k.id])).length, 0);
  const rank = [...RANKS].reverse().find(([n]) => stations >= n)![1];
  const name = playerName(p), grade = gradeLabel(p, num);
  const allStations = WORLDS.reduce((a, w) => a + stationCount(w.id as WorldId), 0);
  const no = passNo(p.id, me);
  // where each world's stamp lands on the stamps page (percent of the page), like stamps added on different trips
  const SLOT: Record<string, [number, number]> = { kassala: [8, 14], saqiya: [52, 8], mogran: [30, 40], suakin: [62, 44], meroe: [6, 66], marra: [48, 72] };
  const issued = Math.min(Date.now(), ...Object.values(me?.skills ?? {}).map(s => s.first || Date.now()));
  const sealed = WORLDS.filter(w => sealedIds.includes(w.id));
  const waiting = WORLDS.filter(w => !sealedIds.includes(w.id));
  const status = (id: WorldId) => { const total = stationCount(id), got = Math.min(masteredIn(me, id), total); return { total, got }; };
  return (
    <div className="screen sand has-rail">
      <div className="main col grow scroll passport-main">
        <TopBar title="جوازي" />
        <div className="passport-cover">
          <div className="passport-book">
            <section className="pp-page pp-id" aria-label="صفحة بيانات المستكشف">
              <i className="pp-emblem-water" aria-hidden />
              <header className="pp-head">
                <svg className="pp-emblem" viewBox="0 0 48 48" width="38" height="38" aria-hidden>
                  <path d="M24 4l3 5h-6zM16 12h16l-3 5H19z" fill="#BA7C03" /><circle cx="24" cy="28" r="11" fill="#FFB627" stroke="#BA7C03" strokeWidth="2.5" />
                  <circle cx="24" cy="28" r="5" fill="#FFF3D6" /><path d="M14 42h20" stroke="#BA7C03" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="pp-title"><b>جواز المستكشف</b><span>رحلة خوارزمي في السودان</span></div>
                <span className="pp-latin" dir="ltr">EXPLORER PASS</span>
              </header>
              <div className="pp-body">
                <div className="pp-photo-frame"><PlayerPhoto profile={p} className="pp-photo" /></div>
                <dl className="pp-fields lead">
                  <div><dt>الاسم</dt><dd>{name}</dd></div>
                  <div><dt>الصف</dt><dd>{grade || '—'}</dd></div>
                  <div><dt>اللقب</dt><dd className="explorer-rank">{rank}</dd></div>
                </dl>
                <dl className="pp-fields more">
                  <div className="pp-no-row"><dt>رقم الجواز</dt><dd className="pp-no" dir="ltr">{no}</dd></div>
                  <div><dt>تاريخ الإصدار</dt><dd>{dateAr(issued)}</dd></div>
                  <div><dt>الأختام</dt><dd><b className="pp-big">{num(sealedIds.length)}</b> / {num(WORLDS.length)}</dd></div>
                  <div><dt>النجوم</dt><dd><IconStar size={20} style={{ color: 'var(--c-gold)', verticalAlign: '-3px' }} /> {num(stars)}</dd></div>
                </dl>
                <div className="pp-ghost" aria-hidden><PlayerPhoto profile={p} className="pp-ghost-photo" /></div>
                <div className="pp-sign"><span className="pp-sign-name">{name}</span><span className="pp-sign-label">توقيع المستكشف</span></div>
              </div>
              <div className="pp-progress" aria-label={`${num(stations)} من ${num(allStations)} محطة`}>
                <span className="pp-progress-label">رحلتك في كل السودان <span className="soft">{num(stations)} من {num(allStations)} محطة</span></span>
                <span className="explorer-bar" aria-hidden><i style={{ width: `${Math.round(stations / Math.max(1, allStations) * 100)}%` }} /></span>
              </div>
              <Mrz no={no} rank={rank} grade={p.grade} sealed={sealedIds.length} />
            </section>
            <div className="pp-spine" aria-hidden />
            <section className="pp-page pp-visas" aria-label="صفحة الأختام">
              <svg className="pp-perf" viewBox="0 0 300 30" aria-hidden><text x="150" y="23" textAnchor="middle">{no.replace(/-/g, ' ')}</text></svg>
              <h2 className="pp-page-title">التأشيرات والأختام</h2>
              <i className="pp-visa-water" aria-hidden />
              <div className="visa-field">
                {!sealed.length && <p className="visa-empty">الصفحة دي لسه فاضية. كمّل عالم كامل وحيتختم هنا!</p>}
                {sealed.map((w, i) => {
                  const id = w.id as WorldId, [x, y] = SLOT[id] ?? [10, 10];
                  return (
                    <button key={id} className="stamp visa done placed" onClick={() => setOpen(id)} aria-label={`${placeName(id)}: ${subjectName(id)}، مكتمل`}
                      style={{ left: `${x}%`, top: `${y}%`, ['--ink' as string]: STAMP_INK[id], ['--tilt' as string]: `${TILT[id] ?? 0}deg`, ['--i' as string]: i }}>
                      <span className="visa-mark"><img className="visa-stamp" src={stampUrl(id)} alt="" draggable={false} /></span>
                      <span className="visa-status ok">مكتمل<small>{dateAr(doneOn(me, id))}</small></span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
        {waiting.length > 0 && (
          <section className="stamp-tray" aria-label="أختام تنتظرك">
            <h2 className="tray-title">أختام تنتظرك <span className="soft">كمّل العالم عشان يتختم في جوازك</span></h2>
            <div className="tray">
              {waiting.map(w => {
                const id = w.id as WorldId, { total, got } = status(id);
                return (
                  <button key={id} className="stamp visa waiting" onClick={() => setOpen(id)} aria-label={`${placeName(id)}: ${subjectName(id)}`} style={{ ['--ink' as string]: STAMP_INK[id] }}>
                    <span className="visa-mark"><img className="visa-stamp" src={stampUrl(id)} alt="" draggable={false} /></span>
                    <span className="visa-head"><b>{placeName(id)}</b><span>{subjectName(id)}</span></span>
                    <span className="visa-status">{total ? `${num(got)} من ${num(total)}` : 'قريبًا'}</span>
                    <span className="tray-bar" aria-hidden><i style={{ width: `${total ? Math.round(got / total * 100) : 0}%` }} /></span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <TabBar current="passport" />
      {open && <StampSheet world={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** a stamp opened: a finished world shows its certificate (skills inside it, the stamp, Siraj's signature, a save
 *  button); a world in progress shows the skills mastered so far */
function StampSheet({ world, onClose }: { world: WorldId; onClose: () => void }) {
  const p = useProfile(); const learners = useLearning(s => s.learners); const num = useNum();
  const me = p ? learners[p.id] : undefined;
  const skills = worldSkills(world).filter(k => isMastered(me?.skills[k.id]));
  const total = stationCount(world), got = Math.min(masteredIn(me, world), total), done = total > 0 && got >= total;
  const photo = usePlayerImage(p);
  const [saving, setSaving] = useState(false);
  useModalBack(true, onClose);
  if (!p) return null;
  const name = playerName(p), grade = gradeLabel(p, num), girl = p.gender === 'f', date = dateAr(doneOn(me, world));
  const line = `${girl ? 'تُمنح البطلة' : 'يُمنح البطل'} ${name}${grade ? ` (${grade})` : ''} هذه الشهادة تقديرًا ${girl ? 'لذكائها ومثابرتها' : 'لذكائه ومثابرته'} في إتمام جميع محطات عالم ${placeName(world)} بنجاح`;
  const save = async () => {
    setSaving(true);
    try { await saveCertificate({ name, line, world: placeName(world), subject: subjectName(world), skills: skills.map(k => k.title.ar), more: n => `ومعاها ${num(n)} ${n > 10 ? 'مهارة' : 'مهارات'} تانية`, date, photo, stamp: stampUrl(world), ink: STAMP_INK[world], girl }); }
    finally { setSaving(false); }
  };
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className={'sheet page' + (done ? ' cert-sheet' : '')} role="dialog" aria-modal="true" aria-label={subjectName(world)}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <button className="icon-btn back-btn" aria-label="رجوع" onClick={onClose}><IconBack /></button>
          <h2 className="t-h2">{placeName(world)} • {subjectName(world)}</h2>
        </div>
        {done ? (
          <>
            <article className="certificate" style={{ ['--ink' as string]: STAMP_INK[world] }}>
              <i className="cert-water" aria-hidden /><i className="cert-corner tl" /><i className="cert-corner tr" /><i className="cert-corner bl" /><i className="cert-corner br" />
              <header className="cert-head">
                <span className="cert-kicker">رحلة خوارزمي</span>
                <h3 className="cert-title">شهادة إنجاز وتفوّق</h3>
              </header>
              <div className="cert-body">
                <div className="cert-main">
                  <PlayerPhoto profile={p} className="cert-photo" />
                  <b className="cert-name">{name}</b>
                  <p className="cert-line">{line}</p>
                </div>
                <div className="cert-skills">
                  <h4>{girl ? 'المهارات التي أتقنتها' : 'المهارات التي أتقنها'}</h4>
                  <ul>{skills.map(k => <li key={k.id}><IconStar size={20} style={{ color: 'var(--c-gold)', flex: 'none' }} /> {k.title.ar}</li>)}</ul>
                </div>
              </div>
              <footer className="cert-foot">
                <img className="cert-stamp" src={stampUrl(world)} alt="" draggable={false} />
                <div className="cert-date"><span>تاريخ الإتمام</span><b>{date}</b></div>
                <div className="cert-sign">
                  <svg viewBox="0 0 160 48" width="150" height="45" aria-hidden><path d="M8 34c14-18 22 6 32-6s10-18 22-4 12 10 24-4 18-6 26 2 12 6 36-6" fill="none" stroke="#2B2118" strokeWidth="3" strokeLinecap="round" /><path d="M20 40h120" stroke="#BA7C03" strokeWidth="1.5" /></svg>
                  <span>المرشد سراج</span>
                </div>
              </footer>
            </article>
            <button className="btn big wide cert-save" onClick={save} disabled={saving}>{saving ? 'لحظة…' : 'احفظ الشهادة صورة'}</button>
          </>
        ) : (
          <>
            <p className="soft">{num(got)} من {num(total)} {total > 10 ? 'محطة' : 'محطات'}، {num(skills.length)} {skills.length === 1 ? 'مهارة' : 'مهارات'}</p>
            {skills.length ? (
              <ul className="mastered">{skills.map(k => <li key={k.id}><IconStar size={20} style={{ color: 'var(--c-gold)' }} /> {k.title.ar}</li>)}</ul>
            ) : <p>لسه ما في مهارات هنا. يلا نبدأ الرحلة!</p>}
          </>
        )}
      </div>
    </>
  );
}

export function Parents() {
  const s = useApp();
  const Seg = <V extends string>({ value, options, onChange, label }: { value: V; options: [V, string][]; onChange: (v: V) => void; label: string }) => (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
  return (
    <div className="screen sand parents">
      <header className="guest-top">
        <button className="icon-btn back-btn" aria-label="رجوع" onClick={() => back('entry')}><IconBack /></button>
        <h1 className="t-h1" style={{ margin: 0 }}>{s.family ? 'بيتنا' : 'ركن الأهل'}</h1>
        <span style={{ width: 56 }} />
      </header>
      <div className="scroll grow parents-body">
        {s.family && <OurHome />}
        <section className="card pc">
          <h2 className="t-h2">وقت اللعب في اليوم</h2>
          <Seg label="وقت اللعب في اليوم" value={String(s.playLimit) as '0'} onChange={v => s.setPlayLimit(+v)} options={[['0', 'بلا حد'], ['20', '٢٠ دقيقة'], ['30', '٣٠ دقيقة'], ['45', '٤٥ دقيقة'], ['60', 'ساعة']] as ['0', string][]} />
          <p className="t-small soft">لما الوقت يخلص، سراج يقول «وقت الراحة». الأهل يقدروا يزيدوا ربع ساعة بضغطة مطوّلة.</p>
        </section>
        <section className="card pc">
          <h2 className="t-h2">الأرقام</h2>
          <Seg label="الأرقام" value={s.numerals} onChange={s.setNumerals} options={[['hindi', '١٢٣'], ['latin', '123']]} />
        </section>
        <section className="card pc">
          <h2 className="t-h2">الحركة</h2>
          <Seg label="الحركة" value={s.motion} onChange={s.setMotion} options={[['auto', 'حسب الجهاز'], ['reduced', 'حركة مخفّفة']]} />
        </section>
        <section className="card pc">
          <h2 className="t-h2">جودة الرسم</h2>
          <Seg label="جودة الرسم" value={s.tierOverride} onChange={s.setTierOverride} options={[['auto', 'تلقائي'], ['low', 'خفيفة'], ['high', 'عالية']]} />
          <p className="t-small soft">الاختبار التلقائي: {s.measuredTier === 'high' ? 'عالية' : s.measuredTier === 'low' ? 'خفيفة' : 'لسه'}</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn paper" onClick={() => s.go('perf')}>صفحة قياس الأداء</button>
            <button className="btn paper" onClick={() => s.setMeasuredTier(null)}>أعد الاختبار</button>
          </div>
        </section>
        <LearnerData />
        <DeviceSection />
      </div>
    </div>
  );
}

/** Live performance page: frames per second, frame time, draw calls, triangles, resolution and device tier,
 *  measured on the real Kassala scene. Low-tier budget: 30 fps, 80 calls, 150k triangles. */
export function Perf() {
  const tier = useTier();
  const zones = useMemo(() => worldSkills('kassala').map(s => s.zone), []);
  const [, tick] = useState(0);
  const [lamps, setLamps] = useState(14);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 500); return () => clearInterval(id); }, []);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const budget = tier === 'low' ? { fps: 30, calls: 80, tris: 150000 } : { fps: 55, calls: 150, tris: 300000 };
  const rows: [string, string, boolean | null][] = [
    ['الإطارات في الثانية', String(stats.fps), stats.fps >= budget.fps - 2],
    ['زمن الإطار', `${stats.ms} ms`, null],
    ['أوامر الرسم', `${stats.calls} / ${budget.calls}`, stats.calls <= budget.calls],
    ['المثلثات', `${stats.tris.toLocaleString('en')} / ${budget.tris.toLocaleString('en')}`, stats.tris <= budget.tris],
    ['دقّة العرض', `${stats.dpr}x`, null],
    ['فئة الجهاز', tier === 'low' ? 'منخفضة (30 إطارًا)' : 'عالية (حتى 60)', null],
    ['التخمين الأوّل', guessTier(), null],
    ['معالج الرسم', stats.gpu || gpuName(), null],
    ['الذاكرة والأنوية', `${nav.deviceMemory ?? '?'} GB · ${navigator.hardwareConcurrency ?? '?'}`, null],
    ['WebGL2', hasWebGL2() ? 'نعم' : 'لا', null],
  ];
  return (
    <div className="screen perf">
      <div style={{ position: 'absolute', inset: 0 }}>
        <Stage fog={TOWN_FOG} camera={{ position: [-300, 60, -60], fov: 50, far: TOWN_FAR }} label="مشهد كسلا لقياس الأداء">
          <KassalaTown mastered={lamps} density={SETTINGS[tier].density} />
        </Stage>
      </div>
      <div className="perf-panel ltr-nums">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b className="t-h2">قياس الأداء</b>
          <button className="icon-btn back-btn" aria-label="رجوع" onClick={() => back('parents')}><IconBack /></button>
        </div>
        <table><tbody>{rows.map(([k, v, ok]) => (
          <tr key={k}><th>{k}</th><td className="ltr">{v}</td><td aria-hidden>{ok === null ? '' : ok ? '✓' : '!'}</td></tr>
        ))}</tbody></table>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn paper" onClick={() => setLamps(n => Math.min(zones.length, n + 1))}>ولّع لمبة</button>
          <button className="btn paper" onClick={() => setLamps(zones.length)}>القمّة</button>
          <button className="btn paper" onClick={() => setLamps(0)}>البداية</button>
        </div>
        <p className="t-small soft">حدود هذه الفئة: <span className="ltr">{budget.fps}</span> إطارًا في الثانية، و<span className="ltr">{budget.calls}</span> أمر رسم. المصابيح: <span className="ltr">{fmt(lamps, 'latin')} / {fmt(zones.length, 'latin')}</span></p>
      </div>
    </div>
  );
}

/** «بيتنا»: the private family corner (only when family mode is unlocked). The family photo (sealed, decrypted on this
 *  device for this session only) melts into the page as a banner, and each of the four children has a progress card. */
function OurHome() {
  const family = useApp(st => st.family), key = useApp(st => st.familyKey);
  const learners = useLearning(st => st.learners);
  const num = useNum();
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (family?.group && key) imageUrl(key, family.group).then(u => live && setPhoto(u)).catch(() => {});
    return () => { live = false; };
  }, [family, key]);
  if (!family) return null;
  const totalStations = WORLDS.reduce((a, w) => a + stationCount(w.id), 0);
  return (
    <section className="our-home" aria-label="بيتنا">
      <div className="our-banner" aria-hidden>{photo && <img src={photo} alt="" />}</div>
      <div className="our-kids">
        {family.members.map(m => {
          const me = learners[m.id];
          const stations = WORLDS.reduce((a, w) => a + Math.min(masteredIn(me, w.id), stationCount(w.id)), 0);
          const stars = WORLDS.reduce((a, w) => a + worldSkills(w.id).filter(k => isMastered(me?.skills[k.id])).length, 0);
          const today = me?.days[dayKey()]?.lit ?? 0;
          const pct = totalStations ? Math.round(stations / totalStations * 100) : 0;
          return (
            <article key={m.id} className="our-kid card" style={{ ['--ring' as string]: m.ring }}>
              <Avatar profile={{ id: m.id, kind: 'family', gender: m.gender, name: m.name, avatar: '' } as Profile} size={76} />
              <b className="t-h2">{m.name}</b>
              <span className="our-bar" role="progressbar" aria-label={`تقدّم ${m.name}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(pct, 2)}%` }} /></span>
              <span className="t-small">{num(stations)} من {num(totalStations)} محطة</span>
              <span className="t-small soft"><IconStar size={18} style={{ color: 'var(--c-gold)', verticalAlign: '-3px' }} /> {num(stars)} · دروس اليوم {num(today)}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Parents' corner: where the children's progress is kept, a backup file to save and restore, and old (v2) progress
 *  waiting to be linked to a child. Names of old players are shown here only, to the parent. */
function LearnerData() {
  const L = useLearning();
  const guests = useApp(st => st.profiles), removeGuest = useApp(st => st.removeGuest);
  const [msg, setMsg] = useState<string | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  useModalBack(ask != null, () => setAsk(null));
  // the public parents' corner shows only this device's guests; family children and the v2 archive live behind the family code
  const download = () => {
    const blob = new Blob([JSON.stringify(L.exportBackup())], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `khawarizmi-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    setMsg('اتحفظت النسخة الاحتياطية في ملف.');
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    try { const r = L.importBackup(JSON.parse(await f.text())); setMsg(r.ok ? `اترجع تقدّم ${r.count} من الأطفال.` : 'الملف دا ما نسخة احتياطية صالحة.'); }
    catch { setMsg('الملف دا ما نسخة احتياطية صالحة.'); }
  };
  return (
    <section className="card pc learner-data">
      <h2 className="t-h2">تقدّم الضيوف</h2>
      <p className="t-small soft">
        {L.durable ? 'محفوظ في هذا الجهاز' : 'التخزين غير متاح في هذا المتصفح، فالتقدّم مؤقت حتى تُغلق الصفحة'}
        {L.durable && (L.persisted ? '، والمتصفح تعهّد بعدم مسحه.' : '. احفظ نسخة احتياطية من وقت لآخر.')}
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn paper" onClick={download}>احفظ نسخة احتياطية</button>
        <label className="btn paper" style={{ cursor: 'pointer' }}>استرجع نسخة<input type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files?.[0])} /></label>
      </div>
      {guests.length > 0 && (
        <ul className="guest-progress">
          {guests.map(g => (
            <li key={g.id} className="guest-row">
              <span><b>{playerName(g)}</b> · {WORLDS.reduce((a, w) => a + masteredIn(L.learners[g.id], w.id), 0)} محطة معمورة</span>
              {ask === g.id ? (
                <span className="row" style={{ gap: 8 }}>
                  <span className="t-small">نمسحه؟</span>
                  <button className="btn danger" onClick={() => { removeGuest(g.id); L.forget(g.id); setAsk(null); setMsg('اتمسح الضيف وتقدّمه.'); }}>امسح</button>
                  <button className="btn paper" onClick={() => setAsk(null)}>لا</button>
                </span>
              ) : <button className="btn paper" aria-label={`امسح ${playerName(g)}`} onClick={() => setAsk(g.id)}>امسح</button>}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="t-small" role="status">{msg}</p>}
    </section>
  );
}

/** Parents' corner: the 3D worlds on this device (download / delete), storage, the app version and its update,
 *  and the local error log. */
function DeviceSection() {
  const P = usePacks();
  const [sizes, setSizes] = useState<Record<string, number>>({});
  useEffect(() => {
    void P.refreshStorage();
    Promise.all(WORLDS.map(async w => [w.id, await worldBytes(w.id)] as const)).then(list => {
      const with3d = list.filter(([, b]) => b > 0);
      setSizes(Object.fromEntries(with3d));
      for (const [id] of with3d) void P.check(id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="card pc device">
      <h2 className="t-h2">الجهاز والإصدار</h2>
      {Object.entries(sizes).map(([id, bytes]) => {
        const st = P.worlds[id]?.state;
        return (
          <div key={id} className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
            <span className="t-small"><b>{SHORT_NAME[id]}</b> · <span className="ltr">{mb(bytes)} MB</span> · {st === 'ready' ? 'محفوظ في الجهاز' : st === 'downloading' ? `ينزل… ${Math.round((P.worlds[id]!.got / bytes) * 100)}%` : 'غير منزّل'}</span>
            {st !== 'ready' && <button className="btn paper" disabled={st === 'downloading'} onClick={() => void P.download(id)}>نزّل</button>}
          </div>
        );
      })}
      {P.storage && <p className="t-small soft">المساحة المستخدمة: <span className="ltr">{mb(P.storage.used)} MB</span>{lowSpace(P.storage) && <b> · مساحة الجهاز قربت تخلص.</b>}</p>}
      <p className="t-small soft">الإصدار <span className="ltr">{__APP_VERSION__}</span> ({__BUILD_DATE__}) · المحتوى <span className="ltr">{CONTENT?.version ?? '-'}</span></p>
      {P.update && <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}><span className="t-small">نسخة جديدة جاهزة. تقدّم الأطفال لن يتأثر.</span><button className="btn" onClick={P.update}>حدّث الآن</button></div>}
    </section>
  );
}
