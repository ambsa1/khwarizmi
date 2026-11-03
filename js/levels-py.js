/* مسارات شاشة الناتج (بايثون الحقيقية): تُضاف على TRACKS بعد levels.js.
   كل مرحلة kind: 'py' و stage: 'console': المسرح شاشة سوداء تعرض ما تطبعه print.
   expect: السطور المطلوبة بالضبط. inputs: أجوبة input() في الاختبار التلقائي (الطفل يكتبها بنفسه).
   starter: الكود الجاهز (الخطأ في مسار الأخطاء، والخطوة السابقة في المشاريع). copy: زر 📋 خد كودك. */
(function (root) {
  'use strict';
  const TRACKS = root.TRACKS;
  if (!TRACKS) return;
  const pyLines = s => s.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;
  const ASK1 = 'الرقم الأول؟', ASK2 = 'الرقم الثاني؟', GUESS = 'خمّن الرقم؟';
  const CALC2 = `a = int(input("${ASK1}"))\nb = int(input("${ASK2}"))\nprint(a + b)`;
  const GAME_IF = 'if guess == secret:\n    print("صح")\nelif guess > secret:\n    print("أصغر")\nelse:\n    print("أكبر")';
  const STORY1 = 'name = input("اسم البطل؟")\nprint("كان يا ما كان بطل اسمه", name)';
  const STORY2 = STORY1 + '\nplace = input("أين يعيش؟")\nprint("يعيش في", place)';
  const STORY3 = STORY2 + '\nthing = input("ماذا يحب؟")\nprint("ويحب", thing)';

  const NEW = [
    {
      id: 'io', name: 'المدخلات والمخرجات', icon: '🖥', color: '#1b7f5a', kind: 'py', minAge: 8,
      idea: 'الكمبيوتر يطبع ويسأل، وأنت تجيب',
      levels: [
        { id: 'io1', goal: 'أَطْبَعُ مَرْحَبا عَلى الشّاشَة!', tip: 'io_tip', keys: ['مرحبا'], starter: 'print("|")',
          expect: ['مرحبا'], solution: 'print("مرحبا")' },
        { id: 'io2', goal: 'أَطْبَعُ سَطْرَيْن!', keys: ['مرحبا', 'أنا سراج'],
          expect: ['مرحبا', 'أنا سراج'], solution: 'print("مرحبا")\nprint("أنا سراج")' },
        { id: 'io3', goal: 'أَحْفَظُ اسْمًا في صُنْدوق، ثُمَّ أَطْبَعُه!', keys: ['name', '"سراج"'],
          expect: ['سراج'], solution: 'name = "سراج"\nprint(name)' },
        { id: 'io4', goal: 'أَسْأَلُ عَنِ الاسْم، ثُمَّ أُرَحِّبُ بِه!', tip: 'input_tip', keys: ['name', 'ما اسمك؟', '"مرحبا"', ', '],
          inputs: ['سراج'], expect: ['مرحبا سراج'], solution: 'name = input("ما اسمك؟")\nprint("مرحبا", name)' },
        { id: 'io5', goal: 'أَجْمَعُ رَقْمَيْن وَأَطْبَعُ النّاتِج!', keys: ['a', 'b'],
          expect: ['8'], solution: 'a = 5\nb = 3\nprint(a + b)' },
        { id: 'io6', goal: 'أَسْأَلُ عَنْ رَقْم، وَأَطْبَعُ ضِعْفَه!', tip: 'int_tip', keys: ['n', 'رقم؟'],
          inputs: ['6'], expect: ['12'], solution: 'n = int(input("رقم؟"))\nprint(n * 2)' },
        { id: 'io7', goal: 'أَعُدُّ إِلى ثَلاثَةٍ بِالتَّكْرار!', keys: ['for i in range(|):', 'i'], mustPy: ['for'],
          expect: ['1', '2', '3'], solution: 'for i in range(3):\n    print(i + 1)' },
      ],
    },
    {
      id: 'errs', name: 'اقرأ الخطأ', icon: '🩺', color: '#c0392b', kind: 'py', minAge: 8,
      idea: 'رسالة الخطأ تقول لك أين المشكلة',
      levels: [
        { id: 'e1', goal: 'قَوْسٌ ناقِص! اقْرَأِ الرِّسالَةَ وَأَصْلِحْه!', tip: 'err_paren', keys: ['مرحبا'],
          starter: 'print("مرحبا"', expect: ['مرحبا'], solution: 'print("مرحبا")' },
        { id: 'e2', goal: 'عَلامَةُ تَنْصيصٍ ناقِصَة!', tip: 'err_quote', keys: ['أنا سراج'],
          starter: 'print("أنا سراج)', expect: ['أنا سراج'], solution: 'print("أنا سراج")' },
        { id: 'e3', goal: 'بايْثون لا تَعْرِفُ هذا الاسْم!', tip: 'err_name', keys: ['name', '"سراج"'],
          starter: 'name = "سراج"\nprint(nmae)', expect: ['سراج'], solution: 'name = "سراج"\nprint(name)' },
        { id: 'e4', goal: 'المَسافَةُ ناقِصَةٌ بَعْدَ النُّقْطَتَيْن!', tip: 'err_indent', keys: ['for i in range(|):', 'هيب'],
          starter: 'for i in range(3):\nprint("هيب")', expect: ['هيب', 'هيب', 'هيب'], solution: 'for i in range(3):\n    print("هيب")' },
        { id: 'e5', goal: 'نَصٌّ زائِدُ رَقْم؟ لا يَصِحّ!', tip: 'err_type', keys: ['age', '"عمري"', ', '],
          starter: 'age = 9\nprint("عمري" + age)', expect: ['عمري 9'], solution: 'age = 9\nprint("عمري", age)' },
        { id: 'e6', goal: 'كَلِمَةٌ مَكْتوبَةٌ خَطَأ!', tip: 'err_name', keys: ['مرحبا'],
          starter: 'pritn("مرحبا")', expect: ['مرحبا'], solution: 'print("مرحبا")' },
      ],
    },
    {
      id: 'proj', name: 'مشاريع', icon: '🏗', color: '#8e44ad', kind: 'py', minAge: 9,
      idea: 'برنامج كامل خطوة خطوة، وخد كودك في الآخر',
      levels: [
        // الآلة الحاسبة
        { id: 'c1', goal: 'الحاسِبَة: أَسْأَلُ عَنْ رَقْمٍ وَأَطْبَعُه!', tip: 'proj_tip', keys: ['a', 'b', ASK1, ASK2],
          inputs: ['5'], expect: ['5'], solution: `a = int(input("${ASK1}"))\nprint(a)` },
        { id: 'c2', goal: 'الحاسِبَة: رَقْمانِ، وَأَطْبَعُ المَجْموع!', keys: ['a', 'b', ASK1, ASK2], starter: `a = int(input("${ASK1}"))\nprint(a)`,
          inputs: ['5', '3'], expect: ['8'], solution: CALC2 },
        { id: 'c3', goal: 'الحاسِبَة: وَأَطْبَعُ الفَرْقَ أَيْضًا!', keys: ['a', 'b', ASK1, ASK2], starter: CALC2,
          inputs: ['5', '3'], expect: ['8', '2'], solution: CALC2 + '\nprint(a - b)' },
        { id: 'c4', goal: 'الحاسِبَة: وَأَطْبَعُ الضَّرْب! خُذْ كودَك!', keys: ['a', 'b', ASK1, ASK2], starter: CALC2 + '\nprint(a - b)', copy: true,
          inputs: ['5', '3'], expect: ['8', '2', '15'], solution: CALC2 + '\nprint(a - b)\nprint(a * b)' },
        // خمّن الرقم
        { id: 'g1', goal: 'خَمِّنِ الرَّقْم: سِرٌّ، وَسُؤال، وَأَطْبَعُ التَّخْمين!', tip: 'proj_tip', keys: ['secret', 'guess', GUESS],
          inputs: ['3'], expect: ['3'], solution: `secret = 7\nguess = int(input("${GUESS}"))\nprint(guess)` },
        { id: 'g2', goal: 'خَمِّنِ الرَّقْم: صَحّ أَوْ لا!', keys: ['secret', 'guess', GUESS, 'if |:', 'else:', ' == ', 'صح', 'لا'],
          starter: `secret = 7\nguess = int(input("${GUESS}"))\nprint(guess)`,
          inputs: ['7'], expect: ['صح'], solution: `secret = 7\nguess = int(input("${GUESS}"))\nif guess == secret:\n    print("صح")\nelse:\n    print("لا")` },
        { id: 'g3', goal: 'خَمِّنِ الرَّقْم: أَكْبَرُ أَمْ أَصْغَر؟', keys: ['secret', 'guess', GUESS, 'if |:', 'elif |:', 'else:', ' == ', ' > ', 'صح', 'أكبر', 'أصغر'],
          starter: `secret = 7\nguess = int(input("${GUESS}"))\nif guess == secret:\n    print("صح")\nelse:\n    print("لا")`,
          inputs: ['9'], expect: ['أصغر'], solution: `secret = 7\nguess = int(input("${GUESS}"))\n${GAME_IF}` },
        { id: 'g4', goal: 'خَمِّنِ الرَّقْم: ثَلاثُ مُحاوَلات! خُذْ كودَك!', keys: ['secret', 'guess', GUESS, 'for i in range(|):', 'if |:', 'elif |:', 'else:', ' == ', ' > ', 'صح', 'أكبر', 'أصغر'],
          starter: `secret = 7\nguess = int(input("${GUESS}"))\n${GAME_IF}`, copy: true, mustPy: ['for'],
          inputs: ['9', '3', '7'], expect: ['أصغر', 'أكبر', 'صح'],
          solution: `secret = 7\nfor i in range(3):\n    guess = int(input("${GUESS}"))\n${GAME_IF.split('\n').map(l => '    ' + l).join('\n')}` },
        // صانع القصص
        { id: 's1', goal: 'القِصَّة: اسْمُ البَطَل!', tip: 'proj_tip', keys: ['name', 'اسم البطل؟', '"كان يا ما كان بطل اسمه"', ', '],
          inputs: ['سراج'], expect: ['كان يا ما كان بطل اسمه سراج'], solution: STORY1 },
        { id: 's2', goal: 'القِصَّة: أَيْنَ يَعيش؟', keys: ['place', 'أين يعيش؟', '"يعيش في"', ', ', 'name', 'اسم البطل؟', '"كان يا ما كان بطل اسمه"'], starter: STORY1,
          inputs: ['سراج', 'القاهرة'], expect: ['كان يا ما كان بطل اسمه سراج', 'يعيش في القاهرة'], solution: STORY2 },
        { id: 's3', goal: 'القِصَّة: ماذا يُحِبّ؟', keys: ['thing', 'ماذا يحب؟', '"ويحب"', ', ', 'name', 'place', 'اسم البطل؟', 'أين يعيش؟', '"كان يا ما كان بطل اسمه"', '"يعيش في"'], starter: STORY2,
          inputs: ['سراج', 'القاهرة', 'الرسم'], expect: ['كان يا ما كان بطل اسمه سراج', 'يعيش في القاهرة', 'ويحب الرسم'], solution: STORY3 },
        { id: 's4', goal: 'القِصَّة: النِّهايَة! خُذْ كودَك!', keys: ['النهاية', ', ', 'name', 'place', 'thing', 'اسم البطل؟', 'أين يعيش؟', 'ماذا يحب؟', '"كان يا ما كان بطل اسمه"', '"يعيش في"', '"ويحب"'], starter: STORY3, copy: true,
          inputs: ['سراج', 'القاهرة', 'الرسم'], expect: ['كان يا ما كان بطل اسمه سراج', 'يعيش في القاهرة', 'ويحب الرسم', 'النهاية'], solution: STORY3 + '\nprint("النهاية")' },
      ],
    },
  ];
  NEW.forEach(t => t.levels.forEach(l => { l.kind = 'py'; l.stage = 'console'; if (l.best == null) l.best = pyLines(l.solution); }));
  TRACKS.push(...NEW);
})(typeof window !== 'undefined' ? window : globalThis);
