// One command for a release candidate:  npm run release
//   1. validate all content (repo root)   2. build the content packs   3. build the app
//   4. serve the build locally and run every automated check (behaviour, layout, offline, data, performance budgets)
// Stops at the first failure with a non-zero exit code, so nothing broken can be published.
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const step = (title, cmd, args, cwd = APP) => {
  console.log(`\n=== ${title}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) { console.error(`\nRELEASE STOPPED at: ${title}`); process.exit(1); }
};
step('validate content', 'npm', ['run', 'validate'], join(APP, '..'));
step('content packs', 'node', ['tools/content-packs.mjs']);
step('build app', 'npx', ['vite', 'build']);

const PORT = 5195;
console.log('\n=== checks on the built app');
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: APP, shell: true, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 40 && !up; i++) { await new Promise(r => setTimeout(r, 500)); up = await fetch(`http://127.0.0.1:${PORT}/`).then(r => r.ok, () => false); }
const check = up ? spawnSync('node', ['tools/check.mjs', `http://127.0.0.1:${PORT}/`], { cwd: APP, stdio: 'inherit', shell: true }) : { status: 1 };
if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); else server.kill();
if (check.status !== 0) { console.error(`\nRELEASE STOPPED at: checks${up ? '' : ' (preview server did not start)'}`); process.exit(1); }
console.log('\nRELEASE CANDIDATE READY: app/dist');
