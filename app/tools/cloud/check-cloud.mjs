// Checks the cloud setup: visitors can only ADD rows (never read); the developer account signs in and reads.
//   node tools/cloud/check-cloud.mjs                 (steps 1-3)
//   DEV_EMAIL=you@example.com node tools/cloud/check-cloud.mjs   (also steps 4-5: developer sign-in and read)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const cfg = readFileSync(join(HERE, '../../src/cloud/config.ts'), 'utf8');
const URL_ = /url: '([^']+)'/.exec(cfg)[1], KEY = /anonKey: '([^']+)'/.exec(cfg)[1];
const H = { apikey: KEY, 'Content-Type': 'application/json' };
let r = await fetch(`${URL_}/rest/v1/errors`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify([{ device: 'setup check', version: 'setup', place: 'setup', message: 'setup check (safe to ignore)', ua: 'node' }]) });
console.log('1 visitor adds an error report:', r.status, r.ok ? 'OK' : (await r.text()).slice(0, 200));
r = await fetch(`${URL_}/rest/v1/errors?select=*&limit=5`, { headers: H });
const rows = await r.json().catch(() => null);
console.log('2 visitor reads errors (must get nothing):', r.status, Array.isArray(rows) ? `${rows.length} rows` : JSON.stringify(rows).slice(0, 160));
r = await fetch(`${URL_}/rest/v1/progress`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify([{ member: 'm9', summary: {} }]) });
console.log('3 visitor adds progress for a non-family id (must be refused):', r.status);
const codeFile = join(HERE, '../../../private/dev-code.txt');
if (process.env.DEV_EMAIL && existsSync(codeFile)) {
  r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: H, body: JSON.stringify({ email: process.env.DEV_EMAIL, password: readFileSync(codeFile, 'utf8').trim() }) });
  const j = await r.json().catch(() => ({}));
  console.log('4 developer sign-in:', r.status, j.access_token ? 'OK' : JSON.stringify(j).slice(0, 200));
  if (j.access_token) {
    r = await fetch(`${URL_}/rest/v1/errors?select=id,message&order=at.desc&limit=3`, { headers: { ...H, Authorization: `Bearer ${j.access_token}` } });
    console.log('5 developer reads errors:', r.status, (await r.text()).slice(0, 200));
  }
} else console.log('4-5 skipped: set DEV_EMAIL to also test the developer sign-in');
