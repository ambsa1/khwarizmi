/* محرك عمران: بناء برنامج منيب وتنفيذه على اللوحة. يعمل في المتصفح وفي node (للاختبار). */
(function (root) {
  'use strict';

  // الاتجاهات: 0 فوق، 1 يمين، 2 تحت، 3 يسار
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const MAX_STEPS = 1000;

  // البطاقات المتاحة في لوحة البطاقات، وكل واحدة تصنع عقدة في البرنامج
  const KINDS = {
    move:        () => ({ type: 'move' }),
    turn_left:   () => ({ type: 'turn_left' }),
    turn_right:  () => ({ type: 'turn_right' }),
    pick:        () => ({ type: 'pick' }),
    for:         () => ({ type: 'for', n: 2, body: [] }),
    if_dates:    () => ({ type: 'if', cond: 'dates', body: [] }),
    if_wall:     () => ({ type: 'if', cond: 'wall', body: [] }),
    ifelse_wall: () => ({ type: 'ifelse', cond: 'wall', body: [], orelse: [] }),
    while_goal:  () => ({ type: 'while', cond: 'not_goal', body: [] }),
  };

  const COND_CODE = { dates: 'dates_here()', wall: 'wall_ahead()', not_goal: 'not at_goal()' };

  let nextId = 1;
  function makeBlock(kind) {
    const b = KINDS[kind]();
    b.id = 'b' + (nextId++);
    b.kind = kind;
    return b;
  }

  function isContainer(b) { return !!b.body; }

  // الحل في ملف المراحل مكتوب بصيغة مختصرة، وهنا نحوله لعقد برنامج
  function fromCompact(list) {
    return list.map(item => {
      if (typeof item === 'string') return makeBlock(item);
      const [t] = item;
      if (t === 'for') { const b = makeBlock('for'); b.n = item[1]; b.body = fromCompact(item[2]); return b; }
      if (t === 'if') { const b = makeBlock(item[1] === 'dates' ? 'if_dates' : 'if_wall'); b.body = fromCompact(item[2]); return b; }
      if (t === 'ifelse') { const b = makeBlock('ifelse_wall'); b.body = fromCompact(item[2]); b.orelse = fromCompact(item[3]); return b; }
      if (t === 'while') { const b = makeBlock('while_goal'); b.body = fromCompact(item[1]); return b; }
      throw new Error('unknown block ' + t);
    });
  }

  function countBlocks(list) {
    let n = 0;
    for (const b of list) {
      n += 1;
      if (b.body) n += countBlocks(b.body);
      if (b.orelse) n += countBlocks(b.orelse);
    }
    return n;
  }

  function kindsUsed(list, out = new Set()) {
    for (const b of list) {
      out.add(b.kind);
      if (b.body) kindsUsed(b.body, out);
      if (b.orelse) kindsUsed(b.orelse, out);
    }
    return out;
  }

  // اسم عدّاد التكرار حسب العمق: i ثم j ثم k (مثل بايثون الحقيقي)
  const VARS = ['i', 'j', 'k', 'm', 'n'];
  const loopVar = depth => VARS[Math.min(depth || 0, VARS.length - 1)];

  // سطر بايثون الذي تمثله البطاقة. depth = عدد التكرارات التي فوقها
  function blockCode(b, depth) {
    switch (b.type) {
      case 'for': return 'for ' + loopVar(depth) + ' in range(' + b.n + '):';
      case 'if': case 'ifelse': return 'if ' + COND_CODE[b.cond] + ':';
      case 'while': return 'while ' + COND_CODE[b.cond] + ':';
      default: return b.type + '()';
    }
  }

  function toPython(list, indent = '', depth = 0) {
    const lines = [];
    for (const b of list) {
      lines.push(indent + blockCode(b, depth));
      const d = depth + (b.type === 'for' ? 1 : 0);
      if (b.body) {
        lines.push(...(b.body.length ? toPython(b.body, indent + '    ', d) : [indent + '    pass']));
      }
      if (b.orelse) {
        lines.push(indent + 'else:');
        lines.push(...(b.orelse.length ? toPython(b.orelse, indent + '    ', d) : [indent + '    pass']));
      }
    }
    return lines;
  }

  // بطاقة "إذا وإلا" مكانها الثاني فارغ؟ (نطلب من الطفل يملاه قبل التشغيل)
  function emptyElse(list) {
    for (const b of list) {
      if (b.orelse && !b.orelse.length) return b;
      const r = (b.body && emptyElse(b.body)) || (b.orelse && emptyElse(b.orelse));
      if (r) return r;
    }
    return null;
  }

  function hasFor(list) {
    return list.some(b => b.type === 'for' || (b.body && hasFor(b.body)) || (b.orelse && hasFor(b.orelse)));
  }

  class Stop {
    constructor(reason, id) { this.reason = reason; this.id = id; }
  }
  class Done {}

  // ينفّذ البرنامج ويرجع قائمة أحداث للرسوم المتحركة، ونتيجة نهائية
  function run(program, level) {
    const cells = level.grid.map(r => r.split(''));
    const H = cells.length, W = cells[0].length;
    let [x, y, d] = level.start;
    let dates = 0;
    cells.forEach(r => r.forEach(c => { if (c === 'D') dates++; }));
    const hasGoal = level.grid.some(r => r.indexOf('G') >= 0);
    const events = [];
    let steps = 0;

    const at = (cx, cy) => (cx < 0 || cy < 0 || cx >= W || cy >= H) ? '#' : cells[cy][cx];
    const ahead = () => at(x + DIRS[d][0], y + DIRS[d][1]);
    const test = cond => {
      if (cond === 'dates') return cells[y][x] === 'D';
      if (cond === 'wall') return ahead() === '#';
      return cells[y][x] !== 'G';
    };
    const ev = (id, kind, extra) => events.push(Object.assign({ id, kind, x, y, d }, extra));
    // منيب ينهي البرنامج وحده بمجرد أن تكتمل المهمة. لو حصل هذا وتكرار for لسه عنده لفّات،
    // نسجّل كم لفّة كانت تكفي، عشان نعلّم الطفل إن بايثون الحقيقي كان سيكمل العدّ
    const finished = () => dates === 0 && (!hasGoal || cells[y][x] === 'G');
    const loops = [];
    let early = null;
    const checkDone = () => {
      if (!finished()) return;
      for (let k = loops.length - 1; k >= 0; k--) {
        if (loops[k].i < loops[k].n - 1) { early = { id: loops[k].id, used: loops[k].i + 1 }; break; }
      }
      throw new Done();
    };

    function exec(list) {
      for (const b of list) {
        if (++steps > MAX_STEPS) throw new Stop('too_long', b.id);
        switch (b.type) {
          case 'move': {
            const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
            const c = at(nx, ny);
            if (c === '#') { ev(b.id, 'bump'); throw new Stop('wall', b.id); }
            x = nx; y = ny;
            if (c === 'W') { ev(b.id, 'splash'); throw new Stop('water', b.id); }
            ev(b.id, 'move');
            checkDone();
            break;
          }
          case 'turn_left': d = (d + 3) % 4; ev(b.id, 'turn', { dir: -1 }); break;
          case 'turn_right': d = (d + 1) % 4; ev(b.id, 'turn', { dir: 1 }); break;
          case 'pick':
            if (cells[y][x] !== 'D') { ev(b.id, 'nopick'); throw new Stop('no_dates', b.id); }
            cells[y][x] = '.'; dates--;
            ev(b.id, 'pick');
            checkDone();
            break;
          case 'for': {
            const loop = { id: b.id, i: 0, n: b.n };
            loops.push(loop);
            for (; loop.i < b.n; loop.i++) { ev(b.id, 'check', { result: true }); exec(b.body); }
            loops.pop();
            break;
          }
          case 'if': {
            const t = test(b.cond);
            ev(b.id, 'check', { result: t });
            if (t) exec(b.body);
            break;
          }
          case 'ifelse': {
            const t = test(b.cond);
            ev(b.id, 'check', { result: t });
            exec(t ? b.body : b.orelse);
            break;
          }
          case 'while': {
            // لو رجع منيب لنفس المكان والاتجاه وعدد التمر، فالتكرار لن ينتهي أبداً
            const seen = new Set();
            for (;;) {
              if (++steps > MAX_STEPS) throw new Stop('too_long', b.id);
              const state = x + ',' + y + ',' + d + ',' + dates;
              if (seen.has(state)) throw new Stop('too_long', b.id);
              seen.add(state);
              const t = test(b.cond);
              ev(b.id, 'check', { result: t });
              if (!t) break;
              exec(b.body);
            }
            break;
          }
        }
      }
    }

    if (!program.length) return { events, ok: false, reason: 'empty' };
    try {
      exec(program);
    } catch (e) {
      if (e instanceof Done) return early ? { events, ok: true, early } : { events, ok: true };
      if (e instanceof Stop) return { events, ok: false, reason: e.reason, failId: e.id };
      throw e;
    }
    if (hasGoal && cells[y][x] !== 'G') return { events, ok: false, reason: 'not_goal' };
    if (dates > 0) return { events, ok: false, reason: 'dates_left' };
    return { events, ok: true };
  }

  const api = { DIRS, KINDS, makeBlock, fromCompact, countBlocks, kindsUsed, blockCode, toPython, emptyElse, hasFor, run };
  root.OmranEngine = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
