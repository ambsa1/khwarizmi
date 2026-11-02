/* تشفير بسيط بالرمز (لإخفاء أسماء أطفال العائلة من الكود المنشور، وليس لحماية أسرار مهمة) */
(function (root) {
  'use strict';

  // ننظّف الرمز: أرقام عربية أو فارسية تتحول لإنجليزية، ونشيل المسافات
  const norm = s => String(s || '').normalize('NFC').trim()
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).replace(/\s+/g, '');

  function stream(code, n) {
    let h = 2166136261;
    for (const ch of norm(code)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
      out[i] = h & 255;
    }
    return out;
  }
  const enc = s => new TextEncoder().encode(s);
  const dec = b => new TextDecoder().decode(b);
  const toB64 = b => (typeof btoa !== 'undefined' ? btoa(String.fromCharCode(...b)) : Buffer.from(b).toString('base64'));
  const fromB64 = s => (typeof atob !== 'undefined' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')));

  function seal(text, code) {
    const b = enc(text), k = stream(code, b.length);
    return toB64(b.map((v, i) => v ^ k[i]));
  }
  function open(data, code) {
    try {
      const b = fromB64(data), k = stream(code, b.length);
      return dec(b.map((v, i) => v ^ k[i]));
    } catch (e) { return null; }
  }

  const api = { seal, open, norm };
  root.Crypt = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
