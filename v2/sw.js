// Replaces the old version's worker: clears its caches, removes itself and sends open pages to the new app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => !/^workbox|^worlds|^content/.test(k)).map(k => caches.delete(k))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(list => list.forEach(c => c.navigate('../')))
));
