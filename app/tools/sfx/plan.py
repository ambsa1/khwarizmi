"""The sound-effects plan (خريطة-المؤثرات.md): every effect the app plays, with its Arabic description, the generation
prompt, length, how many close variants the app rotates between, and how many candidates to generate per variant.
One family: soft, warm, wooden and natural (marimba, kalimba, paper, wood), never harsh electronic or arcade.
Celebrations: happy human voices WITHOUT words (cheers, joyful laughter, "tadaa", "woohoo") with a short tune."""

STYLE = 'soft warm, gentle, high quality, clean start, no reverb tail, for a children learning app'
WOOD = 'soft wooden marimba'

# (id, kind, arabic, prompt, seconds, variants, candidates_per_variant)
UI = [
    ('tap', 'ui', 'ضغطة زر', f'single {WOOD} tap, short muted wooden click, {STYLE}', 0.5, 4, 1),
    ('back', 'ui', 'رجوع', f'soft descending two-note {WOOD} blip, going back, {STYLE}', 0.5, 3, 1),
    ('page', 'ui', 'فتح صفحة', 'soft paper page swoosh with a light wooden tick, opening a page, ' + STYLE, 0.8, 2, 1),
    ('locked', 'ui', 'ضغط على مرحلة مقفولة', 'soft muted wooden double knock, gentle "not yet" sound, not negative, ' + STYLE, 0.5, 3, 1),
    ('unlock', 'ui', 'فتح مرحلة جديدة في المسار', f'small wooden latch unlocking followed by a bright rising {WOOD} sparkle, ' + STYLE, 1.2, 2, 1),
    ('toggle', 'ui', 'تبديل (كتم وتشغيل)', 'tiny soft wooden switch click, ' + STYLE, 0.5, 2, 1),
]
LESSON = [
    ('card-touch', 'lesson', 'لمس بطاقة', 'soft cardboard card pick up, light paper tap, ' + STYLE, 0.5, 4, 1),
    ('card-drop', 'lesson', 'إسقاط بطاقة', 'soft cardboard card placed down on a wooden table, gentle thud, ' + STYLE, 0.5, 3, 1),
    ('snap', 'lesson', 'تثبيت ترتيب أو توصيل', 'satisfying soft wooden peg snapping into place, ' + STYLE, 0.5, 3, 1),
    ('correct', 'lesson', 'إجابة صحيحة', f'bright happy two-note rising {WOOD} chime, correct answer, ' + STYLE, 0.8, 4, 1),
    ('wrong', 'lesson', 'إجابة خطأ (لطيفة)', f'gentle low soft {WOOD} two-note "try again" tone, kind and warm, not sad, not buzzer, ' + STYLE, 0.7, 3, 1),
    ('streak', 'lesson', 'صحيح وراء صحيح', f'joyful quick ascending {WOOD} arpeggio with a light sparkle, ' + STYLE, 1.0, 3, 1),
    ('flip', 'lesson', 'قلب بطاقة شرح', 'soft paper card flip, quick airy flap, ' + STYLE, 0.6, 3, 1),
    ('hint', 'lesson', 'ظهور تلميح', 'soft warm glowing chime, a helpful hint appears, ' + STYLE, 0.8, 2, 1),
    ('lab-pull', 'lesson', 'سحب في المختبر', 'rubber balloon membrane being stretched slowly, soft rubbery creak, ' + STYLE, 1.0, 2, 1),
    ('lab-release', 'lesson', 'إرخاء في المختبر', 'rubber balloon membrane released, soft rubbery flap back, ' + STYLE, 1.0, 2, 1),
    ('lab-air-in', 'lesson', 'دخول الهواء للبالونين', 'soft air flowing in and two small balloons gently inflating, airy, ' + STYLE, 1.5, 1, 2),
    ('lab-air-out', 'lesson', 'خروج الهواء من البالونين', 'soft air flowing out and two small balloons gently deflating, airy sigh, ' + STYLE, 1.5, 1, 2),
    ('lab-move', 'lesson', 'تحريك قطعة في المختبر', 'soft squishy slide of a small food piece moving, playful, ' + STYLE, 0.8, 2, 1),
    ('lab-result', 'lesson', 'نتيجة المختبر', f'curious discovery chime, warm {WOOD} and soft bells, "aha" moment, ' + STYLE, 1.5, 2, 1),
    ('stage-done', 'lesson', 'خلاص مرحلة', f'short cheerful {WOOD} flourish, stage complete, ' + STYLE, 1.2, 2, 1),
]
CELEBRATE = [
    ('lesson-done', 'celebrate', 'خلاص الدرس',
     'small group of happy children cheering "yay" and joyful laughter without words, with a short bright marimba fanfare, celebration, no speech', 3.0, 2, 2),
    ('exam-start', 'celebrate', 'بداية الامتحان',
     'short encouraging soft drum roll on wooden hand drum ending with a bright chime, ready to begin', 2.0, 2, 2),
    ('exam-pass', 'celebrate', 'النجاح في الامتحان',
     'excited children cheering and clapping, joyful "woohoo" and happy laughter without words, short triumphant marimba and bells fanfare, no speech', 4.0, 2, 2),
    ('exam-retry', 'celebrate', 'ما نجح (مشجّعة ودافية)',
     'warm gentle encouraging short melody on marimba and soft strings, hopeful and kind, "you can do it" feeling, no voice', 2.5, 2, 2),
    ('title-bronze', 'celebrate', 'اللقب البرونزي',
     'happy children cheering "tadaa" without words with a warm brass and marimba fanfare, celebration, no speech', 4.0, 1, 2),
    ('title-silver', 'celebrate', 'اللقب الفضي',
     'bigger crowd of happy children cheering and laughing joyfully without words, sparkling bells and marimba fanfare, celebration, no speech', 5.0, 1, 2),
    ('title-gold', 'celebrate', 'اللقب الذهبي',
     'huge joyful celebration, children cheering loudly "woohoo" and laughing without words, applause, grand bright orchestral and marimba fanfare with sparkles, no speech', 6.0, 1, 2),
    ('cheer-under', 'celebrate', 'تحت عبارة التحفيز',
     'soft happy children cheering in the background without words, light marimba bed, celebration underlay, no speech', 4.0, 2, 2),
]
# explainer 1 (science, grade 5): one sound per scene idea (motion bank grows with every explainer)
MOTION = [
    ('welcome-chime', 'motion', 'ترحيب: شعار خوارزمي', 'warm magical welcome chime swell, soft bells and marimba', 1.5),
    ('book-open', 'motion', 'غلاف الكتاب بيتفتح', 'hardcover book opening with a soft page flutter', 1.2),
    ('path-extend', 'motion', 'طريق بيتمد', 'soft airy rising whoosh, something stretching out smoothly', 1.2),
    ('sparkles', 'motion', 'لمعات صغيرة', 'tiny magical sparkle twinkles, gentle glitter', 1.5),
    ('tree-grow', 'motion', 'شجرة بتطلع', 'leaves rustling as a small tree grows quickly, soft natural', 1.5),
    ('bird-land', 'motion', 'عصفور بيحط', 'small bird wing flutter landing on a branch followed by one short cheerful chirp', 1.2),
    ('fish-splash', 'motion', 'سمكة بتقفز من الموية', 'small fish jumping out of river water, light splash', 1.2),
    ('soft-pop', 'motion', 'ظهور (ظلال الأطفال)', 'soft airy bubble pop, gentle appearance', 0.8),
    ('gather-swirl', 'motion', 'اللمّة في دايرة', 'gentle circular swirl whoosh, things gathering together', 1.2),
    ('kalimba-pluck', 'motion', 'ظهور أيقونة (نوتة)', 'single soft kalimba pluck note, warm', 0.5),
    ('glow-shimmer', 'motion', 'لمعة صحية', 'warm soft shimmer glow, gentle', 1.2),
    ('plate-clink', 'motion', 'صحن أكل', 'ceramic plate gently set down on a wooden table, soft clink', 0.8),
    ('water-pour', 'motion', 'إبريق بيسقي', 'water pouring gently from a small jug onto soil', 1.5),
    ('tap-drop', 'motion', 'حنفية بتتقفل وقطرة', 'small metal water tap squeak closing, then a single clear water drop', 1.2),
    ('map-unroll', 'motion', 'خريطة بتتفرد', 'paper map unrolling on a table', 1.2),
    ('station-ding', 'motion', 'محطة بتنوّر', 'soft bright bell ding, a light turning on', 0.8),
    ('breath-in', 'motion', 'هوا داخل للرئتين', 'soft gentle airy inhale, calm breath in', 1.0),
    ('swallow-slide', 'motion', 'لقمة ماشة لتحت', 'soft playful descending slide bloop, something moving down', 0.8),
    ('sprout-pop', 'motion', 'نبتة وبذرة', 'small seed sprouting, soft organic pop and leaf unfurl', 0.8),
    ('bee-buzz', 'motion', 'حشرة', 'light friendly bee buzz passing by', 1.2),
    ('wing-flap', 'motion', 'طائر', 'bird wings flapping as it flies past', 1.0),
    ('drop-shine', 'motion', 'قطرة كبيرة بتلمع', 'big water drop plink with a soft shimmer', 1.2),
    ('term-thock', 'motion', 'المصطلح بيظهر', 'soft deep wooden thock, a word appearing with weight', 0.8),
    ('table-clatter', 'motion', 'أشياء مخلوطة على طاولة', 'fruits and vegetables tumbling softly onto a wooden table', 1.2),
    ('basket-drop', 'motion', 'في السلة', 'fruit dropped into a wicker basket, soft thud', 0.7),
    ('sort-swish', 'motion', 'المجموعات', 'soft swish of things sliding into groups', 1.0),
    ('bat-flight', 'motion', 'خفاش قدّام القمر', 'bat wings flapping at night, soft leathery flutter', 1.5),
    ('x-swipe', 'motion', 'علامة إكس', 'soft marker pen swipe, quick', 0.6),
    ('question-twirl', 'motion', 'علامة سؤال بتلف', 'playful curious twirl whoosh with a light "hmm" bell', 1.2),
    ('exam-reveal', 'motion', 'محطة الامتحان بتظهر', 'short soft drum roll ending with a warm chime, something important appears', 1.5),
    ('twinkle-cascade', 'motion', 'كل النقاط بتلمع', 'cascade of soft twinkling chimes across', 2.0),
    ('start-pop', 'motion', 'زر «لنبدأ» بيظهر', 'bright friendly pop with a cheerful ding, a button appearing', 0.8),
]
MOTION = [(i, k, a, f'{p}, {STYLE}', s, 1, 2) for i, k, a, p, s in MOTION]

ALL = UI + LESSON + CELEBRATE + MOTION

def jobs():
    """(id, variant_no, candidate_no, entry) for every generation call."""
    for e in ALL:
        for v in range(e[5]):
            for c in range(e[6] if e[5] == 1 else 1):
                yield e, v, c
    # variants: one extra candidate per multi-variant effect so the weakest can be dropped
    for e in ALL:
        if e[5] > 1: yield e, e[5], 0

if __name__ == '__main__':
    calls = list(jobs()); sec = sum(max(0.5, e[4]) for e, _, _ in calls)
    print(f'effects {len(ALL)} | final files {sum(e[5] for e in ALL)} | calls {len(calls)} | seconds {sec:.1f} | ~credits {sec * 40:.0f}')
