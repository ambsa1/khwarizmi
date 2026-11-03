// اختبار قسم الرياضيات:  node tests/math.test.js [texts|shots|play|behave]   (من المجلد الرئيسي أو مجلد الاختبارات)
//  1) النصوص: البادئة m_، لا حروف لاتينية، ≤ ٨ كلمات، تشكيل، لكل _f أصل، ولكل مفتاح في الكود نص، والأرقام ٠–١٠٠ كلها تُنطق
//  2) الصور: كل نشاط بخمسة مقاسات (٣ و ٩ سنوات + جولة التحدّي) في tests/shots/math/، ويفحص: داخل الشاشة، بدون تداخل، أهداف ≥ ٤٤، نص غير مقصوص
//  3) اللعب حتى الفوز لكل نشاط بأعمار ٣ و ٦ و ٩ في Chromium و WebKit (iPhone 13) مع حفظ النجوم math:<id>
//  4) السلوك: الضغطتان، الانتظار حتى نهاية الصوت، destroy()، الرجوع، سحب حقيقي، ضغط حقيقي على البيتزا، صوت البنات
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots', 'math');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const PORT = 8797, URL0 = `http://localhost:${PORT}/tests/math.html`;

const VIEWPORTS = [[360, 640], [390, 844], [375, 667], [768, 1024], [1366, 768]];
const AGES = [3, 6, 9];
const only = process.argv[2];
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };

/* ---------- ١ النصوص ---------- */
function checkTexts() {
  const T = require('../js/math/texts.js');
  const NUMS = require('../js/texts.js').NUMS;
  const DIAC = /[ً-ْ]/;
  for (const [k, v] of Object.entries(T)) {
    if (!k.startsWith('m_')) fail(`key without m_ prefix: ${k}`);
    if (typeof v !== 'string' || !v.trim()) fail(`empty text: ${k}`);
    if (/[A-Za-z]/.test(v)) fail(`Latin letters in Arabic voice line ${k}: ${v}`);
    const words = v.replace(/[^؀-ۿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length > 8) fail(`more than 8 words ${k} (${words.length}): ${v}`);
    // كل كلمة فيها تشكيل (الكلمات القصيرة جداً مثل "لا" مسموحة)
    words.forEach(w => { if (w.length > 2 && !DIAC.test(w) && !['ماذا', 'هذا'].includes(w)) fail(`word without diacritics in ${k}: ${w}`); }); // ماذا/هذا: نطقها ثابت
    if (k.endsWith('_f') && !T[k.slice(0, -2)]) fail(`girl line without base: ${k}`);
  }
  // كل مفتاح ثابت في الكود له نص
  const dir = path.join(ROOT, 'js', 'math');
  for (const f of fs.readdirSync(dir)) {
    if (f === 'texts.js') continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/'(m_[a-z0-9_]+)'(\s*\+)?/g)) {
      const k = m[1];
      if (/_$/.test(k) || m[2]) continue; // بادئة لمفتاح يُبنى بالكود
      if (!T[k]) fail(`${f}: voice key without text: ${k}`);
    }
  }
  // المفاتيح المبنية بالكود: الأشكال، الساعات، والأرقام حتى ١٠٠
  for (const s of ['circle', 'square', 'triangle', 'rect', 'star', 'heart', 'diamond']) for (const p of ['m_sh_', 'm_shq_']) if (!T[p + s]) fail('missing ' + p + s);
  for (let h = 1; h <= 12; h++) if (!T['m_h_' + h]) fail('missing m_h_' + h);
  for (let d = 1; d <= 7; d++) if (!T['m_d_' + d]) fail('missing m_d_' + d);
  for (let m = 1; m <= 12; m++) if (!T['m_mo_' + m]) fail('missing m_mo_' + m);
  for (const s of ['circle', 'square', 'triangle', 'star', 'heart']) if (!T['m_sh_' + s]) fail('missing m_sh_' + s + ' (sudoku)');
  global.window = { SIRAJ_TEXTS: { NUMS }, MATH_TEXTS: T, gsap: undefined };
  global.window.window = global.window;
  const numKeys = n => (n <= 20 ? ['n_' + n] : n >= 100 ? ['m_t_100'] : n % 10 ? ['n_' + (n % 10), 'm_wt_' + (n - n % 10)] : ['m_t_' + n]);
  for (let n = 0; n <= 100; n++) for (const k of numKeys(n)) if (!(k.startsWith('n_') ? NUMS[+k.slice(2)] : T[k])) fail(`number ${n}: missing ${k}`);
  console.log(`texts: ${Object.keys(T).length} lines checked`);
}

/* ---------- فحص الشاشة: داخلها، بدون تداخل، أهداف كبيرة، نص غير مقصوص ---------- */
function layoutProblems() {
  const out = [], W = innerWidth, H = innerHeight;
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && !el.closest('.used'); };
  const desc = el => (el.className && el.className.baseVal == null ? String(el.className) : el.tagName).split(' ').slice(0, 2).join('.') + (el.textContent ? '"' + el.textContent.trim().slice(0, 8) + '"' : '');
  const R = r => `[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`;
  const inWin = !!document.querySelector('.mt-win');
  const btns = [...document.querySelectorAll('.mt button, .mt .tapc .mt-obj')].filter(vis).filter(b => !inWin || b.closest('.mt-win') || b.closest('.bar'));
  btns.forEach(b => {
    const sc = b.closest('.mt-scroll'); if (sc && sc.scrollHeight > sc.clientHeight + 2) return;
    const r = b.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push('offscreen ' + desc(b) + R(r));
    const st = b.closest('.mt-stage');
    if (st) { const s = st.getBoundingClientRect(); if (r.top < s.top - 1 || r.bottom > s.bottom + 1 || r.left < s.left - 1 || r.right > s.right + 1) out.push('clipped by stage ' + desc(b) + R(r)); }
    if (r.width < 43.5 || r.height < 43.5) out.push(`small target ${desc(b)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  if (!inWin) {
    const SEL = 'button, .mt-dots, .mt-tag, .mt-eq, .mt-rep, .mt-ladder, .mt-timer, .mt-train-wrap, .mt-nl, .mt-digital, .mt-pz-goal, .mt-pz-box, .mt-item-card, .mt-tray, .mt-patrow, .mt-sj, .mt-clockbox, .mt-objs, .mt-plates, .mt-arr, .mt-ruler, .mt-oneshape, .mt-track, .mt-scale, .mt-addrow, .mt-wire-box, .mt-nl-ctl, .mt-pool .mt-item';
    const blocks = [...document.querySelectorAll('.mt-stage :is(' + SEL + ')')].filter(vis).filter(e => !e.closest('.mt-dragging'));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.contains(b) || b.contains(a)) continue;
      const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
      const ox = Math.min(p.right, q.right) - Math.max(p.left, q.left), oy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (ox > 3 && oy > 3) out.push(`overlap ${desc(a)}${R(p)} × ${desc(b)}${R(q)}`);
    }
  }
  // نص يخرج من زرّه أو صندوقه
  document.querySelectorAll('.mt button b, .mt button small, .mt-bub-t, .mt .t, .mt-wcard h2, .mt-tag, .mt-sum, .mt-eq b, .mt-digital, .mt-car b, .mt-tick b').forEach(t => {
    if (!vis(t) || t.matches('.mt-hop small')) return; // عدّاد القفزات شارة فوق الزر عمداً
    if (t.scrollHeight > t.clientHeight + 2 && getComputedStyle(t).overflow !== 'visible') out.push('clipped text ' + desc(t));
    const host = t.closest('button, .mt-eq b, .mt-car, .mt-tray');
    if (host && host !== t) { const r = t.getBoundingClientRect(), h = host.getBoundingClientRect(); if (r.left < h.left - 2 || r.right > h.right + 2 || r.top < h.top - 2 || r.bottom > h.bottom + 2) out.push('text outside box ' + desc(t)); }
  });
  if (document.documentElement.scrollWidth > W + 1) out.push('horizontal scroll ' + document.documentElement.scrollWidth);
  return [...new Set(out)];
}

(async () => {
  if (!only || only === 'texts') checkTexts();
  if (only === 'texts') { console.log(bad ? `\n${bad} problem(s)` : '\nALL OK'); process.exit(bad ? 1 : 0); }

  await new Promise(r => server.listen(PORT, r));
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const browsers = {};
  const get = async name => (browsers[name] = browsers[name] || await (name === 'webkit' ? webkit : chromium).launch());
  const open = async (bname, ctxOpts, q, tag) => {
    const b = await get(bname);
    const c = await b.newContext(ctxOpts);
    const pg = await c.newPage();
    pg.on('pageerror', e => errors.push(`${bname} ${tag}: ${e.message}`));
    pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404|Failed to load resource/.test(m.text())) errors.push(`${bname} ${tag}: ${m.text()}`); });
    await pg.goto(`${URL0}?${q}`);
    await pg.waitForTimeout(400);
    return pg;
  };
  const acts = pg => pg.evaluate(() => MATH.sections.flatMap(s => s.activities.map(a => [s.id, a.id])));
  // كل نشاط متوقَّع موجود في MATH.sections (المصدر الوحيد لقائمة الأنشطة)
  const EXPECTED = ['count', 'tapnum', 'more', 'order', 'evenodd', 'compare', 'shapes', 'pattern', 'sort', 'addobj', 'subobj', 'numline', 'addnum', 'story', 'twostep',
    'groups', 'tables', 'share', 'factor', 'longer', 'heavy', 'clock', 'week', 'pizza', 'shop', 'fraccmp', 'change', 'rocket', 'sudoku', 'rule', 'balance'];
  const checkActs = async pg => {
    const ids = (await acts(pg)).map(x => x[1]);
    EXPECTED.forEach(id => { if (!ids.includes(id)) fail(`activity missing from MATH.sections: ${id}`); });
    if (new Set(ids).size !== ids.length) fail('duplicate activity ids: ' + ids.join(','));
  };
  const shot = (pg, name) => pg.screenshot({ path: path.join(SHOTS, name + '.png') });
  // يحل الجولات حتى يصل لجولة التحدّي الأخيرة
  const toChallenge = pg => pg.evaluate(async () => {
    const inst = MATH._act.inst;
    if (inst.pick) inst.pick();
    await new Promise(r => setTimeout(r, 300));
    const G = () => inst.G || inst;
    if (!G() || G().r == null) return false;
    const N = G().el.querySelectorAll('.mt-dots i').length;
    const t0 = performance.now();
    while (G().r < N - 1 && performance.now() - t0 < 30000) { if (G().ready() && G().R && G().R.solver) G().R.solver(); await new Promise(r => setTimeout(r, 120)); }
    await new Promise(r => setTimeout(r, 300));
    return G().r === N - 1;
  });

  /* ---------- ٢ الصور بكل المقاسات ---------- */
  if (!only || only === 'shots') {
    await Promise.all(VIEWPORTS.map(async ([w, h]) => {
      const tag = `${w}x${h}`;
      for (const age of [3, 9]) {
        const pg = await open('chromium', { viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 900 }, `age=${age}&fast=3${age === 3 ? '&g=g' : ''}`, tag);
        await pg.waitForTimeout(500);
        await shot(pg, `${tag}-a${age}-home`);
        let c = await pg.evaluate(layoutProblems); if (c.length) fail(`${tag} a${age} home: ${c.join(' | ')}`);
        if (age === 9) {
          await pg.click('.mt-sec >> nth=2'); await pg.waitForTimeout(500);
          await shot(pg, `${tag}-list`);
          c = await pg.evaluate(layoutProblems); if (c.length) fail(`${tag} list: ${c.join(' | ')}`);
        }
        for (const [sid, id] of await acts(pg)) {
          await pg.evaluate(i => MATH._s.open(i), id);
          await pg.waitForTimeout(700);
          if (id === 'tables') {
            await shot(pg, `${tag}-a${age}-tables-pick`);
            c = await pg.evaluate(layoutProblems); if (c.length) fail(`${tag} a${age} tables pick: ${c.join(' | ')}`);
            await pg.click('.mt-tbtn >> nth=1'); await pg.waitForTimeout(700);
          }
          await shot(pg, `${tag}-a${age}-${id}`);
          c = await pg.evaluate(layoutProblems); if (c.length) fail(`${tag} a${age} ${sid}/${id}: ${c.join(' | ')}`);
          if (await toChallenge(pg)) {
            await pg.waitForTimeout(900);
            await shot(pg, `${tag}-a${age}-${id}-chal`);
            c = await pg.evaluate(layoutProblems); if (c.length) fail(`${tag} a${age} ${sid}/${id} challenge: ${c.join(' | ')}`);
          }
        }
        // شاشة الفوز
        if (age === 9) {
          await pg.evaluate(async () => { MATH._s.open('more'); await new Promise(r => setTimeout(r, 300)); MATH._act.inst.solve(); });
          await pg.waitForFunction(() => document.querySelector('.mt-win'), null, { timeout: 30000 }).catch(() => {});
          await pg.waitForTimeout(700);
          await shot(pg, `${tag}-win`);
          c = await pg.evaluate(layoutProblems); if (c.length) fail(`${tag} win: ${c.join(' | ')}`);
        }
        await pg.context().close();
      }
      console.log(`shots ${tag} done`);
    }));
  }

  /* ---------- ٣ اللعب حتى الفوز (Chromium + WebKit iPhone 13) ---------- */
  if (!only || only === 'play') {
    const engines = [['chromium', { viewport: { width: 390, height: 760 }, hasTouch: true }], ['webkit', devices['iPhone 13']]];
    for (const [bname, opts] of engines) {
      for (const age of AGES) {
        const pg = await open(bname, opts, `age=${age}&fast=5`, `play a${age}`);
        await checkActs(pg);
        let n = 0;
        for (const [sid, id] of await acts(pg)) {
          const r = await pg.evaluate(async i => {
            document.querySelectorAll('.mt-win').forEach(x => x.remove());
            const before = MATH._won || 0;
            MATH._s.open(i);
            await new Promise(r => setTimeout(r, 300));
            const inst = MATH._act.inst;
            if (!inst.solve) return { err: 'no solve()' };
            const t0 = performance.now();
            inst.solve();
            while ((MATH._won || 0) === before && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 100));
            return { won: (MATH._won || 0) > before, ms: Math.round(performance.now() - t0), saved: Object.assign({}, window.__saved) };
          }, id);
          if (!(r.won && r.saved && r.saved['math:' + id] > 0)) fail(`${bname} a${age} play ${sid}/${id}: ${JSON.stringify(r).slice(0, 200)}`); else n++;
          if (bname === 'webkit' && age === 6) {
            await pg.evaluate(i => { document.querySelectorAll('.mt-win').forEach(x => x.remove()); MATH._s.open(i); }, id);
            await pg.waitForTimeout(500);
            await shot(pg, `iphone13-a6-${id}`);
            const c = await pg.evaluate(layoutProblems); if (c.length) fail(`webkit iphone13 a6 ${id}: ${c.join(' | ')}`);
          }
        }
        const extra = await pg.evaluate(() => ({ miss: [...new Set(window.__missing)], keys: Object.keys(window.__saved).filter(k => !k.startsWith('math:')) }));
        if (extra.miss.length) fail(`${bname} a${age} missing voice texts: ${extra.miss.join(', ')}`);
        if (extra.keys.length) fail(`${bname} a${age} saved keys without math: prefix: ${extra.keys.join(', ')}`);
        console.log(`ok   ${bname} age ${age}: ${n} activities won`);
        await pg.context().close();
      }
    }
  }

  /* ---------- ٤ السلوك ---------- */
  if (!only || only === 'behave') {
    const pg = await open('chromium', { viewport: { width: 390, height: 844 }, hasTouch: true }, 'age=6', 'behave');
    const G = () => pg.evaluate(() => { const g = MATH._act.inst; return { r: g.r, m: g.mistakes, ready: g.ready() }; });
    const waitReady = async () => { await pg.waitForFunction(() => MATH._act && MATH._act.inst.ready && MATH._act.inst.ready(), null, { timeout: 10000 }); };

    // الضغطتان: ضغط الإجابة الصحيحة مرتين بسرعة = جولة واحدة ونقاط مرة واحدة
    await pg.evaluate(() => MATH._s.open('tapnum')); await waitReady();
    await pg.evaluate(() => { const R = MATH._act.inst.R; const i = R.vals.findIndex(v => R.chk(v)); const b = document.querySelector(`.mt-ch[data-ci="${i}"]`); b.click(); b.click(); });
    await pg.waitForFunction(() => MATH._act.inst.r === 1, null, { timeout: 9000 }).catch(() => {});
    let g = await G();
    if (g.r !== 1 || g.m !== 0) fail(`double tap: round ${g.r}, mistakes ${g.m}`);
    // ضغطة خاطئة أول ٣٠٠ ملي ثانية من الجولة الجديدة تتجاهل
    await pg.evaluate(() => { const R = MATH._act.inst.R; const i = R.vals.findIndex(v => !R.chk(v)); document.querySelector(`.mt-ch[data-ci="${i}"]`).click(); });
    g = await G(); if (g.m !== 0) fail('tap right after round change was not ignored');
    // ضغط حقيقي بالماوس مرتين على الصحيح
    await waitReady();
    const ci = await pg.evaluate(() => { const R = MATH._act.inst.R; return R.vals.findIndex(v => R.chk(v)); });
    await pg.dblclick(`.mt-ch[data-ci="${ci}"]`);
    await pg.waitForTimeout(2500);
    g = await G(); if (g.r !== 2 || g.m !== 0) fail(`real double-click: round ${g.r}, mistakes ${g.m}`);

    // لا ننتقل قبل ما سراج يخلّص جملته
    await pg.evaluate(() => MATH._s.open('count')); await waitReady();
    await pg.evaluate(() => { window.__busy = 4; Voice.busy = () => window.__busy; MATH._act.inst.R.solver(); });
    await pg.waitForTimeout(2600);
    g = await G(); if (g.r !== 0) fail('advanced while voice was still speaking');
    await pg.evaluate(() => { window.__busy = 0; });
    await pg.waitForTimeout(700);
    g = await G(); if (g.r !== 1) fail('did not advance after voice ended: r=' + g.r);

    // destroy() ينظّف كل شيء: لا حركات ولا مؤقّتات تكتب في الصفحة بعده
    await pg.evaluate(() => { MATH._s.open('numline'); });
    await pg.waitForTimeout(600);
    await pg.evaluate(() => { MATH._act.inst.solve(); });
    await pg.waitForTimeout(500);
    const left = await pg.evaluate(async () => {
      MATH.destroy();
      await new Promise(r => setTimeout(r, 2500));
      const live = gsap.globalTimeline.getChildren(true, true, false).filter(t => t.isActive() && (t.targets() || []).some(x => x && x.nodeType === 1));
      return { html: document.getElementById('app').innerHTML.length, tweens: live.length, s: !!MATH._s };
    });
    if (left.html || left.tweens || left.s) fail('destroy left things behind: ' + JSON.stringify(left));
    // يرجع للعمل بعد destroy
    await pg.evaluate(() => MATH.render(document.getElementById('app'), ctx)); await pg.waitForTimeout(400);

    // الرجوع: من النشاط إلى القائمة إلى الأقسام إلى التطبيق
    await pg.evaluate(() => MATH._s.open('shapes')); await pg.waitForTimeout(500);
    await pg.click('[data-mt="back"]'); await pg.waitForTimeout(400);
    if (!(await pg.locator('.mt-act').count())) fail('back from activity did not show list');
    await pg.click('[data-mt="home"]'); await pg.waitForTimeout(400);
    await pg.click('[data-mt="exit"]'); await pg.waitForTimeout(200);
    if ((await pg.evaluate(() => window.__backs)) !== 1) fail('exit did not call ctx.back()');
    await pg.evaluate(() => MATH.render(document.getElementById('app'), ctx)); await pg.waitForTimeout(400);

    // سحب حقيقي: رتّب في الصناديق
    await pg.evaluate(() => MATH._s.open('sort')); await waitReady(); await pg.waitForTimeout(400);
    const tgt = await pg.evaluate(() => { const it = document.querySelector('.mt-item'); const R = MATH._act.inst.R; return null || it.dataset.i; });
    const from = await pg.locator(`.mt-item[data-i="${tgt}"]`).boundingBox();
    // الصندوق الصحيح نعرفه بتجربة الحل: نقرأ لون/شكل العنصر من الحل المحفوظ في الإغلاق → نجرّب كل الصناديق حتى ينجح
    let placed = false;
    const nb = await pg.locator('.mt-bin').count();
    for (let k = 0; k < nb && !placed; k++) {
      await waitReady();
      const f = await pg.locator(`.mt-item[data-i="${tgt}"]`).boundingBox();
      const to = await pg.locator(`.mt-bin >> nth=${k}`).boundingBox();
      await pg.mouse.move(f.x + f.width / 2, f.y + f.height / 2); await pg.mouse.down();
      await pg.mouse.move(f.x + 20, f.y + 30, { steps: 4 });
      await pg.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 }); await pg.mouse.up();
      await pg.waitForTimeout(700);
      placed = await pg.locator(`.mt-item[data-i="${tgt}"].used`).count() > 0;
    }
    if (!from || !placed) fail('real drag into bin did not place the item');

    // ضغط حقيقي على قطعة بيتزا
    await pg.evaluate(() => MATH._s.open('pizza')); await waitReady(); await pg.waitForTimeout(300);
    const pz = await pg.locator('.mt-pizza').boundingBox();
    await pg.mouse.click(pz.x + pz.width * 0.7, pz.y + pz.height * 0.3);
    await pg.waitForTimeout(300);
    if (!(await pg.locator('.mt-slice.eaten').count())) fail('tap on pizza slice did not eat it');

    // عدّ بالضغط يقول الرقم
    await pg.evaluate(() => { window.__said.length = 0; MATH._s.open('count'); }); await waitReady();
    await pg.click('.mt-obj >> nth=0'); await pg.waitForTimeout(150);
    if (!(await pg.evaluate(() => window.__said.includes('n_1')))) fail('tapping an object did not say n_1');

    // المسائل تُركّب من مقاطع: ٣ زائد ٢ يساوي كم؟
    await pg.evaluate(() => { window.__seqs.length = 0; MATH._s.open('addnum'); }); await waitReady();
    const seq = await pg.evaluate(() => window.__seqs.find(s => s.keys.includes('m_eq_q')));
    if (!seq || !seq.keys.some(k => /^(n_|m_t_|m_wt_)/.test(k)) || seq.pri !== 'instruction') fail('equation question not composed from number clips: ' + JSON.stringify(seq));
    await pg.context().close();

    // صوت البنات
    const pg2 = await open('chromium', { viewport: { width: 390, height: 844 } }, 'age=4&g=g', 'girl');
    await pg2.evaluate(() => MATH._s.open('count')); await pg2.waitForTimeout(800);
    const girlKeys = await pg2.evaluate(() => window.__said.filter(k => /_f$/.test(k)));
    if (!girlKeys.length) fail('girl player heard no _f lines');
    await pg2.context().close();
    console.log('behave done');
  }

  if (errors.length) { console.log('CONSOLE ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  for (const b of Object.values(browsers)) await b.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();
