// Offline-first cloud sync (Supabase REST, no client library). Everything is queued on the device and sent when the
// internet is there; nothing ever blocks or slows the child.
//   reportError()   - technical errors from any device (visitors and family): message, place, device, version
//   family progress - for the four family children only, by id (m1..m4), never names: last activity, today's lessons,
//                     stations per world, and the skills they stumble on
// Reading happens only in the developer panel, signed in as the developer account (server-side protection).
import { CLOUD, cloudOn, DEV_GATE } from './config';
import { dayKey, isMastered, masteredIn, useLearning, type Learner } from '../data/learning';
import { stationCount, WORLDS, worldSkills } from '../lib/content';

const QKEY = 'khawarizmi.cloud.q';
type ErrorRow = { at: string; device: string; version: string; place: string; message: string; ua: string };
const readQ = (): ErrorRow[] => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } };
const writeQ = (q: ErrorRow[]) => { try { localStorage.setItem(QKEY, JSON.stringify(q.slice(-50))); } catch { /* full or private */ } };

/** "Android 13 · Chrome 120 · phone" style label */
export function deviceLabel(ua = navigator.userAgent) {
  const os = /Android ([\d.]+)/.exec(ua)?.[0] ?? (/iPhone|iPad/.test(ua) ? `iOS ${(/OS (\d+)/.exec(ua)?.[1] ?? '')}` : /Windows NT/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'جهاز');
  const br = /Edg\/(\d+)/.exec(ua) ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}` : /Chrome\/(\d+)/.exec(ua) ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}` : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}` : /Safari/.test(ua) ? 'Safari' : '';
  const kind = /Mobi|Android|iPhone/.test(ua) ? 'هاتف' : /iPad|Tablet/.test(ua) ? 'لوحي' : 'حاسوب';
  return [os, br, kind].filter(Boolean).join(' · ');
}

// publishable keys go in the apikey header only; Authorization carries the developer's session token when signed in
const headers = (token?: string): Record<string, string> => ({ apikey: CLOUD.anonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

export function reportError(message: string, place: string) {
  writeQ([...readQ(), { at: new Date().toISOString(), device: deviceLabel(), version: __APP_VERSION__, place, message: message.slice(0, 500), ua: navigator.userAgent.slice(0, 200) }]);
  void flush();
}

let flushing = false;
export async function flush() {
  if (!cloudOn() || !navigator.onLine || flushing) return;
  flushing = true;
  try {
    const q = readQ();
    if (q.length) {
      const r = await fetch(`${CLOUD.url}/rest/v1/errors`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(q) });
      if (r.ok) writeQ(readQ().slice(q.length));
    }
    await pushProgress();
  } catch { /* offline or blocked: try again later */ } finally { flushing = false; }
}

/** what the developer sees for one child (no name: the panel adds it on a device where the family is unlocked) */
export function summarize(l: Learner | undefined) {
  const worlds = Object.fromEntries(WORLDS.map(w => [w.id, { done: masteredIn(l, w.id), total: stationCount(w.id) }]));
  const titles = new Map(WORLDS.flatMap(w => worldSkills(w.id).map(s => [s.id, s.title.ar] as const)));
  const stumbles = Object.entries(l?.skills ?? {})
    .filter(([, s]) => s.attempts - s.correct > 0 || (!isMastered(s) && s.attempts > 1))
    .sort((a, b) => (b[1].attempts - b[1].correct) - (a[1].attempts - a[1].correct)).slice(0, 8)
    .map(([id, s]) => ({ skill: titles.get(id) ?? id, misses: s.attempts - s.correct, attempts: s.attempts }));
  const today = l?.days[dayKey()]?.lit ?? 0;
  const last = Math.max(0, ...Object.values(l?.skills ?? {}).map(s => s.last), l?.updated ?? 0);
  return { last: last ? new Date(last).toISOString() : null, today, worlds, stumbles, mastered: Object.values(l?.skills ?? {}).filter(isMastered).length };
}

const sent = new Map<string, string>();
async function pushProgress() {
  const learners = useLearning.getState().learners;
  const rows = Object.entries(learners).filter(([id]) => /^m\d$/.test(id))
    .map(([id, l]) => ({ member: id, device: deviceLabel(), updated_at: new Date().toISOString(), summary: summarize(l) }))
    .filter(r => sent.get(r.member) !== JSON.stringify(r.summary));
  if (!rows.length) return;
  // append-only (visitors may add rows, never read or change them)
  const r = await fetch(`${CLOUD.url}/rest/v1/progress`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  if (r.ok) rows.forEach(x => sent.set(x.member, JSON.stringify(x.summary)));
}

/** start syncing: on connection, every minute, and shortly after the learning store changes */
export function installCloud() {
  if (!cloudOn()) return;
  addEventListener('online', () => void flush());
  setInterval(() => void flush(), 60000);
  let t = 0;
  useLearning.subscribe(() => { clearTimeout(t); t = window.setTimeout(() => void flush(), 8000); });
  void flush();
}

// ---------- developer side ----------
const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
/** checks the developer code against the shipped hash (works offline) */
export async function checkDevCode(code: string) {
  try {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.normalize('NFC').trim()), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(DEV_GATE.salt), iterations: DEV_GATE.iter }, base, 256));
    const want = b64(DEV_GATE.hash);
    return bits.length === want.length && bits.every((v, i) => v === want[i]);
  } catch { return false; }
}
/** signs in to the cloud as the developer (the developer code is the account password) */
async function devEmail(code: string) {
  try {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.normalize('NFC').trim()), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(CLOUD.devEmailSealed.salt), iterations: 250000 }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const all = b64(CLOUD.devEmailSealed.data);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12)));
  } catch { return null; }
}
export async function devSignIn(code: string): Promise<string | null> {
  const email = cloudOn() ? await devEmail(code) : null;
  if (!email) return null;
  const r = await fetch(`${CLOUD.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password: code.trim() }) });
  return r.ok ? (await r.json()).access_token : null;
}
export type ProgressRow = { member: string; device: string; updated_at: string; summary: ReturnType<typeof summarize> };
export type CloudError = ErrorRow & { id: number };
export async function devFetch(token: string) {
  const get = (path: string) => fetch(`${CLOUD.url}/rest/v1/${path}`, { headers: headers(token) }).then(r => (r.ok ? r.json() : []));
  const [rows, errors] = await Promise.all([get('progress?select=member,device,updated_at,summary&order=updated_at.desc&limit=400'), get('errors?select=*&order=at.desc&limit=200')]);
  const latest = new Map<string, ProgressRow>();
  for (const r of rows as ProgressRow[]) if (!latest.has(r.member)) latest.set(r.member, r);
  return { progress: [...latest.values()], errors: errors as CloudError[] };
}

/** a technical error explained in simple Arabic */
export function explainError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('webgl') && m.includes('lost')) return 'الرسم ثلاثي الأبعاد توقّف مؤقتًا (ذاكرة الرسوميات امتلأت أو التطبيق رجع من الخلفية). التطبيق يعيد الرسم تلقائيًا.';
  if (m.includes('webgl')) return 'الجهاز ما قدر يشغّل الرسم ثلاثي الأبعاد (متصفح قديم أو رسوميات ضعيفة). يظهر للطفل صورة بدل العالم.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'انقطع الإنترنت أثناء تحميل ملف. يُعاد المحاولة لما يرجع الاتصال.';
  if (m.includes('dynamically imported module') || m.includes('chunk')) return 'الجهاز كان شغّال بنسخة قديمة بعد تحديث التطبيق. إعادة الفتح تحلّها.';
  if (m.includes('quota') || m.includes('storage')) return 'مساحة التخزين في الجهاز قربت تخلص.';
  if (m.includes('indexeddb') || m.includes('idb')) return 'مشكلة في قاعدة البيانات المحلية بالمتصفح (أحيانًا في وضع التصفح الخاص).';
  if (m.includes('undefined') || m.includes('null')) return 'مشكلة برمجية: جزء من الشاشة حاول يقرأ بيانات لسه ما وصلت.';
  return 'مشكلة غير متوقّعة في التطبيق. التفاصيل التقنية تحت.';
}
