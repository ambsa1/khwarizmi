/* بطاقات البرمجة (مبنية على مكتبة بلوكلي من مؤسسة راسبيري باي، رخصة أباتشي 2.0).
   كل بطاقة مكتوب عليها كود بايثون الحقيقي. لما الطفل يضيف بطاقة، سراج يقول كلمتها بالإنجليزي ثم معناها بالعربي. */
(function (root) {
  'use strict';

  const PY = python.pythonGenerator;
  PY.INDENT = '    '; // أربع مسافات مثل مختبر بايثون (وبايثون الحقيقي)
  const T = root.SIRAJ_TEXTS;

  const icon = svg => ({ type: 'field_image', src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), width: 26, height: 26, alt: '' });
  const ico = {
    say: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M5 6h22a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H14l-6 5v-5H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#fff"/></svg>',
    wave: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M11 27c-3-2-6-7-6-10 0-1.5 1.8-2 2.8-.8L11 20V7a2 2 0 0 1 4 0v8V5a2 2 0 0 1 4 0v10V7a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 5-3 9-8 9h-3c-2 0-3-.4-5-1z" fill="#fff"/></svg>',
    jump: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 4l8 9h-5v7h-6v-7H8z" fill="#fff"/><rect x="7" y="24" width="18" height="4" rx="2" fill="#fff"/></svg>',
    pen: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M6 24l3-8L22 3l7 7L16 23z" fill="#fff"/><path d="M6 24l-2 6 6-2z" fill="#fff"/></svg>',
    right: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M8 20a10 10 0 0 1 16-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M20 5l7 7-9 3z" fill="#fff"/></svg>',
    left: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M24 20a10 10 0 0 0-16-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M12 5l-7 7 9 3z" fill="#fff"/></svg>',
    arrow: d => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g transform="rotate(${d} 16 16)"><path d="M16 27V7M7 15l9-9 9 9" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`,
    loop: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M7 13a9 9 0 0 1 16-4M25 19a9 9 0 0 1-16 4" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M24 3v8h-8zM8 29v-8h8z" fill="#fff"/></svg>',
    flag: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M8 29V4" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M9 5h16l-4 5 4 5H9z" fill="#fff"/></svg>',
    bulb: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3z" fill="#fff"/><rect x="11" y="25" width="10" height="4" rx="2" fill="#fff"/></svg>',
    bulbOff: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3z" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="11" y="25" width="10" height="4" rx="2" fill="#fff"/></svg>',
    box: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M4 11l12-6 12 6v13l-12 6-12-6z" fill="#fff"/><path d="M4 11l12 6 12-6M16 17v13" stroke="#b07a2a" stroke-width="2" fill="none"/></svg>',
    book: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M4 6c5-1 9 0 12 3 3-3 7-4 12-3v20c-5-1-9 0-12 3-3-3-7-4-12-3z" fill="#fff"/><path d="M16 9v20" stroke="#c2185b" stroke-width="2"/></svg>',
    call: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M6 8l18 8-18 8 4-8z" fill="#fff"/></svg>',
    // الشرط: طريق يتفرّع لطريقين
    fork: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 29V17M16 17L7 8M16 17l9-9" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="7" r="3.5" fill="#fff"/><circle cx="25" cy="7" r="3.5" fill="#fff"/></svg>',
    // رقصة: نوتة موسيقية مع شرارات
    dance: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M13 24V7l12-3v16" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="24.5" r="4.5" fill="#fff"/><circle cx="21.5" cy="20.5" r="4.5" fill="#fff"/><path d="M4 6l1.5 3M28 10l2-2M3 14l3-1" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  const COLORS = { talk: '#e8579a', act: '#f08a24', move: '#3d8bff', pen: '#16a865', loop: '#8b5cf6', start: '#ffb400', light: '#4b4f6e', box: '#c27c0e', func: '#d6336c', cond: '#0e9f9f' };
  // الشروط (بطاقة "لو"): القيمة المحفوظة، ونص بايثون المكتوب على البطاقة، وطريقة حسابها من حالة المصباح والصناديق
  const CONDS = {
    lamp_off: { py: 'lamp_off()', test: s => s.lamp === 'off' },
    lamp_on: { py: 'lamp_on()', test: s => s.lamp !== 'off' },
    apples_gt5: { py: 'apples > 5', test: s => (s.vars.apples || 0) > 5 },
    apples_eq0: { py: 'apples == 0', test: s => !s.vars.apples },
  };
  const condField = { type: 'field_dropdown', name: 'COND', options: Object.entries(CONDS).map(([k, c]) => [c.py, k]) };
  // ألوان الأضواء: لون المصباح، ولون البطاقة (أغمق قليلاً عشان الكلام الأبيض يبان)
  const LIGHTS = { red: '#ff4d4f', yellow: '#ffd23e', green: '#3ddc84', blue: '#4fa3ff', purple: '#b07cff' };
  const LIGHT_CARD = { red: '#d93a3c', yellow: '#c99a00', green: '#1f9d55', blue: '#2f6fe0', purple: '#8b5cf6' };
  const LIGHT_DOT = { red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵', purple: '🟣' };
  // صناديق الذاكرة: اسم المتغيّر ورمزه
  const VARS = { apples: '🍎', stars: '⭐', balloons: '🎈' };
  const FUNCS = ['dance', 'hello', 'blink', 'square', 'step'];
  const stmt = { previousStatement: null, nextStatement: null };
  const nums = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => [String(a + i), String(a + i)]);

  // لون بطاقة الضوء يتغيّر مع اللون المختار
  Blockly.Extensions.register('light_tint', function () {
    const f = this.getField('C');
    const upd = v => { this.setColour(LIGHT_CARD[v] || COLORS.light); return v; };
    upd(f.getValue());
    f.setValidator(upd);
  });
  // apples = apples + 1: الاسم الثاني يتبع الأول
  Blockly.Extensions.register('var_mirror', function () {
    const f = this.getField('V'), m = this.getField('V2');
    f.setValidator(v => { m.setValue(v); return v; });
    m.setValue(f.getValue());
  });

  // اسم الكلمة يظهر ومعه الأقواس، والقيمة المحفوظة الاسم وحده
  const fname = suffix => function () {
    const f = this.getField('NAME'), show = f.getDisplayText_;
    f.getDisplayText_ = function () { return show.call(this) + suffix; };
  };
  Blockly.Extensions.register('fname_def', fname('():'));
  Blockly.Extensions.register('fname_call', fname('()'));

  const varField ={ type: 'field_dropdown', name: 'V', options: Object.entries(VARS).map(([k, e]) => [e + ' ' + k, k]) };

  // تعريف البطاقات: النص المكتوب هو كود بايثون
  const DEFS = [
    { type: 'siraj_start', message0: '%1 start', args0: [icon(ico.flag)], nextStatement: null, colour: COLORS.start },
    Object.assign({ type: 'siraj_say', message0: '%1 say(" %2 ")', args0: [icon(ico.say),
      { type: 'field_dropdown', name: 'TEXT', options: T.PHRASES.map(p => [p[2] + ' ' + p[0], p[0]]) }], colour: COLORS.talk }, stmt),
    Object.assign({ type: 'siraj_wave', message0: '%1 wave()', args0: [icon(ico.wave)], colour: COLORS.act }, stmt),
    Object.assign({ type: 'siraj_jump', message0: '%1 jump()', args0: [icon(ico.jump)], colour: COLORS.act }, stmt),
    // حفلة سراج: رقصة (لفّة وهزّة)
    Object.assign({ type: 'siraj_dance', message0: '%1 dance()', args0: [icon(ico.dance)], colour: COLORS.act }, stmt),
    Object.assign({ type: 'pen_forward', message0: '%1 forward( %2 )', args0: [icon(ico.pen),
      { type: 'field_dropdown', name: 'N', options: nums(1, 4) }], colour: COLORS.pen }, stmt),
    Object.assign({ type: 'pen_right', message0: '%1 right( %2 )', args0: [icon(ico.right), { type: 'field_dropdown', name: 'A', options: [['90', '90']] }], colour: COLORS.pen }, stmt),
    Object.assign({ type: 'pen_left', message0: '%1 left( %2 )', args0: [icon(ico.left), { type: 'field_dropdown', name: 'A', options: [['90', '90']] }], colour: COLORS.pen }, stmt),
    // التحرك على اللوحة باتجاهات الشاشة: أسماؤها move_ عشان ما تتلخبط مع right و left في الرسم (الاستدارة)
    Object.assign({ type: 'go_up', message0: '%1 move_up()', args0: [icon(ico.arrow(0))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'go_down', message0: '%1 move_down()', args0: [icon(ico.arrow(180))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'go_left', message0: '%1 move_left()', args0: [icon(ico.arrow(270))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'go_right', message0: '%1 move_right()', args0: [icon(ico.arrow(90))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'siraj_repeat', message0: '%1 for i in range( %2 ):', args0: [icon(ico.loop),
      { type: 'field_dropdown', name: 'N', options: nums(2, 10) }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: COLORS.loop }, stmt),
    // عرض الأضواء
    Object.assign({ type: 'light_on', message0: '%1 light(" %2 ")', args0: [icon(ico.bulb),
      { type: 'field_dropdown', name: 'C', options: Object.keys(LIGHTS).map(c => [LIGHT_DOT[c] + ' ' + c, c]) }], extensions: ['light_tint'] }, stmt),
    Object.assign({ type: 'light_off', message0: '%1 off()', args0: [icon(ico.bulbOff)], colour: COLORS.light }, stmt),
    // صناديق الذاكرة (المتغيّرات)
    Object.assign({ type: 'var_set', message0: '%1 %2 = %3', args0: [icon(ico.box), varField, { type: 'field_dropdown', name: 'N', options: nums(0, 10) }], colour: COLORS.box }, stmt),
    Object.assign({ type: 'var_add', message0: '%1 %2 = %3 + %4', args0: [icon(ico.box), varField, { type: 'field_label_serializable', name: 'V2', text: 'apples' },
      { type: 'field_dropdown', name: 'N', options: nums(1, 5) }], colour: COLORS.box, extensions: ['var_mirror'] }, stmt),
    Object.assign({ type: 'var_sub', message0: '%1 %2 = %3 - %4', args0: [icon(ico.box), varField, { type: 'field_label_serializable', name: 'V2', text: 'apples' },
      { type: 'field_dropdown', name: 'N', options: nums(1, 5) }], colour: COLORS.box, extensions: ['var_mirror'] }, stmt),
    Object.assign({ type: 'var_say', message0: '%1 say( %2 )', args0: [icon(ico.say), varField], colour: COLORS.talk }, stmt),
    // علّم سراج كلمة جديدة (الدوال): الاسم ثابت في كل مرحلة
    // الأقواس ملزوقة في الاسم نفسه (def dance(): مثل بايثون، مش def dance ():)
    Object.assign({ type: 'func_def', message0: '%1 def %2', args0: [icon(ico.book), { type: 'field_label_serializable', name: 'NAME', text: 'dance' }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: COLORS.func, extensions: ['fname_def'] }, stmt),
    Object.assign({ type: 'func_call', message0: '%1 %2', args0: [icon(ico.call), { type: 'field_label_serializable', name: 'NAME', text: 'dance' }], colour: COLORS.func, extensions: ['fname_call'] }, stmt),
    // الشروط: لو (الشرط صح) اعمل ما بداخلها، وإلا (في بطاقة لو/وإلا) اعمل الجزء الثاني
    Object.assign({ type: 'siraj_if', message0: '%1 if %2:', args0: [icon(ico.fork), condField],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: COLORS.cond }, stmt),
    Object.assign({ type: 'siraj_ifelse', message0: '%1 if %2:', args0: [icon(ico.fork), condField],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
      message2: 'else:', message3: '%1', args3: [{ type: 'input_statement', name: 'ELSE' }], colour: COLORS.cond }, stmt),
  ];
  Blockly.common.defineBlocks(Blockly.common.createBlockDefinitionsFromJsonArray(DEFS));
  // إصبع الطفل يهتز: الضغطة ما تتحوّل لسحب يفصل البطاقة إلا بعد ١٢ بكسل (الافتراضي ٥)
  if (Blockly.config) Blockly.config.dragRadius = 12;
  // لا قائمة ضغط طويل (تكرار/حذف/مساعدة بالكلام) تظهر فجأة تحت إصبع الطفل؛ الحذف بزر 🗑 والتراجع بزر ↶
  try { Blockly.ContextMenuRegistry.registry.reset(); } catch (e) { /* نسخة بلوكلي مختلفة */ }
  // أشرطة التمرير مخفية (الطفل يحرّك المساحة بالسحب): ما تغطّي البطاقات، وما تاخد مكان فاضي تحت القائمة
  if (Blockly.Scrollbar) Blockly.Scrollbar.scrollbarThickness = 6; // أقل من كده بلوكلي يرسم مستطيلات بمقاس سالب
  // قائمة البطاقات على التلفون أصغر شوية من البرنامج نفسه، عشان مساحة البرنامج تكفي
  let FLY = 1;
  if (Blockly.HorizontalFlyout && Blockly.registry) {
    class SirajFlyout extends Blockly.HorizontalFlyout {
      getFlyoutScale() { return (this.targetWorkspace.__base || this.targetWorkspace.scale) * FLY; } // ثابتة حتى لو البرنامج صغُر ليكفي
      layout_(c) { super.layout_(c); this.workspace_.scale = this.getFlyoutScale(); }
    }
    try { Blockly.registry.register(Blockly.registry.Type.FLYOUTS_HORIZONTAL_TOOLBOX, 'siraj', SirajFlyout); } catch (e) { /* مسجّلة من قبل */ }
  }

  // الحقل الأساسي لكل بطاقة (للكتابة المختصرة 'light_on:red' في المراحل)
  const MAIN = { siraj_say: 'TEXT', light_on: 'C', var_set: 'V', var_add: 'V', var_sub: 'V', var_say: 'V', func_def: 'NAME', func_call: 'NAME', siraj_if: 'COND', siraj_ifelse: 'COND' };

  // كود بايثون لكل بطاقة
  const G = PY.forBlock;
  const body = (b, gen) => gen.statementToCode(b, 'DO') || gen.INDENT + 'pass\n';
  G.siraj_start = () => '';
  G.siraj_say = b => `say(${JSON.stringify(b.getFieldValue('TEXT'))})\n`;
  G.siraj_wave = () => 'wave()\n';
  G.siraj_jump = () => 'jump()\n';
  G.siraj_dance = () => 'dance()\n';
  G.pen_forward = b => `forward(${b.getFieldValue('N')})\n`;
  G.pen_right = b => `right(${b.getFieldValue('A')})\n`;
  G.pen_left = b => `left(${b.getFieldValue('A')})\n`;
  G.go_up = () => 'move_up()\n';
  G.go_down = () => 'move_down()\n';
  G.go_left = () => 'move_left()\n';
  G.go_right = () => 'move_right()\n';
  G.siraj_repeat = (b, gen) => `for i in range(${b.getFieldValue('N')}):\n${body(b, gen)}`;
  G.light_on = b => `light("${b.getFieldValue('C')}")\n`;
  G.light_off = () => 'off()\n';
  G.var_set = b => `${b.getFieldValue('V')} = ${b.getFieldValue('N')}\n`;
  G.var_add = b => `${b.getFieldValue('V')} = ${b.getFieldValue('V')} + ${b.getFieldValue('N')}\n`;
  G.var_sub = b => `${b.getFieldValue('V')} = ${b.getFieldValue('V')} - ${b.getFieldValue('N')}\n`;
  G.var_say = b => `say(${b.getFieldValue('V')})\n`;
  G.func_def = (b, gen) => `def ${b.getFieldValue('NAME')}():\n${body(b, gen)}`;
  G.func_call = b => `${b.getFieldValue('NAME')}()\n`;
  const condPy = b => (CONDS[b.getFieldValue('COND')] || CONDS.lamp_off).py;
  G.siraj_if = (b, gen) => `if ${condPy(b)}:\n${body(b, gen)}`;
  G.siraj_ifelse = (b, gen) => `if ${condPy(b)}:\n${body(b, gen)}else:\n${gen.statementToCode(b, 'ELSE') || gen.INDENT + 'pass\n'}`;

  const theme = Blockly.Theme.defineTheme('siraj', {
    base: Blockly.Themes.Classic,
    fontStyle: { family: 'ui-monospace, Consolas, "Cascadia Mono", monospace', weight: '700', size: 15 },
    componentStyles: {
      workspaceBackgroundColour: '#f7f3ff', flyoutBackgroundColour: '#ebe4ff', flyoutOpacity: 1,
      scrollbarColour: '#c7bcef', insertionMarkerColour: '#8b5cf6', insertionMarkerOpacity: 0.35,
    },
  });

  const startOf = ws => ws.getTopBlocks(false).find(b => b.type === 'siraj_start');
  const countBlocks = ws => ws.getAllBlocks(false).filter(b => b.type !== 'siraj_start' && b.isEnabled()).length;
  const lastIn = b => { while (b && b.getNextBlock()) b = b.getNextBlock(); return b; };
  const hasDo = b => !!(b && b.getInput('DO'));

  // بطاقة في القائمة: 'نوع' أو 'نوع:قيمة الحقل الأساسي'
  const toolItem = s => {
    const [type, v] = s.split(':');
    return v ? { kind: 'block', type, fields: { [MAIN[type]]: v } } : { kind: 'block', type };
  };

  // وين تدخل البطاقة الجديدة؟
  //  - لو بطاقة فيها مكان داخلي (تكرار أو كلمة جديدة) مختارة: في آخر ما بداخلها
  //  - لو بطاقة ثانية مختارة: بعدها مباشرة (حتى لو كانت داخل تكرار)
  //  - غير كده: في آخر البرنامج، وإذا آخر بطاقة تكرار فاضي ندخل جواه
  //  - تعريف كلمة جديدة يروح دايماً لآخر البرنامج، ونداء الكلمة ما يدخل جوّا تعريفها
  // أول مكان فاضي داخل البطاقة: جوّا "لو" (DO)، ثم جوّا "وإلا" (ELSE) لو فاضي، وإلا بعد آخر بطاقة في DO
  const emptyElse = b => !!(b.getInput('ELSE') && !b.getInputTargetBlock('ELSE'));
  const slot = b => {
    const inner = b.getInputTargetBlock('DO');
    if (!inner) return b.getInput('DO').connection;
    if (emptyElse(b)) return b.getInput('ELSE').connection;
    return lastIn(inner).nextConnection;
  };
  function target(ws, sel, type) {
    if (type === 'func_def') sel = null;
    if (type === 'func_call' && sel) for (let q = sel; q; q = q.getSurroundParent()) if (q.type === 'func_def') sel = q;
    if (sel && !sel.isDeadOrDying() && sel.type !== 'siraj_start' && sel.isEnabled()) {
      if (hasDo(sel) && !(type === 'func_call' && sel.type === 'func_def')) return slot(sel);
      return sel.nextConnection;
    }
    const last = lastIn(startOf(ws));
    const into = hasDo(last) && (!last.getInputTargetBlock('DO') || emptyElse(last)) && !(last.type === 'func_def' && /^func_/.test(type || ''));
    return into ? slot(last) : last.nextConnection;
  }

  // يبني برنامجاً من صيغة الحل: 'نوع' أو ['نوع', {حقل: قيمة}] أو ['نوع', {..}, [بطاقات داخلية]]
  // (بدون أحداث، عشان تحميل برنامج جاهز ما يشغّل أصوات تغيير الحقول)
  function load(ws, list, conn) {
    Blockly.Events.disable();
    try { loadIn(ws, list, conn); } finally { Blockly.Events.enable(); }
    if (ws.rendered) ws.getAllBlocks(false).forEach(b => b.setDisabledReason && b.setDisabledReason(false, 'ORPHANED_BLOCK'));
    if (ws.__fit) ws.__fit();
  }
  function loadIn(ws, list, conn) {
    for (const step of list) {
      const [type, fields, inner] = Array.isArray(step) ? step : [step];
      const b = ws.newBlock(type);
      if (ws.rendered) { b.initSvg(); b.render(); }
      for (const [f, v] of Object.entries(fields || {})) b.setFieldValue(String(v), f);
      conn.connect(b.previousConnection);
      if (inner) loadIn(ws, inner, b.getInput('DO').connection);
      if (step[3] && b.getInput('ELSE')) loadIn(ws, step[3], b.getInput('ELSE').connection); // الجزء الثاني من لو/وإلا
      conn = b.nextConnection;
    }
  }

  // قيم حقول البطاقة (لنسخها في بطاقة جديدة)
  function fieldsOf(src) {
    const fields = {};
    src.inputList.forEach(inp => inp.fieldRow.forEach(f => { if (f.name && f.isSerializable()) fields[f.name] = src.getFieldValue(f.name); }));
    return fields;
  }
  const alive = ws => ws && !(ws.isDisposed && ws.isDisposed());
  // البطاقة تبان كاملة في مساحة البرنامج (مش تحت قائمة البطاقات ولا برّه الشاشة)
  // (بعد ما بلوكلي يخلّص الرسم المؤجّل، عشان المقاسات تبقى صح)
  function reveal(ws, b) {
    setTimeout(() => {
      if (!alive(ws) || !b || b.isDeadOrDying() || !ws.scrollBoundsIntoView) return;
      const rm = Blockly.renderManagement;
      if (rm && rm.triggerQueuedRenders) try { rm.triggerQueuedRenders(ws); } catch (e) { /* */ }
      try { ws.scrollBoundsIntoView(b.getBoundingRectangleWithoutChildren ? b.getBoundingRectangleWithoutChildren() : b.getBoundingRectangle(), 14); } catch (e) { /* أثناء السحب */ }
    }, 30);
  }
  // البطاقة المنفصلة/الشبح: لونها الأصلي (شفاف شوية) بدل نقش "مقفول"
  function tint(ws) {
    if (!alive(ws)) return;
    ws.getAllBlocks(false).forEach(b => {
      const r = b.getSvgRoot && b.getSvgRoot();
      if (!r) return;
      if (!b.isEnabled()) r.style.setProperty('--blocklyDisabledPattern', b.getColour());
      r.classList.toggle('siraj-loose', !b.isEnabled() && !r.classList.contains('siraj-ghost'));
    });
  }
  // يصغّر البرنامج (لحد ٦٠٪ من الحجم العادي) لحد ما يبان كله، ويرجّعه للحجم العادي لما يصغر
  function fit(ws, focus) {
    if (!alive(ws) || (Blockly.Gesture && Blockly.Gesture.inProgress && Blockly.Gesture.inProgress())) return;
    const rm = Blockly.renderManagement; // الرسم المؤجّل يخلص الأول، عشان المقاسات تبقى حقيقية
    if (rm && rm.triggerQueuedRenders) try { rm.triggerQueuedRenders(ws); } catch (e) { /* */ }
    const box = ws.getBlocksBoundingBox(), m = ws.getMetricsManager().getViewMetrics();
    const w = box.right - box.left, h = box.bottom - box.top, base = ws.__base || 1;
    if (!(w > 0 && h > 0) || !(m.height > 0)) return;
    const s = Math.max(base * 0.6, Math.min(base, (m.height - 24) / h, (m.width - 24) / w));
    if (Math.abs(s - ws.scale) > 0.01) ws.setScale(s);
    const sc = ws.scale;
    if (w * sc <= m.width - 20 && h * sc <= m.height - 20) {
      // البرنامج كله يكفي: أوله فوق على الشمال بهامش صغير (لو مش ظاهر كله دلوقتي)
      const x = ws.scrollX + sc * box.left, y = ws.scrollY + sc * box.top; // مكان أول البرنامج على الشاشة
      const ok = x >= 4 && y >= 4 && x + w * sc <= m.width - 4 && y + h * sc <= m.height - 4;
      if (!ok) try { ws.scroll(12 - sc * box.left, 12 - sc * box.top); } catch (e) { /* */ }
    }
    else if (focus) reveal(ws, focus);
    else { try { ws.scrollBoundsIntoView(startOf(ws).getBoundingRectangleWithoutChildren(), 8); } catch (e) { /* */ } } // البداية تبان
  }
  const rectOf = b => b.getBoundingRectangle();
  const hits = (a, c) => a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
  // بطاقة متروكة فوق بطاقات ثانية: تنزل تحت كل البطاقات (من غير ما تتوصّل بحاجة)
  function untangle(ws, id) {
    if (!alive(ws)) return;
    const b = ws.getBlockById(id);
    if (!b || b.isDeadOrDying() || b.getParent() || b.type === 'siraj_start') return;
    const others = ws.getTopBlocks(false).filter(o => o !== b);
    if (!others.some(o => hits(rectOf(b), rectOf(o)))) return;
    const bottom = Math.max(...others.map(o => rectOf(o).bottom)), left = rectOf(startOf(ws)).left;
    const r = rectOf(b);
    b.moveBy(left - r.left, bottom + 16 - r.top);
    reveal(ws, b);
  }

  /* الشبح: البطاقة التالية في التلميح تظهر شفافة متوصّلة في مكانها الصحيح (مش فوق بطاقة ثانية).
     الضغط عليها يضيفها. ما تدخل في الكود ولا في العدّ (مقفولة)، وتختفي مع أي تعديل */
  function clearGhost(ws) {
    if (!alive(ws) || !ws.__ghost) return;
    const g = ws.getBlockById(ws.__ghost);
    ws.__ghostGone = ws.__ghost; ws.__ghost = null; ws.__gap = false;
    if (!g || g.isDeadOrDying()) return;
    Blockly.Events.disable();
    try { g.dispose(true); } finally { Blockly.Events.enable(); }
  }
  // مكان البطاقة التالية حسب الحل: بعد آخر بطاقة، أو جوّا التكرار/الكلمة، أو بعد البطاقة الأم لو الخطوة برّه
  function nextConn(ws, d) {
    let b = d.after;
    if (!b) return lastIn(startOf(ws)).nextConnection;
    // أول بطاقة في فرع "وإلا": نطلع لبطاقة لو/وإلا الأم وندخل في فرعها الثاني
    if (d.firstElse) {
      for (let k = d.afterDepth; k >= d.depth && b; k--) b = b.getSurroundParent();
      return b && b.getInput('ELSE') ? b.getInput('ELSE').connection : null;
    }
    if (d.afterDepth < d.depth && hasDo(b)) {
      const inner = b.getInputTargetBlock('DO');
      return inner ? lastIn(inner).nextConnection : b.getInput('DO').connection;
    }
    for (let k = d.afterDepth; k > d.depth && b; k--) b = b.getSurroundParent();
    return b ? lastIn(b).nextConnection : null;
  }
  function showGhost(ws, d) {
    clearGhost(ws);
    if (!alive(ws) || !d || d.kind !== 'next' || ws.remainingCapacity() < 2) return null; // آخر مكان فاضي: نسيبه للبطاقة الحقيقية
    const conn = nextConn(ws, d);
    if (!conn || conn.targetBlock()) return null;
    const [type, fields] = Array.isArray(d.step) ? d.step : [d.step];
    let g = null;
    Blockly.Events.disable();
    try {
      g = ws.newBlock(type);
      g.initSvg();
      for (const [f, v] of Object.entries(fields || {})) g.setFieldValue(String(v), f);
      g.setDisabledReason(true, 'SIRAJ_GHOST');
      g.setMovable(false); g.setEditable(false);
      g.getSvgRoot().classList.add('siraj-ghost');
      g.render();
      conn.connect(g.previousConnection);
    } catch (e) { if (g) g.dispose(false); g = null; } finally { Blockly.Events.enable(); }
    if (!g) return null;
    ws.__ghost = g.id;
    tint(ws);
    if (ws.__fit) ws.__fit(g); else reveal(ws, g);
    return g;
  }

  /* الفراغ (مراحل "أكمل البرنامج"): البرنامج جاهز وفيه بطاقة واحدة ناقصة في مكان رقم gap من الحل.
     يظهر مكانها شبح مخطّط بعلامة استفهام (ما يقول اسم البطاقة)، وأي بطاقة من القائمة تدخل مكانه.
     يرجع الشبح لو البرنامج الحالي = الحل ناقص تلك البطاقة، وإلا null (الطفل عدّل، فالفراغ اختفى) */
  function showGap(ws, solution, gap) {
    clearGhost(ws);
    if (!alive(ws) || !ws.rendered) return null;
    const s = flatSol(solution), w = s[gap];
    if (!w) return null;
    const want = s.filter((x, i) => i !== gap), a = flatWs(ws);
    const same = a.length === want.length && want.every((x, i) => a[i].type === x.type && a[i].d === x.d
      && Object.entries(x.fields).every(([k, v]) => String(a[i].b.getFieldValue(k)) === String(v)));
    if (!same) return null;
    let conn;
    if (gap === 0) conn = startOf(ws).nextConnection;
    else {
      const prev = a[gap - 1];
      if (w.d > prev.d) conn = prev.b.getInput('DO').connection;
      else { let b = prev.b; for (let k = prev.d; k > w.d && b; k--) b = b.getSurroundParent(); conn = b && b.nextConnection; }
    }
    if (!conn) return null;
    let g = null;
    Blockly.Events.disable();
    try {
      g = ws.newBlock(w.type);
      g.initSvg();
      for (const [f, v] of Object.entries(w.fields)) g.setFieldValue(String(v), f);
      g.setDisabledReason(true, 'SIRAJ_GHOST');
      g.setMovable(false); g.setEditable(false); g.setDeletable(false);
      g.getSvgRoot().classList.add('siraj-ghost', 'siraj-gap');
      g.render();
      // لو بعده بطاقات: نفصلها، نوصّل الشبح، ثم نرجّعها تحته
      const next = conn.targetBlock();
      if (next) next.previousConnection.disconnect();
      conn.connect(g.previousConnection);
      if (next) g.nextConnection.connect(next.previousConnection);
      // علامة استفهام فوق البطاقة بدل كلامها (مخفي بالـ CSS)
      const q = document.createElementNS(SVGNS, 'text');
      q.setAttribute('class', 'siraj-gap-q'); q.textContent = '?';
      const hw = g.getHeightWidth();
      q.setAttribute('x', hw.width / 2); q.setAttribute('y', hw.height / 2 + 9);
      g.getSvgRoot().appendChild(q);
    } catch (e) { if (g) g.dispose(false); g = null; } finally { Blockly.Events.enable(); }
    if (!g) return null;
    ws.__ghost = g.id; ws.__gap = true;
    tint(ws);
    if (ws.__fit) ws.__fit(g); else reveal(ws, g);
    return g;
  }

  /* الحشرة: دعسوقة صغيرة قاعدة على البطاقة الغلط في مراحل صيد الحشرات */
  const BUG = '<svg class="bug-svg" viewBox="0 0 44 44" width="38" height="38" aria-hidden="true"><g class="bug-body">'
    + '<path d="M16 9 Q13 3 9 4 M28 9 Q31 3 35 4" stroke="#20213a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '<circle cx="9" cy="4" r="2.4" fill="#20213a"/><circle cx="35" cy="4" r="2.4" fill="#20213a"/>'
    + '<path d="M8 22 L2 19 M8 28 L2 30 M10 34 L5 39 M36 22 L42 19 M36 28 L42 30 M34 34 L39 39" stroke="#20213a" stroke-width="2.6" stroke-linecap="round"/>'
    + '<circle cx="22" cy="14" r="8" fill="#20213a"/><circle cx="19" cy="13" r="2.2" fill="#fff"/><circle cx="25" cy="13" r="2.2" fill="#fff"/>'
    + '<circle cx="19.4" cy="13.4" r="1.1" fill="#20213a"/><circle cx="25.4" cy="13.4" r="1.1" fill="#20213a"/>'
    + '<ellipse cx="22" cy="28" rx="14" ry="13" fill="#ef3b36" stroke="#20213a" stroke-width="2.4"/>'
    + '<path d="M22 15.5 V41" stroke="#20213a" stroke-width="2.2"/>'
    + '<circle cx="15" cy="24" r="2.8" fill="#20213a"/><circle cx="29" cy="24" r="2.8" fill="#20213a"/><circle cx="14" cy="33" r="2.4" fill="#20213a"/><circle cx="30" cy="33" r="2.4" fill="#20213a"/>'
    + '<ellipse cx="16" cy="21" rx="3" ry="1.6" fill="#fff" opacity=".55" transform="rotate(-30 16 21)"/></g></svg>';
  const SVGNS = 'http://www.w3.org/2000/svg';
  // يحط الحشرة على البطاقة (فوق طرفها اليمين)، ويشيلها من أي بطاقة ثانية
  function bugOn(ws, b) {
    if (!alive(ws)) return null;
    ws.getAllBlocks(false).forEach(x => { const r = x.getSvgRoot && x.getSvgRoot(), o = r && r.querySelector(':scope > .siraj-bug'); if (o && x !== b) o.remove(); });
    if (!b || b.isDeadOrDying() || !b.getSvgRoot()) return null;
    const r = b.getSvgRoot();
    let g = r.querySelector(':scope > .siraj-bug');
    if (!g) {
      g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'siraj-bug');
      g.innerHTML = BUG;
      r.appendChild(g);
    }
    // على الطرف اليمين للبطاقة، في نص سطرها الأول (ما تغطّي كلام بطاقة ثانية)
    const w = b.width || b.getHeightWidth().width, h = Math.min(b.height || 48, 52);
    g.setAttribute('transform', `translate(${Math.max(40, w) - 14} ${h / 2 - 19})`);
    return g;
  }

  // يجهّز مساحة البرمجة لمرحلة معيّنة. on(event) يبلّغ التطبيق بما يحدث
  function makeWorkspace(div, types, max, on) {
    const narrow = div.clientWidth < 420, short = div.clientHeight < 330; // short = تلفون بالعرض
    FLY = short ? 0.75 : narrow ? 0.82 : 1;
    const ws = Blockly.inject(div, {
      toolbox: { kind: 'flyoutToolbox', contents: types.map(toolItem) },
      renderer: 'zelos', theme, rtl: false, sounds: false, trashcan: false, // الحذف بزر 🗑 أو بالسحب للقائمة
      // قائمة البطاقات في الأسفل بالعرض، عشان مساحة البرنامج تاخد كل عرض الشاشة
      horizontalLayout: true, toolboxPosition: 'end',
      plugins: { flyoutsHorizontalToolbox: 'siraj' },
      maxBlocks: max ? max + 1 : Infinity, // +1 لبطاقة البداية
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { startScale: narrow ? 0.85 : short ? 0.8 : 1, controls: false, wheel: false, pinch: true },
      grid: { spacing: 28, length: 3, colour: '#e3dbff', snap: false },
    });
    ws.__base = ws.scale;
    const start = ws.newBlock('siraj_start');
    start.initSvg(); start.render();
    start.setDeletable(false);
    start.moveBy(16, 14);
    ws.clearUndo(); // زر التراجع ما يمسح بطاقة البداية
    ws.addChangeListener(Blockly.Events.disableOrphans);
    // البطاقة المنفصلة (مش متوصّلة بـ start) تفضل بلونها، بخط متقطّع بدل التظليل المخطّط اللي يبان "مقفول"
    ws.addChangeListener(e => { if (!e.isUiEvent || e.type === Blockly.Events.BLOCK_DRAG) tint(ws); });
    // البطاقة اللي اتسابت لوحدها ما تقعد فوق بطاقة ثانية: تنزل تحت البرنامج في مكان فاضي
    ws.addChangeListener(e => { if (e.type === Blockly.Events.BLOCK_DRAG && !e.isStart) setTimeout(() => untangle(ws, e.blockId), 0); });
    // البرنامج كله يبان دايماً: لو كبر عن المساحة، البطاقات تصغر شوية بدل ما تستخبى تحت القائمة
    let fitT;
    const refit = f => { clearTimeout(fitT); fitT = setTimeout(() => fit(ws, f && f.id ? f : cursor ? ws.getBlockById(cursor) : null), 40); };
    ws.addChangeListener(e => { if (!e.isUiEvent || e.type === Blockly.Events.BLOCK_DRAG) refit(); });
    ws.__fit = refit;

    // بلوكلي ما بيعرف لو حجم مساحته اتغيّر (مثلاً لما لوحة بايثون تكبر)، فنبلّغه
    const ro = new ResizeObserver(() => { if (alive(ws)) { Blockly.svgResize(ws); refit(); } });
    ro.observe(div);

    // مكان الإضافة التالي: بطاقة عليها توهّج ذهبي. الضغط على بطاقة في البرنامج يغيّره،
    // والضغط على "start" أو مكان فاضي يرجّعه لآخر البرنامج
    let cursor = null;
    const setCursor = b => {
      const old = cursor && ws.getBlockById(cursor);
      if (old && old.getSvgRoot()) old.getSvgRoot().classList.remove('siraj-cursor');
      cursor = b && b.type !== 'siraj_start' ? b.id : null;
      if (cursor) b.getSvgRoot().classList.add('siraj-cursor');
    };
    ws.addChangeListener(e => {
      if (e.type === Blockly.Events.CLICK && e.workspaceId === ws.id && !(e.blockId && e.blockId === ws.__ghostGone)) setCursor(e.blockId ? ws.getBlockById(e.blockId) : null);
      if (e.type === Blockly.Events.BLOCK_DELETE && cursor && !ws.getBlockById(cursor)) cursor = null;
    });

    // الضغط على بطاقة في القائمة (في أي جزء منها) يضيفها مباشرة. نفرّق بين الضغطة والسحب بمسافة حركة الإصبع
    const fw = ws.getFlyout().getWorkspace();
    let down = null;
    div.addEventListener('pointerdown', e => {
      const t = e.target.closest ? e.target : null;
      const g = t && t.closest('.blocklyFlyout .blocklyDraggable'), gh = t && t.closest('.siraj-ghost');
      // شبح الفراغ (علامة الاستفهام) مش بطاقة تُضاف بالضغط: الطفل يختار من القائمة
      down = g || gh ? { id: g ? g.getAttribute('data-id') : null, ghost: !!gh && !g && !gh.classList.contains('siraj-gap'), x: e.clientX, y: e.clientY, p: e.pointerId, sel: cursor && ws.getBlockById(cursor) } : null;
    }, true);
    div.addEventListener('pointercancel', () => { down = null; }, true);
    // يضيف بطاقة جديدة (بنفس قيم الحقول) عند هذا الوصل
    function addAt(conn, type, fields) {
      // الإضافة والتوصيل حدث واحد، عشان زر التراجع يشيل البطاقة مرة واحدة (بدل ما تنفصل الأول ثم تختفي)
      Blockly.Events.setGroup(true);
      let b;
      try {
        b = Blockly.serialization.blocks.append({ type, fields }, ws, { recordUndo: true });
        conn.connect(b.previousConnection);
      } finally { Blockly.Events.setGroup(false); }
      setCursor(b); // البطاقة الجديدة هي مكان الإضافة التالي (ولو تكرار، الإضافة التالية تدخل جواه)
      reveal(ws, b);
      Sfx.snap();
      on({ added: type, block: b });
      return b;
    }
    ws.__addAt = addAt;
    div.addEventListener('pointerup', e => {
      if (!down || e.pointerId !== down.p || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down = null; return; }
      const id = down.id, sel = down.sel, onGhost = down.ghost;
      down = null;
      setTimeout(() => { if (!ws.isDisposed || !ws.isDisposed()) Blockly.hideChaff(); }, 0); // نقفل قائمة الكلمات لو اتفتحت بالضغطة
      if ((ws.isReadOnly && ws.isReadOnly()) || (ws.isDisposed && ws.isDisposed())) return;
      // الضغط على البطاقة الشبح (التلميح) يضيفها هي نفسها في مكانها
      if (onGhost) {
        // بعد ما بلوكلي يخلّص الضغطة نفسها (عشان ما يتعامل مع بطاقة اتشالت)
        setTimeout(() => {
          if (ws.isDisposed && ws.isDisposed()) return;
          const g = ws.__ghost && ws.getBlockById(ws.__ghost);
          if (!g || (ws.isReadOnly && ws.isReadOnly())) return;
          const conn = g.previousConnection.targetConnection, type = g.type, fields = fieldsOf(g);
          clearGhost(ws);
          if (!conn || conn.targetBlock() || ws.remainingCapacity() < 1) return;
          addAt(conn, type, fields);
        }, 0);
        return;
      }
      const src = fw.getBlockById(id);
      if (!src) return;
      // فراغ في البرنامج: البطاقة الجديدة تدخل مكانه (الشبح يتشال، والبطاقات اللي بعده ترجع تتوصّل)
      const gap = ws.__gap && ws.__ghost && ws.getBlockById(ws.__ghost);
      const gapConn = gap && !gap.isDeadOrDying() ? gap.previousConnection.targetConnection : null;
      clearGhost(ws); // الشبح ما ياخدش مكان البطاقة الحقيقية
      if (ws.remainingCapacity() < 1) { on({ full: true }); return; }
      // البطاقة الجديدة تاخد نفس قيم بطاقة القائمة (لون الضوء، اسم الصندوق، اسم الكلمة...)
      addAt(gapConn || target(ws, sel && !sel.isDeadOrDying() ? sel : null, src.type), src.type, fieldsOf(src));
    }, true);

    ws.addChangeListener(e => {
      if (e.type === Blockly.Events.BLOCK_CHANGE && e.element === 'field') on({ field: e.name, value: e.newValue });
      if (!e.isUiEvent) { clearGhost(ws); on({}); }
    });
    // حذف البطاقة المختارة (أو آخر بطاقة) بزر واحد، بدل السحب لسلة المهملات
    ws.__del = () => {
      if (ws.isReadOnly && ws.isReadOnly()) return false;
      clearGhost(ws);
      let b = cursor && ws.getBlockById(cursor);
      if (!b) { b = lastIn(startOf(ws)); if (hasDo(b) && b.getInputTargetBlock('DO')) b = lastIn(b.getInputTargetBlock('DO')); }
      if (!b || b.type === 'siraj_start' || !b.isDeletable()) return false;
      const prev = b.getPreviousBlock();
      b.dispose(true, true);
      setCursor(prev && !prev.isDeadOrDying() ? prev : null);
      return true;
    };
    ws.__ro = ro;
    return ws;
  }

  function dispose(ws) {
    Blockly.hideChaff();
    if (ws.__ro) ws.__ro.disconnect();
    ws.dispose();
  }

  // يحوّل البرنامج المربوط تحت "start" لقائمة أوامر ينفّذها سراج
  // init: حالة البداية في المرحلة {lamp: 'red'|'off', vars: {apples: 7}}. الشروط تُحسب هنا أثناء التحويل،
  // لأن البرنامج محدَّد تماماً: نتابع حالة المصباح (آخر ضوء) والصناديق مع كل أمر، فنعرف نتيجة كل "لو" في مكانها
  function compile(ws, init) {
    const ops = [], defs = {};
    const st = { lamp: (init && init.lamp) || 'off', vars: Object.assign({}, init && init.vars) };
    let halt = false, depth = 0;
    const err = (b, reason) => { ops.push({ id: b.id, op: 'error', reason }); halt = true; };
    const walk = b => {
      for (; b && !halt; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        const t = b.type, f = n => b.getFieldValue(n);
        if (t === 'siraj_if' || t === 'siraj_ifelse') {
          const c = CONDS[f('COND')], ok = !!(c && c.test(st));
          ops.push({ id: b.id, op: 'if', arg: ok });
          if (ok) walk(b.getInputTargetBlock('DO'));
          else if (t === 'siraj_ifelse') walk(b.getInputTargetBlock('ELSE'));
        } else if (t === 'light_on') { st.lamp = f('C'); ops.push({ id: b.id, op: 'light', arg: f('C') }); }
        else if (t === 'light_off') { st.lamp = 'off'; ops.push({ id: b.id, op: 'off' }); }
        else if (t === 'var_set') { st.vars[f('V')] = +f('N'); ops.push({ id: b.id, op: 'set', name: f('V'), arg: +f('N') }); }
        else if (t === 'var_add' || t === 'var_sub') {
          const n = t === 'var_add' ? +f('N') : -f('N');
          st.vars[f('V')] = (st.vars[f('V')] || 0) + n;
          ops.push({ id: b.id, op: 'add', name: f('V'), arg: n });
        }
        else if (t === 'siraj_repeat') {
          const n = +f('N');
          for (let k = 0; k < n && !halt; k++) { ops.push({ id: b.id, op: 'loop' }); walk(b.getInputTargetBlock('DO')); }
        } else if (t === 'func_def') defs[f('NAME')] = b;
        else if (t === 'func_call') {
          const d = defs[f('NAME')];
          if (!d) err(b, 'func_unknown');
          else if (!d.getInputTargetBlock('DO')) err(b, 'func_empty');
          else if (depth > 8) err(b, 'func_loop');
          else { ops.push({ id: b.id, op: 'call' }); depth++; walk(d.getInputTargetBlock('DO')); depth--; }
        }
        else if (t === 'siraj_say') ops.push({ id: b.id, op: 'say', arg: f('TEXT') });
        else if (t === 'pen_forward') ops.push({ id: b.id, op: 'forward', arg: +f('N') });
        else if (t === 'pen_right') ops.push({ id: b.id, op: 'turn', arg: +f('A') });
        else if (t === 'pen_left') ops.push({ id: b.id, op: 'turn', arg: -f('A') });
        else if (t === 'var_say') ops.push({ id: b.id, op: 'sayvar', name: f('V') });
        else ops.push({ id: b.id, op: t.replace(/^(siraj|go)_/, '') });
        if (ops.length > 2000) { if (depth) err(b, 'func_loop'); halt = true; }
      }
    };
    walk(startOf(ws).getNextBlock());
    return ops;
  }

  // مساحة مخفية (بدون رسم) لحساب أوامر الحل وكوده
  function headless(list) {
    const ws = new Blockly.Workspace();
    const s = ws.newBlock('siraj_start');
    load(ws, list, s.nextConnection);
    return ws;
  }
  function opsOf(list) { const ws = headless(list); const ops = compile(ws); ws.dispose(); return ops; }
  function countOf(list) { return list.reduce((n, s) => n + 1 + (Array.isArray(s) && s[2] ? countOf(s[2]) : 0) + (Array.isArray(s) && s[3] ? countOf(s[3]) : 0), 0); }

  // كود بايثون مع رقم السطر لكل بطاقة (عشان نلوّن السطر اللي شغّال)
  function toPython(ws) {
    PY.STATEMENT_PREFIX = '#@%1\n';
    PY.init(ws);
    let code = PY.blockToCode(startOf(ws).getNextBlock() || null) || '';
    if (Array.isArray(code)) code = code[0];
    PY.STATEMENT_PREFIX = null;
    const lines = [], map = {};
    let pending = null;
    code.split('\n').forEach(l => {
      const m = l.match(/^\s*#@'?(.*?)'?$/);
      if (m) { pending = m[1]; return; }
      if (!l.trim()) return;
      if (pending) { map[pending] = lines.length; pending = null; }
      lines.push(l);
    });
    return { lines, map };
  }
  // كود بطاقة واحدة من صيغة الحل (لتلميح "جرّب هذه")
  function lineOf(step) {
    const [type, fields] = Array.isArray(step) ? step : [step];
    const ws = headless([[type, fields]]);
    const l = toPython(ws).lines[0] || '';
    ws.dispose();
    return l.trim();
  }

  // البرنامج الحالي كقائمة مسطّحة (للمقارنة بالحل في التلميح)
  function flatWs(ws) {
    const out = [];
    // br: الفرع (ELSE لبطاقات "وإلا")، first: أول بطاقة في فرع "وإلا" (الشبح يدخل هناك)
    const walk = (b, d, br, first) => {
      for (; b; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        out.push({ b, type: b.type, d, br, first }); first = false;
        if (hasDo(b)) walk(b.getInputTargetBlock('DO'), d + 1, '', false);
        if (b.getInput('ELSE')) walk(b.getInputTargetBlock('ELSE'), d + 1, 'ELSE', true);
      }
    };
    walk(startOf(ws).getNextBlock(), 0, '', false);
    return out;
  }
  function flatSol(list, d = 0, out = [], br = '', first = false) {
    for (const s of list) {
      const [type, fields, inner, els] = Array.isArray(s) ? s : [s];
      out.push({ step: s, type, fields: fields || {}, d, br, first }); first = false;
      if (inner) flatSol(inner, d + 1, out, '', false);
      if (els) flatSol(els, d + 1, out, 'ELSE', true);
    }
    return out;
  }
  // أول اختلاف بين برنامج الطفل والحل: {kind: field|wrong|next|extra, block, step, line}
  function diff(ws, solution) {
    const a = flatWs(ws), s = flatSol(solution);
    for (let i = 0; i < s.length; i++) {
      const x = a[i], w = s[i];
      if (!x) return { kind: 'next', step: w.step, type: w.type, line: lineOf(w.step), after: a[i - 1] && a[i - 1].b, afterDepth: a[i - 1] ? a[i - 1].d : -1, depth: w.d, firstElse: !!w.first };
      const sameFields = Object.entries(w.fields).every(([k, v]) => String(x.b.getFieldValue(k)) === String(v));
      const samePlace = x.d === w.d && (x.br || '') === (w.br || '');
      if (x.type === w.type && samePlace && sameFields) continue;
      if (x.type === w.type && samePlace) return { kind: 'field', block: x.b, line: lineOf(w.step) };
      return { kind: 'wrong', block: x.b, line: lineOf(w.step) };
    }
    if (a.length > s.length) return { kind: 'extra', block: a[s.length].b };
    return null;
  }
  // توهّج على بطاقة في البرنامج أو في القائمة
  function glow(b, on) { const r = b && b.getSvgRoot && b.getSvgRoot(); if (r) r.classList.toggle('siraj-hint', on !== false); }
  function glowTool(ws, step) {
    const [type, fields] = Array.isArray(step) ? step : [step];
    const fl = ws.getFlyout && ws.getFlyout();
    if (!fl) return;
    const list = fl.getWorkspace().getTopBlocks(false).filter(b => b.type === type);
    const k = MAIN[type];
    const best = list.find(b => !k || !fields || fields[k] == null || b.getFieldValue(k) === String(fields[k])) || list[0];
    glow(best);
    showTool(ws, best);
  }

  /* قائمة البطاقات بالعرض: على التلفون ما تكفي كل البطاقات، فنحرّكها لتبان البطاقة المطلوبة */
  const flyWs = ws => { const fl = ws && !(ws.isDisposed && ws.isDisposed()) && ws.getFlyout && ws.getFlyout(); return fl ? fl.getWorkspace() : null; };
  function slide(ws, to, o) {
    const fw = flyWs(ws); if (!fw || !fw.scrollbar || !root.gsap) return null;
    const p = { x: -fw.scrollX };
    return gsap.to(p, Object.assign({ x: to, duration: 0.6, ease: 'power2.inOut', onUpdate() { const w = flyWs(ws); if (!w || !w.scrollbar) { this.kill(); return; } w.scrollbar.set(p.x, 0); } }, o));
  }
  // تحريك القائمة حتى تظهر هذه البطاقة كاملة
  function showTool(ws, b) {
    const fw = flyWs(ws); if (!fw || !b || !b.getSvgRoot()) return;
    const r = b.getSvgRoot().getBoundingClientRect(), v = fw.getParentSvg().getBoundingClientRect();
    if (r.left >= v.left && r.right <= v.right) return;
    const m = fw.getMetricsManager(), max = Math.max(0, m.getScrollMetrics().width - m.getViewMetrics().width);
    slide(ws, Math.max(0, Math.min(max, -fw.scrollX + (r.left - v.left) - 12)));
  }
  // لمحة عند فتح المرحلة: القائمة تتحرك للآخر وترجع، عشان الطفل يعرف إن فيه بطاقات أكثر
  function peek(ws) {
    const fw = flyWs(ws); if (!fw) return;
    const m = fw.getMetricsManager(), max = m.getScrollMetrics().width - m.getViewMetrics().width;
    if (max < 20) return;
    const x0 = -fw.scrollX, tw = slide(ws, max, { duration: 0.9, yoyo: true, repeat: 1, repeatDelay: 0.5 });
    // الطفل لمس: نقف، ونرجع القائمة لأولها عشان أول البطاقات (الجديدة والمطلوبة) تبان
    if (tw) ws.getParentSvg().parentNode.addEventListener('pointerdown', () => {
      if (!tw.isActive() && tw.progress() >= 1) return;
      tw.kill();
      const w = flyWs(ws); if (w && w.scrollbar) w.scrollbar.set(x0, 0);
    }, { once: true, capture: true });
  }
  function clearGlow(ws) {
    [ws, ws.getFlyout && ws.getFlyout() && ws.getFlyout().getWorkspace()].forEach(w => w && w.getAllBlocks(false).forEach(b => glow(b, false)));
  }
  // يمسح البرنامج (ما عدا البداية)
  function clear(ws) { const s = startOf(ws), n = s.getNextBlock(); if (n) n.dispose(false); ws.getTopBlocks(false).forEach(b => { if (b !== s) b.dispose(false); }); }

  root.Blocks = {
    DEFS, COLORS, LIGHTS, LIGHT_DOT, VARS, FUNCS, CONDS, makeWorkspace, dispose, compile, python: toPython, countBlocks, startOf,
    load, opsOf, countOf, diff, glow, glowTool, clearGlow, clear, lineOf, peek, showTool,
    ghost: showGhost, gap: showGap, stepAt: (list, i) => (flatSol(list)[i] || {}).step, clearGhost, reveal, bugOn, BUG, tint,
  };
})(window);
