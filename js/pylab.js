/* مختبر بايثون: مفسّر صغير وآمن (بدون eval) لجزء من لغة بايثون، ومحرّر كود بأزرار كبيرة للتلفون.
   يدعم: الأوامر (say, wave, jump, forward, right, left, move_up..., light, off, print)، المتغيّرات، + - * / // %،
   for i in range(n)، def name()، if / elif / else، والمقارنات. رسائل الخطأ بالعربي وتشير لرقم السطر.
   الناتج: قائمة أوامر مثل أوامر البطاقات، كل أمر معه رقم سطره، وتنفّذها نفس المسارح. */
(function (root) {
  'use strict';

  const COLORS = ['red', 'yellow', 'green', 'blue', 'purple'];
  const KEYWORDS = ['for', 'in', 'range', 'def', 'if', 'elif', 'else', 'pass', 'True', 'False', 'and', 'or', 'not'];
  // الأوامر الجاهزة: [أقل عدد مدخلات، أكثر عدد، نوع المدخلات]
  const BUILTIN = {
    say: [1, 1], print: [0, 9], wave: [0, 0], jump: [0, 0], forward: [1, 1, 'num'], right: [0, 1, 'num'], left: [0, 1, 'num'],
    move_up: [0, 0], move_down: [0, 0], move_left: [0, 0], move_right: [0, 0], light: [1, 1, 'color'], off: [0, 0],
    input: [0, 1], int: [1, 1], str: [1, 1],
  };
  // شاشة الناتج (بايثون الحقيقي): الأوامر المسموحة فقط، والباقي NameError مثل بايثون
  const CONSOLE_OK = ['print', 'input', 'int', 'str'];
  // كيف يطبع بايثون القيمة
  const fmt = v => typeof v === 'boolean' ? (v ? 'True' : 'False') : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) : String(v);
  // نص رسالة الخطأ كما تكتبها بايثون (يظهر بالأحمر في شاشة الناتج)
  const PY = {
    str: 'SyntaxError: unterminated string literal',
    paren: "SyntaxError: '(' was never closed",
    colon: "SyntaxError: expected ':'",
    indent: 'IndentationError: expected an indented block',
    extra_indent: 'IndentationError: unexpected indent',
    name: n => `NameError: name '${n}' is not defined`,
    mix: (a, b) => typeof a === 'string' ? `TypeError: can only concatenate str (not "${typeof b === 'number' ? 'int' : typeof b}") to str` : `TypeError: unsupported operand type(s) for +: 'int' and 'str'`,
    int: s => `ValueError: invalid literal for int() with base 10: '${s}'`,
    zero: 'ZeroDivisionError: division by zero',
  };

  // رسائل الخطأ (تظهر على الشاشة؛ الكود بين علامتي ` يُعرض بخط الكود)
  const M = {
    str: 'نسينا علامة التنصيص `"` في آخر النص',
    char: s => `حرف غريب هنا: \`${s}\``,
    ar: 'الكلام العربي يُكتب بين علامتي تنصيص: `"مرحبا"`',
    paren: 'نسينا قوس الإغلاق `)`',
    colon: 'نسينا النقطتين `:` في آخر السطر',
    need_indent: 'السطر الذي بعد `:` يلزمه مسافة في أوله (⇥)',
    extra_indent: 'مسافة زائدة في أول السطر',
    bad_indent: 'المسافات في أول السطر غير متساوية',
    call_paren: n => `\`${n}\` تحتاج قوسين: \`${n}()\``,
    unknown: (n, s) => `لا أعرف \`${n}\`` + (s ? `، هل المقصود \`${s}\`؟` : ''),
    empty_var: n => `الصندوق \`${n}\` فارغ، نضع فيه قيمة أولاً`,
    def_later: n => `نعرّف \`${n}\` بـ \`def\` قبل أن نناديها`,
    args0: n => `\`${n}()\` لا تحتاج شيئاً بين القوسين`,
    args1: n => `\`${n}\` تحتاج شيئاً واحداً بين القوسين`,
    num: n => `\`${n}\` تحتاج رقماً، مثل \`${n}(2)\``,
    color: 'الألوان: `"red"` `"yellow"` `"green"` `"blue"` `"purple"`',
    mix: 'لا نجمع نصاً مع رقم',
    zero: 'لا نقسم على صفر',
    long: 'البرنامج يعمل خطوات كثيرة جداً',
    deep: 'الكلمة تنادي نفسها بلا نهاية',
    eq: 'في الشرط نكتب `==` بدل `=`',
    expr: 'هنا شيء ناقص أو زائد',
    while: '`while` ليست في مختبرنا بعد، نستعمل `for`',
    else: '`else` تأتي بعد `if`',
    params: 'كلماتنا الجديدة بلا مدخلات: `def dance():`',
    range: 'التكرار يُكتب هكذا: `for i in range(4):`',
    range_num: '`range` تحتاج رقماً صحيحاً',
    big: 'الرقم كبير جداً',
    assign: n => `لا نضع قيمة في \`${n}\``,
    not_func: n => `\`${n}\` صندوق وليس أمراً`,
    value: n => `\`${n}\` أمر، لا نضعه في صندوق`,
    after: 'شيء زائد في آخر السطر',
  };

  class PyError { constructor(line, msg, py) { this.line = line; this.msg = msg; this.py = py; } }
  const fail = (line, msg, py) => { throw new PyError(line, msg, py); };
  // input() بلا جواب بعد: نوقف التنفيذ، والمسرح يسأل الطفل ثم يكمّل (resume)
  class NeedInput { constructor(prompt, line) { this.prompt = prompt; this.line = line; } }
  const M2 = { not_num: s => `\`${s}\` ليس رقماً، نكتب رقماً مثل \`7\``, ask: 'سؤال بلا جواب' };

  // تنظيف ما يكتبه التلفون: علامات تنصيص ذكية، فاصلة عربية، أرقام عربية، Tab
  function norm(src) {
    return String(src || '').replace(/\r/g, '').replace(/[“”«»„]/g, '"').replace(/[‘’]/g, "'").replace(/،/g, ',')
      .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0)
      .replace(/\t/g, '    ').replace(/[ ‏‎]/g, ' ');
  }

  /* ---------- تقسيم السطر لكلمات ---------- */
  const OPS = ['==', '!=', '<=', '>=', '//', '+=', '-=', '(', ')', ':', ',', '=', '+', '-', '*', '/', '%', '<', '>'];
  function tokenize(text, line) {
    const out = [];
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (c === ' ') { i++; continue; }
      if (c === '#') break;
      let m;
      if ((m = /^\d+(\.\d+)?/.exec(text.slice(i)))) { out.push({ t: 'num', v: +m[0], line }); i += m[0].length; continue; }
      if (c === '"' || c === "'") {
        const j = text.indexOf(c, i + 1);
        if (j < 0) fail(line, M.str, PY.str);
        out.push({ t: 'str', v: text.slice(i + 1, j), line }); i = j + 1; continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i)))) { out.push({ t: 'name', v: m[0], line }); i += m[0].length; continue; }
      if (/[؀-ۿ]/.test(c)) fail(line, M.ar);
      const op = OPS.find(o => text.startsWith(o, i));
      if (op) { out.push({ t: 'op', v: op, line }); i += op.length; continue; }
      fail(line, M.char(c));
    }
    return out;
  }

  /* ---------- قراءة البرنامج (شجرة الأوامر) ---------- */
  function parse(src) {
    const lines = [];
    norm(src).split('\n').forEach((raw, k) => {
      const toks = tokenize(raw, k + 1);
      if (toks.length) lines.push({ n: k + 1, ind: raw.match(/^ */)[0].length, toks });
    });
    let li = 0;

    function block(ind) {
      const body = [];
      while (li < lines.length) {
        const L = lines[li];
        if (L.ind < ind) break;
        if (L.ind > ind) fail(L.n, M.extra_indent, PY.extra_indent);
        body.push(statement(L, ind));
      }
      return body;
    }
    // ما بعد ":" إما على نفس السطر، أو أسطر فيها مسافة أكبر
    function suite(L, ind, rest) {
      if (rest.length) return [simple({ n: L.n, toks: rest })];
      const nx = lines[li];
      if (!nx || nx.ind <= ind) fail(nx && nx.ind <= ind ? nx.n : L.n, M.need_indent, PY.indent);
      const body = block(nx.ind);
      const after = lines[li];
      if (after && after.ind > ind) fail(after.n, M.bad_indent);
      return body;
    }
    function statement(L, ind) {
      li++;
      const k = L.toks[0];
      if (k.t === 'name' && ['for', 'def', 'if', 'while', 'elif', 'else'].includes(k.v)) {
        const ci = L.toks.findIndex(t => t.t === 'op' && t.v === ':');
        if (k.v === 'while') fail(L.n, M.while);
        if (k.v === 'elif' || k.v === 'else') fail(L.n, M.else);
        if (ci < 0) fail(L.n, M.colon, PY.colon);
        const head = L.toks.slice(1, ci), rest = L.toks.slice(ci + 1);
        if (k.v === 'for') {
          const P = cursor(head, L.n);
          const v = P.next();
          if (!v || v.t !== 'name' || !P.is('name', 'in') || !P.is('name', 'range') || !P.is('op', '(')) fail(L.n, M.range);
          const args = [P.expr()];
          if (P.is('op', ',')) args.push(P.expr());
          if (!P.is('op', ')')) fail(L.n, M.paren);
          P.end();
          return { t: 'for', v: v.v, args, body: suite(L, ind, rest), line: L.n };
        }
        if (k.v === 'def') {
          const P = cursor(head, L.n);
          const v = P.next();
          if (!v || v.t !== 'name') fail(L.n, M.params);
          if (!P.is('op', '(')) fail(L.n, M.call_paren(v.v));
          if (!P.is('op', ')')) fail(L.n, M.params);
          P.end();
          return { t: 'def', v: v.v, body: suite(L, ind, rest), line: L.n };
        }
        // if / elif / else
        const P = cursor(head, L.n);
        const branches = [{ cond: P.cond(), body: null }];
        P.end();
        branches[0].body = suite(L, ind, rest);
        let other = null;
        while (li < lines.length && lines[li].ind === ind && lines[li].toks[0].t === 'name' && ['elif', 'else'].includes(lines[li].toks[0].v)) {
          const E = lines[li++], ek = E.toks[0].v, eci = E.toks.findIndex(t => t.t === 'op' && t.v === ':');
          if (eci < 0) fail(E.n, M.colon);
          if (ek === 'elif') {
            const Q = cursor(E.toks.slice(1, eci), E.n);
            const b = { cond: Q.cond() }; Q.end();
            b.body = suite(E, ind, E.toks.slice(eci + 1));
            branches.push(b);
          } else {
            if (eci !== 1) fail(E.n, M.colon);
            other = suite(E, ind, E.toks.slice(eci + 1));
            break;
          }
        }
        return { t: 'if', branches, other, line: L.n };
      }
      return simple(L);
    }
    function simple(L) {
      const k = L.toks[0];
      if (k.t === 'name' && k.v === 'pass' && L.toks.length === 1) return { t: 'pass', line: L.n };
      const a = L.toks[1];
      if (k.t === 'name' && a && a.t === 'op' && ['=', '+=', '-='].includes(a.v)) {
        if (KEYWORDS.includes(k.v) || BUILTIN[k.v]) fail(L.n, M.assign(k.v));
        const P = cursor(L.toks.slice(2), L.n);
        const e = P.expr(); P.end();
        return { t: 'set', v: k.v, op: a.v, e, line: L.n };
      }
      const P = cursor(L.toks, L.n);
      const e = P.expr(); P.end();
      return { t: 'expr', e, line: L.n };
    }
    const prog = block(0);
    return prog;
  }

  // قارئ التعبيرات داخل سطر واحد
  function cursor(toks, line) {
    let p = 0;
    const peek = () => toks[p];
    const P = {
      next: () => toks[p++],
      is(t, v) { const k = toks[p]; if (k && k.t === t && k.v === v) { p++; return true; } return false; },
      end() {
        const k = toks[p];
        if (!k) return;
        if (k.t === 'op' && k.v === '=') fail(line, M.eq);
        if (k.t === 'op' && k.v === ')') fail(line, M.expr);
        if (k.t === 'str' || k.t === 'num') {
          const prev = toks[p - 1];
          if (prev && prev.t === 'name' && BUILTIN[prev.v]) fail(line, M.call_paren(prev.v));
        }
        fail(line, M.after);
      },
      cond() {
        const e = P.expr();
        if (peek() && peek().t === 'op' && peek().v === '=') fail(line, M.eq);
        return e;
      },
      expr() {
        let a = P.add();
        const k = peek();
        if (k && k.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(k.v)) { p++; a = { t: 'bin', op: k.v, a, b: P.add(), line }; }
        return a;
      },
      add() {
        let a = P.mul();
        for (let k = peek(); k && k.t === 'op' && (k.v === '+' || k.v === '-'); k = peek()) { p++; a = { t: 'bin', op: k.v, a, b: P.mul(), line }; }
        return a;
      },
      mul() {
        let a = P.unary();
        for (let k = peek(); k && k.t === 'op' && ['*', '/', '//', '%'].includes(k.v); k = peek()) { p++; a = { t: 'bin', op: k.v, a, b: P.unary(), line }; }
        return a;
      },
      unary() { if (P.is('op', '-')) return { t: 'neg', a: P.unary(), line }; return P.atom(); },
      atom() {
        const k = toks[p++];
        if (!k) fail(line, M.expr);
        if (k.t === 'num') return { t: 'val', v: k.v };
        if (k.t === 'str') return { t: 'val', v: k.v };
        if (k.t === 'op' && k.v === '(') { const e = P.expr(); if (!P.is('op', ')')) fail(line, M.paren, PY.paren); return e; }
        if (k.t === 'name') {
          if (k.v === 'True' || k.v === 'False') return { t: 'val', v: k.v === 'True' };
          if (P.is('op', '(')) {
            const args = [];
            if (!P.is('op', ')')) {
              args.push(P.expr());
              while (P.is('op', ',')) args.push(P.expr());
              if (!P.is('op', ')')) fail(line, M.paren, PY.paren);
            }
            return { t: 'call', v: k.v, args, line };
          }
          return { t: 'name', v: k.v, line };
        }
        fail(line, M.expr);
      },
    };
    return P;
  }

  /* ---------- التنفيذ: يحوّل الشجرة لقائمة أوامر ---------- */
  // أقرب اسم معروف (لخطأ إملائي صغير)
  function near(n, names) {
    const lo = n.toLowerCase();
    const d = (a, b) => {
      const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 1; j <= b.length; j++) m[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return m[a.length][b.length];
    };
    let best = null, bd = 3;
    for (const x of names) { const k = x.toLowerCase() === lo ? 0 : d(lo, x.toLowerCase()); if (k < bd && (k <= 1 || lo.length > 3)) { bd = k; best = x; } }
    return best;
  }
  // كل الأسماء التي يُعرَّف بها شيء في البرنامج (لتمييز "فارغ" عن "غير معروف")
  function declared(prog, out = { vars: new Set(), funcs: new Set() }) {
    for (const s of prog) {
      if (s.t === 'set') out.vars.add(s.v);
      if (s.t === 'for') { out.vars.add(s.v); declared(s.body, out); }
      if (s.t === 'def') { out.funcs.add(s.v); declared(s.body, out); }
      if (s.t === 'if') { s.branches.forEach(b => declared(b.body, out)); if (s.other) declared(s.other, out); }
    }
    return out;
  }

  function execute(prog, ops, ctx) {
    const vars = {}, funcs = {}, dec = declared(prog), con = !!(ctx && ctx.con);
    let depth = 0, used = 0;
    const emit = o => { ops.push(o); if (ops.length > 3000) fail(o.line, M.long); };
    const known = () => (con ? CONSOLE_OK : Object.keys(BUILTIN));
    const names = () => known().concat(Object.keys(funcs), Object.keys(vars), [...dec.vars], [...dec.funcs], KEYWORDS);
    const unknown = (n, line) => {
      if (dec.vars.has(n)) fail(line, M.empty_var(n), PY.name(n));
      if (dec.funcs.has(n)) fail(line, M.def_later(n), PY.name(n));
      fail(line, M.unknown(n, near(n, names())), PY.name(n));
    };
    const builtin = n => (con && !CONSOLE_OK.includes(n) ? null : BUILTIN[n]);
    function val(e) {
      if (e.t === 'val') return e.v;
      if (e.t === 'name') {
        if (Object.prototype.hasOwnProperty.call(vars, e.v)) return vars[e.v];
        if (builtin(e.v) || funcs[e.v]) fail(e.line, M.call_paren(e.v));
        return unknown(e.v, e.line);
      }
      if (e.t === 'neg') { const v = val(e.a); if (typeof v !== 'number') fail(e.line, M.mix); return -v; }
      if (e.t === 'call') { const r = call(e); if (r === undefined) fail(e.line, M.value(e.v)); return r; }
      const a = val(e.a), b = val(e.b);
      switch (e.op) {
        case '+':
          if (typeof a !== typeof b) fail(e.line, M.mix, PY.mix(a, b));
          return a + b;
        case '-': case '*': case '/': case '//': case '%':
          if (typeof a !== 'number' || typeof b !== 'number') fail(e.line, M.mix, `TypeError: unsupported operand type(s) for ${e.op}: '${typeof a === 'number' ? 'int' : 'str'}' and '${typeof b === 'number' ? 'int' : 'str'}'`);
          if (e.op !== '-' && e.op !== '*' && b === 0) fail(e.line, M.zero, PY.zero);
          return e.op === '-' ? a - b : e.op === '*' ? a * b : e.op === '/' ? a / b : e.op === '//' ? Math.floor(a / b) : ((a % b) + b) % b;
        case '==': return a === b;
        case '!=': return a !== b;
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
      }
      return fail(e.line, M.expr);
    }
    function call(e) {
      const n = e.v, line = e.line;
      if (funcs[n]) {
        if (e.args.length) fail(line, M.args0(n));
        if (depth > 30) fail(line, M.deep);
        emit({ op: 'call', line });
        depth++; run(funcs[n]); depth--;
        return null;
      }
      const B = builtin(n);
      if (!B) {
        if (Object.prototype.hasOwnProperty.call(vars, n)) fail(line, M.not_func(n));
        return unknown(n, line);
      }
      if (e.args.length < B[0] || e.args.length > B[1]) fail(line, B[1] ? M.args1(n) : M.args0(n));
      const args = e.args.map(val), a = args[0];
      // أوامر شاشة الناتج: input تسأل (أو تأخذ جواباً جاهزاً)، int تحوّل لرقم، str لنص
      if (n === 'input') {
        const prompt = a === undefined ? '' : fmt(a), answers = (ctx && ctx.answers) || [];
        if (used >= answers.length) throw new NeedInput(prompt, line);
        const v = answers[used++];
        emit({ op: 'input', prompt, value: v, line });
        return v;
      }
      if (n === 'int') {
        if (typeof a === 'number') return Math.trunc(a);
        if (!/^\s*-?\d+\s*$/.test(String(a))) fail(line, M2.not_num(a), PY.int(a));
        return parseInt(a, 10);
      }
      if (n === 'str') return fmt(a);
      if (B[2] === 'num' && a !== undefined && typeof a !== 'number') fail(line, M.num(n));
      if (B[2] === 'num' && a !== undefined && Math.abs(a) > 50 && n === 'forward') fail(line, M.big);
      if (B[2] === 'color' && !COLORS.includes(a)) fail(line, M.color);
      if (n === 'print' && (con || args.length !== 1)) emit({ op: 'say', arg: args.map(fmt).join(' '), line });
      else if (n === 'say' || n === 'print') emit({ op: 'say', arg: typeof a === 'number' ? Math.round(a * 100) / 100 : typeof a === 'boolean' ? (a ? 'True' : 'False') : a, line });
      else if (n === 'forward') emit({ op: 'forward', arg: a, line });
      else if (n === 'right') emit({ op: 'turn', arg: a === undefined ? 90 : a, line });
      else if (n === 'left') emit({ op: 'turn', arg: -(a === undefined ? 90 : a), line });
      else if (n === 'light') emit({ op: 'light', arg: a, line });
      else if (n.startsWith('move_')) emit({ op: n.slice(5), line });
      else emit({ op: n, line });
      return undefined;
    }
    function run(body) {
      for (const s of body) {
        if (s.t === 'pass') continue;
        if (s.t === 'expr') { if (s.e.t === 'call') call(s.e); else val(s.e); }
        else if (s.t === 'set') {
          let v = val(s.e);
          if (s.op !== '=') {
            if (!Object.prototype.hasOwnProperty.call(vars, s.v)) unknown(s.v, s.line);
            const old = vars[s.v];
            if (typeof old !== typeof v || (s.op === '-=' && typeof v !== 'number')) fail(s.line, M.mix);
            v = s.op === '+=' ? old + v : old - v;
          }
          vars[s.v] = v;
          emit({ op: 'set', name: s.v, arg: v, line: s.line });
        } else if (s.t === 'for') {
          const r = s.args.map(val);
          if (r.some(x => !Number.isInteger(x))) fail(s.line, M.range_num);
          const [a, b] = r.length > 1 ? r : [0, r[0]];
          if (b - a > 1000) fail(s.line, M.big);
          for (let i = a; i < b; i++) {
            vars[s.v] = i;
            emit({ op: 'set', name: s.v, arg: i, line: s.line, loopvar: true });
            emit({ op: 'loop', line: s.line });
            run(s.body);
          }
        } else if (s.t === 'def') funcs[s.v] = s.body;
        else if (s.t === 'if') {
          const br = s.branches.find(b => val(b.cond));
          if (br) run(br.body); else if (s.other) run(s.other);
        }
      }
    }
    run(prog);
    return ops;
  }

  // يشغّل الكود: {ops, error: {line, msg, parse}}
  // شاشة الناتج المفتوحة الآن (المسرح console)، لو فيه
  const consoleOn = () => (api.console && api.console.el && api.console.el.isConnected ? api.console : null);
  // into: نتيجة سابقة توقفت عند input()؛ نعيد التنفيذ بالأجوبة ونضيف الأوامر الجديدة على نفس القائمة (المسرح بيمشي عليها)
  function compile(src, into) {
    const r = into || { ops: [] }, base = into ? r.ops.length : 0, con = consoleOn();
    if (!into && con) con.answers = []; // تشغيل جديد: الأسئلة تُسأل من أول
    delete r.error;
    const err = (e, parse) => { r.error = { line: e.line, msg: e.msg, parse, py: e.py || (parse ? 'SyntaxError: invalid syntax' : 'RuntimeError: ' + e.msg) }; api.lastError = r.error; return r; };
    let prog;
    try { prog = parse(src); } catch (e) { if (e instanceof PyError) return err(e, true); throw e; }
    // الأوامر التي سبقت الخطأ تفضل، عشان الطفل يشوف ما حدث قبله
    const ops = [];
    let e2 = null;
    try { execute(prog, ops, { con, answers: con ? con.answers : [] }); } catch (e) {
      if (e instanceof NeedInput) ops.push({ op: 'input', prompt: e.prompt, line: e.line, resume: v => { if (con) con.answers.push(v); compile(src, r); } });
      else if (e instanceof PyError) e2 = e;
      else throw e;
    }
    for (const o of ops.slice(base)) r.ops.push(o);
    return e2 ? err(e2, false) : r;
  }

  // ناتج برنامج (سطور print) بأجوبة معيّنة لـ input()؛ null لو فيه خطأ أو الأجوبة ما كفت. يُستعمل لحساب الناتج المطلوب من الحل بأجوبة الطفل نفسها
  function outputOf(src, answers) {
    try {
      const ops = [];
      execute(parse(src), ops, { con: true, answers: answers || [] });
      return ops.filter(o => o.op === 'say').map(o => String(o.arg));
    } catch (e) { if (e instanceof PyError || e instanceof NeedInput) return null; throw e; }
  }

  // كلمات البرنامج (للتأكد إن الطفل استعمل for أو def أو if أو +)
  function uses(src, word) {
    try { return norm(src).split('\n').some(l => tokenize(l, 0).some(t => t.v === word)); } catch (e) { return false; }
  }
  const lineCount = src => norm(src).split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;

  /* ---------- محرّر الكود ---------- */
  // أزرار حسب نوع المسرح، والنص | مكان المؤشر بعد الإدخال
  const KEYS = {
    talk: ['say("|")', 'wave()', 'jump()'],
    draw: ['forward(|)', 'right(90)', 'left(90)'],
    path: ['move_up()', 'move_down()', 'move_left()', 'move_right()'],
    lights: ['light("|")', 'off()', '"red"', '"yellow"', '"green"', '"blue"', '"purple"'],
    vars: ['say(|)'],
    console: ['print("|")', 'print(|)', 'input("|")', 'int(input("|"))', ' = ', ' + ', ' - ', ' * '],
  };
  // لوحة مفاتيح حقيقية غالباً (لابتوب): الطفل يكتب بحرّية، والأزرار تفضل ظاهرة
  const laptop = () => { try { return window.matchMedia('(min-width: 1024px)').matches || (window.matchMedia('(pointer: fine)').matches && window.matchMedia('(min-width: 700px)').matches); } catch (e) { return false; } };
  const SYMS = ['⏎', '⇥', '⌫', '(', ')', '"', ':', '=', '+', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // مقارنة سطرين بدون فرق المسافات حوالين العلامات (a=1 زي a = 1)
  const spc = l => l.replace(/\s+/g, ' ').replace(/ ?([()=+,:<>-]) ?/g, '$1');

  function editor(el, level, kind, onEdit) {
    const words = (level.keys || []).concat(KEYS[kind] || []); // كلمات المرحلة الجديدة أولاً، عشان تبان على التلفون
    el.innerHTML = `<div class="code-ed" dir="ltr"><div class="ed-hl"></div><pre class="gutter" aria-hidden="true"></pre>
      <textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python"></textarea></div>
      <div class="py-err" id="pyErr" hidden></div>
      <div class="keys" dir="ltr"><div class="krow">${words.map(w => `<button class="key w" data-k="${escH(w)}">${escH(w.replace('|', ''))}</button>`).join('')}</div>
        <div class="krow">${SYMS.map(s => `<button class="key ${/\d/.test(s) ? 'd' : 's'}" data-k="${escH(s)}">${escH(s)}</button>`).join('')}</div></div>`;
    const ta = el.querySelector('textarea'), gut = el.querySelector('.gutter'), hl = el.querySelector('.ed-hl'), err = el.querySelector('.py-err');
    const LH = 24, PAD = 8, kbd = laptop();
    el.classList.toggle('kbd', kbd);
    let mark = null;
    const lines = () => ta.value.split('\n').length;
    function sync() {
      const n = Math.max(lines(), 4);
      gut.innerHTML = Array.from({ length: n }, (_, i) => `<span class="${mark && mark.line === i + 1 ? (mark.bad ? 'bad' : 'cur') : ''}">${i + 1}</span>`).join('\n');
      gut.scrollTop = ta.scrollTop;
      if (mark) { hl.style.display = 'block'; hl.className = 'ed-hl ' + (mark.bad ? 'bad' : ''); hl.style.top = (PAD + (mark.line - 1) * LH - ta.scrollTop) + 'px'; } else hl.style.display = 'none';
    }

    /* مكان المؤشر الحقيقي: سفاري الآيفون يضيّع التحديد لما الطفل يضغط زر (الكتابة تفقد التركيز)،
       فنحفظه بنفسنا وقت ما الكتابة مركّزة، ونستعمل المحفوظ لما مش مركّزة */
    let pos = null;
    const focused = () => document.activeElement === ta;
    const clamp = n => Math.max(0, Math.min(ta.value.length, n));
    const save = () => { if (focused()) pos = { s: ta.selectionStart, e: ta.selectionEnd }; };
    ['select', 'keyup', 'input', 'click', 'focus', 'pointerup', 'touchend'].forEach(ev => ta.addEventListener(ev, () => setTimeout(save, 0)));
    const onSel = () => { if (!ta.isConnected) { document.removeEventListener('selectionchange', onSel); return; } save(); };
    document.addEventListener('selectionchange', onSel);
    function sel() {
      if (focused()) return { s: ta.selectionStart, e: ta.selectionEnd };
      const n = ta.value.length;
      return pos ? { s: clamp(pos.s), e: clamp(pos.e) } : { s: n, e: n }; // أول ضغطة بدون مؤشر: في الآخر
    }
    function put(s, e, t, caret) { // يكتب النص ويحفظ مكان المؤشر الجديد
      ta.setRangeText(t, s, e, 'end');
      const c = caret == null ? s + t.length : caret;
      try { ta.setSelectionRange(c, c); } catch (x) { /* */ }
      pos = { s: c, e: c };
    }
    // السطر اللي فيه المؤشر
    const lineAt = (v, s) => { const a = v.lastIndexOf('\n', s - 1) + 1; let b = v.indexOf('\n', s); if (b < 0) b = v.length; return { a, b, text: v.slice(a, b), before: v.slice(a, s), after: v.slice(s, b) }; };
    const indentOf = l => l.match(/^ */)[0];
    const count = (l, c) => l.split(c).length - 1;
    // سطر كامل: فيه كلام، الأقواس والتنصيص مقفولة، وما بيخلصش بعلامة (= + ( ,) لسه مستنية حاجة بعدها
    const complete = l => { const t = l.trim(); return !!t && count(t, '"') % 2 === 0 && count(t, '(') === count(t, ')') && !/[=+\-*/<>(,]$/.test(t); };
    // زر يبدأ أمر جديد (نداء دالة، أو for/if/else/def)
    const STMT = /^(?:[A-Za-z_]+\(|for |if |elif |else:|def |while )/;
    // مسافة السطر الجديد بعد هذا السطر: نفس المسافة، وأربعة زيادة بعد ":"، و else ترجع لمستوى if بتاعها
    function indentFor(v, lineStart, prevText, key) {
      let ind = indentOf(prevText) + (/:\s*$/.test(prevText) ? '    ' : '');
      if (/^(else:|elif )/.test(key)) {
        const before = v.slice(0, lineStart).split('\n');
        for (let i = before.length - 1; i >= 0; i--) {
          const m = before[i].match(/^( *)(if|elif) /);
          if (m && m[1].length < ind.length + (prevText.trim() ? 0 : 1)) { ind = m[1]; break; }
        }
      }
      return ind;
    }
    function insert(text, smart) {
      if (ta.readOnly) return;
      let { s, e } = sel();
      const v = ta.value;
      let t = text.replace('|', ''), caret = text.indexOf('|');
      if (smart && s === e) {
        const L = lineAt(v, s);
        if (/^".*"$/.test(t) && L.before.endsWith('"') && L.after.startsWith('"')) { t = t.slice(1, -1); caret = -1; } // "red" بين علامتين: الكلمة بس
        else if (STMT.test(text) || /^[A-Za-z_؀-ۿ]+$/.test(t)) {
          // كلمة لوحدها (apples, count, i...) تبدأ سطر جديد بس لو اللي قبل المؤشر قيمة كاملة: range(5| أو say(x)|، مش say(| ولا "|
          const inStr = count(L.before, '"') % 2 === 1, filled = !inStr && /[\w؀-ۿ)":]$/.test(L.before);
          // أمر بعد "x = " أو "(" يكمل نفس السطر (name = input(...))، مش سطر جديد
          const waiting = /[=+\-*/<>(,]$/.test(L.before.trim());
          if (L.text.trim() && (STMT.test(text) ? complete(L.text) || (!L.after.trim() && !waiting) : complete(L.text) && filled)) {
            // بعد أمر كامل: سطر جديد بنفس المسافة (حتى لو المؤشر كان جوّه علامتي التنصيص)
            const ind = indentFor(v, L.b + 1, L.text, text);
            s = e = L.b; t = '\n' + ind + t; if (caret >= 0) caret += 1 + ind.length;
          } else if (!L.text.trim() && /^(else:|elif )/.test(text)) {
            // سطر فاضي: else ترجع لمستوى if
            const ind = indentFor(v, L.a, v.slice(0, Math.max(0, L.a - 1)).split('\n').pop() || '', text);
            s = L.a; e = L.b; t = ind + t; if (caret >= 0) caret += ind.length;
          }
        }
      }
      put(s, e, t, caret >= 0 ? s + caret : null);
      changed();
    }
    function newline() {
      const { s } = sel(), cur = lineAt(ta.value, s).before;
      let ind = cur.match(/^ */)[0];
      if (/:\s*$/.test(cur)) ind += '    ';
      insert('\n' + ind);
    }
    function back() {
      if (ta.readOnly) return;
      const { s, e } = sel();
      if (s !== e) { put(s, e, ''); return changed(); }
      if (!s) return;
      const cur = lineAt(ta.value, s).before;
      const n = /^ +$/.test(cur) ? (cur.length % 4 || 4) : 1; // في المسافات الأولى نمسح أربعة
      put(s - n, s, '');
      changed();
    }
    // التلميح (💡 جرّب: ...) يفضل ظاهر والطفل بيكتب السطر، والخطأ يختفي مع أول تعديل
    // (ويختفي هو كمان لما السطر اللي فيه المؤشر يبقى زي المطلوب بالظبط)
    const same = (a, b) => spc(a).trim() === spc(b).trim();
    function changed() {
      mark = null;
      if (!err.classList.contains('tip') || (err.dataset.want && same(lineAt(ta.value, sel().s).text, err.dataset.want))) err.hidden = true;
      sync(); onEdit && onEdit();
    }
    // التلميح يجهّز مكان السطر: سطر جديد بالمسافة الصح، أو يحدّد السطر الغلط (الضغطة الجاية تستبدله)، أو السطر الزائد كله (⌫ يمسحه)
    // n = رقم السطر بين سطور الكود الحقيقية (من غير الفاضية والتعليقات)، مثل diffLines. يرجّع رقم السطر في المحرّر
    function prepare(n, text) {
      if (ta.readOnly) return n;
      const ls = ta.value.split('\n'), real = [];
      ls.forEach((l, i) => { if (l.replace(/#.*/, '').trim()) real.push(i); });
      const off = i => ls.slice(0, i).reduce((a, l) => a + l.length + 1, 0);
      const ind = indentOf(text || '');
      if (n <= real.length) {
        const i = real[n - 1], a = off(i), l = ls[i];
        if (!text) { const s = i ? a - 1 : a, e = i ? a + l.length : Math.min(ta.value.length, a + l.length + 1); ta.setSelectionRange(s, e); pos = { s, e }; return i + 1; }
        put(a, a + indentOf(l).length, ind);
        const s = a + ind.length, e = a + ind.length + l.trim().length;
        ta.setSelectionRange(s, e); pos = { s, e };
        sync(); onEdit && onEdit();
        return i + 1;
      }
      // سطر ناقص: في آخر الكود (بعد آخر سطر حقيقي)
      const last = real.length ? real[real.length - 1] : -1, a = last < 0 ? 0 : off(last) + ls[last].length;
      put(a, ta.value.length, (last < 0 ? '' : '\n') + ind);
      sync(); onEdit && onEdit();
      return last + 2;
    }
    ta.addEventListener('input', changed);
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); newline(); }
      else if (e.key === 'Tab') { e.preventDefault(); insert('    '); }
      else if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.metaKey && ta.selectionStart === ta.selectionEnd && ta.selectionStart) {
        // مثل Enter اللي بيزيد أربعة: Backspace في المسافات الأولى يمسح أربعة
        const before = ta.value.slice(0, ta.selectionStart);
        if (/^ +$/.test(before.slice(before.lastIndexOf('\n') + 1))) { e.preventDefault(); back(); }
      }
    });
    const keys = el.querySelector('.keys');
    // الضغط على الأزرار ما يقفل لوحة مفاتيح التلفون ولا يحرّك المؤشر
    let wasFocused = false;
    // بالماوس: نمنع الزر ياخد التركيز من الكتابة. باللمس لا (سفاري يلغي الضغطة كلها لو منعنا pointerdown)، والمؤشر محفوظ أصلاً
    const keep = e => { if (e.target.closest('.key')) { wasFocused = wasFocused || focused(); save(); if (e.type === 'mousedown' || e.pointerType === 'mouse') e.preventDefault(); } };
    keys.addEventListener('pointerdown', keep);
    keys.addEventListener('mousedown', keep);
    keys.addEventListener('click', e => {
      const b = e.target.closest('.key');
      if (!b) return;
      const k = b.dataset.k;
      Sfx.tap();
      if (k === '⏎') newline(); else if (k === '⌫') back(); else if (k === '⇥') insert('    '); else insert(k, b.classList.contains('w'));
      // لوحة مفاتيح التلفون كانت مفتوحة: نرجّع التركيز في نفس المكان (ولو كانت مقفولة ما نفتحهاش)
      if (wasFocused && !focused() && pos) { try { ta.focus({ preventScroll: true }); ta.setSelectionRange(pos.s, pos.e); } catch (x) { /* */ } }
      wasFocused = false;
    });
    sync();
    return {
      get: () => ta.value,
      // على اللابتوب نركّز الكتابة فوراً (لوحة المفاتيح الحقيقية)، وعلى التلفون لا (ما نفتح لوحة المفاتيح لوحدنا)
      set(v) { ta.value = v; pos = { s: v.length, e: v.length }; changed(); if (kbd) { try { ta.focus({ preventScroll: true }); ta.setSelectionRange(v.length, v.length); } catch (x) { /* */ } } },
      caret(i) { pos = { s: i, e: i }; try { ta.setSelectionRange(i, i); } catch (x) { /* */ } }, // بدون focus عشان لوحة مفاتيح التلفون ما تفتح لوحدها
      prepare,
      sel,
      mark(line, bad) {
        mark = line ? { line, bad } : null; sync();
        if (line) { const y = PAD + (line - 1) * LH; if (y < ta.scrollTop || y > ta.scrollTop + ta.clientHeight - LH) ta.scrollTop = y - ta.clientHeight / 2; }
      },
      error(line, msg, kind2, want) {
        err.hidden = false; err.className = 'py-err ' + (kind2 || '');
        err.dataset.want = want || '';
        const html = escH(msg).replace(/`([^`]*)`/g, '<code dir="ltr">$1</code>');
        err.innerHTML = (line ? `<b>${kind2 === 'tip' ? '💡' : '⚠️'} السطر <bdi>${line}</bdi>:</b> ` : '') + html;
        this.mark(line, kind2 !== 'tip');
        // شاشة الناتج: نفس الخطأ بالأحمر كما تكتبه بايثون الحقيقية
        const c = kind2 !== 'tip' && line ? consoleOn() : null;
        if (c) c.error(line, api.lastError && api.lastError.line === line ? api.lastError.py : msg);
      },
      clear() { mark = null; err.hidden = true; sync(); },
      lock(on) { ta.readOnly = on; el.classList.toggle('locked', on); },
    };
  }

  // أول سطر مختلف عن الحل (للتلميح)
  function diffLines(src, sol) {
    const clean = s => norm(s).split('\n').map(l => l.replace(/#.*/, '').replace(/\s+$/, '')).filter(l => l.trim());
    const a = clean(src), b = clean(sol);
    const sp = spc;
    for (let i = 0; i < b.length; i++) if (!a[i] || sp(a[i]) !== sp(b[i])) return { line: i + 1, text: b[i] };
    return a.length > b.length ? { line: b.length + 1, text: '' } : null;
  }

  /* ---------- شاشة الناتج: مسرح أسود يعرض ما تطبعه بايثون الحقيقية (print)، ويسأل الطفل عند input ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const testMode = () => typeof location !== 'undefined' && /[?&]test=1/.test(location.search);
  class ConsoleStage {
    constructor(el, level, color) { this.el = el; this.level = level; this.color = color; this.answers = []; this.out = []; }
    mount() {
      this.el.innerHTML = `<div class="con" dir="ltr"><div class="con-bar"><span></span><span></span><span></span><b>Python</b></div>
        <pre class="con-out" id="conOut"></pre>
        <form class="con-ask" id="conAsk" hidden dir="rtl"><label for="conIn" class="con-q"></label>
          <div class="con-row"><input id="conIn" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" enterkeyhint="done" aria-label="الجواب"><button type="submit" class="run con-go">↵</button></div></form>
        ${this.level.copy ? '<button type="button" class="con-copy" id="conCopy">📋 خد كودك</button>' : ''}</div>`;
      this.outEl = this.el.querySelector('#conOut'); this.ask = this.el.querySelector('#conAsk'); this.inp = this.el.querySelector('#conIn');
      this.ask.addEventListener('submit', e => { e.preventDefault(); this.answer(); });
      const cp = this.el.querySelector('#conCopy');
      if (cp) cp.addEventListener('click', () => this.copy(cp));
      api.console = this;
      this.reset();
    }
    reset() { this.answers = []; this.out = []; this.resolve = null; if (this.outEl) this.outEl.innerHTML = '<span class="con-cur"></span>'; this.hide(); }
    // سطر في الشاشة: cls فاضي = ناتج، in = سؤال وجواب، err = خطأ، ok = نجاح
    line(text, cls) {
      const cur = this.outEl.querySelector('.con-cur'), s = document.createElement('span');
      s.className = 'con-l ' + (cls || ''); s.textContent = text;
      this.outEl.insertBefore(s, cur); this.outEl.insertBefore(document.createTextNode('\n'), cur);
      this.outEl.scrollTop = 1e6;
    }
    async exec(o) {
      const d = ms => sleep(ms / (root.__speed || 1));
      if (o.op === 'say') { const t = String(o.arg); this.out.push(t); this.line(t); if (root.Sfx) Sfx.tap(); await d(260); }
      else if (o.op === 'input') {
        let v = o.value;
        if (v == null) { v = await this.askUser(o.prompt); o.resume(v); }
        this.line(o.prompt + v, 'in');
        await d(160);
      } else if (o.op === 'loop') await d(60);
      return true;
    }
    // الاختبار التلقائي: الأجوبة من المرحلة (inputs). وإلا صندوق سؤال بالعربي
    askUser(prompt) {
      const ins = this.level.inputs;
      if (testMode() && root.__autoInput !== false && ins) return sleep(30).then(() => { const v = ins[this.answers.length]; return v == null ? '' : String(v); });
      return new Promise(res => {
        this.el.querySelector('.con-q').textContent = prompt || '…';
        this.ask.hidden = false; this.inp.value = ''; this.resolve = res;
        try { this.inp.focus({ preventScroll: true }); } catch (e) { /* */ }
      });
    }
    answer() { if (!this.resolve) return; const v = this.inp.value, r = this.resolve; this.resolve = null; this.hide(); r(v); }
    hide() { if (this.ask) this.ask.hidden = true; }
    error(line, py) { this.line(`Traceback (most recent call last):\n  File "main.py", line ${line}`, 'err'); this.line(py, 'err b'); }
    result() {
      // المطلوب = ناتج الحل المرجعي بأجوبة الطفل نفسها (اسمه هو، رقمه هو)، وإلا expect الثابتة
      const want = (this.level.solution && outputOf(this.level.solution, this.answers)) || (this.level.expect || []).map(String), got = this.out;
      if (want.length === got.length && want.every((x, i) => x === got[i])) return { ok: true };
      return { ok: false, reason: got.length < want.length ? 'con_short' : got.length > want.length ? 'con_long' : 'con_wrong' };
    }
    async celebrate() {
      this.line('>>> ✓', 'ok');
      const c = this.el.querySelector('.con');
      if (c && root.gsap) await gsap.fromTo(c, { boxShadow: '0 0 0 0 #3ddc84' }, { boxShadow: '0 0 0 8px rgba(61,220,132,0)', duration: 0.5 });
    }
    // 📋 خد كودك: ينسخ البرنامج كما هو (بايثون حقيقية تشغّله)
    copy(btn) {
      const ta = document.querySelector('#code'), code = ta ? ta.value : '';
      const ok = () => { btn.textContent = '✓ نُسِخ'; setTimeout(() => { btn.textContent = '📋 خد كودك'; }, 1600); };
      try { navigator.clipboard.writeText(code).then(ok, ok); } catch (e) { ok(); }
    }
    destroy() { this.hide(); if (api.console === this) api.console = null; }
  }

  const api = { compile, outputOf, uses, lineCount, editor, diffLines, norm, fmt, ConsoleStage, console: null, lastError: null };
  root.PyLab = api;
  if (root.Stages) root.Stages.console = ConsoleStage;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
