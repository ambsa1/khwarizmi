// اختبار الضغط (R27):  node tests/monkey.test.js [monkey|races|roam]   (من المجلد الرئيسي)
//   MONKEY_MS = مدة الـ gremlins لكل شاشة (افتراضي 10000)، PORT (افتراضي 8795)، SEED
// ١) gremlins.js (ضغط، لمس، كتابة، تعبئة، تمرير) بسرعة عالية وبذرة ثابتة على كل شاشة رئيسية، بمقاسين،
//    ومعها ضغطات حقيقية من Playwright في نفس الوقت.
// ٢) سباقات مقصودة: ٣ ضغطات على كل زر، تشغيل ×١٠، رجوع ثم فتح مرحلة خلال ٥٠ms، فتح وقفل النوافذ بسرعة،
//    تدوير الشاشة أثناء الحركة، وإخفاء الصفحة وإظهارها أثناء التشغيل.
// يفشل عند: أي خطأ في الكونسول، أكثر من نافذة .m-back، أكثر من شاشة في #app، حالة الشاشة لا تطابق الصفحة،
// "شغّال" عالق، مساحات بلوكلي متسرّبة، حركات GSAP أو مؤقّتات متكررة تزيد بلا حد، أو مقطعَي صوت معاً.
const path = require('path');
const { chromium } = require('playwright');
const { serve, familyCode, newPage } = require('./stress-lib');

const PORT = +process.env.PORT || 8795;
const MS = +process.env.MONKEY_MS || 10000;
const SEED = +process.env.SEED || 20261103;
const only = process.argv[2];
const BASE = `http://localhost:${PORT}/index.html?test=1`;
const VIEWPORTS = [[360, 640, true], [1024, 768, false]];

let bad = 0;
const errors = [];
const fail = m => { bad++; console.log('FAIL ' + m); };
const ok = m => console.log('ok   ' + m);

// كل شاشة: دالة تفتحها داخل الصفحة
const SCREENS = [
  ['home', 'SirajTest.screens.renderHome()'],
  ['new', "SirajTest.act('new')"],
  ['sections', 'SirajTest.player(9); SirajTest.screens.renderSections()'],
  ['tracks', 'SirajTest.player(9); SirajTest.screens.renderTracks()'],
  ['level talk', "SirajTest.open('talk', 't3')"],
  ['level lights', "SirajTest.open('lights', 'l3')"],
  ['level draw', "SirajTest.open('draw', 'd4')"],
  ['level path', "SirajTest.open('path', 'p2')"],
  ['level vars', "SirajTest.open('vars', 'v5')"],
  ['level funcs', "SirajTest.open('funcs', 'f3')"],
  ['level bugs', "SirajTest.open('bugs', 'b4')"],
  ['level predict', "SirajTest.open('talk', 't7')"],
  ['level pylab', "SirajTest.open('pylab', 'y4')"],
  ['little path (3)', "SirajTest.open('path', 'p2', 3)"],
  ['little lights (3)', "SirajTest.open('lights', 'l3', 3)"],
  ['little talk (3)', "SirajTest.open('talk', 't3', 3)"],
  ['win modal', "SirajTest.open('talk', 't1'); SirajTest.loadSolution(); await SirajTest.run()"],
  ['parents gate', 'SirajTest.screens.renderHome(); Parents.open()'],
  ['parents panel', 'Parents.panel()'],
  ['encyclopedia', 'SirajTest.player(9); Extras.openEncy()'],
  ['stickers', 'SirajTest.player(9); Extras.openStickers()'],
  ['certificates', 'SirajTest.player(9); Extras.openCerts()'],
  ['family corner', 'SirajTest.player(9); Extras.openFamily()'],
  ['cw home', "SirajTest.player(9); SirajTest.act('pc')"],
  ...[0, 1, 2, 3, 4, 5].map(i => [`cw section ${i}`, `SirajTest.player(9); SirajTest.act('pc'); CW._s.sectionScreen(CW.sections[${i}])`]),
  ...['isit', 'build', 'balloons', 'feed', 'star', 'ty_rain', 'popup', 'password', 'binary', 'algo'].map(id => [`cw ${id}`, `SirajTest.player(9); SirajTest.act('pc'); CW._s.open('${id}')`]),
  ['cw typing lesson', "SirajTest.player(9); SirajTest.act('pc'); CW._s.open('type_ar'); CW._act.inst.lesson(0)"],
  ['cw little (4)', "SirajTest.player(4); SirajTest.act('pc'); CW._s.open('balloons')"],
];
// أزرار تنقل لشاشة أخرى (نستبعدها في جولة الشاشة الواحدة)، وأزرار تحفظ ملفات أو تفتح نافذة اختيار ملف
const NAV = '[data-act="home"],[data-act="sections"],[data-act="tracks"],[data-act="next"],[data-act="m-close"],[data-cw="exit"],[data-cw="back"],[data-cw="home"],[data-x="go-stickers"],[data-act="code"],[data-act="pc"],[data-act="pick"],[data-act="save-new"],[data-x="ency"],[data-x="stickers"],[data-x="certs"],[data-x="family"],[data-act="level"],[data-cw="sec"],[data-cw="act"],[data-cw="done"]';
const FILES = '[data-p="import"],[data-p="backup"],[data-p="share"],[data-p="export-one"],[data-x="cert-save"]';

async function open(pg, code) {
  // الصوت يرجع شغّال (القرود ممكن تكون قفلته من لوحة الأهل) عشان نقيس التداخل في كل شاشة
  await pg.evaluate(() => { Store.settings.voice = true; });
  await pg.evaluate(`(async () => { ${code}; })()`);
  await pg.evaluate(() => { App.S.lock = 0; });
  await pg.waitForTimeout(400);
}
async function boot(browser, w, h, touch, tag) {
  const pg = await newPage(browser, { w, h, touch, seed: SEED, errors, tag });
  await pg.goto(BASE);
  await pg.waitForTimeout(300);
  await pg.addScriptTag({ path: path.join(__dirname, 'vendor', 'gremlins.min.js') });
  // سرعة حقيقية وصوت حقيقي (وضع الاختبار يسرّع ويكتم)
  await pg.evaluate(async fam => { window.__speed = 1; gsap.globalTimeline.timeScale(1); Store.settings.voice = true; if (fam) await Store.enableFamily(fam); }, familyCode());
  return pg;
}

// gremlins داخل الصفحة + ضغطات حقيقية من Playwright معاً
async function monkey(pg, ms, seed, touch, noNav) {
  const inPage = pg.evaluate(async ([ms, seed, touch, noNav, NAV, FILES]) => {
    const g = window.gremlins, quiet = () => {};
    const can = el => !(el && el.closest && el.closest(noNav ? NAV + ',' + FILES : FILES));
    // typer خاص: gremlins.typer يرسل Event عادي بدل KeyboardEvent (جهاز حقيقي لا يفعل ذلك، وبلوكلي يحتاج getModifierState)
    const KEYS = ['KeyF', 'KeyJ', 'KeyD', 'KeyK', 'KeyA', 'Space', 'Enter', 'Backspace', 'Tab', 'Digit1', 'Digit0', 'KeyQ', 'ArrowLeft', 'Escape', 'Delete'];
    const typer = ({ randomizer: r }) => () => {
      const code = KEYS[r.natural({ max: KEYS.length - 1 })], key = code.replace(/^(Key|Digit)/, '').toLowerCase();
      const el = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
      ['keydown', 'keypress', 'keyup'].forEach(type => el.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })));
    };
    const species = [
      g.species.clicker({ clickTypes: ['click', 'click', 'click', 'click', 'dblclick', 'mousedown', 'mouseup'], canClick: can, showAction: quiet }),
      g.species.formFiller({ showAction: quiet }),
      typer,
      g.species.scroller({ showAction: quiet }),
    ];
    if (touch) species.push(g.species.toucher({ showAction: quiet }));
    const horde = g.createHorde({
      species, mogwais: [g.mogwais.alert()],
      strategies: [g.strategies.distribution({ delay: 12, nb: Math.round(ms / 12) })],
      randomizer: new g.Chance(seed), logger: { log: quiet, info: quiet, warn: quiet, error: quiet },
    });
    await horde.unleash();
  }, [ms, seed, touch, noNav, NAV, FILES]);
  // ضغطات حقيقية (pointer + mouse + click) في أماكن عشوائية ثابتة البذرة
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const vp = pg.viewportSize(), t0 = Date.now();
  const real = (async () => {
    while (Date.now() - t0 < ms) {
      const x = Math.floor(rnd() * vp.width), y = Math.floor(rnd() * vp.height);
      const okToTap = await pg.evaluate(([x, y, noNav, NAV, FILES]) => { const el = document.elementFromPoint(x, y); return !(el && el.closest(noNav ? NAV + ',' + FILES : FILES)); }, [x, y, noNav, NAV, FILES]).catch(() => false);
      if (okToTap) {
        if (touch && rnd() < 0.5) await pg.touchscreen.tap(x, y).catch(() => {});
        else await pg.mouse.click(x, y, { delay: Math.floor(rnd() * 30) }).catch(() => {});
      }
      await pg.waitForTimeout(10 + Math.floor(rnd() * 50));
    }
  })();
  await Promise.all([inPage, real]);
}

// بعد كل جولة: ننتظر انتهاء أي تشغيل، ثم نرجع للبيت ونقيس التسرّب
async function settle(pg, tag) {
  for (let i = 0; i < 60; i++) { if (!(await pg.evaluate(() => App.S.running))) break; await pg.waitForTimeout(500); }
  const st = await pg.evaluate(() => ({ running: App.S.running, inv: { modals: __inv.modals, roots: __inv.roots, overlap: __inv.overlap, overlapKeys: __inv.overlapKeys.slice(0, 3), stuck: __inv.stuck, desync: __inv.desync.slice() } }));
  if (st.running) fail(`${tag}: S.running stuck after 30 s`);
  if (st.inv.modals > 1) fail(`${tag}: ${st.inv.modals} modals at once`);
  if (st.inv.roots > 1) fail(`${tag}: ${st.inv.roots} screen roots at once`);
  if (st.inv.overlap) fail(`${tag}: audio overlap ×${st.inv.overlap} ${st.inv.overlapKeys.join(' | ')}`);
  if (st.inv.stuck) fail(`${tag}: running stuck`);
  if (st.inv.desync.length) fail(`${tag}: screen state desync ${st.inv.desync.join(' | ')}`);
  const acts = await pg.evaluate(() => { const r = { clicks: __inv.clicks, keys: __inv.keys, voice: Voice.log.filter(x => x.ev === 'start').length }; __inv.clicks = __inv.keys = 0; return r; });
  await pg.evaluate(() => { document.querySelectorAll('.cw-win').forEach(x => x.remove()); App.closeModal(); App.renderHome(); Object.assign(__inv, { modals: 0, roots: 0, overlap: 0, overlapKeys: [], stuck: 0, desync: [] }); Voice._reset(); });
  await pg.waitForTimeout(1500);
  return pg.evaluate(acts => ({ acts, tweens: gsap.globalTimeline.getChildren(true, true, false).length, ws: Blockly.common.getAllWorkspaces().length, inj: document.querySelectorAll('.injectionDiv').length, ivals: __inv.intervals(), modal: document.querySelectorAll('.m-back').length }), acts);
}

function checkLeak(tag, base, now) {
  if (now.ws || now.inj) fail(`${tag}: Blockly workspaces leaked (${now.ws} registered, ${now.inj} in DOM)`);
  if (now.tweens > base.tweens + 6) fail(`${tag}: GSAP tweens grew ${base.tweens} → ${now.tweens}`);
  if (now.ivals > base.ivals + 2) fail(`${tag}: intervals grew ${base.ivals} → ${now.ivals}`);
  if (now.modal) fail(`${tag}: modal left open after going home`);
}

(async () => {
  const server = await serve(PORT);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  /* ---------- ١ gremlins على كل شاشة ---------- */
  if (!only || only === 'monkey') {
    for (const [w, h, touch] of VIEWPORTS) {
      const tag0 = `${w}x${h}`;
      const pg = await boot(browser, w, h, touch, tag0);
      await pg.waitForTimeout(1200);
      const base = await pg.evaluate(() => ({ tweens: gsap.globalTimeline.getChildren(true, true, false).length, ivals: __inv.intervals() }));
      let n = 0;
      for (const [name, code] of SCREENS.filter(s => !process.env.MONKEY_ONLY || new RegExp(process.env.MONKEY_ONLY).test(s[0]))) {
        const tag = `${tag0} ${name}`, e0 = errors.length;
        pg.__tag = tag;
        await open(pg, code);
        await monkey(pg, MS, SEED + n++, touch, true);
        const now = await settle(pg, tag);
        checkLeak(tag, base, now);
        if (errors.length === e0) ok(`${tag} (${JSON.stringify(now)})`);
      }
      await pg.context().close();
    }
  }

  /* ---------- ٢ تجوال حر من البيت (كل الأزرار مسموحة) ---------- */
  if (!only || only === 'roam') {
    for (const [w, h, touch] of VIEWPORTS) {
      const tag = `${w}x${h} free roam`, e0 = errors.length;
      const pg = await boot(browser, w, h, touch, tag);
      await pg.evaluate(() => { SirajTest.player(7); SirajTest.player(3); App.renderHome(); });
      await pg.waitForTimeout(1200);
      const base = await pg.evaluate(() => ({ tweens: gsap.globalTimeline.getChildren(true, true, false).length, ivals: __inv.intervals() }));
      for (let k = 0; k < 3; k++) await monkey(pg, MS * 2, SEED + 100 + k, touch, false);
      const now = await settle(pg, tag);
      checkLeak(tag, base, now);
      if (errors.length === e0) ok(`${tag} (${JSON.stringify(now)})`);
      await pg.context().close();
    }
  }

  /* ---------- ٣ سباقات مقصودة ---------- */
  if (!only || only === 'races') {
    const [w, h, touch] = VIEWPORTS[0];
    const pg = await boot(browser, w, h, touch, 'races');
    await pg.waitForTimeout(800);
    const base = await pg.evaluate(() => ({ tweens: gsap.globalTimeline.getChildren(true, true, false).length, ivals: __inv.intervals() }));
    const tapAt = async (sel, n, gap) => {
      const box = await pg.evaluate(s => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel);
      if (!box) return false;
      for (let i = 0; i < n; i++) { await pg.mouse.click(box.x, box.y); if (gap) await pg.waitForTimeout(gap); }
      return true;
    };
    const race = async (tag, fn) => {
      const e0 = errors.length;
      pg.__tag = tag;
      try { await fn(); } catch (e) { fail(`${tag}: ${e.message.split('\n')[0]}`); }
      const now = await settle(pg, tag);
      checkLeak(tag, base, now);
      if (errors.length === e0) ok(tag);
    };

    // ٣ ضغطات سريعة على كل زر في كل شاشة
    for (const [name, code] of SCREENS.filter(s => /^(home|new|sections|tracks|level talk|level pylab|little path|win modal|parents panel|encyclopedia|stickers|certificates|cw home|cw section 3|cw isit|cw typing lesson)/.test(s[0]))) {
      await open(pg, code);
      const sels = await pg.evaluate(FILES => [...document.querySelectorAll('[data-act],[data-cw],[data-p],[data-x]')].filter(el => !el.closest(FILES) && el.getBoundingClientRect().width).slice(0, 30)
        .map(el => { const a = ['act', 'cw', 'p', 'x'].find(k => el.dataset[k] != null); const extra = ['i', 't', 'l', 'id', 'k', 'm', 'a', 'g', 'c'].filter(k => el.dataset[k] != null).map(k => `[data-${k}="${el.dataset[k]}"]`).join(''); return `[data-${a}="${el.dataset[a]}"]${extra}`; }), FILES);
      await race(`triple-tap ×${sels.length} on ${name}`, async () => {
        for (const sel of sels) {
          await open(pg, code);
          await tapAt(sel, 3, 0);
          await pg.waitForTimeout(150);
          const inv = await pg.evaluate(() => ({ m: document.querySelectorAll('.m-back').length, r: document.getElementById('app').children.length }));
          if (inv.m > 1 || inv.r > 1) fail(`triple-tap ${name} ${sel}: modals ${inv.m} roots ${inv.r}`);
          for (let i = 0; i < 40 && await pg.evaluate(() => App.S.running); i++) await pg.waitForTimeout(250);
        }
      });
    }

    await race('Run ×10 fast (solution)', async () => {
      await open(pg, "SirajTest.open('talk', 't3'); SirajTest.loadSolution()");
      for (let i = 0; i < 10; i++) { await pg.click('#run', { force: true, noWaitAfter: true, timeout: 500 }).catch(() => {}); }
      for (let i = 0; i < 60 && await pg.evaluate(() => App.S.running); i++) await pg.waitForTimeout(250);
      const r = await pg.evaluate(() => ({ m: document.querySelectorAll('.m-back').length, won: App.S.lastResult && App.S.lastResult.won, starts: Voice.log.filter(x => x.ev === 'start' && /^win/.test(x.k)).length }));
      if (r.m !== 1 || !r.won) fail('Run ×10: expected exactly one win modal ' + JSON.stringify(r));
      if (r.starts > 1) fail('Run ×10: win line spoken ' + r.starts + ' times');
    });
    await race('Run ×10 fast (empty program)', async () => {
      await open(pg, "SirajTest.open('talk', 't3'); Voice._reset()");
      for (let i = 0; i < 10; i++) { await tapAt('#run', 1, 20); }
      await pg.waitForTimeout(400);
      const n = await pg.evaluate(() => Voice.log.filter(x => x.ev === 'start' && /^empty/.test(x.k)).length);
      if (n > 1) fail(`Run ×10 empty: "empty" spoken ${n} times (cooldown broken)`);
    });
    for (const gap of [0, 10, 30, 50, 120, 380]) {
      await race(`back then open level within ${gap} ms`, async () => {
        await open(pg, "SirajTest.open('draw', 'd2')");
        await pg.evaluate(() => { App.S.lock = 0; });
        await tapAt('[data-act="tracks"]', 1);
        await pg.waitForTimeout(gap);
        await pg.evaluate(() => { const b = document.querySelector('.lv[data-t="2"][data-l="0"]'); if (b) b.click(); });
        await pg.waitForTimeout(500);
        const r = await pg.evaluate(() => ({ s: App.S.screen, ws: Blockly.common.getAllWorkspaces().length, inj: document.querySelectorAll('.injectionDiv').length, stage: !!document.getElementById('stage') }));
        if (r.inj > 1 || (r.s === 'level') !== r.stage || (r.s !== 'level' && r.inj)) fail(`back→level ${gap}ms: ${JSON.stringify(r)}`);
      });
    }
    await race('open/close parents modal ×12 fast', async () => {
      await open(pg, 'SirajTest.screens.renderHome()');
      for (let i = 0; i < 12; i++) { await tapAt('.corner', 1); await pg.waitForTimeout(40); await tapAt('[data-p="close"]', 1); await pg.waitForTimeout(40); }
    });
    await race('solution offer modal open/close ×10', async () => {
      await open(pg, "SirajTest.open('lights', 'l3'); App.S.fails = 4");
      for (let i = 0; i < 10; i++) { await tapAt('#hintBtn', 1); await pg.waitForTimeout(60); await pg.mouse.click(5, 5); await pg.waitForTimeout(60); }
    });
    await race('win modal: again/next spam', async () => {
      await open(pg, "SirajTest.open('talk', 't1'); SirajTest.loadSolution(); await SirajTest.run()");
      for (let i = 0; i < 6; i++) { await tapAt('[data-act="again"]', 2, 10); await tapAt('#run', 2, 10); await tapAt('[data-act="next"]', 3, 5); }
    });
    await race('predict modal: pick + back fast', async () => {
      await open(pg, "SirajTest.open('talk', 't7')");
      await pg.waitForTimeout(500);
      await tapAt('.pchoice', 3, 5);
      await pg.waitForTimeout(700);
      await tapAt('[data-act="tracks"]', 1);
    });
    await race('rotate mid-animation (draw)', async () => {
      await open(pg, "SirajTest.open('draw', 'd4'); SirajTest.loadSolution()");
      await pg.evaluate(() => { document.getElementById('run').click(); });
      for (let i = 0; i < 7; i++) { await pg.setViewportSize(i % 2 ? { width: 360, height: 640 } : { width: 640, height: 360 }); await pg.waitForTimeout(140); }
      // آخر مقاس مختلف عن الأول، والتشغيل لسه شغّال: لازم المسرح يتعاد رسمه بعد ما يخلص
      for (let i = 0; i < 60 && await pg.evaluate(() => App.S.running); i++) await pg.waitForTimeout(250);
      await pg.waitForTimeout(400);
      const r = await pg.evaluate(() => { const c = document.querySelector('#stage canvas'), st = document.getElementById('stage'); return c && st ? { cw: Math.round(parseFloat(c.style.width)), sw: Math.round(st.getBoundingClientRect().width) } : null; });
      if (!r || Math.abs(r.cw - r.sw) > 2) fail('rotate: draw canvas not re-laid out after run ' + JSON.stringify(r));
      await pg.setViewportSize({ width: 360, height: 640 });
    });
    await race('add card then undo once = card gone (no detached card)', async () => {
      await open(pg, "SirajTest.open('talk', 't3')");
      const fb = await pg.evaluate(() => { const r = document.querySelector('.blocklyFlyout .blocklyDraggable').getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
      await pg.mouse.click(fb.x, fb.y); await pg.waitForTimeout(200);
      await pg.mouse.click(fb.x, fb.y); await pg.waitForTimeout(200);
      await pg.evaluate(() => { App.S.lock = 0; });
      await tapAt('[data-act="undo"]', 1); await pg.waitForTimeout(300);
      const r = await pg.evaluate(() => ({ all: App.S.ws.getAllBlocks(false).length, top: App.S.ws.getTopBlocks(false).length }));
      if (r.all !== 2 || r.top !== 1) fail('undo after tap-add left a detached card ' + JSON.stringify(r));
    });
    await race('voice stops when leaving a screen', async () => {
      await open(pg, "SirajTest.player(9); SirajTest.screens.renderSections(); Voice._reset()");
      await pg.evaluate(() => { App.S.lock = 0; });
      await tapAt('[data-x="ency"]', 1);
      await pg.waitForTimeout(400);
      const before = await pg.evaluate(() => __inv.audioNow());
      await pg.evaluate(() => { App.S.lock = 0; });
      await tapAt('[data-act="sections"]', 1); await pg.waitForTimeout(120);
      const after = await pg.evaluate(() => __inv.audioNow());
      if (!before) fail('encyclopedia line did not play');
      if (before && after) fail('the encyclopedia line kept talking after going back');
    });
    await race('certificate drawn late never pops over another screen', async () => {
      await open(pg, "const p = SirajTest.player(9); SirajTest.TRACKS[0].levels.forEach(l => Store.win(p, l.id, 3)); p.certs['T-talk'] = Date.now(); Extras.openCerts()");
      // الشهادة بتترسم (خطوط + صورة)، والطفل يرجع فوراً
      await pg.evaluate(() => { Extras.showCert(App.S.player, Extras.groups()[0], false); App.S.lock = 0; document.querySelector('[data-act="sections"]').click(); });
      await pg.waitForTimeout(2500);
      const r = await pg.evaluate(() => ({ s: App.S.screen, img: !!document.querySelector('.x-cert-img') }));
      if (r.img) fail('certificate modal appeared after leaving the screen ' + JSON.stringify(r));
    });
    await race('parents backup then leave: panel does not come back', async () => {
      await open(pg, 'Parents.panel()');
      await pg.evaluate(() => { document.querySelector('[data-p="backup"]').click(); App.S.lock = 0; document.querySelector('[data-act="home"]').click(); });
      await pg.waitForTimeout(700);
      const s = await pg.evaluate(() => App.S.screen);
      if (s !== 'home') fail('parents panel re-opened itself after leaving: ' + s);
    });
    await race('touch: no double-tap zoom, no pull-to-refresh, no Blockly context menu, kid-sized drag radius', async () => {
      await open(pg, "SirajTest.open('talk', 't3'); SirajTest.loadSolution()");
      const r = await pg.evaluate(() => {
        const b = App.S.ws.getAllBlocks(false)[1].getSvgRoot().getBoundingClientRect();
        return { ta: getComputedStyle(document.body).touchAction, ob: getComputedStyle(document.documentElement).overscrollBehaviorY, drag: Blockly.config.dragRadius, b: { x: b.left + 30, y: b.top + 10 } };
      });
      if (!/manipulation/.test(r.ta)) fail('body touch-action is ' + r.ta + ' (double-tap zoom possible)');
      if (r.ob !== 'none') fail('overscroll-behavior is ' + r.ob + ' (pull-to-refresh possible)');
      if (r.drag < 10) fail('Blockly dragRadius ' + r.drag + ' (a shaky tap drags the card out)');
      await pg.mouse.click(r.b.x, r.b.y, { button: 'right' }); await pg.waitForTimeout(200);
      const menu = await pg.evaluate(() => { const m = document.querySelector('.blocklyWidgetDiv'); return !!m && !!m.textContent.trim() && m.getBoundingClientRect().height > 0; });
      if (menu) fail('Blockly context menu opens (long-press menu confuses kids)');
    });
    await race('rotate mid-animation (path, little mode, cw typing)', async () => {
      await open(pg, "SirajTest.open('path', 'p2', 3)");
      await pg.evaluate(() => { SirajTest.littleSolve(); });
      for (let i = 0; i < 6; i++) { await pg.setViewportSize(i % 2 ? { width: 360, height: 640 } : { width: 640, height: 360 }); await pg.waitForTimeout(120); }
      await open(pg, "SirajTest.act('pc'); CW._s.open('type_ar'); CW._act.inst.lesson(0)");
      for (let i = 0; i < 6; i++) { await pg.setViewportSize(i % 2 ? { width: 360, height: 640 } : { width: 640, height: 360 }); await pg.keyboard.press('KeyF'); await pg.waitForTimeout(80); }
      await pg.setViewportSize({ width: 360, height: 640 });
    });
    await race('visibility hidden/visible mid-run', async () => {
      await open(pg, "SirajTest.open('talk', 't3'); SirajTest.loadSolution()");
      await pg.evaluate(() => { document.getElementById('run').click(); });
      await pg.waitForTimeout(700);
      const hide = v => pg.evaluate(v => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => v }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (v ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, v);
      await hide(true);
      await pg.waitForTimeout(150);
      const a = await pg.evaluate(() => __inv.audioNow());
      if (a) fail('voice still playing while page hidden');
      await pg.waitForTimeout(500);
      await hide(false);
      for (let i = 0; i < 60 && await pg.evaluate(() => App.S.running); i++) await pg.waitForTimeout(250);
      const r = await pg.evaluate(() => App.S.lastResult);
      if (!r || !r.won) fail('run did not finish after hide/show ' + JSON.stringify(r));
    });
    await race('CW rapid taps (sections, activities, back, replay ×10)', async () => {
      await open(pg, "SirajTest.player(9); SirajTest.act('pc')");
      await pg.waitForTimeout(300);
      for (let i = 0; i < 4; i++) {
        await tapAt('.cw-sec[data-i="1"]', 3, 0); await pg.waitForTimeout(320);
        await tapAt('.cw-act[data-i="0"]', 3, 0); await pg.waitForTimeout(320);
        await pg.evaluate(() => Voice._reset());
        for (let k = 0; k < 10; k++) await tapAt('[data-cw="replay"]', 1, 15);
        const starts = await pg.evaluate(() => Voice.log.filter(x => x.ev === 'start').length);
        if (starts > 4) fail(`CW replay ×10 restarted the line ${starts} times`);
        await tapAt('[data-cw="back"]', 3, 0); await pg.waitForTimeout(320);
        await tapAt('[data-cw="home"]', 3, 0); await pg.waitForTimeout(320);
      }
      await tapAt('[data-cw="exit"]', 3, 0);
    });
    await pg.context().close();
  }

  if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 40).join('\n')); bad += errors.length; }
  await browser.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();
