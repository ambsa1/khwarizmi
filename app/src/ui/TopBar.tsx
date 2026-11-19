// The unified top bar of the inner screens (journey, map, passport) and the app menu.
//   start (right in RTL): the active player as a glass pill - tap to switch player
//   centre: the screen or world title
//   end (left in RTL): the menu (bottom sheet on phones, popover on wide screens): about, guide, sound, privacy
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { useHold } from './Hold';
import { back, useModalBack } from './nav';
import { IconBack } from './Icons';
import { createPortal } from 'react-dom';
import { Sound, useSoundSettings } from '../audio/SoundManager';
import { useApp, useProfile } from '../state/store';
import { Avatar, gradeLabel, playerName } from './kit';
import { useNum } from '../lib/num';

const P = { width: 26, height: 26, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const IconDots = () => <svg {...P}><circle cx="16" cy="7" r="2.4" fill="currentColor" /><circle cx="16" cy="16" r="2.4" fill="currentColor" /><circle cx="16" cy="25" r="2.4" fill="currentColor" /></svg>;
const IconInfo = () => <svg {...P}><circle cx="16" cy="16" r="12" /><path d="M16 14v8" /><circle cx="16" cy="9.5" r="1.4" fill="currentColor" /></svg>;
const IconBook = () => <svg {...P}><path d="M5 7c4-2 8-2 11 1 3-3 7-3 11-1v18c-4-2-8-2-11 1-3-3-7-3-11-1z" /><path d="M16 8v18" /></svg>;
const IconSound = () => <svg {...P}><path d="M5 12h5l7-6v20l-7-6H5z" /><path d="M22 11c2 3 2 7 0 10M25.5 8c4 5 4 11 0 16" /></svg>;
const IconShield = () => <svg {...P}><path d="M16 4l10 4v7c0 7-5 11-10 13C11 26 6 22 6 15V8z" /><path d="M11.5 16l3 3 6-6" /></svg>;

type Page = 'about' | 'guide' | 'sound' | 'privacy';
const ITEMS: [Page, string, () => JSX.Element][] = [
  ['about', 'عن تطبيق خوارزمي', IconInfo], ['guide', 'دليل الاستخدام', IconBook], ['sound', 'إعدادات الصوت والمؤثرات', IconSound], ['privacy', 'سياسة الخصوصية', IconShield],
];

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <div className="toggle-row"><span>{label}</span><button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} /></div>;
}

function SoundPage() {
  const s = useSoundSettings();
  return (
    <>
      <Switch label="مؤثرات الأزرار والاحتفال" on={s.effects} onChange={v => Sound.set({ effects: v })} />
      <Switch label="أصوات العالم (ريح، ماء، طيور)" on={s.ambient} onChange={v => Sound.set({ ambient: v })} />
      <Switch label="صوت سراج" on={s.voice} onChange={v => Sound.set({ voice: v })} />
      <label className="toggle-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <span>مستوى الصوت</span>
        <input className="vol" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={e => Sound.set({ volume: +e.target.value })} onPointerUp={() => Sound.play('star')} />
      </label>
    </>
  );
}

/** the version line; holding it 2.5 seconds (silently, nothing shows) opens the developer gate */
function Version() {
  const go = useApp(s => s.go);
  const hold = useHold(2500, () => go('dev'));
  return <p className="soft version" {...hold.handlers}>الإصدار <span className="ltr">{__APP_VERSION__}</span></p>;
}

function PageBody({ page }: { page: Page }) {
  if (page === 'sound') return <SoundPage />;
  if (page === 'about') return (
    <>
      <p>خوارزمي تطبيق تعليمي للأطفال من ٣ لحدّ ١٢ سنة. سراج، صاحب رأس الفانوس، بيرافق الطفل في رحلة عبر ستة عوالم سودانية حقيقية.</p>
      <p>كل عالم فيه محطات، وكل محطة فيها دروس صغيرة. لما الطفل يكمّل دروس المحطة، تتبني وتحيا الأرض حولها.</p>
      <p>التطبيق بيشتغل بدون إنترنت بعد أول تحميل.</p>
      <p className="motivate">يا بطل ويا بطلة: كل درس بتكمّلوه بيعمّر حتة من بلدنا، وكل محطة بتنوّروها بتقرّبكم من حلمكم. ما تستعجلوا، الغلط جزء من التعلّم، وسراج معاكم خطوة بخطوة.
        وإنتو يا أهلنا: دقايق قليلة كل يوم مع ولادكم وبناتكم بتصنع فرق كبير. شجّعوهم واحتفلوا معاهم بكل ختم في الجواز.</p>
      <Version />
    </>
  );
  if (page === 'guide') return (
    <ol>
      <li>اختار اللاعب، أو اعمل ضيف جديد.</li>
      <li>في «رحلتي» اضغط الزر الذهبي عشان تبدأ الدرس الجاي.</li>
      <li>كل ما تكمّل دروس محطة، تتبني ويحيا العالم وراء سراج.</li>
      <li>«الخريطة» بتنقّلك بين العوالم، و«جوازي» بيوريك أختامك.</li>
      <li>ركن الأهل في القفل أعلى الشاشة الأولى: اضغط عليه مرة واحدة.</li>
    </ol>
  );
  return (
    <>
      <p>كل التقدّم محفوظ في الجهاز دا بس. ما في حسابات، ولا إعلانات، ولا تتبّع.</p>
      <p>بيانات الأسرة وصورها مشفّرة، وما بتنفتح إلا بالكود، والصور ما بتطلع من الجهاز.</p>
      <p>من ركن الأهل تقدر تاخد نسخة احتياطية، أو ترجّعها، أو تمسح البيانات.</p>
    </>
  );
}

/** The ⋮ menu: a list of four items, each opening its page. */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const close = () => { setOpen(false); setPage(null); Sound.play('close'); };
  // the device back button: a page goes back to the list, the list closes the menu
  useModalBack(open, close);
  useModalBack(open && page != null, () => setPage(null));
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [open]);
  const title = page ? ITEMS.find(i => i[0] === page)![1] : null;
  return (
    <>
      <button className="icon-btn dots-btn" aria-label="القائمة" aria-haspopup="dialog" onClick={() => { setOpen(true); Sound.play('open'); }}><IconDots /></button>
      {createPortal(<AnimatePresence>
        {open && <>
          <motion.div key="scrim" className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div key="sheet" role="dialog" aria-modal="true" aria-label={title ?? 'القائمة'} className={'sheet ' + (page ? 'page' : 'pop')}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
            <div className="sheet-grip" />
            {page ? (
              <>
                <div className="sheet-head">
                  <button className="icon-btn back-btn" aria-label="رجوع" onClick={() => setPage(null)}><IconBack /></button>
                  <h2 className="t-h2">{title}</h2>
                </div>
                <PageBody page={page} />
              </>
            ) : <>
              <div className="sheet-head">
                <button className="icon-btn back-btn" aria-label="رجوع" onClick={close}><IconBack /></button>
                <h2 className="t-h2">القائمة</h2>
              </div>
              {ITEMS.map(([id, label, Icon]) => (
                <button key={id} className="menu-item" onClick={() => setPage(id)}><Icon />{label}</button>
              ))}
            </>}
          </motion.div>
        </>}
      </AnimatePresence>, document.body)}
    </>
  );
}

/** Top bar of the inner screens. */
export function TopBar({ title }: { title: ReactNode }) {
  const p = useProfile(), go = useApp(s => s.go), screen = useApp(s => s.screen);
  const num = useNum();
  if (!p) return null;
  const name = playerName(p), grade = gradeLabel(p, num);
  return (
    <header className="topbar">
      <div className="topbar-start">
        <button className="icon-btn back-btn" aria-label="رجوع" onClick={() => back(screen === 'path' ? 'entry' : 'path')}><IconBack /></button>
        <button className="glass player-pill" aria-label={`${name}: غيّر اللاعب`} onClick={() => go('entry')}>
          <Avatar profile={p} size={44} />
          <span className="pill-text"><span>{name}</span>{grade && <small>{grade}</small>}</span>
        </button>
      </div>
      <div className="topbar-title">{title}</div>
      <AppMenu />
    </header>
  );
}
