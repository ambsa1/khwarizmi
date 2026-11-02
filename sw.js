/* يخزّن اللعبة كلها في الجهاز عشان تشتغل بدون إنترنت.
   مهم: عند أي تحديث للعبة غيّر رقم VERSION، عشان الأجهزة تنزّل النسخة الجديدة. */
const VERSION = 'omran-v3';
importScripts('voice/list.js');

const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/engine.js', 'js/levels.js', 'js/texts.js', 'js/storage.js', 'js/sound.js', 'js/art.js', 'js/app.js',
  'voice/list.js', 'icons/icon-192.png', 'icons/icon-512.png',
];
const VOICE = (self.OMRAN_VOICE_LIST || []).map(k => 'voice/' + k + '.mp3');
// cache: 'reload' عشان ما ناخد نسخة قديمة من ذاكرة المتصفح بعد التحديث
const fresh = u => new Request(u, { cache: 'reload' });

// ملفات الصوت تُنزَّل ستة ستة، عشان التلفونات الضعيفة ما تتعب
async function cacheVoices(c) {
  for (let i = 0; i < VOICE.length; i += 6) {
    await Promise.all(VOICE.slice(i, i + 6).map(u => c.add(fresh(u)).catch(() => {})));
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE.map(fresh)).then(() => cacheVoices(c)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// المتصفح يطلب ملفات الصوت على أجزاء، فنقطع الجزء المطلوب من النسخة المحفوظة.
// لو الملف ما محفوظ، ننزّله كاملاً ونحفظه أولاً.
async function rangeFromCache(req) {
  const cache = await caches.open(VERSION);
  let hit = await cache.match(req.url, { ignoreSearch: true });
  if (!hit) {
    try {
      const full = await fetch(req.url);
      if (full.status !== 200) return full;
      await cache.put(req.url, full.clone());
      hit = full;
    } catch (e) {
      return fetch(req);
    }
  }
  const buf = await hit.arrayBuffer();
  const len = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '') || [];
  let start, end;
  if (m[1] === '' && m[2]) { start = Math.max(0, len - Number(m[2])); end = len - 1; } // bytes=-500
  else { start = Number(m[1] || 0); end = m[2] ? Math.min(Number(m[2]), len - 1) : len - 1; }
  if (start >= len) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${len}` } });
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${len}`,
      'Content-Length': String(end - start + 1),
    },
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.headers.get('range')) { e.respondWith(rangeFromCache(e.request)); return; }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.status === 200 && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
