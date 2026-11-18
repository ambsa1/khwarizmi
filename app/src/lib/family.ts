// Opens the sealed family data (public/family/*) with the family code.
// Same scheme as app/tools/seal-family.mjs: PBKDF2-SHA256 (250k) -> AES-256-GCM, file = iv(12) | ciphertext+tag.
// After a successful unlock only the derived key (never the code) is kept on the device.

export type FamilyMember = { id: string; name: string; age: number; gender: 'm' | 'f'; ring: string; image: string };
export type FamilyManifest = { members: FamilyMember[]; group: string };
type Envelope = { v: number; iter: number; salt: string; data: string };

const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const toB64 = (u: Uint8Array) => { let s = ''; u.forEach(b => (s += String.fromCharCode(b))); return btoa(s); };
const norm = (s: string) => s.normalize('NFC').trim()
  .replace(/[ً-ٰـ]/g, '').replace(/[آأإٱ]/g, 'ا')
  .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0)).replace(/\s+/g, '');

async function envelope(): Promise<Envelope | null> {
  try { const r = await fetch('family/family.enc', { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch { return null; }
}
const aesKey = (raw: Uint8Array) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
async function open(key: CryptoKey, bytes: Uint8Array) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12)));
}

/** Code -> { manifest, keyB64 } or null if the code is wrong / data missing. */
export async function unlockWithCode(code: string) {
  const env = await envelope();
  if (!env || !crypto?.subtle) return null;
  try {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(code)), 'PBKDF2', false, ['deriveBits']);
    const raw = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(env.salt), iterations: env.iter }, base, 256));
    const manifest = JSON.parse(new TextDecoder().decode(await open(await aesKey(raw), fromB64(env.data)))) as FamilyManifest;
    return { manifest, keyB64: toB64(raw) };
  } catch { return null; }
}

/** Saved key -> manifest (fast, no PBKDF2). */
export async function unlockWithKey(keyB64: string) {
  const env = await envelope();
  if (!env) return null;
  try { return JSON.parse(new TextDecoder().decode(await open(await aesKey(fromB64(keyB64)), fromB64(env.data)))) as FamilyManifest; } catch { return null; }
}

const urlCache = new Map<string, string>();
/** Decrypts one sealed image into an object URL (cached for the session). */
export async function imageUrl(keyB64: string, file: string) {
  if (urlCache.has(file)) return urlCache.get(file)!;
  const r = await fetch('family/' + file);
  if (!r.ok) throw new Error('missing ' + file);
  const bytes = await open(await aesKey(fromB64(keyB64)), new Uint8Array(await r.arrayBuffer()));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  urlCache.set(file, url);
  return url;
}
