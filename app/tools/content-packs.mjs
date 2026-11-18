// Builds the content packs the app loads at run time (nothing from the curriculum is compiled into the app code):
//   public/content/core.json          worlds, skill trees, activity templates   (needed by every screen; precached)
//   public/content/world-<id>.json    the lessons of one world                  (loaded on demand)
//   public/content/legacy.json        old v2 level -> new skill map             (loaded only when importing v2 data)
//   public/content/manifest.json      content version + every pack with its size
//   public/worlds/index.json          the 3D files of each world with sizes     (for downloading a world)
// Run after `npm run validate` (repo root) so only validated content is packed.   node tools/content-packs.mjs
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const C = join(ROOT, 'content');
const OUT = join(HERE, '..', 'public', 'content');
mkdirSync(OUT, { recursive: true });
const read = p => JSON.parse(readFileSync(join(C, p), 'utf8'));
const strip = o => { const { $schema, ...rest } = o; return rest; };
const walk = d => (existsSync(d) ? readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

const worlds = read('worlds/worlds.json').worlds;
const trees = Object.fromEntries(readdirSync(join(C, 'skills')).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), strip(read(`skills/${f}`))]));
const templates = read('templates/templates.json').templates;
const lessons = walk(join(C, 'lessons')).filter(f => f.endsWith('.json')).map(f => strip(JSON.parse(readFileSync(f, 'utf8'))));

const packs = [];
const write = (name, data) => {
  const txt = JSON.stringify(data);
  writeFileSync(join(OUT, name), txt);
  packs.push({ file: name, bytes: Buffer.byteLength(txt), hash: createHash('sha256').update(txt).digest('hex').slice(0, 12) });
};
write('core.json', { worlds, trees, templates });
// a world's lessons: lessons teaching any skill of that world's tree
const skillWorld = new Map(Object.values(trees).flatMap(t => (t.skills ?? []).map(s => [s.id, t.world])));
for (const w of worlds) {
  const own = lessons.filter(l => l.skills.some(id => skillWorld.get(id) === w.id));
  write(`world-${w.id}.json`, { world: w.id, lessons: own });
}
write('legacy.json', strip(read('legacy/coding-75.json')));
const version = createHash('sha256').update(packs.map(p => p.hash).join()).digest('hex').slice(0, 10);
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ version, built: new Date().toISOString(), packs }, null, 1));

// 3D world files (downloaded per world)
const WORLDS_DIR = join(HERE, '..', 'public', 'worlds');
const index = {};
for (const id of existsSync(WORLDS_DIR) ? readdirSync(WORLDS_DIR) : []) {
  const dir = join(WORLDS_DIR, id); if (!statSync(dir).isDirectory()) continue;
  const files = walk(dir).map(f => ({ path: relative(join(HERE, '..', 'public'), f).replace(/\\/g, '/'), bytes: statSync(f).size }));
  index[id] = { files, bytes: files.reduce((a, f) => a + f.bytes, 0) };
}
writeFileSync(join(WORLDS_DIR, 'index.json'), JSON.stringify(index, null, 1));

console.log(`content ${version}: ${packs.map(p => `${p.file} ${(p.bytes / 1024).toFixed(1)} KB`).join(', ')}; lessons ${lessons.length}`);
console.log(`worlds: ${Object.entries(index).map(([id, w]) => `${id} ${(w.bytes / 1048576).toFixed(2)} MB in ${w.files.length} files`).join(', ')}`);
