/* بطاقات البرمجة (مبنية على مكتبة بلوكلي من مؤسسة راسبيري باي، رخصة أباتشي 2.0).
   كل بطاقة مكتوب عليها كود بايثون الحقيقي. لما الطفل يضيف بطاقة، سراج يقول معناها بالعربي. */
(function (root) {
  'use strict';

  const PY = python.pythonGenerator;
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
  };

  const COLORS = { talk: '#e8579a', act: '#f08a24', move: '#3d8bff', pen: '#16a865', loop: '#8b5cf6', start: '#ffb400' };
  const stmt = { previousStatement: null, nextStatement: null };

  // تعريف البطاقات: النص المكتوب هو كود بايثون
  const DEFS = [
    { type: 'siraj_start', message0: '%1 start', args0: [icon(ico.flag)], nextStatement: null, colour: COLORS.start },
    Object.assign({ type: 'siraj_say', message0: '%1 say(" %2 ")', args0: [icon(ico.say),
      { type: 'field_dropdown', name: 'TEXT', options: T.PHRASES.map(p => [p[2] + ' ' + p[0], p[0]]) }], colour: COLORS.talk }, stmt),
    Object.assign({ type: 'siraj_wave', message0: '%1 wave()', args0: [icon(ico.wave)], colour: COLORS.act }, stmt),
    Object.assign({ type: 'siraj_jump', message0: '%1 jump()', args0: [icon(ico.jump)], colour: COLORS.act }, stmt),
    Object.assign({ type: 'pen_forward', message0: '%1 forward( %2 )', args0: [icon(ico.pen),
      { type: 'field_dropdown', name: 'N', options: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']] }], colour: COLORS.pen }, stmt),
    Object.assign({ type: 'pen_right', message0: '%1 right( %2 )', args0: [icon(ico.right), { type: 'field_dropdown', name: 'A', options: [['90', '90']] }], colour: COLORS.pen }, stmt),
    Object.assign({ type: 'pen_left', message0: '%1 left( %2 )', args0: [icon(ico.left), { type: 'field_dropdown', name: 'A', options: [['90', '90']] }], colour: COLORS.pen }, stmt),
    // التحرك على اللوحة باتجاهات الشاشة: أسماؤها move_ عشان ما تتلخبط مع right و left في الرسم (الاستدارة)
    Object.assign({ type: 'go_up', message0: '%1 move_up()', args0: [icon(ico.arrow(0))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'go_down', message0: '%1 move_down()', args0: [icon(ico.arrow(180))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'go_left', message0: '%1 move_left()', args0: [icon(ico.arrow(270))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'go_right', message0: '%1 move_right()', args0: [icon(ico.arrow(90))], colour: COLORS.move }, stmt),
    Object.assign({ type: 'siraj_repeat', message0: '%1 for i in range( %2 ):', args0: [icon(ico.loop),
      { type: 'field_dropdown', name: 'N', options: [2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => [String(n), String(n)]) }],
      message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: COLORS.loop }, stmt),
  ];
  Blockly.common.defineBlocks(Blockly.common.createBlockDefinitionsFromJsonArray(DEFS));

  // كود بايثون لكل بطاقة
  const G = PY.forBlock;
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
  G.siraj_repeat = (b, gen) => `for i in range(${b.getFieldValue('N')}):\n${gen.statementToCode(b, 'DO') || gen.INDENT + 'pass\n'}`;

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

  // وين تدخل البطاقة الجديدة؟
  //  - لو بطاقة تكرار مختارة: في آخر ما بداخلها
  //  - لو بطاقة ثانية مختارة: بعدها مباشرة (حتى لو كانت داخل تكرار)
  //  - غير كده: في آخر البرنامج، وإذا آخر بطاقة تكرار فاضي ندخل جواه
  function target(ws, sel) {
    if (sel && !sel.isDeadOrDying() && sel.type !== 'siraj_start' && sel.isEnabled()) {
      if (sel.type === 'siraj_repeat') {
        const inner = sel.getInputTargetBlock('DO');
        return inner ? lastIn(inner).nextConnection : sel.getInput('DO').connection;
      }
      return sel.nextConnection;
    }
    const last = lastIn(startOf(ws));
    if (last.type === 'siraj_repeat' && !last.getInputTargetBlock('DO')) return last.getInput('DO').connection;
    return last.nextConnection;
  }

  // يجهّز مساحة البرمجة لمرحلة معيّنة. on(event) يبلّغ التطبيق بما يحدث
  function makeWorkspace(div, types, max, on) {
    const ws = Blockly.inject(div, {
      toolbox: { kind: 'flyoutToolbox', contents: types.map(t => ({ kind: 'block', type: t })) },
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
      setTimeout(() => Blockly.hideChaff(), 0); // نقفل قائمة الكلمات لو اتفتحت بالضغطة
      if (ws.isReadOnly && ws.isReadOnly()) return;
      const src = fw.getBlockById(id);
      if (!src) return;
      if (ws.remainingCapacity() < 1) { on({ full: true }); return; }
      const conn = target(ws, sel);
      const b = ws.newBlock(src.type);
      b.initSvg(); b.render();
      conn.connect(b.previousConnection);
      setCursor(b); // البطاقة الجديدة هي مكان الإضافة التالي (ولو تكرار، الإضافة التالية تدخل جواه)
      Sfx.snap();
      on({ added: src.type });
    }, true);

    ws.addChangeListener(e => {
      if (e.type === Blockly.Events.BLOCK_CHANGE && e.element === 'field' && e.name === 'TEXT') on({ phrase: e.newValue });
      if (!e.isUiEvent) on({});
    });
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
    const ops = [];
    const walk = b => {
      for (; b; b = b.getNextBlock()) {
        if (!b.isEnabled()) continue;
        const t = b.type;
        if (t === 'siraj_repeat') {
          const n = +b.getFieldValue('N');
          for (let k = 0; k < n; k++) { ops.push({ id: b.id, op: 'loop' }); walk(b.getInputTargetBlock('DO')); }
        } else if (t === 'siraj_say') ops.push({ id: b.id, op: 'say', arg: b.getFieldValue('TEXT') });
        else if (t === 'pen_forward') ops.push({ id: b.id, op: 'forward', arg: +b.getFieldValue('N') });
        else if (t === 'pen_right') ops.push({ id: b.id, op: 'turn', arg: +b.getFieldValue('A') });
        else if (t === 'pen_left') ops.push({ id: b.id, op: 'turn', arg: -b.getFieldValue('A') });
        else ops.push({ id: b.id, op: t.replace(/^(siraj|go)_/, '') });
        if (ops.length > 2000) break;
      }
    };
    walk(startOf(ws).getNextBlock());
    return ops;
  }

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

  root.Blocks = { DEFS, COLORS, makeWorkspace, dispose, compile, python: toPython, countBlocks, startOf };
})(window);
