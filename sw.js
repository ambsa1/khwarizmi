/* النسخة الأولى من اللعبة كانت هنا، واللعبة الجديدة في مجلد v2 ولها عامل خاص بيها.
   العامل ده بيمسح ملفات النسخة القديمة من الجهاز ويشيل نفسه، عشان ما يفضل شيء قديم يتعارض مع الجديدة. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('omran-')).map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(list => list.forEach(c => { if (!/\/v2\//.test(new URL(c.url).pathname)) c.navigate('./v2/'); }))
  );
});
