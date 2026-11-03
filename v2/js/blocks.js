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
  };

  const COLORS = { talk: '#e8579a', act: '#f08a24', move: '#3d8bff', pen: '#16a865', loop: '#8b5cf6', start: '#ffb400', light: '#4b4f6e', box: '#c27c0e', func: '#d6336c' };
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
  ];
  Blockly.common.defineBlocks(Blockly.common.createBlockDefinitionsFromJsonArray(DEFS));
  // إصبع الطفل يهتز: الضغطة ما تتحوّل لسحب يفصل البطاقة إلا بعد ١٢ بكسل (الافتراضي ٥)
  if (Blockly.config) Blockly.config.dragRadius = 12;
  // لا قائمة ضغط طويل (تكرار/حذف/مساعدة بالكلام) تظهر فجأة تحت إصبع الطفل؛ الحذف بزر 🗑 والتراجع بزر ↶
  try { Blockly.ContextMenuRegistry.registry.reset(); } catch (e) { /* نسخة بلوكلي مختلفة */ }

  // الحقل الأساسي لكل بطاقة (للكتابة المختصرة 'light_on:red' في المراحل)
  const MAIN = { siraj_say: 'TEXT', light_on: 'C', var_set: 'V', var_add: 'V', var_sub: 'V', var_say: 'V', func_def: 'NAME', func_call: 'NAME' };

  // كود بايثون لكل بطاقة
  const G = PY.forBlock;
  const body = (b, gen) => gen.statementToCode(b, 'DO') || gen.INDENT + 'pass\n';
  G.siraj_start = () => '';
  G.siraj_say = b => `say(${JSON.stringify(b.getFieldValue('TEXT'))})\n`;
  G.siraj_wave = () => 'wave()\n';
  G.siraj_jump = () => 'jump()\n';
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
  function target(ws, sel, type) {
    if (type === 'func_def') sel = null;
    if (type === 'func_call' && sel) for (let q = sel; q; q = q.getSurroundParent()) if (q.type === 'func_def') sel = q;
    if (sel && !sel.isDeadOrDying() && sel.type !== 'siraj_start' && sel.isEnabled()) {
      if (hasDo(sel) && !(type === 'func_call' && sel.type === 'func_def')) {
        const inner = sel.getInputTargetBlock('DO');
        return inner ? lastIn(inner).nextConnection : sel.getInput('DO').connection;
      }
      return sel.nextConnection;
    }
    const last = lastIn(startOf(ws));
    const into = hasDo(last) && !last.getInputTargetBlock('DO') && !(last.type === 'func_def' && /^func_/.test(type || ''));
    return into ? last.getInput('DO').connection : last.nextConnection;
  }

  // يبني برنامجاً من صيغة الحل: 'نوع' أو ['نوع', {حقل: قيمة}] أو ['نوع', {..}, [بطاقات داخلية]]
  // (بدون أحداث، عشان تحميل برنامج جاهز ما يشغّل أصوات تغيير الحقول)
  function load(ws, list, conn) {
    Blockly.Events.disable();
    try { loadIn(ws, list, conn); } finally { Blockly.Events.enable(); }
    if (ws.rendered) ws.getAllBlocks(false).forEach(b => b.setDisabledReason && b.setDisabledReason(false, 'ORPHANED_BLOCK'));
  }
  function loadIn(ws, list, conn) {
    for (const step of list) {
      const [type, fields, inner] = Array.isArray(step) ? step : [step];
      const b = ws.newBlock(type);
      if (ws.rendered) { b.initSvg(); b.render(); }
      for (const [f, v] of Object.entries(fields || {})) b.setFieldValue(String(v), f);
      conn.connect(b.previousConnection);
      if (inner) loadIn(ws, inner, b.getInput('DO').connection);
      conn = b.nextConnection;
    }
  }

  // يجهّز مساحة البرمجة لمرحلة معيّنة. on(event) يبلّغ التطبيق بما يحدث
  function makeWorkspace(div, types, max, on) {
    const ws = Blockly.inject(div, {
      toolbox: { kind: 'flyoutToolbox', contents: types.map(toolItem) },
      renderer: 'zelos', theme, rtl: false, sounds: false, trashcan: true,
      // قائمة البطاقات في الأسفل بالعرض، عشان مساحة البرنامج تاخد كل عرض الشاشة
      horizontalLayout: true, toolboxPosition: 'end',
      maxBlocks: max ? max + 1 : Infinity, // +1 لبطاقة البداية
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { startScale: div.clientWidth < 420 ? 0.88 : 1, controls: false, wheel: false, pinch: true },
      grid: { spacing: 28, length: 3, colour: '#e3dbff', snap: false },
    });
    const start = ws.newBlock('siraj_start');
    start.initSvg(); start.render();
    start.setDeletable(false);
    start.moveBy(24, 20);
    ws.clearUndo(); // زر التراجع ما يمسح بطاقة البداية
    ws.addChangeListener(Blockly.Events.disableOrphans);

    // بلوكلي ما بيعرف لو حجم مساحته اتغيّر (مثلاً لما لوحة بايثون تكبر)، فنبلّغه
    const ro = new ResizeObserver(() => Blockly.svgResize(ws));
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
      if (e.type === Blockly.Events.CLICK && e.workspaceId === ws.id) setCursor(e.blockId ? ws.getBlockById(e.blockId) : null);
      if (e.type === Blockly.Events.BLOCK_DELETE && cursor && !ws.getBlockById(cursor)) cursor = null;
    });

    // الضغط على بطاقة في القائمة (في أي جزء منها) يضيفها مباشرة. نفرّق بين الضغطة والسحب بمسافة حركة الإصبع
    const fw = ws.getFlyout().getWorkspace();
    let down = null;
    div.addEventListener('pointerdown', e => {
      const g = e.target.closest && e.target.closest('.blocklyFlyout .blocklyDraggable');
      down = g ? { id: g.getAttribute('data-id'), x: e.clientX, y: e.clientY, p: e.pointerId, sel: cursor && ws.getBlockById(cursor) } : null;
    }, true);
    div.addEventListener('pointercancel', () => { down = null; }, true);
    div.addEventListener('pointerup', e => {
      if (!down || e.pointerId !== down.p || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down = null; return; }
      const id = down.id, sel = down.sel;
      down = null;
      setTimeout(() => { if (!ws.isDisposed || !ws.isDisposed()) Blockly.hideChaff(); }, 0); // نقفل قائمة الكلمات لو اتفتحت بالضغطة
      if ((ws.isReadOnly && ws.isReadOnly()) || (ws.isDisposed && ws.isDisposed())) return;
      const src = fw.getBlockById(id);
      if (!src) return;
      if (ws.remainingCapacity() < 1) { on({ full: true }); return; }
      const conn = target(ws, sel, src.type);
      // البطاقة الجديدة تاخد نفس قيم بطاقة القائمة (لون الضوء، اسم الصندوق، اسم الكلمة...)
      const fields = {};
      src.inputList.forEach(inp => inp.fieldRow.forEach(f => { if (f.name && f.isSerializable()) fields[f.name] = src.getFieldValue(f.name); }));
      // الإضافة والتوصيل حدث واحد، عشان زر التراجع يشيل البطاقة مرة واحدة (بدل ما تنفصل الأول ثم تختفي)
      Blockly.Events.setGroup(true);
      let b;
      try {
        b = Blockly.serialization.blocks.append({ type: src.type, fields }, ws, { recordUndo: true });
        conn.connect(b.previousConnection);
      } finally { Blockly.Events.setGroup(false); }
      setCursor(b); // البطاقة الجديدة هي مكان الإضافة التالي (ولو تكرار، الإضافة التالية تدخل جواه)
      Sfx.snap();
      on({ added: src.type, block: b });
    }, true);

    ws.addChangeListener(e => {
      if (e.type === Blockly.Events.BLOCK_CHANGE && e.element === 'field') on({ field: e.name, value: e.newValue });
      if (!e.isUiEvent) on({});
    });
    // حذف البطاقة المختارة (أو آخر بطاقة) بزر واحد، بدل السحب لسلة المهملات
    ws.__del = () => {
      if (ws.isReadOnly && ws.isReadOnly()) return false;
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
  function compile(ws) {
    const ops = [], defs = {};
    let halt = false, depth = 0;
    const err = (b, reason) => { ops.push({ id: b.id, op: 'error', reason }); halt = true; };
    const walk = b => {
      for (; b && !halt; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        const t = b.type, f = n => b.getFieldValue(n);
        if (t === 'siraj_repeat') {
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
        else if (t === 'light_on') ops.push({ id: b.id, op: 'light', arg: f('C') });
        else if (t === 'light_off') ops.push({ id: b.id, op: 'off' });
        else if (t === 'var_set') ops.push({ id: b.id, op: 'set', name: f('V'), arg: +f('N') });
        else if (t === 'var_add') ops.push({ id: b.id, op: 'add', name: f('V'), arg: +f('N') });
        else if (t === 'var_sub') ops.push({ id: b.id, op: 'add', name: f('V'), arg: -f('N') });
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
  function countOf(list) { return list.reduce((n, s) => n + 1 + (Array.isArray(s) && s[2] ? countOf(s[2]) : 0), 0); }

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
    const walk = (b, d) => { for (; b; b = b.getNextBlock()) { if (!b.isEnabled()) continue; out.push({ b, type: b.type, d }); if (hasDo(b)) walk(b.getInputTargetBlock('DO'), d + 1); } };
    walk(startOf(ws).getNextBlock(), 0);
    return out;
  }
  function flatSol(list, d = 0, out = []) {
    for (const s of list) {
      const [type, fields, inner] = Array.isArray(s) ? s : [s];
      out.push({ step: s, type, fields: fields || {}, d });
      if (inner) flatSol(inner, d + 1, out);
    }
    return out;
  }
  // أول اختلاف بين برنامج الطفل والحل: {kind: field|wrong|next|extra, block, step, line}
  function diff(ws, solution) {
    const a = flatWs(ws), s = flatSol(solution);
    for (let i = 0; i < s.length; i++) {
      const x = a[i], w = s[i];
      if (!x) return { kind: 'next', step: w.step, type: w.type, line: lineOf(w.step), after: a[i - 1] && a[i - 1].b };
      const sameFields = Object.entries(w.fields).every(([k, v]) => String(x.b.getFieldValue(k)) === String(v));
      if (x.type === w.type && x.d === w.d && sameFields) continue;
      if (x.type === w.type && x.d === w.d) return { kind: 'field', block: x.b, line: lineOf(w.step) };
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
    DEFS, COLORS, LIGHTS, LIGHT_DOT, VARS, FUNCS, makeWorkspace, dispose, compile, python: toPython, countBlocks, startOf,
    load, opsOf, countOf, diff, glow, glowTool, clearGlow, clear, lineOf, peek, showTool,
  };
})(window);
