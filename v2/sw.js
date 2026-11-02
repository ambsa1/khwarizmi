/* يخزّن بيت الخوارزمي كله في الجهاز عشان يشتغل بدون إنترنت.
   قائمة الملفات والبصمة في precache.js (تُولَّد بـ node tools/precache.js قبل كل رفع). */
importScripts('precache.js');
const { version, files } = self.PRECACHE;
const CACHE = 'khwarizmi-' + version;
const fresh = u => new Request(u, { cache: 'reload' });

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // نخزّن الملفات ستة ستة، عشان التلفونات الضعيفة ما تتعب
    for (let i = 0; i < files.length; i += 6) {
      await Promise.all(files.slice(i, i + 6).map(u => c.add(fresh(u)).catch(() => {})));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('khwarizmi-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// ملفات الصوت تُطلب على أجزاء: نقطع الجزء المطلوب من النسخة المحفوظة
async function ranged(req) {
  const c = await caches.open(CACHE);
  let hit = await c.match(req.url, { ignoreSearch: true });
  if (!hit) {
    try { const full = await fetch(req.url); if (full.status !== 200) return full; await c.put(req.url, full.clone()); hit = full; } catch (e) { return fetch(req); }
  }
  const buf = await hit.arrayBuffer(), len = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '') || [];
  let start, end;
  if (m[1] === '' && m[2]) { start = Math.max(0, len - +m[2]); end = len - 1; } else { start = +(m[1] || 0); end = m[2] ? Math.min(+m[2], len - 1) : len - 1; }
  if (start >= len) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${len}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${len}`, 'Content-Length': String(end - start + 1) } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.headers.get('range')) { e.respondWith(ranged(req)); return; }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // نتجاهل ?v=N في البحث، لأن البصمة نفسها بتضمن النسخة الصحيحة
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.status === 200) c.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return (await c.match('./')) || (await c.match('index.html'));
      throw err;
    }
  })());
});
