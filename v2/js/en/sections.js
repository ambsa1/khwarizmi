/* قسم الإنجليزي: الأقسام وأنشطتها (كل قسم ينتهي باختبار) + الاختبار الكبير */
(function (root) {
  'use strict';
  const EN = root.EN, X = EN.acts;
  const words = name => [X.learn(), X.listen(), X.match(), X.read(), X.spell(), X.quiz({ name })];
  const SEC = (id, order, en, name, icon, color, acts, extra) => EN.register(Object.assign({ id, order, en, name, icon, color, vocab: id, voice: 'en2_s_' + id, minAge: 3, activities: acts }, extra));

  SEC('colors', 1, 'Colors', 'الألوان', '🎨', '#e0533f',
    [X.learn(), X.listen(), X.paint(), X.match(), X.read(), X.spell(), X.quiz({ name: 'اختبار الألوان', extra: 'paint' })]);
  SEC('numbers', 2, 'Numbers', 'الأرقام ١–٢٠', '🔢', '#2b78c2', [
    X.learn({ name: 'الأرقام ١–١٠', items: () => EN.vocab('numbers').slice(0, 10) }),
    X.learn({ id: 'learn2', en: 'Learn 11–20', name: 'الأرقام ١١–٢٠', icon: '🔟', minAge: 6, items: () => EN.vocab('numbers').slice(10, 20) }),
    X.listen(), X.count(), X.match(), X.read(), X.spell(), X.quiz({ name: 'اختبار الأرقام', extra: 'count' })]);
  SEC('animals', 3, 'Animals', 'الحيوانات', '🦁', '#e88a1a', words('اختبار الحيوانات'));
  SEC('body', 4, 'My body', 'جسمي', '✋', '#d94f8a', words('اختبار جسمي'));
  SEC('family', 5, 'My family', 'عائلتي', '👪', '#8b5cf6', words('اختبار العائلة'));
  SEC('food', 6, 'Food', 'الطعام', '🍎', '#2f9e5b', words('اختبار الطعام'));
  SEC('home', 7, 'At home', 'في البيت', '🏠', '#c47a2c', words('اختبار البيت'));
  SEC('talk', 8, "Let's talk", 'جمل قصيرة', '💬', '#14a3b8', [
    X.learn({ name: 'تعلّم الجمل' }), X.listen(), X.read({ name: 'اقرأ الجملة' }), X.build(), X.quiz({ name: 'اختبار الجمل' })]);

  // الاختبار الكبير: من كل الأقسام حسب العمر
  const ALL = ['colors', 'numbers', 'animals', 'body', 'family', 'food', 'home', 'talk'];
  const mixed = (A, filter) => ALL.reduce((a, s) => a.concat(X.pool(s, A.age)), []).filter(filter || (() => true));
  SEC('big', 9, 'Big quiz', 'الاختبار الكبير', '🏆', '#d6a100', [
    X.quiz({ id: 'big', en: 'Big quiz', name: 'الاختبار الكبير', icon: '🏆', from: A => mixed(A), rounds: a => (a <= 4 ? 6 : a <= 6 ? 8 : 10) }),
    X.read({ id: 'bigread', en: 'Read', name: 'اقرأ كل الكلمات', from: A => mixed(A, x => x.sec !== 'talk'), rounds: () => 8 }),
    X.spell({ id: 'bigspell', en: 'Spell', name: 'تهجئة كل الكلمات', from: A => mixed(A, x => x.sec !== 'talk') }),
  ], { vocab: null });
})(window);
