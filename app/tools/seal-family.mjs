// Seals the private family data so it can ship inside the public app without being readable.
//   npm run family
// Reads (all local, git-ignored):
//   ../private/family.json        names, ages, genders of the four children
//   ../private/family-code.txt    the family code
//   ../private/avatars/*.jpeg     four portraits + one group photo
// Writes (safe to publish, AES-GCM encrypted):
//   public/family/family.enc      JSON envelope: version, salt, iterations, encrypted manifest
//   public/family/<id>.bin        encrypted, resized images
// Key: PBKDF2-SHA256 (250,000 rounds, random salt) -> AES-256-GCM. A fresh salt and IVs on every run.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const PRIVATE = join(APP, '..', 'private');
const OUT = join(APP, 'public', 'family');
const TMP = join(PRIVATE, 'build');
const ITER = 250000;
const subtle = globalThis.crypto.subtle;

// Which photo belongs to which child (file name -> family id). Ring colours come from the new palette.
const PHOTOS = { 1: 'Monib.jpeg', 2: 'Hanen.jpeg', 3: 'Mohamed.jpeg', 4: 'Omran.jpeg' };
const GROUP = 'self ph u can use it in any place.jpeg';
const RING = { 1: '#2F7FD8', 2: '#D9558F', 3: '#1F9D61', 4: '#E8892B' };

const norm = s => String(s).normalize('NFC').trim()
  .replace(/[ً-ٰـ]/g, '').replace(/[آأإٱ]/g, 'ا')
  .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6f0).replace(/\s+/g, '');
const b64 = u8 => Buffer.from(u8).toString('base64');

async function deriveKey(code, salt) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(norm(code)), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}
async function seal(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
}
function resize(src, dst, max, q) {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(HERE, 'resize.ps1'), src, dst, String(max), String(q)], { stdio: 'pipe' });
  return readFileSync(dst);
}

const family = JSON.parse(readFileSync(join(PRIVATE, 'family.json'), 'utf8'));
const code = readFileSync(join(PRIVATE, 'family-code.txt'), 'utf8').trim();
if (!code) throw new Error('empty family code');
mkdirSync(TMP, { recursive: true });
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await deriveKey(code, salt);
const members = [];
for (const m of family) {
  const file = join(PRIVATE, 'avatars', PHOTOS[m.fid]);
  if (!existsSync(file)) throw new Error('missing portrait for family id ' + m.fid);
  const img = resize(file, join(TMP, `m${m.fid}.jpg`), 512, 86);
  writeFileSync(join(OUT, `m${m.fid}.bin`), await seal(key, img));
  members.push({ id: `m${m.fid}`, name: m.name, age: m.age, gender: m.gender === 'g' ? 'f' : 'm', ring: RING[m.fid], image: `m${m.fid}.bin` });
}
const groupImg = resize(join(PRIVATE, 'avatars', GROUP), join(TMP, 'group.jpg'), 1400, 84);
writeFileSync(join(OUT, 'group.bin'), await seal(key, groupImg));

const manifest = { members, group: 'group.bin', sealedAt: new Date().toISOString().slice(0, 10) };
const envelope = { v: 2, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), data: b64(await seal(key, new TextEncoder().encode(JSON.stringify(manifest)))) };
writeFileSync(join(OUT, 'family.enc'), JSON.stringify(envelope) + '\n');
rmSync(TMP, { recursive: true, force: true });
console.log(`sealed ${members.length} members + group photo into public/family/ (no names in clear text)`);
