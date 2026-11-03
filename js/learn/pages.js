/* دفتر البرمجة: المحتوى (القصّة، الدروس، اللابتوب، الامتحان).
   كل شاشة: { key (صوت سراج), pic (HTML أو إيموجي) } أو { code: [...] , key } أو سؤال { key, code?, opts }.
   في الأسئلة: الخيار الأوّل هو الصحيح دائماً (يُخلط عند العرض). خيار بحروف لاتينية فقط يُعرض ككود LTR. */
(function (root) {
  'use strict';
  const E = e => `<span class="lr-emo">${e}</span>`;
  const CODE = lines => `<div class="lr-code mini" dir="ltr">${lines.map(l => `<span class="lr-cl">${l}</span>`).join('')}</div>`;
  const STEPS = a => `<ol class="lr-steps">${a.map(s => `<li>${s}</li>`).join('')}</ol>`;
  // سطر كود: نصّ، أو { t, err: true } لرسالة خطأ حمراء، أو { t, out: true } لنتيجة
  const L = (t, k) => ({ t, k });

  const intro = {
    id: 'intro', save: 'lr:intro', title: 'شنو البرمجة؟', icon: '📖',
    screens: [
      { key: 'lr_in1', pic: `<div class="lr-pc"><div class="lr-pc-scr">⚡<span class="lr-qm">؟</span></div><div class="lr-pc-base"></div></div>` },
      { key: 'lr_in2', pic: STEPS(['🥚 خذ البيضة', '🍳 اكسرها في المقلاة', '🔥 اطبخها', '🍽️ قدّمها']) },
      { key: 'lr_in3', pic: `<div class="lr-scroll-pic">📜<small>برنامج</small>${STEPS(['١', '٢', '٣'])}</div>` },
      { key: 'lr_in4', pic: `<div class="lr-row">${E('🧒')}<span class="lr-arrow">💬</span>${E('🖥️')}</div>` },
      { key: 'lr_in5', pic: `<div class="lr-col">${E('🐍')}${CODE(['print("hello")', 'for i in range(3):'])}</div>` },
      { key: 'lr_in6', pic: `<div class="lr-row">${E('👩‍💻')}${E('👨‍💻')}</div>` },
      { key: 'lr_in7', pic: `<div class="lr-col">${CODE(['print(1)', 'print(2)', 'print(3)'])}<span class="lr-arrow down">⬇</span><div class="lr-out" dir="ltr">1<br>2<br>3</div></div>` },
    ],
    quiz: [
      { key: 'lr_iq1', opts: ['قائمة تعليمات بالترتيب', 'لعبة فقط', 'صورة ملوّنة'] },
      { key: 'lr_iq2', opts: ['لغة برمجة', 'حيوان داخل الكمبيوتر', 'جهاز صغير'] },
      { key: 'lr_iq3', opts: ['المبرمج', 'الكمبيوتر وحده', 'الطبّاخ'] },
    ],
  };

  const lessons = {
    seq: {
      title: 'التسلسل', icon: '🔢', pic: `<div class="lr-row">${E('🫖')}<span class="lr-arrow">→</span>${E('🍵')}</div>`,
      code: [L('print("ضع الماء")', 'lr_seq_l1'), L('print("أضف الشاي")', 'lr_seq_l2'), L('print("اشرب")', 'lr_seq_l3')],
      quiz: [
        { key: 'lr_seq_q1', code: ['print("أ")', 'print("ب")', 'print("ج")'], opts: ['السطر الأعلى', 'السطر الأسفل', 'كلّها معاً'] },
        { key: 'lr_seq_q2', opts: ['تتغيّر النتيجة', 'لا شيء يتغيّر'] },
      ],
    },
    loops: {
      title: 'التكرار', icon: '🔁', pic: `<div class="lr-row">${E('🪥')}<span class="lr-badge">×20</span></div>`,
      code: [L('for i in range(20):', 'lr_loops_l1'), L('    print("فرشة")', 'lr_loops_l2')],
      quiz: [
        { key: 'lr_loops_q1', code: ['for i in range(3):', '    print("هلا")'], opts: ['3', '1', '30'] },
        { key: 'lr_loops_q2', opts: ['نكتب الأمر مرّة ويعمل مرّات', 'يجعل الكمبيوتر أبطأ'] },
      ],
    },
    vars: {
      title: 'المتغيّرات', icon: '📦', pic: `<div class="lr-box-pic"><span class="lr-box-name" dir="ltr">age</span><span class="lr-box-val">9</span></div>`,
      code: [L('age = 9', 'lr_vars_l1'), L('age = age + 1', 'lr_vars_l2'), L('print(age)', 'lr_vars_l3')],
      quiz: [
        { key: 'lr_vars_q1', code: ['x = 5', 'x = x + 2', 'print(x)'], opts: ['7', '5', 'x'] },
        { key: 'lr_vars_q2', opts: ['صندوق باسم يحفظ قيمة', 'زرّ في لوحة المفاتيح'] },
      ],
    },
    cond: {
      title: 'الشروط', icon: '🔀', pic: `<div class="lr-row">${E('🌧️')}<span class="lr-arrow">→</span>${E('☂️')}</div>`,
      code: [L('rain = True', 'lr_cond_l1'), L('if rain:', 'lr_cond_l2'), L('    print("خذ المظلة")', 'lr_cond_l3'), L('else:', 'lr_cond_l4')],
      quiz: [
        { key: 'lr_cond_q1', code: ['n = 10', 'if n > 5:', '    print("كبير")', 'else:', '    print("صغير")'], opts: ['كبير', 'صغير', 'لا شيء'] },
        { key: 'lr_cond_q2', opts: ['if', 'for', 'print'] },
      ],
    },
    funcs: {
      title: 'الدوال', icon: '🧩', pic: `<div class="lr-row">${E('📋')}<span class="lr-arrow">→</span>${E('🍰')}</div>`,
      code: [L('def hello():', 'lr_funcs_l1'), L('    print("مرحبا")', 'lr_funcs_l2'), L('hello()', 'lr_funcs_l3'), L('hello()', 'lr_funcs_l4')],
      quiz: [
        { key: 'lr_funcs_q1', code: ['def hello():', '    print("مرحبا")', 'hello()', 'hello()'], opts: ['2', '1', '4'] },
        { key: 'lr_funcs_q2', opts: ['def', 'if', 'else'] },
      ],
    },
    io: {
      title: 'الإدخال والإخراج', icon: '⌨️', pic: `<div class="lr-row">${E('⌨️')}<span class="lr-arrow">→</span>${E('🖥️')}<span class="lr-arrow">→</span>${E('💬')}</div>`,
      code: [L('name = input("اسمك؟ ")', 'lr_io_l1'), L('print("أهلا", name)', 'lr_io_l2')],
      quiz: [
        { key: 'lr_io_q1', opts: ['input', 'print', 'for'] },
        { key: 'lr_io_q2', opts: ['print', 'input', 'def'] },
      ],
    },
    bugs: {
      title: 'الأخطاء', icon: '🐛', pic: `<div class="lr-row">${E('🐛')}<span class="lr-arrow">→</span>${E('🔧')}</div>`,
      code: [L('prnt("مرحبا")', 'lr_bugs_l1'), L({ t: "NameError: name 'prnt' is not defined", err: true }, 'lr_bugs_l2'), L('print("مرحبا")', 'lr_bugs_l3')],
      quiz: [
        { key: 'lr_bugs_q1', opts: ['يوجد خطأ نصلحه', 'الكمبيوتر غضبان', 'انتهى البرنامج بنجاح'] },
        { key: 'lr_bugs_q2', code: ['print("أ")', 'prin("ب")'], opts: ['الثاني', 'الأوّل'] },
      ],
    },
  };

  // محاكاة نافذة في إس كود (CSS فقط). opts: { code, out, err, run }
  function vscode(o) {
    o = o || {};
    const code = o.code || ['print("مرحبا")'];
    return `<div class="lr-vsc" dir="ltr">
      <div class="lr-vsc-title"><i></i><i></i><i></i><span>hello.py - Visual Studio Code</span></div>
      <div class="lr-vsc-body">
        <div class="lr-vsc-act"><b>▤</b><b>🔍</b><b>⑂</b><b>▷</b></div>
        <div class="lr-vsc-side"><small>EXPLORER</small><div class="lr-vsc-file ${o.file ? 'hl' : ''}">🐍 hello.py</div></div>
        <div class="lr-vsc-main">
          <div class="lr-vsc-tabs"><span class="on">🐍 hello.py</span><button class="lr-vsc-run ${o.run ? 'hl' : ''}" tabindex="-1" aria-label="تشغيل">▶</button></div>
          <div class="lr-vsc-ed">${code.map((l, i) => `<div class="lr-vsc-ln"><em>${i + 1}</em><span>${root.LEARN && root.LEARN.hl ? root.LEARN.hl(l) : l}</span></div>`).join('')}</div>
          <div class="lr-vsc-term ${o.hl ? 'hl' : ''}"><small>TERMINAL</small><div class="lr-vsc-tl">$ python hello.py</div>${o.err ? `<div class="lr-vsc-tl err">${o.err}</div>` : o.out ? `<div class="lr-vsc-tl out">${o.out}</div>` : ''}</div>
        </div>
      </div></div>`;
  }

  const laptop = {
    id: 'laptop', save: 'lr:laptop', title: 'على اللابتوب', icon: '💻',
    screens: [
      { key: 'lr_lp1', pic: () => vscode({}) },
      { key: 'lr_lp2', pic: () => vscode({ file: true }) },
      { key: 'lr_lp3', pic: () => vscode({ run: true }) },
      { key: 'lr_lp4', pic: () => vscode({ run: true, out: 'مرحبا' }) },
      { key: 'lr_lp5', pic: `<div class="lr-col"><div class="lr-cmp"><span>🎮 في اللعبة</span>${CODE(['say("مرحبا")'])}</div><span class="lr-arrow down">⬇</span><div class="lr-cmp"><span>💻 على اللابتوب</span>${CODE(['print("مرحبا")'])}</div></div>` },
      { key: 'lr_lp6', pic: () => vscode({ out: 'مرحبا', hl: true }) },
      { key: 'lr_lp7', pic: () => vscode({ code: ['prnt("مرحبا")'], err: "NameError: name 'prnt' is not defined" }) },
    ],
    quiz: [
      { key: 'lr_lq1', opts: ['في إس كود', 'في الآلة الحاسبة', 'في الرسّام'] },
      { key: 'lr_lq2', opts: ['.py', '.jpg', '.mp3'] },
      { key: 'lr_lq3', opts: ['print', 'say', 'input'] },
    ],
  };

  // الامتحان: أسئلة إضافية + أسئلة الدروس والقصّة واللابتوب
  const examExtra = [
    { key: 'lr_xq1', opts: ['print("hi")', 'x = 3', 'name = "a"'] },
    { key: 'lr_xq2', code: ['for i in range(5):', '    print("*")'], opts: ['يطبع نجمة خمس مرّات', 'يطبع الرقم خمسة', 'لا يفعل شيئاً'] },
    { key: 'lr_xq3', opts: ['تعليمات بلغة برمجة', 'صورة ملوّنة', 'صوت'] },
    { key: 'lr_xq4', opts: ['for', 'print', 'def'] },
  ];
  const examPool = () => examExtra.concat(intro.quiz, laptop.quiz, ...Object.keys(lessons).map(k => lessons[k].quiz));

  root.LEARN_PAGES = { intro, lessons, laptop, vscode, examPool };
  if (typeof module !== 'undefined') module.exports = root.LEARN_PAGES;
})(typeof window !== 'undefined' ? window : globalThis);
