// اختبار سفاري الآيفون واللابتوب:  node tests/webkit.test.js [py|levels|wide|sweep|doors|layout]   (من المجلد الرئيسي، PORT افتراضي 8792)
//  layout البيت في النص، قفل الأهل، عناوين الأبواب على خط واحد، الاسم معزول في التحية، مسافة تحت آخر صف، ٤ مدن في ركن العائلة
//  doors  الأبواب الأربعة (البرمجة، الكمبيوتر، الإنجليزية، الرياضيات) تفتح أقسامها والرجوع يرجّع (آيفون 13 WebKit + كروميوم)
//  py     مختبر بايثون: كل مرحلة (y1–y12 مع y11b) تنحل بالضغط على أزرار المحرّر فقط، باتّباع التلميح 💡 حرفياً
//         + كتابة بدون تلميح (السطر الجديد تلقائياً بعد أمر كامل) + مكان المؤشر بعد ما الكتابة تفقد التركيز (مشكلة الآيفون)
//  levels كل مرحلة في كل مسار على آيفون 13 (WebKit): صورة لكل مرحلة، والبطاقات ما تقعدش تحت القائمة،
//         الرسالة ما تغطّيش سراج ولا الخطة، الشبح ما يقعدش فوق بطاقة، والحشرة على البطاقة الغلط
//  wide   اللابتوب (1280×720، 1366×768، 1440×900، 1920×1080) في كروميوم و WebKit: عرض كامل، شبكة، المسرح جنب البطاقات
//  sweep  كل الشاشات (البيت، لاعب جديد، الأقسام، الخريطة، المراحل، الصغار، الفوز، عالم الكمبيوتر بكل أنشطته، الموسوعة،
//         الملصقات، الشهادات، لوحة الأهل) على آيفون 13 و SE (وSE بشريطَي سفاري) وآيباد: ما فيش عنصر طالع برّه الشاشة بالعرض،
//         وزر التشغيل والبطاقات ظاهرة
const fs = require('fs');
const path = require('path');
const { webkit, chromium, devices } = require('playwright');
const { serve } = require('./stress-lib');

const PORT = +process.env.PORT || 8792;
const BASE = `http://localhost:${PORT}/index.html?test=1`;
const SHOTS = path.join(__dirname, 'shots', 'webkit');
const only = process.argv[2];
let bad = 0;
const errors = [];
const check = (ok, name, extra) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };
const IPHONE = devices['iPhone 13']; // 390×664: آيفون مع شريط سفاري تحت
const SE = devices['iPhone SE (3rd gen)']; // 375×667، و375×548 = نفس الجهاز وشريطَي سفاري ظاهرين
const DEVICES = { iphone13: IPHONE, iphoneSE: SE, iphoneSEsafari: Object.assign({}, SE, { viewport: { width: 375, height: 548 } }), ipad: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPad (gen 7)'].userAgent } };

async function page(browser, opts, tag) {
  const o = Object.assign({}, opts); delete o.defaultBrowserType;
  const ctx = await browser.newContext(o);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
  pg.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE|404|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
  await pg.goto(BASE); await pg.waitForTimeout(500);
  return pg;
}
const shot = (pg, dir, name) => { fs.mkdirSync(path.join(SHOTS, dir), { recursive: true }); return pg.screenshot({ path: path.join(SHOTS, dir, name + '.png') }); };

/* ---------- مختبر بايثون بالأزرار ---------- */
// خطة ضغطات تكتب السطر المطلوب من أزرار المحرّر (أطول زر يطابق أولاً؛ | = مكان المؤشر داخل الزر)
const sp = l => l.replace(/\s+/g, ' ').replace(/ ?([()=+,:<>-]) ?/g, '$1');
function plan(target, keys) {
  const T = sp(target).trim(), out = [];
  let pre = '', post = '';
  for (let g = 0; g < 80 && pre.length + post.length < T.length; g++) {
    const mid = T.slice(pre.length, T.length - post.length);
    let best = null;
    for (const k of keys) {
      if (['⏎', '⇥', '⌫'].includes(k)) continue;
      let [kp, ks = ''] = k.split('|').map(sp);
      if (/^".*"$/.test(k) && pre.endsWith('"') && post.startsWith('"')) { kp = k.slice(1, -1); ks = ''; }
      if (!kp && !ks) continue;
      if (!mid.startsWith(kp) || (ks && !mid.slice(kp.length).endsWith(ks)) || kp.length + ks.length > mid.length) continue;
      const score = kp.length + ks.length;
      if (!best || score > best.score) best = { k, kp, ks, score };
    }
    if (!best) return null;
    out.push(best.k); pre += best.kp; post = best.ks + post;
  }
  return out;
}
const keySel = k => `.key[data-k="${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;

async function pyTest(browser, name, opts) {
  const pg = await page(browser, opts, name);
  const tap = sel => (opts.hasTouch ? pg.tap(sel) : pg.click(sel));
  // كل مراحل الكتابة: المختبر + مسارات شاشة الناتج (io, errs, proj)؛ أجوبة input() من inputs المرحلة (وضع الاختبار)
  const levels = await pg.evaluate(() => SirajTest.TRACKS.filter(t => t.kind === 'py').flatMap(t => t.levels.map(l => [t.id, l.id])));
  for (const [tid, id] of levels) {
    await pg.evaluate(([t, i]) => SirajTest.open(t, i), [tid, id]);
    await pg.waitForTimeout(450);
    // بطاقة الفكرة (أول مرحلة في المسار) تغطي الشاشة: نضغط "هيا نجرب" مثل الطفل
    for (let k = 0; k < 3; k++) {
      const card = await pg.evaluate(() => !!document.querySelector('[data-act="idea-ok"]'));
      if (!card) break;
      await pg.waitForTimeout(400); // قفل النافذة (S.lock) ٣٥٠ مللي بعد ظهورها
      await pg.evaluate(() => { const b = document.querySelector('[data-act="idea-ok"]'); if (b) b.click(); });
      await pg.waitForTimeout(250);
    }
    const keys = await pg.$$eval('.key', bs => bs.map(b => b.dataset.k));
    let ok = true, steps = 0, why = '';
    for (; steps < 30; steps++) {
      await pg.waitForTimeout(380);
      await tap('#hintBtn'); await pg.waitForTimeout(150);
      const h = await pg.evaluate(() => { const e = document.querySelector('#pyErr'); return e.hidden ? null : { code: (e.querySelector('code') || {}).textContent || '', text: e.textContent }; });
      if (!h) break; // التلميح ما لقاش فرق: البرنامج زي الحل
      if (/زائد/.test(h.text)) { await tap(keySel('⌫')); continue; }
      const p = plan(h.code, keys);
      if (!p) { ok = false; why = 'no keys for: ' + h.code; break; }
      for (const k of p) { await tap(keySel(k)); await pg.waitForTimeout(40); }
      const got = await pg.evaluate(() => { const ta = document.querySelector('#code'), v = ta.value, s = SirajTest.S.ed.sel().s; const a = v.lastIndexOf('\n', s - 1) + 1; let b = v.indexOf('\n', s); if (b < 0) b = v.length; return v.slice(a, b); });
      if (sp(got).trim() !== sp(h.code).trim()) { ok = false; why = `line "${got}" ≠ "${h.code}"`; break; }
    }
    await pg.waitForTimeout(380);
    await tap('#run');
    const r = await pg.waitForFunction(() => SirajTest.S.lastResult, null, { timeout: 15000 }).then(x => x.jsonValue()).catch(() => null);
    const code = await pg.evaluate(() => SirajTest.S.ed ? SirajTest.S.ed.get() : '');
    check(ok && r && r.won && r.stars === 3, `${name} ${tid} ${id} solved by hint + key taps only (${steps} hints)`, ok ? JSON.stringify(r) : why);
    if (!(r && r.won)) console.log(code);
    await pg.evaluate(() => { SirajTest.S.lastResult = null; document.querySelector('#modal').innerHTML = ''; });
  }
  // بدون تلميح: الأزرار بالترتيب تكتب الحل بالضبط (سطر جديد تلقائياً بعد كل أمر كامل)
  for (const [id, taps, want] of [
    ['y2', ['wave()', 'say("|")', 'مرحبا', 'jump()'], 'wave()\nsay("مرحبا")\njump()'],
    ['y4', ['for i in range(|):', '4', 'forward(|)', '2', 'right(90)'], 'for i in range(4):\n    forward(2)\n    right(90)'],
    ['y8', ['count', ' = ', '0', 'for i in range(|):', '5', 'count', ' = ', 'count', ' + ', '1', 'say(|)', 'count'], 'count = 0\nfor i in range(5):\n    count = count + 1\n    say(count)'],
    ['y12', ['for i in range(|):', '5', 'if |:', 'i', ' < ', '3', 'light("|")', '"green"', 'else:', 'light("|")', '"red"'], 'for i in range(5):\n    if i < 3:\n        light("green")\n    else:\n        light("red")'],
  ]) {
    await pg.evaluate(i => { SirajTest.open('pylab', i); SirajTest.S.drafts = {}; SirajTest.setCode(''); }, id);
    await pg.waitForTimeout(400);
    for (const k of taps) { await tap(keySel(k)); await pg.waitForTimeout(30); }
    const code = await pg.evaluate(() => SirajTest.S.ed.get());
    check(code === want, `${name} pylab ${id} key taps without hints → exact program`, code === want ? '' : JSON.stringify(code));
  }
  // الآيفون: الكتابة تفقد التركيز لما الطفل يضغط زر، والمتصفح يرجّع التحديد للصفر. الزر لازم يكتب في مكان المؤشر الحقيقي
  {
    await pg.evaluate(() => { SirajTest.open('pylab', 'y2'); SirajTest.S.drafts = {}; SirajTest.setCode('wave()\nsay("")'); });
    await pg.waitForTimeout(400);
    await tap('#code');
    await pg.evaluate(() => { const ta = document.querySelector('#code'); ta.focus(); ta.setSelectionRange(12, 12); document.dispatchEvent(new Event('selectionchange')); });
    await pg.waitForTimeout(50);
    await pg.evaluate(() => { const ta = document.querySelector('#code'); ta.blur(); ta.setSelectionRange(0, 0); }); // مثل سفاري بعد فقد التركيز
    await tap(keySel('مرحبا')); await pg.waitForTimeout(40);
    await tap(keySel('jump()')); await pg.waitForTimeout(40);
    const code = await pg.evaluate(() => SirajTest.S.ed.get());
    check(code === 'wave()\nsay("مرحبا")\njump()', `${name} caret kept after blur (iOS) → insert at real caret`, JSON.stringify(code));
    const st = await pg.evaluate(() => { const c = getComputedStyle(document.querySelector('#code')); return c.direction + ' ' + c.unicodeBidi; });
    check(/^ltr (isolate|plaintext)/.test(st), `${name} code editor is LTR + isolated bidi`, st);
    await shot(pg, 'py', name + '-y2-arabic');
  }
  // شاشة الناتج: input() تفتح صندوق سؤال حقيقي، الطفل يكتب الجواب ويضغط ↵، والناتج يظهر ويفوز
  {
    await pg.evaluate(() => { window.__autoInput = false; SirajTest.open('io', 'io4'); SirajTest.S.drafts = {}; SirajTest.loadSolution(); SirajTest.S.lastResult = null; });
    await pg.waitForTimeout(300);
    await tap('#run');
    const asked = await pg.waitForSelector('#conAsk:not([hidden])', { timeout: 5000 }).then(() => true).catch(() => false);
    check(asked, `${name} console input() opens the Arabic prompt box`);
    if (asked) { await pg.fill('#conIn', 'عمر'); await pg.press('#conIn', 'Enter'); }
    const r = await pg.waitForFunction(() => SirajTest.S.lastResult, null, { timeout: 8000 }).then(x => x.jsonValue()).catch(() => null);
    const out = await pg.$$eval('.con-l', ls => ls.map(l => l.textContent));
    check(r && r.won && out.includes('مرحبا عمر') && out.some(l => /^ما اسمك؟عمر$/.test(l)), `${name} console prints greeting with typed name`, JSON.stringify({ r, out }));
    await shot(pg, 'py', name + '-console-io4');
    // خطأ حقيقي بالأحمر في الشاشة (SyntaxError + رقم السطر) قبل الإصلاح
    await pg.evaluate(() => { window.__autoInput = true; SirajTest.open('errs', 'e3'); SirajTest.S.drafts = {}; SirajTest.S.lastResult = null; document.querySelector('#modal').innerHTML = ''; });
    await pg.waitForTimeout(300);
    await tap('#run');
    await pg.waitForFunction(() => SirajTest.S.lastResult, null, { timeout: 8000 }).catch(() => null);
    const errs = await pg.$$eval('.con-l.err', ls => ls.map(l => l.textContent).join('\n'));
    check(/line 2/.test(errs) && /NameError: name 'nmae' is not defined/.test(errs), `${name} console shows a real Python NameError with the line number`, JSON.stringify(errs));
    await shot(pg, 'py', name + '-console-e3');
    await pg.evaluate(() => { SirajTest.S.lastResult = null; document.querySelector('#modal').innerHTML = ''; });
  }
  await pg.context().close();
}

/* ---------- كل المراحل على آيفون 13 ---------- */
async function levelsTest(browser) {
  const pg = await page(browser, IPHONE, 'iphone13');
  const list = await pg.evaluate(() => SirajTest.TRACKS.flatMap(t => t.levels.map(l => [t.id, l.id, l.kind || '', !!l.preset, !!l.tip])));
  const geo = () => pg.evaluate(() => {
    const R = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const inter = (a, c) => Math.max(0, Math.min(a.r, c.r) - Math.max(a.l, c.l)) * Math.max(0, Math.min(a.b, c.b) - Math.max(a.t, c.t));
    const ws = document.querySelector('#ws'), fly = document.querySelector('.blocklyFlyout'), S = SirajTest.S;
    const out = { problems: [] };
    if (ws && fly && S.ws) {
      const wr = R(ws), fr = R(fly.querySelector('.blocklyFlyoutBackground') || fly);
      const view = { l: wr.l, t: wr.t, r: wr.r, b: fr.t };
      // البطاقات (من غير الشبح) جوّه المساحة الظاهرة فوق القائمة
      const blocks = S.ws.getAllBlocks(false).map(b => ({ b, r: R(b.getSvgRoot().querySelector('.blocklyPath')) }));
      // برنامج أطول من المساحة حتى بأصغر حجم (٦٠٪): مقبول إنه يتمرّر، بشرط إن البداية ظاهرة
      const atMin = S.ws.scale <= S.ws.__base * 0.6 + 0.01;
      blocks.forEach(({ b, r }) => {
        if (atMin && b.type !== 'siraj_start') return;
        if (r.t < view.t - 2 || r.b > view.b + 2 || r.l < view.l - 2 || r.r > view.r + 2) out.problems.push(`block ${b.type} outside view (${Math.round(r.t)}-${Math.round(r.b)} vs ${Math.round(view.t)}-${Math.round(view.b)})`);
      });
      out.scale = +S.ws.scale.toFixed(2);
      // الشبح ما يغطّيش بطاقة ثانية (إلا تلامس الوصلة)
      const g = S.ws.__ghost && S.ws.getBlockById(S.ws.__ghost);
      if (g) {
        const gr = R(g.getSvgRoot().querySelector('.blocklyPath'));
        blocks.forEach(({ b, r }) => { if (b !== g && !b.getDescendants(false).includes(g) && inter(gr, r) > 14 * gr.w) out.problems.push('ghost overlaps ' + b.type); });
        out.ghost = true;
      }
      const bug = document.querySelector('.siraj-bug');
      if (bug) out.bug = true;
    }
    const goal = document.querySelector('.goal'), toast = document.querySelector('#toast'), sj = document.querySelector('.siraj-holder, .lt-siraj, .vsiraj'), plan = document.querySelector('.plan');
    if (toast && getComputedStyle(toast).opacity > 0.5) {
      const tr = R(toast);
      if (sj && inter(tr, R(sj)) > 40) out.problems.push('toast covers Siraj');
      if (plan && plan.children.length && getComputedStyle(plan).opacity > 0.5 && inter(tr, R(plan)) > 40) out.problems.push('toast covers plan');
      if (goal && getComputedStyle(goal).opacity > 0.5 && inter(tr, R(goal)) > 40) out.problems.push('toast covers goal');
      if (tr.r > innerWidth + 1 || tr.l < -1) out.problems.push('toast off screen');
    }
    const run = document.querySelector('#run');
    if (run) { const r = R(run); if (r.b > innerHeight + 1 || r.t < 0) out.problems.push('run button clipped'); }
    if (document.documentElement.scrollWidth > innerWidth + 1) out.problems.push('page wider than screen');
    return out;
  });
  for (const [tid, lid, kind, preset, tip] of list) {
    await pg.evaluate(([t, l]) => SirajTest.open(t, l), [tid, lid]);
    await pg.waitForTimeout(450);
    await pg.evaluate(() => SirajTest.S.screen === 'level' && (document.querySelector('#modal').innerHTML = '')); // نافذة "ماذا سيحدث؟"
    let g = await geo();
    await shot(pg, 'iphone13', `${tid}-${lid}`);
    check(!g.problems.length, `iPhone13 ${tid}/${lid} layout`, g.problems.join('; '));
    if (tid === 'bugs') check(g.bug, `iPhone13 ${tid}/${lid} ladybug on the faulty card`);
    if (kind === 'py') continue;
    // التلميح: الشبح في مكانه + الرسالة مكان الهدف
    await pg.evaluate(() => { SirajTest.S.fails = 0; SirajTest.hint(); });
    await pg.waitForTimeout(500);
    g = await geo();
    await shot(pg, 'iphone13', `${tid}-${lid}-hint`);
    check(!g.problems.length, `iPhone13 ${tid}/${lid} hint (ghost${g.ghost ? ' shown' : ' -'})`, g.problems.join('; '));
    // الحل كامل: البرنامج كله ظاهر (يصغر لو لازم)
    await pg.evaluate(() => SirajTest.loadSolution());
    await pg.waitForTimeout(300);
    g = await geo();
    if (g.problems.length) await shot(pg, 'iphone13', `${tid}-${lid}-solution`);
    check(!g.problems.length, `iPhone13 ${tid}/${lid} full solution visible (scale ${g.scale})`, g.problems.join('; '));
  }
  // مسكة الحشرة: الحل → شبكة + الحشرة تطير، ونافذة الفوز
  {
    await pg.evaluate(() => SirajTest.open('bugs', 'b1')); await pg.waitForTimeout(400);
    await pg.evaluate(() => SirajTest.loadSolution());
    await pg.waitForTimeout(250);
    const scared = await pg.evaluate(() => { const b = document.querySelector('.siraj-bug'); return !!b && b.classList.contains('scared'); });
    check(scared, 'fixed program → ladybug is scared (waiting to be caught)');
    await pg.evaluate(() => { window.__speed = 1; gsap.globalTimeline.timeScale(1); window.__r = SirajTest.run(); });
    const mid = await pg.waitForFunction(() => !!document.querySelector('.bug-catch .bc-net'), null, { timeout: 10000, polling: 50 }).then(() => true).catch(() => false);
    await pg.waitForTimeout(250);
    await shot(pg, 'iphone13', 'bugs-b1-catch');
    const r = await pg.evaluate(async () => { const r = await window.__r; window.__speed = 12; gsap.globalTimeline.timeScale(12); return r; });
    check(mid && r && r.won && !(await pg.$('.siraj-bug')), 'win → net catches the ladybug, then win modal', JSON.stringify(r));
  }
  // الحشرة تمشي للبطاقة الغلط الجديدة لما الطفل يغيّر البرنامج
  {
    await pg.evaluate(() => SirajTest.open('bugs', 'b2')); await pg.waitForTimeout(300);
    const on = await pg.evaluate(() => { const b = document.querySelector('.siraj-bug'); const blk = b && SirajTest.S.ws.getAllBlocks(false).find(x => x.getSvgRoot() === b.parentNode); return blk ? blk.getFieldValue('C') + '@' + SirajTest.S.ws.getAllBlocks(false).filter(x => x.type === 'light_on').indexOf(blk) : null; });
    check(on === 'red@1', 'ladybug sits on the 2nd light (the bug)', on);
  }
  // البطاقة المنفصلة ما تبانش "مقفولة" وما تقعدش فوق بطاقة ثانية
  {
    await pg.evaluate(() => SirajTest.open('bugs', 'b1')); await pg.waitForTimeout(300);
    const r = await pg.evaluate(async () => {
      const ws = SirajTest.S.ws, b = ws.getAllBlocks(false).find(x => x.type === 'siraj_jump');
      const s = Blockly.Events.BlockDrag;
      b.unplug(false);
      const st = ws.getAllBlocks(false).find(x => x.type === 'siraj_start');
      b.moveTo(st.getRelativeToSurfaceXY()); // فوق start
      Blockly.Events.fire(new s(b, false, []));
      await new Promise(r => setTimeout(r, 200));
      const R = el => el.getBoundingClientRect();
      const a = R(b.getSvgRoot().querySelector('.blocklyPath')), c = R(st.getSvgRoot().querySelector('.blocklyPath'));
      const fill = getComputedStyle(b.getSvgRoot().querySelector('.blocklyPath')).fill;
      return { overlap: a.top < c.bottom && c.top < a.bottom && a.left < c.right && c.left < a.right, pattern: /url/.test(fill), loose: b.getSvgRoot().classList.contains('siraj-loose') };
    });
    await shot(pg, 'iphone13', 'bugs-b1-loose');
    check(!r.overlap && !r.pattern && r.loose, 'loose card: not hatched, moved off other cards', JSON.stringify(r));
  }
  // الضغط على الشبح يضيف البطاقة نفسها
  {
    await pg.evaluate(() => SirajTest.open('talk', 't2')); await pg.waitForTimeout(400);
    await pg.evaluate(() => SirajTest.hint()); await pg.waitForTimeout(400);
    const box = await pg.evaluate(() => { const g = document.querySelector('.siraj-ghost .blocklyPath').getBoundingClientRect(); return { x: g.left + g.width / 2, y: g.top + g.height / 2 }; });
    await pg.touchscreen.tap(box.x, box.y); await pg.waitForTimeout(400);
    const code = await pg.evaluate(() => Blocks.python(SirajTest.S.ws).lines.join('|'));
    check(code === 'wave()' && !(await pg.$('.siraj-ghost')), 'tap on ghost adds that card in place', code);
  }
  await pg.context().close();
}

/* ---------- اللابتوب ---------- */
async function wideTest(browser, bname) {
  for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080]]) {
    const tag = `${bname}-${w}x${h}`;
    const pg = await page(browser, { viewport: { width: w, height: h }, deviceScaleFactor: 1 }, tag);
    const look = async (name, extra) => {
      await pg.waitForTimeout(700);
      const r = await pg.evaluate(() => {
        const sc = document.querySelector('.screen, .cw');
        const scroll = [...document.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); return /auto|scroll/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 2 && e.clientWidth > 0; }).map(e => e.offsetWidth - e.clientWidth);
        return { full: sc ? Math.round(sc.getBoundingClientRect().width) : 0, iw: innerWidth, wide: document.documentElement.scrollWidth > innerWidth + 1, bars: Math.max(0, ...scroll) };
      });
      const p = [];
      if (r.full < r.iw - 2) p.push(`screen ${r.full}px of ${r.iw}`);
      if (r.wide) p.push('horizontal page scroll');
      if (r.bars > 10) p.push(`fat scrollbar ${r.bars}px`);
      if (extra) p.push(...(await pg.evaluate(extra)));
      await shot(pg, 'wide', `${tag}-${name}`);
      check(!p.length, `${tag} ${name}`, p.join('; '));
    };
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderHome(); }); await look('home');
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderSections(); }); await look('sections');
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderTracks(); });
    await look('tracks', () => { const t = [...document.querySelectorAll('.track')].map(e => e.getBoundingClientRect().top); return new Set(t.slice(0, 4).map(Math.round)).size === t.slice(0, 4).length ? ['tracks not in a grid'] : []; });
    const beside = () => { const s = document.querySelector('.stage-wrap').getBoundingClientRect(), e = document.querySelector('.editor').getBoundingClientRect(); return s.right <= e.left + 1 || e.right <= s.left + 1 ? [] : ['stage not beside editor']; };
    for (const [t, l] of [['talk', 't3'], ['draw', 'd4'], ['bugs', 'b4'], ['pylab', 'y4']]) { await pg.evaluate(([a, b]) => SirajTest.open(a, b), [t, l]); await look(`level-${t}`, beside); }
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.act('pc'); }); await look('cw');
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderSections(); Extras.openEncy(); }); await look('ency');
    await pg.context().close();
  }
}

/* ---------- كل الشاشات على آيفون 13 و SE وآيباد ---------- */
async function sweepTest(browser) {
  for (const [dname, dev] of Object.entries(DEVICES)) {
    const pg = await page(browser, dev, dname);
    const clipped = () => pg.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page wider than screen');
      // أزرار طالعة برّه الشاشة بالعرض (إلا اللي جوّه شريط بيتمرّر بالعرض)
      document.querySelectorAll('button, .key, .cw-key').forEach(b => {
        const r = b.getBoundingClientRect();
        if (!r.width || getComputedStyle(b).visibility === 'hidden') return;
        let p = b.parentElement, scroller = false;
        for (; p; p = p.parentElement) { const c = getComputedStyle(p); if (/auto|scroll|hidden/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 1) { scroller = true; break; } }
        if (!scroller && (r.left < -1 || r.right > innerWidth + 1)) out.push(`button off screen: ${(b.textContent || b.className).trim().slice(0, 20)}`);
      });
      // زر التشغيل، وقائمة البطاقات، وأزرار الصغار، والنافذة: جوّه الشاشة بالطول كمان
      const inY = (sel, name) => { const e = document.querySelector(sel); if (!e) return; const r = e.getBoundingClientRect(); if (r.height && (r.top < -1 || r.bottom > innerHeight + 1)) out.push(name + ' clipped vertically'); };
      inY('#run', 'run'); inY('.blocklyFlyout', 'flyout'); inY('.lpal', 'little palette'); inY('#modal .m-card', 'modal'); inY('.keys', 'python keys');
      return [...new Set(out)].slice(0, 5);
    });
    const look = async (name, ms) => { await pg.waitForTimeout(ms || 650); const p = await clipped(); await shot(pg, 'sweep-' + dname, name); check(!p.length, `${dname} ${name}`, p.join('; ')); };
    await pg.evaluate(() => SirajTest.screens.renderHome()); await look('home');
    await pg.evaluate(() => SirajTest.act('new')); await look('new-player');
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderSections(); }); await look('sections');
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.screens.renderTracks(); }); await look('tracks');
    for (const [t, l, a] of [['talk', 't3', 9], ['lights', 'l3', 9], ['draw', 'd4', 9], ['path', 'p2', 9], ['vars', 'v5', 9], ['funcs', 'f3', 9], ['bugs', 'b4', 9], ['pylab', 'y4', 9], ['talk', 't2', 3], ['path', 'p2', 3], ['lights', 'l3', 3], ['talk', 't2', 6]]) {
      await pg.evaluate(([x, y, z]) => SirajTest.open(x, y, z), [t, l, a]); await look(`level-${t}-${l}-age${a}`);
    }
    await pg.evaluate(async () => { SirajTest.open('talk', 't1'); SirajTest.loadSolution(); await SirajTest.run(); }); await look('win-modal', 900);
    await pg.evaluate(() => { document.querySelector('#modal').innerHTML = ''; SirajTest.open('talk', 't7'); }); await look('predict-modal', 900);
    await pg.evaluate(() => { document.querySelector('#modal').innerHTML = ''; SirajTest.player(9); SirajTest.screens.renderSections(); Extras.openEncy(); }); await look('ency');
    await pg.evaluate(() => Extras.openStickers()); await look('stickers');
    await pg.evaluate(() => Extras.openCerts()); await look('certs');
    await pg.evaluate(() => { Store.setPin('1111'); SirajTest.screens.renderHome(); Parents.open(); }); await look('parents-pin');
    await pg.fill('#pPin', '1111'); await pg.evaluate(() => document.querySelector('[data-p="pin-ok"]').click()); await look('parents-panel');
    await pg.evaluate(() => { document.querySelector('#modal').innerHTML = ''; SirajTest.player(9); SirajTest.act('pc'); }); await look('cw-home');
    const acts = await pg.evaluate(() => CW.sections.flatMap(s => s.activities.map(a => a.id)));
    for (const id of acts) { await pg.evaluate(i => { SirajTest.player(9); SirajTest.act('pc'); CW._s.open(i); }, id); await look('cw-' + id, 900); }
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.act('en'); }); await look('en-home');
    await pg.evaluate(() => { SirajTest.player(9); SirajTest.act('math'); }); await look('math-home');
    await pg.context().close();
  }
}

/* ---------- الأبواب الأربعة: كل باب يفتح قسمه، والرجوع يرجّع لاختيار القسم ---------- */
async function doorsTest(browser, tag, dev) {
  const pg = await page(browser, dev, tag);
  await pg.evaluate(() => { SirajTest.player(7); SirajTest.screens.renderSections(); });
  await pg.waitForTimeout(1100);
  await shot(pg, 'doors', `${tag}-sections`);
  const BACK = { code: ['tracks', '[data-act="sections"]'], pc: ['cw', '[data-cw="exit"]'], en: ['en', '[data-en="exit"]'], math: ['math', '[data-mt="exit"]'] };
  const acts = await pg.evaluate(() => [...document.querySelectorAll('.sections .door')].map(d => d.dataset.act));
  check(JSON.stringify(acts) === '["code","pc","en","math"]', `${tag} 4 doors in order`, JSON.stringify(acts));
  for (const act of Object.keys(BACK)) {
    const [scr, back] = BACK[act];
    await pg.waitForTimeout(600);
    await pg.click(`.door[data-act="${act}"]`);
    await pg.waitForTimeout(800);
    const r = await pg.evaluate(s => ({ screen: SirajTest.S.screen, back: !!document.querySelector(s), wide: document.documentElement.scrollWidth > innerWidth + 1 }), back);
    await shot(pg, 'doors', `${tag}-${act}`);
    check(r.screen === scr && r.back && !r.wide, `${tag} door ${act} opens its section`, JSON.stringify(r));
    await pg.click(back);
    await pg.waitForTimeout(700);
    const b = await pg.evaluate(() => ({ screen: SirajTest.S.screen, doors: document.querySelectorAll('.sections .door').length }));
    check(b.screen === 'sections' && b.doors === 4, `${tag} back from ${act} → sections`, JSON.stringify(b));
  }
  await pg.context().close();
}

/* ---------- ترتيب البيت والأبواب (مشاكل لقيناها على الآيفون واللابتوب) ---------- */
//  - "لاعب جديد" لوحده (وأي عدد بلاطات) في النص تحت العنوان، وقفل الأهل ما يقعدش فوق بلاطة
//  - الأبواب ٢×٢: العناوين على خط واحد في كل صف
//  - "أهلاً <الاسم>!": الاسم معزول (<bdi>) عشان الأرقام والإنجليزي ما يلخبطوش الترتيب
//  - آخر صف في اختيار القسم بعيد عن حافة الشاشة (مسافة + شريط الآيفون)
//  - ركن العائلة: مدينة لكل قسم من الأربعة
async function layoutTest(browser, tag, dev) {
  const pg = await page(browser, dev, tag);
  const home = async n => {
    await pg.evaluate(k => { localStorage.clear(); Store.load(); Store.settings.voice = false; for (let i = 0; i < k; i++) Store.addPlayer({ name: 'ل' + i, age: 7, gender: 'b', color: '#3d8bff' }); SirajTest.screens.renderHome(); }, n);
    await pg.waitForTimeout(800);
    return pg.evaluate(() => {
      const tiles = [...document.querySelectorAll('.players .player')].map(b => b.getBoundingClientRect());
      const L = Math.min(...tiles.map(r => r.left)), R = Math.max(...tiles.map(r => r.right)), mid = innerWidth / 2;
      const c = document.querySelector('.corner').getBoundingClientRect();
      const hit = tiles.some(r => Math.min(r.right, c.right) - Math.max(r.left, c.left) > 2 && Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top) > 2);
      return { off: Math.round(Math.abs((L + R) / 2 - mid)), hit };
    });
  };
  for (const n of [0, 1, 4]) {
    const r = await home(n);
    check(r.off <= 2 && !r.hit, `${tag} home with ${n} player(s): tiles centered, lock not over a tile`, JSON.stringify(r));
  }
  await shot(pg, 'layout', `${tag}-home`);
  await pg.evaluate(() => { const p = SirajTest.player(9); p.name = 'Sara 2'; SirajTest.screens.renderSections(); });
  await pg.waitForTimeout(1100);
  const s = await pg.evaluate(() => {
    const t = document.querySelector('.bar .t'), d = [...document.querySelectorAll('.sections .door')].map(x => [x.getBoundingClientRect(), x.querySelector('h3').getBoundingClientRect()]);
    const rows = {}; d.forEach(([r, h]) => { (rows[Math.round(r.top)] = rows[Math.round(r.top)] || []).push(Math.round(h.top)); });
    const sc = document.querySelector('.sections'), last = sc.lastElementChild.getBoundingClientRect();
    sc.scrollTop = 1e6;
    const gap = Math.round(sc.getBoundingClientRect().bottom - sc.lastElementChild.getBoundingClientRect().bottom);
    return { bdi: t.querySelector('bdi') ? t.querySelector('bdi').textContent : null, rows: Object.values(rows), gap, lastBottom: Math.round(last.bottom) };
  });
  check(s.bdi === 'Sara 2', `${tag} greeting isolates the name`, String(s.bdi));
  check(s.rows.every(r => Math.max(...r) - Math.min(...r) <= 1), `${tag} door titles line up in each row`, JSON.stringify(s.rows));
  check(s.gap >= 24, `${tag} room under the last row on the sections screen`, String(s.gap));
  await shot(pg, 'layout', `${tag}-sections`);
  await pg.evaluate(() => { Store.data.family = true; SirajTest.player(9); Extras.openFamily(); });
  await pg.waitForTimeout(800);
  const f = await pg.evaluate(() => [...document.querySelector('.x-kid').querySelectorAll('.x-cty')].map(e => e.dataset.k).join(''));
  check(f === 'TCEM', `${tag} family corner: a lamp city for each of the 4 sections`, f);
  await shot(pg, 'layout', `${tag}-family`);
  await pg.context().close();
}

(async () => {
  const server = await serve(PORT);
  const wk = await webkit.launch();
  try {
    if (!only || only === 'py') {
      await pyTest(wk, 'webkit-iphone13', IPHONE);
      const ch = await chromium.launch();
      await pyTest(ch, 'chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
      await ch.close();
    }
    if (!only || only === 'levels') await levelsTest(wk);
    if (!only || only === 'wide') {
      await wideTest(wk, 'webkit');
      const ch = await chromium.launch(); await wideTest(ch, 'chromium'); await ch.close();
    }
    if (!only || only === 'sweep') await sweepTest(wk);
    if (!only || only === 'doors') {
      await doorsTest(wk, 'webkit-iphone13', IPHONE);
      const ch = await chromium.launch(); await doorsTest(ch, 'chromium-390', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); await ch.close();
    }
    if (!only || only === 'layout') {
      await layoutTest(wk, 'webkit-iphone13', IPHONE);
      await layoutTest(wk, 'webkit-iphoneSE', SE);
      const ch = await chromium.launch();
      for (const [w, h] of [[390, 844], [768, 1024], [1024, 768], [1366, 768]]) await layoutTest(ch, `chromium-${w}x${h}`, { viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      await ch.close();
    }
  } finally {
    await wk.close();
    server.close();
  }
  if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();
