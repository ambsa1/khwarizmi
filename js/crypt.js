/* تشفير بيانات العائلة برمزها (أسماء الأطفال وأصوات الترحيب بهم):
   PBKDF2-SHA256 (٢٥٠ ألف دورة، ملح عشوائي) → مفتاح AES-GCM. نفس الكود يشتغل في المتصفح وفي node (tools/).
   الشكل: base64( 1 | ملح ١٦ | iv ١٢ | نص مشفّر+وسم ). ملفات الصوت: iv ١٢ | صوت مشفّر+وسم (بنفس المفتاح). */
(function (root) {
  'use strict';

  const ITER = 250000, VER = 1;
  const C = root.crypto && root.crypto.subtle ? root.crypto : typeof require === 'function' ? require('crypto').webcrypto : null;
  const S = () => { if (!C || !C.subtle) throw new Error('nocrypto'); return C.subtle; };

  // ننظّف الرمز: أرقام عربية أو فارسية تتحول لإنجليزية، ونشيل المسافات والتشكيل والتطويل،
  // ونوحّد أشكال الألف والياء، عشان "سما" و"سمآ" و"سمى" تكون نفس الرمز
  const norm = s => String(s || '').normalize('NFC').trim().toLowerCase()
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).replace(/\s+/g, '')
    .replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي');

  const enc = s => new TextEncoder().encode(s);
  const dec = b => new TextDecoder().decode(b);
  const toB64 = b => { if (typeof btoa === 'undefined') return Buffer.from(b).toString('base64'); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); };
  const fromB64 = s => (typeof atob !== 'undefined' ? Uint8Array.from(atob(s), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(s, 'base64')));
  const rand = n => C.getRandomValues(new Uint8Array(n));

  // الرمز + الملح → مفتاح خام (٣٢ بايت) يُحفظ على الجهاز بعد الفتح، بدل الرمز نفسه
  async function derive(code, salt) {
    const base = await S().importKey('raw', enc(norm(code)), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await S().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, 256));
  }
  const aes = raw => S().importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function lock(raw, bytes) {
    const iv = rand(12), ct = new Uint8Array(await S().encrypt({ name: 'AES-GCM', iv }, await aes(raw), bytes));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
  }
  async function unlock(raw, bytes) {
    bytes = new Uint8Array(bytes);
    return new Uint8Array(await S().decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, await aes(raw), bytes.subarray(12)));
  }

  // للأدوات: نص → سطر FAMILY_ENC (ملح جديد كل مرة)، ويرجع المفتاح عشان تتشفّر به ملفات الصوت
  async function seal(text, code) {
    const salt = rand(16), key = await derive(code, salt), body = await lock(key, enc(text));
    const out = new Uint8Array(1 + 16 + body.length); out[0] = VER; out.set(salt, 1); out.set(body, 17);
    return { data: toB64(out), key: toB64(key) };
  }
  // بالرمز: يرجع { text, key } أو null لو الرمز غلط
  async function open(data, code) {
    try {
      const b = fromB64(data); if (b[0] !== VER) return null;
      const key = await derive(code, b.subarray(1, 17));
      return { text: dec(await unlock(key, b.subarray(17))), key: toB64(key) };
    } catch (e) { return null; }
  }
  // بالمفتاح المحفوظ (بدون انتظار PBKDF2)
  async function openWith(data, key) {
    try { const b = fromB64(data); return b[0] === VER ? dec(await unlock(fromB64(key), b.subarray(17))) : null; } catch (e) { return null; }
  }
  const sealBytes = async (bytes, key) => lock(fromB64(key), bytes);
  const openBytes = async (bytes, key) => { try { return await unlock(fromB64(key), bytes); } catch (e) { return null; } };

  const api = { seal, open, openWith, sealBytes, openBytes, norm, ITER };
  root.Crypt = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
