// اختبار سياسة الصوت (R28):  node tests/voice.test.js   (من المجلد الرئيسي، PORT افتراضي 8794)
//  ١) وحدات: الأولوية، منع التكرار خلال ٦ ثوانٍ (إلا force)، الأسماء تتوقف بعد ٣ مرات لكل طفل (ومحفوظة)،
//     التشجيع مرة كل ١٥ ثانية، التنويع بدون تكرار متتالٍ، وزر 🔊 لا يعيد الجملة الشغّالة من أولها.
//  ٢) في اللعب الحقيقي بصوت حقيقي: لا يشتغل مقطعان معاً أبداً، أسماء البطاقات تتوقف بعد ٣،
//     لكل شاشة جملة تعليمات واحدة، والكتابة/البالونات بدون كلام مع كل ضغطة.
const { chromium } = require('playwright');
const { serve, newPage } = require('./stress-lib');

const PORT = +process.env.PORT || 8794;
let bad = 0;
const errors = [];
const check = (ok, name, extra) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };

(async () => {
  const server = await serve(PORT);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await newPage(browser, { w: 390, h: 800, touch: false, seed: 7, errors, tag: 'voice' });
  await pg.goto(`http://localhost:${PORT}/index.html?test=1`);
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__speed = 1; gsap.globalTimeline.timeScale(1); Store.settings.voice = true; });

  /* ---------- ١ وحدات بساعة مزيّفة ---------- */
  const u = await pg.evaluate(() => {
    const T = { t: 1e7 }, real = Voice.now;
    Voice.now = () => T.t;
    const starts = k => Voice.log.filter(x => x.ev === 'start' && (!k || x.k === k)).length;
    const r = {};
    Voice._reset();
    // الأولوية
    r.instr = Voice.play('goal_t1', 'x', undefined, { pri: 'instruction' });
    r.nameWhileInstr = Voice.play('en_for', 'for', 'en', { pri: 'name' });
    r.feedWhileInstr = Voice.play('retry', 'x', undefined, { pri: 'feedback' });
    r.forceWhileInstr = Voice.play('sol_offer', 'x', undefined, { force: true });
    Voice.stop(); T.t += 10000;
    Voice.play('en_wave', 'wave', 'en', { pri: 'name' });
    r.feedInterruptsName = Voice.play('talk_short', 'x', undefined, { pri: 'feedback' }) && Voice.busy() === Voice.PRI.feedback;
    // اسم جديد ما يقطع زوج (إنجليزي + عربي) شغّال، إلا بالطلب
    Voice.stop(); T.t += 10000;
    Voice.playSeq([['en_jump', 'jump', 'en'], ['k_siraj_jump', 'x']], { pri: 'name' });
    r.nameKeepsName = !Voice.playSeq([['en_for', 'for', 'en'], ['k_siraj_repeat', 'x']], { pri: 'name' }) && Voice.log.slice(-1)[0].why === 'busy';
    r.forcedNameCuts = Voice.play('ph_0', 'x', undefined, { pri: 'name', force: true });
    // منع التكرار
    Voice.stop(); T.t += 10000;
    r.first = Voice.play('retry', 'x');
    Voice.stop(); T.t += 2000;
    r.repeatBlocked = !Voice.play('retry', 'x');
    Voice.stop();
    r.forced = Voice.play('retry', 'x', undefined, { force: true });
    Voice.stop(); T.t += 7000;
    r.afterCool = Voice.play('retry', 'x');
    // 🔊 مرتين والجملة شغّالة: ما تبدأ من أولها
    Voice.stop(); T.t += 10000;
    const n0 = starts('goal_t2');
    Voice.play('goal_t2', 'x', undefined, { force: true }); Voice.play('goal_t2', 'x', undefined, { force: true }); Voice.play('goal_t2', 'x', undefined, { force: true });
    r.forceNoRestart = starts('goal_t2') - n0 === 1;
    // الأسماء: أول ٣ مرات فقط لكل طفل، ومحفوظة مع اللاعب
    const p = SirajTest.player(6);
    Object.keys(p.seen).filter(k => k.startsWith('v:')).forEach(k => delete p.seen[k]);
    const s0 = starts('en_say');
    for (let i = 0; i < 6; i++) { Voice.stop(); T.t += 7000; Voice.playSeq([['en_say', 'say', 'en'], ['k_siraj_say', 'x']], { pri: 'name' }); }
    r.nameStarts = starts('en_say') - s0;
    r.saved = p.seen['v:en_say'];
    r.persisted = /"v:en_say":3/.test(localStorage.getItem('khwarizmi.v1') || '');
    // نفس الاسم داخل تعليمة (درس جديد) يتقال عادي
    Voice.stop(); T.t += 7000;
    Voice.playSeq([['cw_ty_new', 'x'], ['en_say', 'say', 'en']], { pri: 'instruction' });
    T.t += 1; Voice.log.slice(-1);
    r.nameInInstruction = Voice.log.some(x => x.ev === 'start' && x.k === 'cw_ty_new');
    // طفل آخر يبدأ من صفر
    const q = SirajTest.player(8);
    Object.keys(q.seen).filter(k => k.startsWith('v:')).forEach(k => delete q.seen[k]);
    Voice.stop(); T.t += 7000;
    r.otherChild = Voice.playSeq([['en_say', 'say', 'en']], { pri: 'name' });
    // التشجيع: مرة كل ١٥ ثانية
    Voice.stop(); T.t += 20000;
    r.amb1 = Voice.play('cw_good1', 'x', undefined, { pri: 'ambient' });
    Voice.stop(); T.t += 5000;
    r.amb2Blocked = !Voice.play('cw_good2', 'x', undefined, { pri: 'ambient' });
    Voice.stop(); T.t += 11000;
    r.amb3 = Voice.play('cw_good3', 'x', undefined, { pri: 'ambient' });
    // التنويع
    const picks = Array.from({ length: 60 }, () => Voice.pick(['win1', 'win2', 'win3']));
    r.noRepeatPick = picks.every((k, i) => !i || k !== picks[i - 1]) && new Set(picks).size === 3;
    // التصنيف التلقائي
    r.cls = ['goal_t1', 'en_for', 'k_siraj_say', 'c_red', 'n_3', 'cw_l_keyf', 'cw_p_mouse', 'win2', 'hint_next', 'cw_good1', 'hi_a', 'tracks', 'cw_bal', 'x_cert', 'x_certs'].map(k => k + ':' + Voice.cls(k)).join(' ');
    Voice.stop(); Voice.now = real; Voice._reset();
    return r;
  });
  check(u.instr && !u.nameWhileInstr && !u.feedWhileInstr, 'lower priority never interrupts an instruction', JSON.stringify(u).slice(0, 0));
  check(u.forceWhileInstr, '🔊 / forced line interrupts anything');
  check(u.feedInterruptsName, 'feedback interrupts a card name');
  check(u.nameKeepsName && u.forcedNameCuts, 'a new card name never splits a playing name pair (unless forced)', JSON.stringify([u.nameKeepsName, u.forcedNameCuts]));
  check(u.first && u.repeatBlocked && u.forced && u.afterCool, 'same line not replayed within 6 s unless forced', JSON.stringify([u.first, u.repeatBlocked, u.forced, u.afterCool]));
  check(u.forceNoRestart, '🔊 tapped 3× while playing = one start (no stutter)');
  check(u.nameStarts === 3 && u.saved === 3 && u.persisted, 'card names stop after 3 times per child (saved)', JSON.stringify([u.nameStarts, u.saved, u.persisted]));
  check(u.nameInInstruction, 'a name inside a lesson instruction still plays');
  check(u.otherChild, 'another child hears the name again');
  check(u.amb1 && u.amb2Blocked && u.amb3, 'praise at most every 15 s', JSON.stringify([u.amb1, u.amb2Blocked, u.amb3]));
  check(u.noRepeatPick, 'praise/win variants never repeat back-to-back');
  check(u.cls === 'goal_t1:instruction en_for:name k_siraj_say:name c_red:name n_3:name cw_l_keyf:name cw_p_mouse:name win2:feedback hint_next:feedback cw_good1:ambient hi_a:ambient tracks:instruction cw_bal:instruction x_cert:feedback x_certs:instruction', 'key classification', u.cls);

  /* ---------- ٢ لعب حقيقي بصوت حقيقي ---------- */
  const flyTap = async (i) => {
    // بطاقات القائمة الظاهرة بترتيبها على الشاشة (بلوكلي يغيّر ترتيبها في الصفحة بعد كل ضغطة)
    const b = await pg.evaluate(i => { const rs = [...document.querySelectorAll('.blocklyFlyout .blocklyDraggable')].map(e => e.getBoundingClientRect()).filter(r => r.left >= 0 && r.left + 30 < innerWidth).sort((a, b) => a.left - b.left); const r = rs[i % rs.length]; return { x: r.left + 18, y: r.top + r.height / 2 }; }, i);
    await pg.mouse.click(b.x, b.y);
  };
  // مرحلة: الهدف يتقال، والبطاقات أثناءه ما تقطعه، ولا تداخل أبداً
  await pg.evaluate(() => { Voice._reset(); const p = SirajTest.player(7); Object.keys(p.seen).filter(k => k.startsWith('v:')).forEach(k => delete p.seen[k]); __inv.overlap = 0; __inv.maxAudio = 0; SirajTest.open('talk', 't3', 7); });
  await pg.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { await flyTap(i); await pg.waitForTimeout(90); }
  const lv = await pg.evaluate(() => ({ goal: Voice.log.some(x => x.ev === 'start' && /^goal_/.test(x.k)), dropped: Voice.log.filter(x => x.ev === 'drop' && x.why === 'busy').length, cards: App.S.ws.getAllBlocks(false).length }));
  check(lv.goal && lv.dropped > 0 && lv.cards >= 6, 'level goal plays; card names tapped during it are dropped (not cutting it)', JSON.stringify(lv));
  await pg.evaluate(() => { App.S.lock = 0; document.getElementById('run').click(); });
  for (let i = 0; i < 80 && await pg.evaluate(() => App.S.running); i++) await pg.waitForTimeout(250);
  await pg.waitForTimeout(800);
  // اسم البطاقة يتوقف بعد ٣ مرات مع ضغطات حقيقية متباعدة
  await pg.evaluate(() => { App.closeModal(); SirajTest.open('talk', 't3', 7); Voice.stop(); });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__T = 0; const real = Date.now; Voice.now = () => real() + window.__T; });
  // نفس البطاقة ٦ مرات بفاصل ٧ ثوانٍ (ساعة الصوت فقط)، ونحذفها كل مرة عشان ما نوصل للحد الأقصى
  for (let i = 0; i < 6; i++) { await pg.evaluate(() => { Voice.stop(); window.__T += 7000; }); await flyTap(1); await pg.waitForTimeout(150); await pg.evaluate(() => App.S.ws.__del()); }
  const nm = await pg.evaluate(() => { const k = Voice.log.filter(x => x.ev === 'start' && /^en_/.test(x.k)).map(x => x.k); Voice.now = () => Date.now(); return k; });
  const byKey = nm.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {});
  check(Object.values(byKey).length === 1 && Object.values(byKey)[0] === 3, 'real taps: the same card name is spoken exactly 3 times, then SFX only', JSON.stringify(byKey));
  const ov = await pg.evaluate(() => ({ overlap: __inv.overlap, max: __inv.maxAudio, keys: __inv.overlapKeys.slice(0, 3) }));
  check(ov.overlap === 0 && ov.max <= 1, 'real audio: never two clips at once', JSON.stringify(ov));

  // لكل شاشة جملة تعليمات واحدة (للي ما بيقرأ)
  const screens = [
    ['home', "SirajTest.act('home')"],
    ['new player', "SirajTest.act('new')"],
    ['sections', "const p = SirajTest.player(9); SirajTest.act('pick', { id: p.id })"],
    ['tracks', "SirajTest.player(9); SirajTest.act('code')"],
    ['level', "SirajTest.open('lights', 'l2')"],
    ['little level', "SirajTest.open('path', 'p3', 3)"],
    ['pylab', "SirajTest.open('pylab', 'y2')"],
    ['encyclopedia', "SirajTest.player(9); SirajTest.screens.renderSections(); App.S.lock = 0; document.querySelector('[data-x=\"ency\"]').click()"],
    ['stickers', "SirajTest.player(9); SirajTest.screens.renderSections(); App.S.lock = 0; document.querySelector('[data-x=\"stickers\"]').click()"],
    ['certificates', "SirajTest.player(9); SirajTest.screens.renderSections(); App.S.lock = 0; document.querySelector('[data-x=\"certs\"]').click()"],
    ['cw home', "SirajTest.player(9); SirajTest.act('pc')"],
    ['cw section', "SirajTest.player(9); SirajTest.act('pc'); CW._s.sectionScreen(CW.sections[3])"],
    ['cw activity', "SirajTest.player(9); SirajTest.act('pc'); CW._s.open('isit')"],
  ];
  for (const [name, code] of screens) {
    await pg.evaluate(() => { App.closeModal(); Voice._reset(); });
    await pg.evaluate(`(() => { ${code}; })()`);
    await pg.waitForTimeout(1300);
    const r = await pg.evaluate(() => Voice.log.filter(x => x.ev === 'start').map(x => [x.k, x.pri]));
    const instr = r.filter(x => x[1] === 4); // Voice.PRI.instruction
    check(instr.length >= 1, `${name}: has a spoken instruction`, JSON.stringify(r.map(x => x[0])));
  }

  // الكتابة: كل ضغطة صحيحة = صوت قصير فقط (بدون كلام)
  await pg.evaluate(() => { SirajTest.player(9); SirajTest.act('pc'); CW._s.open('type_ar'); CW._act.inst.lesson(0); });
  for (let i = 0; i < 40 && await pg.evaluate(() => Voice.busy()); i++) await pg.waitForTimeout(250);
  await pg.evaluate(() => Voice._reset());
  for (let i = 0; i < 12; i++) { const c = await pg.evaluate(() => { const k = document.querySelector('.cw-key.next'); return k && k.dataset.c; }); if (!c) break; await pg.keyboard.press(c); await pg.waitForTimeout(60); }
  const ty = await pg.evaluate(() => Voice.log.filter(x => x.ev === 'start').map(x => x.k));
  check(ty.length === 0, 'typing: no voice per keystroke', JSON.stringify(ty));

  // البالونات: كل فرقعة = مؤثر صوتي، والتشجيع مرة واحدة على الأكثر
  await pg.evaluate(() => { SirajTest.player(4); SirajTest.act('pc'); CW._s.open('balloons'); });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => Voice._reset());
  for (let i = 0; i < 8; i++) {
    const b = await pg.evaluate(() => { const el = [...document.querySelectorAll('.cw-balloon:not(.pop)')].find(x => { const r = x.getBoundingClientRect(); return r.top > 60 && r.bottom < innerHeight - 10; }); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 3 }; });
    if (b) await pg.mouse.click(b.x, b.y);
    await pg.waitForTimeout(300);
  }
  const bl = await pg.evaluate(() => Voice.log.filter(x => x.ev === 'start').map(x => x.k));
  check(bl.length <= 1, 'balloons: popping is SFX, at most one praise line', JSON.stringify(bl));

  const ov2 = await pg.evaluate(() => ({ overlap: __inv.overlap, max: __inv.maxAudio }));
  check(ov2.overlap === 0, 'no audio overlap during the whole voice run', JSON.stringify(ov2));

  if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 30).join('\n')); bad += errors.length; }
  await browser.close();
  server.close();
  console.log(bad ? `\n${bad} problem(s)` : '\nALL OK');
  process.exit(bad ? 1 : 0);
})();
