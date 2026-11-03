/* المسارات والمراحل. كل مسار نوع مختلف من البرمجة:
   talk: سراج يتكلم ويتحرك (التسلسل)   lights: عرض الأضواء   draw: الرسم بالكود (التسلسل والتكرار)   path: مغامرة النور (التخطيط)
   vars: صناديق الذاكرة (المتغيّرات)   funcs: علّم سراج كلمة جديدة (الدوال)   bugs: صيد الحشرات (إصلاح الأخطاء)   pylab: مختبر بايثون (كتابة الكود)
   goal: جملة قصيرة جداً يقولها سراج بصيغة المتكلم (تناسب الولد والبنت). best: أقل عدد بطاقات للحل (للنجوم؛ الافتراضي عدد بطاقات الحل). max: أكبر عدد مسموح.
   tip: نصيحة صوتية تظهر في أول المرحلة (مفتاح من texts.js). stage: نوع المسرح لو مختلف عن المسار.
   must: بطاقات لازم تُستعمل (وإلا يطلب سراج استعمالها). preset: برنامج جاهز يظهر عند فتح المرحلة (فيه حشرة أو للتعديل).
   predict: {choices, answer} صور يختار منها الطفل ماذا سيحدث قبل تشغيل البرنامج الجاهز.
   مختبر بايثون (kind: 'py'): solution نص بايثون، starter نص البداية، keys أزرار إضافية، mustPy كلمات لازم تُكتب.
   ترتيب المراحل في القائمة هو ترتيب اللعب. لا تغيّر id أي مرحلة، لأن تقدّم الأطفال محفوظ به. */
(function (root) {
  'use strict';

  // اختصارات لكتابة الحلول. الصيغة: 'نوع' أو ['نوع', {حقل: قيمة}] أو ['نوع', {حقل: قيمة}, [بطاقات داخلية]]
  const say = t => ['siraj_say', { TEXT: t }], fw = n => ['pen_forward', { N: n }], R = 'pen_right', Lt = 'pen_left';
  const rep = (n, inner) => ['siraj_repeat', { N: n }, inner];
  const lt = c => ['light_on', { C: c }], OFF = 'light_off';
  const vset = (v, n) => ['var_set', { V: v, N: n }], vadd = (v, n) => ['var_add', { V: v, N: n }], vsub = (v, n) => ['var_sub', { V: v, N: n }], vsay = v => ['var_say', { V: v }];
  const def = (name, inner) => ['func_def', { NAME: name }, inner], call = name => ['func_call', { NAME: name }];
  const times = (n, a) => Array.from({ length: n }, () => a).flat();
  // مربع طوله s يبدأ من (x, y) ويرسم يميناً ثم لتحت
  const sq = (x, y, s) => [[x, y, x + s, y], [x + s, y, x + s, y + s], [x + s, y + s, x, y + s], [x, y + s, x, y]];

  const TRACKS = [
    {
      id: 'talk', name: 'سراج يتكلم', icon: '💬', color: '#e8579a',
      idea: 'التسلسل: الأوامر تُنفَّذ بالترتيب',
      levels: [
        { id: 't1', goal: 'أُريدُ أَنْ أَقولَ: مَرْحَبا!', blocks: ['siraj_say'], best: 1, tip: 'tap_tip',
          target: ['say:مرحبا'] },
        { id: 't2', goal: 'أُلَوِّحُ، ثُمَّ أَقولُ: مَرْحَبا!', blocks: ['siraj_say', 'siraj_wave'], best: 2,
          target: ['wave', 'say:مرحبا'] },
        { id: 't2b', goal: 'أُريدُ أَنْ أَقولَ: أَنا سِراج!', blocks: ['siraj_say'], best: 1, tip: 'pick_word',
          target: ['say:أنا سراج'] },
        { id: 't3', goal: 'مَرْحَبا، ثُمَّ أَنا سِراج، ثُمَّ أَقْفِزُ!', blocks: ['siraj_say', 'siraj_wave', 'siraj_jump'], best: 3,
          target: ['say:مرحبا', 'say:أنا سراج', 'jump'] },
        { id: 't4', goal: 'هِيب هِيب ثَلاثَ مَرّاتٍ، ثُمَّ هُرّاي!', blocks: ['siraj_say', 'siraj_jump', 'siraj_repeat'], best: 3, max: 3, tip: 'loop_in',
          target: ['say:هيب هيب', 'say:هيب هيب', 'say:هيب هيب', 'say:هرّاي'] },
        { id: 't5', goal: 'أُلَوِّحُ وَأَقْفِزُ، مَرَّتَيْن!', blocks: ['siraj_wave', 'siraj_jump', 'siraj_repeat'], max: 3, tip: 'loop_in',
          target: ['wave', 'jump', 'wave', 'jump'], solution: [rep(2, ['siraj_wave', 'siraj_jump'])] },
        { id: 't6', goal: 'مَرْحَبا، ثُمَّ ثَلاثُ قَفَزات، ثُمَّ شُكْراً!', blocks: ['siraj_say', 'siraj_jump', 'siraj_repeat'], max: 5,
          target: ['say:مرحبا', 'jump', 'jump', 'jump', 'say:شكرا'], solution: [say('مرحبا'), rep(3, ['siraj_jump']), say('شكرا')] },
        { id: 't7', goal: 'هِيب هِيب أَرْبَعَ مَرّاتٍ، ثُمَّ هُرّاي!', blocks: ['siraj_say', 'siraj_repeat'],
          preset: [rep(2, [say('هيب هيب')]), say('هرّاي')],
          predict: { answer: 0, choices: [['say:هيب هيب', 'say:هيب هيب', 'say:هرّاي'], ['say:هيب هيب', 'say:هرّاي'], ['say:هرّاي', 'say:هيب هيب', 'say:هيب هيب']] },
          target: ['say:هيب هيب', 'say:هيب هيب', 'say:هيب هيب', 'say:هيب هيب', 'say:هرّاي'], solution: [rep(4, [say('هيب هيب')]), say('هرّاي')] },
        // لعب حر (PRIMM: اصنع): أي برنامج يفوز بثلاث نجوم. الحل هنا مجرد مثال للاختبار
        { id: 't8', free: true, goal: 'عَرْضٌ حُرّ! أَيُّ بَرْنامَجٍ يُعْجِبُني!', blocks: ['siraj_say', 'siraj_wave', 'siraj_jump', 'siraj_repeat'], tip: 'free_tip',
          target: [], solution: [say('مرحبا'), 'siraj_wave', 'siraj_jump', say('هيا نلعب'), 'siraj_jump', 'siraj_wave'] },
      ],
    },
    {
      id: 'lights', name: 'عرض الأضواء', icon: '🚦', color: '#f0a500',
      idea: 'الأضواء تشتعل بالترتيب الذي تكتبه',
      levels: [
        { id: 'l1', goal: 'أُضيءُ المِصْباحَ بِاللَّوْنِ الأَحْمَر!', blocks: ['light_on:red'], tip: 'tap_tip',
          target: ['red'], solution: [lt('red')] },
        { id: 'l2', goal: 'أَحْمَر، ثُمَّ أَخْضَر!', blocks: ['light_on:red', 'light_on:green'],
          target: ['red', 'green'], solution: [lt('red'), lt('green')] },
        { id: 'l3', goal: 'إِشارَةُ المُرور: أَحْمَر، أَصْفَر، أَخْضَر!', blocks: ['light_on:red', 'light_on:yellow', 'light_on:green'],
          target: ['red', 'yellow', 'green'], solution: [lt('red'), lt('yellow'), lt('green')] },
        { id: 'l4', goal: 'أَحْمَر، ثُمَّ أُطْفِئُ، ثُمَّ أَحْمَر!', blocks: ['light_on:red', 'light_off'],
          target: ['red', 'off', 'red'], solution: [lt('red'), OFF, lt('red')] },
        { id: 'l5', goal: 'أَزْرَق، ثُمَّ بَنَفْسَجِيّ!', blocks: ['light_on'], tip: 'pick_word',
          target: ['blue', 'purple'], solution: [lt('blue'), lt('purple')] },
        { id: 'l6', goal: 'أَرْمِشُ بِالأَصْفَرِ ثَلاثَ مَرّات!', blocks: ['light_on:yellow', 'light_off', 'siraj_repeat'], max: 3, tip: 'loop_in',
          target: times(3, ['yellow', 'off']), solution: [rep(3, [lt('yellow'), OFF])] },
        { id: 'l7', goal: 'أَحْمَر، أَخْضَر، أَزْرَق... مَرَّتَيْن!', blocks: ['light_on', 'siraj_repeat'], max: 4,
          target: times(2, ['red', 'green', 'blue']), solution: [rep(2, [lt('red'), lt('green'), lt('blue')])] },
        { id: 'l8', goal: 'أَرْمِشُ بِالأَزْرَق، ثُمَّ أَخْضَرُ في النِّهايَة!', blocks: ['light_on', 'light_off', 'siraj_repeat'], max: 5,
          target: times(3, ['blue', 'off']).concat(['green']), solution: [rep(3, [lt('blue'), OFF]), lt('green')] },
        { id: 'l9', free: true, goal: 'عَرْضُ أَضْواءٍ حُرّ! أَيُّ أَلْوانٍ تُعْجِبُني!', blocks: ['light_on', 'light_off', 'siraj_repeat'], tip: 'free_tip',
          lamps: 8, solution: [lt('red'), lt('yellow'), lt('green'), lt('blue'), lt('purple'), OFF] },
      ],
    },
    {
      id: 'draw', name: 'ارسم بالكود', icon: '🎨', color: '#16a865',
      idea: 'الرسم بالأوامر، والتكرار',
      levels: [
        { id: 'd1', goal: 'أُريدُ خَطًّا!', blocks: ['pen_forward'], best: 1, tip: 'tap_tip',
          start: [0, 0, 0], target: [[0, 0, 3, 0]] },
        { id: 'd2', goal: 'أُريدُ هذا الشَّكْل!', blocks: ['pen_forward', 'pen_right'], best: 3,
          start: [0, 0, 0], target: [[0, 0, 2, 0], [2, 0, 2, 2]] },
        { id: 'd2b', goal: 'وَالآنَ إِلى اليَسار!', blocks: ['pen_forward', 'pen_left'], best: 3,
          start: [0, 0, 0], target: [[0, 0, 2, 0], [2, 0, 2, -2]] },
        { id: 'd3', goal: 'أُريدُ مُرَبَّعًا!', blocks: ['pen_forward', 'pen_right'], best: 7,
          start: [0, 0, 0], target: sq(0, 0, 2) },
        { id: 'd4', goal: 'مُرَبَّعٌ بِثَلاثِ بِطاقاتٍ فَقَط!', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'], best: 3, max: 3, tip: 'loop_in',
          start: [0, 0, 0], target: sq(0, 0, 2) },
        { id: 'd5', goal: 'أُريدُ دَرَجًا!', blocks: ['pen_forward', 'pen_right', 'pen_left', 'siraj_repeat'], best: 5, max: 6,
          start: [0, 0, 0], target: [[0, 0, 1, 0], [1, 0, 1, -1], [1, -1, 2, -1], [2, -1, 2, -2], [2, -2, 3, -2], [3, -2, 3, -3]] },
        { id: 'd6', goal: 'أُريدُ مُسْتَطيلًا طَويلًا!', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'],
          start: [0, 0, 0], target: [[0, 0, 3, 0], [3, 0, 3, 1], [3, 1, 0, 1], [0, 1, 0, 0]], solution: [rep(2, [fw(3), R, fw(1), R])] },
        { id: 'd7', goal: 'أُريدُ المُرَبَّعَ أَكْبَر!', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'],
          preset: [rep(4, [fw(1), R])],
          predict: { answer: 0, choices: [sq(0, 0, 1), [[0, 0, 4, 0]], sq(0, 0, 3)] },
          start: [0, 0, 0], target: sq(0, 0, 3), solution: [rep(4, [fw(3), R])] },
        { id: 'd8', goal: 'أُريدُ كوبًا! القَلَمُ يَنْظُرُ لِتَحْت.', blocks: ['pen_forward', 'pen_left'], tip: 'look_arrow',
          start: [0, 0, 90], target: [[0, 0, 0, 2], [0, 2, 2, 2], [2, 2, 2, 0]], solution: [fw(2), Lt, fw(2), Lt, fw(2)] },
        // خطوة قبل النافذة: تكرار داخل تكرار بمربعين بس
        { id: 'd8b', goal: 'مُرَبَّعانِ جَنْبًا إِلى جَنْب!', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'], max: 5, tip: 'loop_loop',
          start: [0, 0, 0], target: [].concat(sq(0, 0, 1), sq(1, 0, 1)),
          solution: [rep(2, [rep(4, [fw(1), R]), fw(1)])] },
        { id: 'd9', goal: 'أَرْسُمُ نافِذَةً بِأَرْبَعَةِ مُرَبَّعات!', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'], max: 5, tip: 'loop_loop',
          start: [0, 0, 0], target: [].concat(sq(0, 0, 1), sq(-1, 0, 1), sq(-1, -1, 1), sq(0, -1, 1)),
          solution: [rep(4, [rep(4, [fw(1), R]), R])] },
        { id: 'd10', free: true, goal: 'رَسْمٌ حُرّ! أَيُّ رَسْمَةٍ تُعْجِبُني!', blocks: ['pen_forward', 'pen_right', 'pen_left', 'siraj_repeat'], tip: 'free_tip',
          start: [0, 0, 0], target: [], area: [-3, -3, 3, 3], solution: [rep(4, [fw(2), R])] },
      ],
    },
    {
      id: 'path', name: 'مغامرة النور', icon: '✨', color: '#3d8bff',
      idea: 'التخطيط: اجمع الشرارات وأضئ المصباح',
      levels: [
        { id: 'p1', goal: 'هَيّا إِلى المِصْباح!', blocks: ['go_right'], best: 4, tip: 'tap_tip',
          grid: ['R.s.L'] },
        { id: 'p1b', goal: 'الشَّرارَةُ، ثُمَّ المِصْباح!', blocks: ['go_up', 'go_right'], best: 4,
          grid: ['..L', '.s.', 'R..'] },
        { id: 'p2', goal: 'ثَلاثُ شَرارات، ثُمَّ المِصْباح!', blocks: ['go_up', 'go_down', 'go_left', 'go_right'], best: 7,
          grid: ['....L', '.#.#s', '.s.s.', 'R....'] },
        { id: 'p3', goal: 'طَريقٌ طَويلٌ بِبِطاقَتَيْنِ فَقَط!', blocks: ['go_right', 'siraj_repeat'], best: 2, max: 2, tip: 'loop_in',
          grid: ['R.s.s.s.L'] },
        { id: 'p4', goal: 'هَيّا نَصْعَدُ الدَّرَج!', blocks: ['go_up', 'go_right', 'siraj_repeat'], best: 4, max: 4,
          grid: ['###.L', '##.s#', '#.s##', 'R.###'] },
        { id: 'p5', goal: 'أَمْشي، ثُمَّ أَصْعَدُ، بِتَكْرارَيْن!', blocks: ['go_up', 'go_right', 'siraj_repeat'], max: 4,
          grid: ['#####L', '#####s', '#####.', 'R.s.s.'], solution: [rep(5, ['go_right']), rep(3, ['go_up'])] },
        { id: 'p6', goal: 'مَتاهَة! أَجِدُ الطَّريقَ إِلى المِصْباح.', blocks: ['go_up', 'go_down', 'go_left', 'go_right'],
          grid: ['R..#L', '##.#s', '#.s..'], solution: ['go_right', 'go_right', 'go_down', 'go_down', 'go_right', 'go_right', 'go_up', 'go_up'] },
        { id: 'p7', goal: 'دَرَجٌ كَبيرٌ: ثَلاثُ بِطاقاتٍ داخِلَ التَّكْرار!', blocks: ['go_up', 'go_right', 'siraj_repeat'], max: 4,
          grid: ['######L', '####.s.', '##.s.##', 'R.s####'], solution: [rep(3, ['go_right', 'go_right', 'go_up'])] },
      ],
    },
    {
      id: 'vars', name: 'صناديق الذاكرة', icon: '📦', color: '#c27c0e',
      idea: 'المتغيّر صندوق له اسم، يحفظ رقماً',
      levels: [
        { id: 'v1', goal: 'أَضَعُ ثَلاثَ تُفّاحاتٍ في الصُّنْدوق!', blocks: ['var_set:apples'], tip: 'var_tip',
          vars: ['apples'], target: { apples: 3 }, solution: [vset('apples', 3)] },
        { id: 'v2', goal: 'أَضَعُ خَمْسَة، ثُمَّ أَقولُ ما في الصُّنْدوق!', blocks: ['var_set:apples', 'var_say:apples'],
          vars: ['apples'], target: { apples: 5 }, says: [5], solution: [vset('apples', 5), vsay('apples')] },
        { id: 'v3', goal: 'أَقولُ اثْنان، ثُمَّ أَزيدُ واحِدًا وَأَقول!', blocks: ['var_set:apples', 'var_add:apples', 'var_say:apples'], must: ['var_add'],
          vars: ['apples'], target: { apples: 3 }, says: [2, 3], solution: [vset('apples', 2), vsay('apples'), vadd('apples', 1), vsay('apples')] },
        { id: 'v4', goal: 'عِنْدي خَمْسَة، آكُلُ اثْنَتَيْن، كَمْ بَقِيَ؟', blocks: ['var_set:apples', 'var_sub:apples', 'var_say:apples'], must: ['var_sub'],
          vars: ['apples'], target: { apples: 3 }, says: [3], solution: [vset('apples', 5), vsub('apples', 2), vsay('apples')] },
        { id: 'v5', goal: 'أَعُدُّ: واحِد، اثْنان، ثَلاثَة، أَرْبَعَة!', blocks: ['var_set:apples', 'var_add:apples', 'var_say:apples', 'siraj_repeat'], max: 4, tip: 'loop_in',
          vars: ['apples'], target: { apples: 4 }, says: [1, 2, 3, 4], solution: [vset('apples', 0), rep(4, [vadd('apples', 1), vsay('apples')])] },
        { id: 'v6', goal: 'تُفّاحَتان، وَثَلاثُ نُجوم!', blocks: ['var_set:apples', 'var_set:stars'],
          vars: ['apples', 'stars'], target: { apples: 2, stars: 3 }, solution: [vset('apples', 2), vset('stars', 3)] },
        { id: 'v7', goal: 'أَعُدُّ بِالاثْنَيْن: اثْنان، أَرْبَعَة، سِتَّة، ثَمانِيَة!', blocks: ['var_set:stars', 'var_add:stars', 'var_say:stars', 'siraj_repeat'], max: 4,
          vars: ['stars'], target: { stars: 8 }, says: [2, 4, 6, 8], solution: [vset('stars', 0), rep(4, [vadd('stars', 2), vsay('stars')])] },
        { id: 'v8', goal: 'أُريدُ أَنْ أَقولَ عَشَرَة!', blocks: ['var_set:balloons', 'var_add:balloons', 'var_say:balloons', 'siraj_repeat'],
          preset: [vset('balloons', 1), rep(3, [vadd('balloons', 2)]), vsay('balloons')],
          predict: { answer: 0, choices: [7, 6, 3] },
          vars: ['balloons'], target: { balloons: 10 }, says: [10], solution: [vset('balloons', 1), rep(3, [vadd('balloons', 3)]), vsay('balloons')] },
      ],
    },
    {
      id: 'funcs', name: 'علّم سراج كلمة', icon: '📖', color: '#d6336c', noLittle: true,
      idea: 'الدالة: كلمة جديدة نعلّمها مرة ونستعملها كثيراً',
      levels: [
        { id: 'f1', stage: 'talk', goal: 'أُريدُ رَقْصَةً جَديدَة: أُلَوِّحُ ثُمَّ أَقْفِز!', blocks: ['siraj_wave', 'siraj_jump', 'func_call:dance'], must: ['func_def', 'func_call'], tip: 'func_tip',
          preset: [def('dance', [])], target: ['wave', 'jump'], solution: [def('dance', ['siraj_wave', 'siraj_jump']), call('dance')] },
        { id: 'f2', stage: 'talk', goal: 'أَرْقُصُ مَرَّتَيْن!', blocks: ['func_call:dance', 'siraj_wave', 'siraj_jump'], must: ['func_def', 'func_call'],
          preset: [def('dance', ['siraj_wave', 'siraj_jump'])], target: ['wave', 'jump', 'wave', 'jump'],
          solution: [def('dance', ['siraj_wave', 'siraj_jump']), call('dance'), call('dance')] },
        { id: 'f3', stage: 'talk', goal: 'أُحَيّي ثَلاثَةَ أَصْدِقاء!', blocks: ['func_def:hello', 'func_call:hello', 'siraj_wave', 'siraj_say'], must: ['func_def', 'func_call'],
          target: times(3, ['wave', 'say:مرحبا']), solution: [def('hello', ['siraj_wave', say('مرحبا')]), call('hello'), call('hello'), call('hello')] },
        { id: 'f4', stage: 'lights', goal: 'كَلِمَةٌ جَديدَةٌ لِلرَّمْش، وَأَرْمِشُ ثَلاثاً!', blocks: ['func_def:blink', 'func_call:blink', 'light_on:yellow', 'light_off', 'siraj_repeat'], must: ['func_def', 'func_call'],
          target: times(3, ['yellow', 'off']), solution: [def('blink', [lt('yellow'), OFF]), rep(3, [call('blink')])] },
        { id: 'f5', stage: 'draw', goal: 'كَلِمَةُ المُرَبَّع، وَأَرْسُمُ مُرَبَّعَيْن!', blocks: ['func_def:square', 'func_call:square', 'pen_forward', 'pen_right', 'siraj_repeat'], must: ['func_def', 'func_call'],
          start: [0, 0, 0], target: [].concat(sq(0, 0, 1), [[1, 0, 2, 0]], sq(2, 0, 1)),
          solution: [def('square', [rep(4, [fw(1), R])]), call('square'), fw(2), call('square')] },
        { id: 'f6', stage: 'path', goal: 'كَلِمَةُ الدَّرَجَة، ثُمَّ أَصْعَدُ الدَّرَج!', blocks: ['func_def:step', 'func_call:step', 'go_up', 'go_right', 'siraj_repeat'], must: ['func_def', 'func_call'],
          grid: ['####L', '###s.', '##s.#', '#s.##', 'R.###'], solution: [def('step', ['go_right', 'go_up']), rep(4, [call('step')])] },
        { id: 'f7', stage: 'talk', goal: 'كَلِمَتانِ جَديدَتان: تَحِيَّةٌ وَرَقْصَة!', blocks: ['func_def:hello', 'func_def:dance', 'func_call:hello', 'func_call:dance', 'siraj_wave', 'siraj_jump', 'siraj_say'], must: ['func_def', 'func_call'],
          target: ['wave', 'say:مرحبا', 'jump', 'jump', 'wave', 'say:مرحبا'],
          solution: [def('hello', ['siraj_wave', say('مرحبا')]), def('dance', ['siraj_jump', 'siraj_jump']), call('hello'), call('dance'), call('hello')] },
      ],
    },
    {
      id: 'bugs', name: 'صيد الحشرات', icon: '🐞', color: '#2f9e44', noLittle: true,
      idea: 'البرنامج فيه خطأ صغير: شغّله، اعرف السبب، وأصلحه',
      levels: [
        { id: 'b1', stage: 'talk', goal: 'أُريدُ مَرْحَبا ثُمَّ أُلَوِّح، لا أَقْفِز!', blocks: ['siraj_say', 'siraj_wave', 'siraj_jump'], tip: 'bug_tip',
          preset: [say('مرحبا'), 'siraj_jump'], target: ['say:مرحبا', 'wave'], solution: [say('مرحبا'), 'siraj_wave'] },
        { id: 'b2', stage: 'lights', goal: 'إِشارَتي فيها حَشَرَة: أَحْمَر، أَصْفَر، أَخْضَر!', blocks: ['light_on'], tip: 'bug_tip',
          preset: [lt('red'), lt('red'), lt('green')], target: ['red', 'yellow', 'green'], solution: [lt('red'), lt('yellow'), lt('green')] },
        { id: 'b3', stage: 'draw', goal: 'مُرَبَّعي مَكْسور! أَيْنَ الحَشَرَة؟', blocks: ['pen_forward', 'pen_right'], tip: 'bug_tip',
          preset: [fw(2), R, fw(2), R, fw(1), R, fw(2)], start: [0, 0, 0], target: sq(0, 0, 2), solution: [fw(2), R, fw(2), R, fw(2), R, fw(2)] },
        { id: 'b4', stage: 'path', goal: 'اصْطَدَمْتُ بِصُنْدوق! التَّرْتيبُ فيهِ حَشَرَة.', blocks: ['go_up', 'go_right', 'siraj_repeat'], tip: 'bug_tip',
          preset: [rep(2, ['go_up', 'go_right'])], grid: ['##L', '#s.', 'R.#'], solution: [rep(2, ['go_right', 'go_up'])] },
        { id: 'b5', stage: 'lights', goal: 'أَرْمِشُ أَرْبَعَ مَرّات، لا مَرَّتَيْن!', blocks: ['light_on', 'light_off', 'siraj_repeat'], tip: 'bug_tip',
          preset: [rep(2, [lt('blue'), OFF])], target: times(4, ['blue', 'off']), solution: [rep(4, [lt('blue'), OFF])] },
        { id: 'b6', stage: 'vars', goal: 'أُريدُ أَنْ أَقولَ ثَلاثَة! أَيْنَ الحَشَرَة؟', blocks: ['var_set:apples', 'var_add:apples', 'var_say:apples'], tip: 'bug_tip',
          preset: [vset('apples', 2), vsay('apples'), vadd('apples', 1)], vars: ['apples'], target: { apples: 3 }, says: [3],
          solution: [vset('apples', 2), vadd('apples', 1), vsay('apples')] },
        { id: 'b7', stage: 'talk', goal: 'لا أَعْرِفُ الرَّقْصَةَ بَعْد! التَّرْتيبُ خَطَأ.', blocks: ['func_call:dance', 'siraj_wave', 'siraj_jump'], tip: 'bug_tip', must: ['func_def', 'func_call'],
          preset: [call('dance'), def('dance', ['siraj_wave', 'siraj_jump'])], target: ['wave', 'jump'], solution: [def('dance', ['siraj_wave', 'siraj_jump']), call('dance')] },
        { id: 'b8', stage: 'path', goal: 'مَشَيْتُ أَكْثَرَ مِنَ اللّازِم! الرَّقْمُ فيهِ حَشَرَة.', blocks: ['go_right', 'siraj_repeat'], tip: 'bug_tip',
          preset: [rep(8, ['go_right'])], grid: ['R.s.s.L'], solution: [rep(6, ['go_right'])] },
        { id: 'b9', stage: 'draw', goal: 'نافِذَتي ناقِصَة! أَيْنَ الحَشَرَة؟', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'], tip: 'bug_tip',
          preset: [rep(4, [rep(3, [fw(1), R]), R])], start: [0, 0, 0], target: [].concat(sq(0, 0, 1), sq(-1, 0, 1), sq(-1, -1, 1), sq(0, -1, 1)),
          solution: [rep(4, [rep(4, [fw(1), R]), R])] },
      ],
    },
    {
      id: 'pylab', name: 'مختبر بايثون', icon: '🐍', color: '#3776ab', kind: 'py', minAge: 8,
      idea: 'اكتب كود بايثون الحقيقي بيدك',
      levels: [
        { id: 'y1', stage: 'talk', goal: 'أَكْتُبُ أَوَّلَ سَطْرٍ في بايْثون!', tip: 'py_tip', keys: ['مرحبا'], starter: 'say("|")',
          target: ['say:مرحبا'], solution: 'say("مرحبا")' },
        { id: 'y2', stage: 'talk', goal: 'أُلَوِّحُ، أَقولُ مَرْحَبا، ثُمَّ أَقْفِز!', keys: ['مرحبا'],
          target: ['wave', 'say:مرحبا', 'jump'], solution: 'wave()\nsay("مرحبا")\njump()' },
        { id: 'y3', stage: 'draw', goal: 'أَرْسُمُ زاوِيَةً بِالكود!',
          start: [0, 0, 0], target: [[0, 0, 2, 0], [2, 0, 2, 2]], solution: 'forward(2)\nright(90)\nforward(2)' },
        { id: 'y4', stage: 'draw', goal: 'أَرْسُمُ مُرَبَّعًا بِالتَّكْرار!', tip: 'py_indent', keys: ['for i in range(|):'], mustPy: ['for'],
          start: [0, 0, 0], target: sq(0, 0, 2), solution: 'for i in range(4):\n    forward(2)\n    right(90)' },
        { id: 'y5', stage: 'path', goal: 'أَمْشي إِلى المِصْباحِ بِسَطْرَيْنِ فَقَط!', keys: ['for i in range(|):'], mustPy: ['for'],
          grid: ['R.s.s.s.L'], solution: 'for i in range(8):\n    move_right()' },
        { id: 'y6', stage: 'lights', goal: 'أَرْمِشُ بِالأَحْمَر، ثُمَّ أَخْضَرُ في النِّهايَة!', keys: ['for i in range(|):'],
          target: times(3, ['red', 'off']).concat(['green']), solution: 'for i in range(3):\n    light("red")\n    off()\nlight("green")' },
        { id: 'y7', stage: 'vars', goal: 'ثَلاثُ تُفّاحات، ثُمَّ أَزيدُ اثْنَتَيْن!', starter: 'apples = 3\n', keys: ['apples', ' + '], mustPy: ['+'],
          vars: ['apples'], target: { apples: 5 }, says: [5], solution: 'apples = 3\napples = apples + 2\nsay(apples)' },
        { id: 'y8', stage: 'vars', goal: 'أُسَمّي صُنْدوقًا، وَأَعُدُّ إِلى خَمْسَة!', keys: ['count', ' = ', ' + ', 'for i in range(|):'], mustPy: ['for'],
          vars: [], says: [1, 2, 3, 4, 5], solution: 'count = 0\nfor i in range(5):\n    count = count + 1\n    say(count)' },
        { id: 'y9', stage: 'vars', goal: 'أَعُدُّ مِنْ واحِدٍ إِلى خَمْسَةٍ بِسَطْرَيْن!', keys: ['for i in range(|):', 'i', ' + '], mustPy: ['for'],
          vars: [], says: [1, 2, 3, 4, 5], solution: 'for i in range(5):\n    say(i + 1)' },
        { id: 'y10', stage: 'talk', goal: 'أُعَرِّفُ رَقْصَةً، وَأَرْقُصُها مَرَّتَيْن!', keys: ['def |():', 'dance'], mustPy: ['def'],
          target: times(2, ['wave', 'jump', 'jump']), solution: 'def dance():\n    wave()\n    jump()\n    jump()\ndance()\ndance()' },
        { id: 'y11', stage: 'draw', goal: 'ثَلاثَةُ مُرَبَّعاتٍ بِكَلِمَةٍ جَديدَة!', keys: ['def |():', 'square', 'for i in range(|):'], mustPy: ['def', 'for'],
          start: [0, 0, 0], target: [].concat(sq(0, 0, 1), sq(1, 0, 1), sq(2, 0, 1)),
          solution: 'def square():\n    for i in range(4):\n        forward(1)\n        right(90)\nfor i in range(3):\n    square()\n    forward(1)' },
        // الشرط وحده أولاً (if بدون else)، وبعدها y12 تضيف else
        { id: 'y11b', stage: 'lights', goal: 'أُضيءُ ثَلاثَةً خُضْرًا فَقَط، بِالشَّرْط!', tip: 'py_if1', keys: ['for i in range(|):', 'if |:', 'i', ' < '], mustPy: ['if'],
          target: ['green', 'green', 'green'], solution: 'for i in range(5):\n    if i < 3:\n        light("green")' },
        { id: 'y12', stage: 'lights', goal: 'ثَلاثَةٌ خُضْر، ثُمَّ اثْنانِ حُمْر، بِالشَّرْط!', tip: 'py_if', keys: ['for i in range(|):', 'if |:', 'else:', 'i', ' < '], mustPy: ['if'],
          target: ['green', 'green', 'green', 'red', 'red'], solution: 'for i in range(5):\n    if i < 3:\n        light("green")\n    else:\n        light("red")' },
      ],
    },
  ];

  // الحلول المرجعية للمراحل القديمة (للاختبار التلقائي ولزر "اعرض الحل"). المراحل الجديدة تكتب solution داخلها مباشرة.
  const SOL = {
    t1: [say('مرحبا')], t2: ['siraj_wave', say('مرحبا')], t2b: [say('أنا سراج')],
    t3: [say('مرحبا'), say('أنا سراج'), 'siraj_jump'],
    t4: [rep(3, [say('هيب هيب')]), say('هرّاي')],
    d1: [fw(3)], d2: [fw(2), R, fw(2)], d2b: [fw(2), Lt, fw(2)],
    d3: [fw(2), R, fw(2), R, fw(2), R, fw(2)],
    d4: [rep(4, [fw(2), R])],
    d5: [rep(3, [fw(1), Lt, fw(1), R])],
    p1: ['go_right', 'go_right', 'go_right', 'go_right'], p1b: ['go_right', 'go_up', 'go_right', 'go_up'],
    p2: ['go_right', 'go_up', 'go_right', 'go_right', 'go_right', 'go_up', 'go_up'],
    p3: [rep(8, ['go_right'])],
    p4: [rep(3, ['go_right', 'go_up']), 'go_right'],
  };
  const count = list => list.reduce((n, s) => n + 1 + (Array.isArray(s) && s[2] ? count(s[2]) : 0), 0);
  const pyLines = s => s.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  TRACKS.forEach(t => t.levels.forEach(l => {
    if (!l.solution && SOL[l.id]) l.solution = SOL[l.id];
    if (t.kind) l.kind = t.kind;
    if (l.best == null && l.solution) l.best = typeof l.solution === 'string' ? pyLines(l.solution) : count(l.solution);
  }));

  // المسارات التي يراها هذا الطفل: المختبر من عمر ٨، والكلمات والحشرات مش لوضع الصغار (٤ وأقل)
  const tracksFor = p => TRACKS.map((t, ti) => [t, ti]).filter(([t]) => !p || ((!t.minAge || p.age >= t.minAge) && !(t.noLittle && p.age <= 4)));
  Object.defineProperty(TRACKS, 'forPlayer', { value: tracksFor });
  root.TRACKS = TRACKS;
  root.tracksFor = tracksFor;
  if (typeof module !== 'undefined') module.exports = TRACKS;
})(typeof window !== 'undefined' ? window : globalThis);
