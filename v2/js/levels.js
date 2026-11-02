/* المسارات والمراحل. كل مسار نوع مختلف من البرمجة:
   talk: سراج يتكلم ويتحرك (التسلسل)   draw: الرسم بالكود (التسلسل والتكرار)   path: مغامرة النور (التخطيط)
   goal: جملة قصيرة جداً يقولها سراج بصيغة المتكلم (تناسب الولد والبنت). best: أقل عدد بطاقات للحل (للنجوم). max: أكبر عدد مسموح.
   tip: نصيحة صوتية تظهر في أول المرحلة (مفتاح من texts.js).
   ترتيب المراحل في القائمة هو ترتيب اللعب. لا تغيّر id أي مرحلة، لأن تقدّم الأطفال محفوظ به. */
(function (root) {
  'use strict';

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
          start: [0, 0, 0], target: [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0]] },
        { id: 'd4', goal: 'مُرَبَّعٌ بِثَلاثِ بِطاقاتٍ فَقَط!', blocks: ['pen_forward', 'pen_right', 'siraj_repeat'], best: 3, max: 3, tip: 'loop_in',
          start: [0, 0, 0], target: [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0]] },
        { id: 'd5', goal: 'أُريدُ دَرَجًا!', blocks: ['pen_forward', 'pen_right', 'pen_left', 'siraj_repeat'], best: 5, max: 6,
          start: [0, 0, 0], target: [[0, 0, 1, 0], [1, 0, 1, -1], [1, -1, 2, -1], [2, -1, 2, -2], [2, -2, 3, -2], [3, -2, 3, -3]] },
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
      ],
    },
  ];

  root.TRACKS = TRACKS;
  if (typeof module !== 'undefined') module.exports = TRACKS;
})(typeof window !== 'undefined' ? window : globalThis);
