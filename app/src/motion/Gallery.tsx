// The motion library at a glance (?view=motion): every layer/template with sample data, fully shown. Used to review the
// library after any change (one improvement here shows in every book).
import { SceneView, type Ctx } from './library';
import type { Scene } from './types';
import { artUrl } from '../school/book';

const S = (note: string, s: Omit<Scene, 'part' | 'cues'>): Scene & { note: string } => ({ part: 0, cues: {}, note, ...s });
const SAMPLES = [
  S('title · شاشة عنوان', { layers: [{ kind: 'title', cue: '', text: 'الجهاز التنفسي', sub: 'رحلة الهواء في أجسامنا', art: 'icon-lungs' }] }),
  S('card · بطاقة مفهوم', { layers: [{ kind: 'card', cue: '', title: 'الشهيق', text: 'الهواء الذاهب إلى الرئتين.', art: 'wind' }] }),
  S('steps · خطوات متسلسلة', { layers: [{ kind: 'steps', items: [{ cue: '', text: 'الأنف', art: 'wind' }, { cue: '', text: 'البلعوم' }, { cue: '', text: 'الرئتان', art: 'icon-lungs' }] }] }),
  S('compare · مقارنة', { layers: [{ kind: 'compare', right: { title: 'فقاريات', tone: 'palm', items: [{ cue: '', art: 'fish', text: 'سمكة' }, { cue: '', art: 'bird', text: 'عصفور' }] }, left: { title: 'لا فقاريات', tone: 'clay', items: [{ cue: '', art: 'icon-snail', text: 'حلزون' }, { cue: '', art: 'bee', text: 'نحلة' }] } }] }),
  S('labels · رسم توضيحي بأسماء', { items: [{ art: 'icon-lungs', x: 50, y: 52, s: 30 }], layers: [{ kind: 'labels', items: [{ cue: '', text: 'القصبة الهوائية', x: 72, y: 20 }, { cue: '', text: 'الرئتان', x: 24, y: 62 }] }] }),
  S('road · طريق بمحطات', { layers: [{ kind: 'road', cue: '', points: [[14, 40], [38, 32], [62, 40], [86, 32]], lit: ['', '', null, null], labels: ['١', '٢', '٣', '٤'] }] }),
  S('ground + ring + items · مشهد وتجميع', { layers: [{ kind: 'ground', river: true }, { kind: 'ring', cue: '', x: 50, y: 44, size: 40 }], items: [{ art: 'tree', x: 40, y: 34, s: 14 }, { art: 'bird', x: 60, y: 34, s: 11 }, { art: 'fish', x: 60, y: 58, s: 12 }, { art: 'kids', x: 40, y: 58, s: 12 }] }),
  S('term + groups · مصطلح ومجموعات', { layers: [{ kind: 'term', cue: '', text: 'التصنيف' }, { kind: 'group', cue: '', x: 74, y: 60, size: 28, tone: 'palm', label: 'نباتات' }, { kind: 'group', cue: '', x: 26, y: 60, size: 28, tone: 'clay', label: 'حيوانات' }], items: [{ art: 'tree', x: 74, y: 60, s: 9 }, { art: 'bird', x: 26, y: 60, s: 9 }] }),
];
export function MotionGallery() {
  const c: Ctx = { on: () => true, cover: new URL('school-data/g5-science/cover.webp', document.baseURI).href, logo: artUrl('icons/icon-512.png'), art: n => artUrl(`art/school/${n}.svg`) };
  return (
    <div className="motion-gallery" dir="rtl">
      {SAMPLES.map(s => <figure key={s.note}><figcaption>{s.note}</figcaption><div className="explain-stage"><div className="scene"><SceneView scene={s} c={c} /></div></div></figure>)}
    </div>
  );
}
