// Publishes app/dist to the public site (GitHub Pages: branch main, root) as one new commit on top of main's history.
//   npm run deploy            (run `npm run release` first: it builds app/dist and must pass every check)
// - builds the commit in a separate worktree, so the working branch is never touched
// - keeps the v2/ redirect (devices that installed the old version are moved to the new app and cleaned up)
// - verifies every published file is byte-identical to app/dist before pushing
// - waits for GitHub Pages to finish, then prints the live URL
// Rollback: `git push origin <previous main commit>:main` (nothing is ever force-deleted).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..'), REPO = join(APP, '..'), DIST = join(APP, 'dist');
const sh = (cmd, cwd = REPO) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }).toString().trim();
if (!existsSync(join(DIST, 'index.html'))) { console.error('app/dist is missing: run `npm run release` first'); process.exit(1); }
const source = sh('git rev-parse --short HEAD');
const dirty = sh('git status --porcelain');
if (dirty) { console.error('working tree has uncommitted changes: commit them first so the published build is traceable'); process.exit(1); }

const W = mkdtempSync(join(tmpdir(), 'khw-pages-'));
try {
  sh('git fetch origin main -q');
  sh(`git worktree add -q --detach "${W}" origin/main`);
  const keep = new Set(['.git', 'v2', '.gitattributes', '.nojekyll']);
  for (const f of readdirSync(W)) if (!keep.has(f)) rmSync(join(W, f), { recursive: true, force: true });
  cpSync(DIST, W, { recursive: true });
  writeFileSync(join(W, '.nojekyll'), '');
  sh('git add -A', W);
  // every staged file must be byte-identical to the build (guards against line-ending conversion of encrypted files)
  const staged = new Map(sh('git ls-files -s', W).split('\n').map(l => { const [meta, path] = l.split('\t'); return [path, meta.split(' ')[1]]; }));
  for (const [f, blob] of staged) {
    if (!existsSync(join(DIST, f))) continue;
    if (sh(`git hash-object --no-filters "${join(DIST, f)}"`, W) !== blob) throw new Error(`published file differs from the build: ${f}`);
  }
  if (!sh('git status --porcelain', W)) throw Object.assign(new Error('nothing new to publish'), { quiet: true });
  sh(`git commit -q -m "نشر خوارزمي من ${source}"`, W);
  const commit = sh('git rev-parse --short HEAD', W);
  sh('git push -q origin HEAD:main', W);
  console.log(`pushed ${commit} to main; waiting for GitHub Pages...`);
  for (let i = 0; i < 60; i++) {
    const s = sh('gh api repos/ambsa1/khwarizmi/pages/builds/latest --jq ".status + \\" \\" + .commit"');
    if (s.startsWith('built') && s.includes(commit)) { console.log('LIVE: https://ambsa1.github.io/khwarizmi/'); break; }
    if (s.startsWith('errored')) throw new Error('GitHub Pages build failed');
    execSync('node -e "setTimeout(()=>{},5000)"');
  }
} catch (e) {
  console.log(e.message);
  if (!e.quiet) process.exitCode = 1;
} finally {
  try { sh(`git worktree remove --force "${W}"`); } catch { /* already gone */ }
}
