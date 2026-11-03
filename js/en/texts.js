/* قسم الإنجليزي: كل ما يُنطق (بصوت إنجليزي فقط) + الترجمة العربية المكتوبة (لا تُنطق).
   EN_TEXTS  = المفتاح ← الجملة الإنجليزية (تتولّد أصواتها: كل المفاتيح تبدأ بـ en2_)
   EN_AR     = المفتاح ← الترجمة العربية المكتوبة تحت الجملة (و _f للبنات)
   EN_VOCAB  = الكلمات لكل قسم: [المعرّف، الكلمة، العربي، الصورة]  (الصورة: إيموجي ≤ 12، أو رمز خاص يُرسم بالكود)
   الكلمة تُكتب على الشاشة بالحروف الصغيرة، وتُنطق من EN_TEXTS['en2_w_' + المعرّف]. */
(function (root) {
  'use strict';
  const T = {}, AR = {};
  const line = (k, en, ar, arF) => { T[k] = en; AR[k] = ar; if (arF) AR[k + '_f'] = arF; };

  /* ---------- التعليمات والتشجيع (قصيرة جداً) ---------- */
  line('en2_hello', "Let's learn English!", 'هيا نتعلّم الإنجليزية!');
  line('en2_pick', 'Pick a game!', 'اختر لعبة!', 'اختاري لعبة!');
  line('en2_learn', 'Tap and listen!', 'اضغط واسمع!', 'اضغطي واسمعي!');
  line('en2_listen', 'Listen and tap!', 'اسمع واضغط!', 'اسمعي واضغطي!');
  line('en2_match', 'Match the word and the picture!', 'صِل الكلمة بالصورة!', 'صِلي الكلمة بالصورة!');
  line('en2_read', 'Read and tap the picture!', 'اقرأ واضغط الصورة!', 'اقرئي واضغطي الصورة!');
  line('en2_spell', 'Spell the word!', 'رتّب حروف الكلمة!', 'رتّبي حروف الكلمة!');
  line('en2_build', 'Put the words in order!', 'رتّب الكلمات!', 'رتّبي الكلمات!');
  line('en2_quiz', 'Quiz time!', 'وقت الاختبار!');
  line('en2_bigquiz', "Big quiz! Let's go!", 'الاختبار الكبير! هيا بنا!');
  line('en2_count', 'How many? Count and tap!', 'كم عددها؟ عُدّ واضغط!', 'كم عددها؟ عُدّي واضغطي!');
  line('en2_paint', 'Paint it! Listen and tap the color!', 'لوّن! اسمع واضغط اللون!', 'لوّني! اسمعي واضغطي اللون!');
  line('en2_good1', 'Great job!', 'عمل رائع!');
  line('en2_good2', 'Well done!', 'أحسنت!', 'أحسنتِ!');
  line('en2_good3', 'Super!', 'ممتاز!', 'ممتازة!');
  line('en2_good4', 'Yes! Good!', 'نعم! جيد!');
  line('en2_try', 'Try again!', 'حاول مرة أخرى!', 'حاولي مرة أخرى!');
  line('en2_win1', 'You did it!', 'لقد نجحت!', 'لقد نجحتِ!');
  line('en2_win2', 'Amazing!', 'مذهل!', 'مذهلة!');
  line('en2_win3', 'Excellent!', 'ممتاز!', 'ممتازة!');

  /* ---------- أسماء الأقسام (تُقال عند فتح القسم) ---------- */
  line('en2_s_colors', 'Colors!', 'الألوان');
  line('en2_s_numbers', 'Numbers!', 'الأرقام');
  line('en2_s_animals', 'Animals!', 'الحيوانات');
  line('en2_s_body', 'My body!', 'جسمي');
  line('en2_s_family', 'My family!', 'عائلتي');
  line('en2_s_food', 'Food!', 'الطعام');
  line('en2_s_home', 'At home!', 'في البيت');
  line('en2_s_talk', "Let's talk!", 'هيا نتكلّم!');
  line('en2_s_big', 'Big quiz!', 'الاختبار الكبير');

  /* ---------- الكلمات ---------- */
  // ألوان: الصورة #لون (تُرسم بقعة ألوان بالكود)
  const V = {
    colors: [
      ['red', 'red', 'أحمر', '#e53935'], ['blue', 'blue', 'أزرق', '#1e7de0'], ['green', 'green', 'أخضر', '#2fa84f'],
      ['yellow', 'yellow', 'أصفر', '#ffd21f'], ['orange', 'orange', 'برتقالي', '#ff8a00'], ['purple', 'purple', 'بنفسجي', '#8e3bd1'],
      ['pink', 'pink', 'وردي', '#ff6fae'], ['brown', 'brown', 'بنّي', '#8b5a2b'], ['black', 'black', 'أسود', '#1d1d24'], ['white', 'white', 'أبيض', '#ffffff'],
    ],
    // أرقام: الصورة #رقم (يُرسم الرقم + نقاط العدّ)
    numbers: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
      .map((w, i) => [w, w, ['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر',
        'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر', 'عشرون'][i], '#' + (i + 1)]),
    animals: [
      ['cat', 'cat', 'قطة', '🐱'], ['dog', 'dog', 'كلب', '🐶'], ['fish', 'fish', 'سمكة', '🐟'], ['bird', 'bird', 'عصفور', '🐦'],
      ['duck', 'duck', 'بطة', '🦆'], ['cow', 'cow', 'بقرة', '🐮'], ['lion', 'lion', 'أسد', '🦁'], ['horse', 'horse', 'حصان', '🐴'],
      ['sheep', 'sheep', 'خروف', '🐑'], ['monkey', 'monkey', 'قرد', '🐵'], ['elephant', 'elephant', 'فيل', '🐘'], ['rabbit', 'rabbit', 'أرنب', '🐰'],
      ['frog', 'frog', 'ضفدع', '🐸'], ['bear', 'bear', 'دب', '🐻'],
    ],
    body: [
      ['eyes', 'eyes', 'عيون', '👀'], ['ear', 'ear', 'أذن', '👂'], ['nose', 'nose', 'أنف', '👃'], ['mouth', 'mouth', 'فم', '👄'],
      ['hand', 'hand', 'يد', '✋'], ['foot', 'foot', 'قدم', '🦶'], ['face', 'face', 'وجه', '🙂'], ['leg', 'leg', 'ساق', '🦵'],
      ['teeth', 'teeth', 'أسنان', '🦷'], ['arm', 'arm', 'ذراع', '💪'],
    ],
    family: [
      ['mother', 'mother', 'أمّ', '🧕'], ['father', 'father', 'أب', '👨'], ['baby', 'baby', 'طفل رضيع', '👶'], ['brother', 'brother', 'أخ', '👦'],
      ['sister', 'sister', 'أخت', '👧'], ['grandma', 'grandma', 'جدّة', '👵'], ['grandpa', 'grandpa', 'جدّ', '👴'], ['family', 'family', 'عائلة', '👪'],
    ],
    food: [
      ['apple', 'apple', 'تفاحة', '🍎'], ['banana', 'banana', 'موزة', '🍌'], ['milk', 'milk', 'حليب', '🥛'], ['bread', 'bread', 'خبز', '🍞'],
      ['egg', 'egg', 'بيضة', '🥚'], ['water', 'water', 'ماء', '💧'], ['orange_f', 'orange', 'برتقالة', '🍊'], ['grapes', 'grapes', 'عنب', '🍇'],
      ['cheese', 'cheese', 'جبن', '🧀'], ['rice', 'rice', 'أرز', '🍚'], ['cake', 'cake', 'كعكة', '🍰'], ['carrot', 'carrot', 'جزرة', '🥕'],
    ],
    home: [
      ['house', 'house', 'بيت', '🏠'], ['door', 'door', 'باب', '🚪'], ['bed', 'bed', 'سرير', '🛏️'], ['ball', 'ball', 'كرة', '⚽'],
      ['book', 'book', 'كتاب', '📖'], ['cup', 'cup', 'كوب', '☕'], ['tv', 'TV', 'تلفاز', '📺'], ['phone', 'phone', 'هاتف', '📱'],
      ['clock', 'clock', 'ساعة', '⏰'], ['key', 'key', 'مفتاح', '🔑'], ['lamp', 'lamp', 'مصباح', '💡'], ['sofa', 'sofa', 'كنبة', '🛋️'],
    ],
    // جمل قصيرة: [المعرّف، الجملة، العربي، الصورة] — @siraj = سراج نفسه
    talk: [
      ['hello', 'Hello!', 'مرحباً!', '👋😃'], ['bye', 'Goodbye!', 'مع السلامة!', '👋🚶'], ['morning', 'Good morning!', 'صباح الخير!', '🌅'],
      ['night', 'Good night!', 'تصبح على خير!', '😴🌙'], ['thanks', 'Thank you!', 'شكراً!', '🎁😊'], ['love', 'I love you!', 'أحبك!', '🤗❤️'],
      ['name_q', 'What is your name?', 'ما اسمك؟', '🙂❓'], ['name', 'My name is Siraj.', 'اسمي سراج.', '@siraj'],
      ['how', 'How are you?', 'كيف حالك؟', '🤔❓'], ['fine', 'I am fine, thank you.', 'أنا بخير، شكراً.', '😊👍'], ['sorry', 'I am sorry.', 'أنا آسف.', '😔'],
    ],
  };
  const SPOKEN = { tv: 'T V.', orange_f: 'Orange.' };
  for (const [sec, list] of Object.entries(V)) {
    for (const [id, en] of list) {
      if (sec === 'talk') T['en2_t_' + id] = en;
      else T['en2_w_' + id] = SPOKEN[id] || en.charAt(0).toUpperCase() + en.slice(1) + '.';
    }
  }
  // الحروف (للتهجئة)
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(c => { T['en2_l_' + c] = c.toUpperCase() + '.'; });

  root.EN_TEXTS = T;
  root.EN_AR = AR;
  root.EN_VOCAB = V;
  if (typeof module !== 'undefined') module.exports = T;
})(typeof window !== 'undefined' ? window : globalThis);
