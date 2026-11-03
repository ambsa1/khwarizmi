/* لوحة الأهل: رقم مكتوب بالكلمات + رقم سري (تُقبل الأرقام العربية)، تقدّم كل طفل، الوقت، الحذف والتصفير،
   الصوت، حد اللعب اليومي، النسخ الاحتياطي والنقل بين الأجهزة، ووضع العائلة. يعتمد على window.App */
(function () {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => window.App;
  const focus = id => setTimeout(() => { const i = $('#' + id); if (i) try { i.focus(); } catch (e) { /* لا شيء */ } }, 80);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };

  let gateAns = null, gateThen = null, confirmFn = null, pinTries = 0;

  /* ---------- الدخول ---------- */
  function open() {
    if (Store.hasPin()) pinPrompt();
    else gate(false, () => setPin(true));
  }
  // بوابة الكبار بدون حساب: رقم مكتوب بالكلمات، والكبير يكتبه بالأرقام. الصغار ما بيقدروا يقروه،
  // وكتابة مكانات الرقم بالترتيب الصحيح صعبة على من يقرأ للتو. عند نسيان الرقم السري: رقم من أربع خانات
  const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
  const THOUSANDS = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف'];
  const pick = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function gateNumber(hard) {
    const th = hard ? pick(1, 9) : 0, h = pick(1, 9), t = pick(2, 9), o = pick(1, 9);
    const words = [THOUSANDS[th], HUNDREDS[h], ONES[o], TENS[t]].filter(Boolean).join(' و');
    return { n: th * 1000 + h * 100 + t * 10 + o, words };
  }
  function gate(hard, then) {
    const q = gateNumber(hard);
    gateAns = q.n; gateThen = then;
    A().showModal(`<h2>🔒 للكبار</h2><p>اكتب هذا الرقم بالأرقام:</p><p class="p-gate-w">${q.words}</p>
      <input id="pGate" inputmode="numeric" class="inp" autocomplete="off" aria-label="الرقم بالأرقام"><p class="err" id="pErr"></p>
      <div class="w-acts"><button class="sq" data-p="close" aria-label="إلغاء">✕</button><button class="run" data-p="gate">دخول</button></div>`);
    focus('pGate');
  }
  function setPin(first) {
    A().showModal(`<h2>🔑 رقم سري للأهل</h2><p>${first ? 'اختر رقماً من 4 إلى 6 أرقام لحماية لوحة الأهل.' : 'اكتب الرقم السري الجديد (4 إلى 6 أرقام).'}</p>
      <input id="pPin1" type="password" inputmode="numeric" maxlength="6" class="inp" autocomplete="new-password" aria-label="الرقم السري">
      <p>أعد كتابته للتأكيد</p>
      <input id="pPin2" type="password" inputmode="numeric" maxlength="6" class="inp" autocomplete="new-password" aria-label="تأكيد الرقم السري">
      <p class="err" id="pErr"></p>
      <div class="w-acts"><button class="sq" data-p="close" aria-label="إلغاء">✕</button><button class="run" data-p="pin-save">حفظ</button></div>`);
    focus('pPin1');
  }
  function pinPrompt() {
    A().showModal(`<h2>🔒 لوحة الأهل</h2><p>اكتب الرقم السري</p>
      <input id="pPin" type="password" inputmode="numeric" maxlength="6" class="inp" autocomplete="current-password" aria-label="الرقم السري"><p class="err" id="pErr"></p>
      <div class="w-acts"><button class="sq" data-p="close" aria-label="إلغاء">✕</button><button class="run" data-p="pin-ok">دخول</button></div>
      <button class="p-link" data-p="forgot">نسيت الرقم السري؟</button>`);
    focus('pPin');
  }
  // صندوق رمز العائلة (المدخل السري من الشعار): بدون أي ذكر للعائلة قبل كتابة الرمز
  function familyPrompt() {
    if (Store.familyReady()) return;
    A().showModal(`<h2>🔑</h2><input id="pFam" class="inp" autocomplete="off" aria-label="الرمز"><p class="err" id="pFamErr"></p>
      <div class="w-acts"><button class="sq" data-p="close" aria-label="إلغاء">✕</button><button class="run" data-p="family">دخول</button></div>`);
    focus('pFam');
  }
  const err = t => { const e = $('#pErr'); if (e) { e.textContent = t; gsap.fromTo(e, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, .3)' }); } };
  function message(title, text) {
    A().showModal(`<h2>${title}</h2><p>${text}</p><div class="w-acts"><button class="run" data-p="close">حسناً</button></div>`);
  }
  function confirmBox(text, label, fn) {
    confirmFn = fn;
    A().showModal(`<h2>⚠️ متأكد؟</h2><p>${text}</p>
      <div class="w-acts"><button class="sq wide" data-p="close">رجوع</button><button class="run p-danger" data-p="confirm">${label}</button></div>`);
  }

  /* ---------- اللوحة ---------- */
  const mins = s => Math.round((s || 0) / 60);
  const timeText = s => (s >= 3600 ? `${(s / 3600).toFixed(1).replace('.0', '')} ساعة` : `${mins(s)} دقيقة`);
  function ago(t) {
    if (!t) return 'لم يلعب بعد';
    const d = Math.floor((Date.now() - t) / 864e5);
    return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : d === 2 ? 'منذ يومين' : d <= 10 ? `منذ ${d} أيام` : new Date(t).toLocaleDateString('ar-EG');
  }
  // عدد المراحل والأنشطة، والمحلول منها لكل طفل (من أقسام الشهادات في extras.js)
  function counts(p) {
    const gs = window.Extras ? Extras.groups(p) : [], r = { lv: 0, lvAll: 0, cw: 0, cwAll: 0, en: 0, enAll: 0, mt: 0, mtAll: 0 };
    for (const g of gs) {
      const k = { C: 'cw', E: 'en', M: 'mt' }[g.key[0]] || 'lv';
      r[k + 'All'] += g.ids.length; r[k] += Extras.doneIn(p, g);
    }
    return r;
  }

  function panel() {
    A().closeModal();
    const d = Store.data, set = d.settings;
    const notices = [];
    if (isIOS && !installed()) notices.push('📱 على الآيفون والآيباد: ثبّت اللعبة حتى لا يمسح سفاري التقدّم. اضغط زر المشاركة <bdi>⬆️</bdi> ثم «إضافة إلى الشاشة الرئيسية»، وافتحها دائماً من أيقونتها.');
    if (Store.saveFailed) notices.push('⚠️ المتصفح لا يسمح بحفظ التقدّم. لا تستخدم التصفح الخفي، وتأكد أن ذاكرة الجهاز ليست ممتلئة.');
    if (Store.backupDue()) notices.push('💾 لم تُحفظ نسخة احتياطية منذ أكثر من أسبوع. احفظ نسخة الآن واحتفظ بها في مكان آمن. <button class="p-btn gold" data-p="backup">💾 احفظ نسخة الآن</button>');
    const kid = p => {
      const c = counts(p), all = c.lvAll + c.cwAll + c.enAll + c.mtAll, pct = all ? Math.round((c.lv + c.cw + c.en + c.mt) / all * 100) : 0;
      return `<div class="p-kid"><span class="pic">${Store.picOf && Store.picOf(p) ? `<img class="pfp" src="${Store.picOf(p)}" alt="">` : A().mini(p.color)}</span><div class="p-kid-main">
        <h4><bdi>${esc(p.name) || 'بدون اسم'}</bdi> <small>${p.gender === 'g' ? '👧' : '👦'} ${p.age} سنوات</small></h4>
        <div class="p-stats"><span>⭐ ${Store.stars(p)}</span><span>💡 <bdi dir="ltr">${c.lv} / ${c.lvAll}</bdi> مرحلة</span>${c.cwAll ? `<span>💻 <bdi dir="ltr">${c.cw} / ${c.cwAll}</bdi> نشاط</span>` : ''}${c.enAll ? `<span>🔤 <bdi dir="ltr">${c.en} / ${c.enAll}</bdi> إنجليزي</span>` : ''}${c.mtAll ? `<span>🔢 <bdi dir="ltr">${c.mt} / ${c.mtAll}</bdi> رياضيات</span>` : ''}
          <span>⏱ اليوم ${mins(Store.todaySec(p))} د</span><span>⌛ المجموع ${timeText(p.total)}</span><span>📅 ${ago(p.last)}</span></div>
        <div class="x-bar"><i style="width:${pct}%"></i></div>
        <div class="p-acts"><button class="p-btn" data-p="export-one" data-id="${esc(p.id)}">📤 نقل لجهاز آخر</button>
          <button class="p-btn" data-p="reset" data-id="${esc(p.id)}">↺ تصفير</button>
          <button class="p-btn red" data-p="delete" data-id="${esc(p.id)}">🗑 حذف</button></div></div></div>`;
    };
    const canShare = !!(navigator.canShare && window.File);
    // في الوضع العام ما يظهر أي أثر لأطفال العائلة
    const shown = Store.visiblePlayers ? Store.visiblePlayers() : d.players;
    A().S.screen = 'parents';
    A().screen(`<div class="sky"></div>
      <header class="bar"><button class="ib" data-act="home" aria-label="رجوع">→</button><span class="t">لوحة الأهل</span></header>
      <div class="x-scroll p-panel">
        ${notices.map(n => `<div class="p-note">${n}</div>`).join('')}
        <section class="p-card"><h3>🧒 الأطفال على هذا الجهاز (${d.players.length})</h3>
          ${shown.length ? shown.map(kid).join('') : '<p class="p-muted">لا يوجد أطفال بعد.</p>'}</section>
        <section class="p-card"><h3>⚙️ الإعدادات</h3>
          <label class="p-row"><span>🔊 صوت سراج</span><input type="checkbox" id="pVoice" class="p-switch" ${set.voice ? 'checked' : ''}></label>
          <div class="p-row col"><span>⏱ وقت اللعب في اليوم</span>
            <div class="p-seg">${Store.LIMITS.map(m => `<button class="${set.limit === m ? 'on' : ''}" data-p="limit" data-m="${m}">${m ? m + ' د' : 'بدون حد'}</button>`).join('')}</div>
            <small class="p-muted">عند انتهاء الوقت يطلب سراج الراحة بلطف، ولا يقطع أي مرحلة أثناء اللعب.</small></div>
          <div class="p-row"><span>🔑 الرقم السري</span><button class="p-btn" data-p="change-pin">تغيير</button></div></section>
        <section class="p-card"><h3>💾 النسخ الاحتياطي والنقل</h3>
          <p class="p-muted">احفظ ملفاً فيه تقدّم كل الأطفال، وأرسله لنفسك أو انقله لجهاز آخر. عند الاسترجاع لا يضيع شيء: اللعبة تحتفظ بأفضل نتيجة لكل مرحلة.</p>
          <div class="p-acts"><button class="p-btn gold" data-p="backup">💾 حفظ نسخة لكل الأطفال</button>
            ${canShare ? '<button class="p-btn" data-p="share">📲 مشاركة النسخة</button>' : ''}
            <button class="p-btn blue" data-p="import">📥 استرجاع من ملف</button></div>
          <small class="p-muted">آخر نسخة: ${d.lastBackup ? new Date(d.lastBackup).toLocaleDateString('ar-EG') : 'لم تُحفظ بعد'}</small>
          <input type="file" id="pFile" accept=".json,application/json,text/plain" hidden></section>
        ${Store.familyReady() ? `<section class="p-card"><h3>🏠 وضع العائلة</h3><p class="ok">✔ وضع العائلة مفعّل على هذا الجهاز</p>
          <p class="p-muted">الإخفاء يرجّع الجهاز للوضع العام (لاعبون عاديون) ويخفي الأسماء والصور، والتقدّم يبقى محفوظاً. للرجوع: اضغط مطوّلاً على الشعار في الشاشة الرئيسية واكتب الرمز.</p>
          <button class="p-btn wide" data-p="fam-hide">🙈 إخفاء وضع العائلة</button></section>` : ''}
        <section class="p-card p-help"><h3>❓ مساعدة</h3>
          <p>• <b>التثبيت:</b> من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
          <p>• <b>بدون إنترنت:</b> بعد أول فتح تعمل اللعبة بدون إنترنت.</p>
          <p>• <b>الخصوصية:</b> لا إعلانات ولا حسابات، وكل البيانات تبقى على هذا الجهاز فقط.</p></section>
      </div>`, 'night x-screen p-screen');
  }

  /* ---------- النسخ الاحتياطي ---------- */
  const stamp = () => { const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-'); };
  const fileName = who => `خوارزمي-${who ? who.replace(/[\\/:*?"<>|]/g, '') + '-' : ''}${stamp()}.json`;
  function download(obj, name) {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  async function share(obj, name) {
    try {
      const file = new File([JSON.stringify(obj)], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'خوارزمي' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    download(obj, name);
  }
  function importFile(file) {
    if (!file) return;
    if (file.size > 5e6) { message('❌ الملف كبير جداً', 'هذا ليس ملف نسخة من لعبة خوارزمي.'); return; }
    const r = new FileReader();
    r.onload = () => {
      let res;
      try { res = Store.importData(String(r.result)); } catch (e) { if (onPanel()) message('❌ لم يتم الاسترجاع', 'هذا الملف ليس نسخة صحيحة من لعبة خوارزمي، أو لا يحتوي على أي طفل.'); return; }
      if (!onPanel()) return;
      panel();
      message('✔ تم الاسترجاع', `تقدّم ${res.count} ${res.count === 1 ? 'طفل' : 'أطفال'}${res.added ? ` (جديد: ${res.added})` : ''}. احتفظنا بأفضل نتيجة لكل مرحلة.`);
    };
    r.onerror = () => { if (onPanel()) message('❌ لم يتم الاسترجاع', 'تعذّرت قراءة الملف.'); };
    r.readAsText(file);
  }

  /* ---------- الأحداث ---------- */
  const val = id => ($('#' + id) ? $('#' + id).value : '');
  // نعيد رسم اللوحة فقط لو الأهل لسه فيها (ما نرجّع شاشة قفلوها)
  const onPanel = () => A().S.screen === 'parents';
  const PACT = {
    close: () => A().closeModal(),
    gate: () => {
      if (+Store.digits(val('pGate')) === gateAns && gateAns) { const f = gateThen; gateAns = null; f(); } else err('غير صحيح، حاول مرة أخرى');
    },
    'pin-save': () => {
      const a = Store.digits(val('pPin1')), b = Store.digits(val('pPin2'));
      if (!Store.pinOk(a)) return err('الرقم من 4 إلى 6 أرقام');
      if (a !== b) return err('الرقمان غير متطابقين');
      Store.setPin(a); pinTries = 0; panel();
    },
    'pin-ok': () => {
      if (Store.checkPin(val('pPin'))) { pinTries = 0; panel(); return; }
      pinTries++;
      err(pinTries >= 3 ? 'غير صحيح. يمكنك الضغط على «نسيت الرقم السري»' : 'الرقم غير صحيح');
    },
    forgot: () => gate(true, () => setPin(false)),
    'change-pin': () => setPin(false),
    limit: t => { Store.setLimit(+t.dataset.m); if (window.Extras) Extras._resetBreak(); document.querySelectorAll('.p-seg button').forEach(b => b.classList.toggle('on', b === t)); },
    // نعيد رسم اللوحة (يختفي تنبيه النسخة ويتحدّث «آخر نسخة») ونبقى في نفس مكان التمرير
    backup: () => {
      download(Store.exportAll(), fileName());
      setTimeout(() => {
        if (!onPanel()) return;
        const sc = $('.p-panel'), y = sc ? sc.scrollTop : 0, note = sc && sc.querySelector('.p-note [data-p="backup"]');
        const shift = note ? note.closest('.p-note').offsetHeight + 14 : 0; // التنبيه فوق بيختفي
        panel();
        const s2 = $('.p-panel'); if (s2) s2.scrollTop = Math.max(0, y - shift);
      }, 300);
    },
    share: () => { share(Store.exportAll(), fileName()); },
    import: () => { const f = $('#pFile'); if (f) { f.value = ''; f.click(); } },
    'export-one': t => { const p = Store.getPlayer(t.dataset.id), o = Store.exportOne(t.dataset.id); if (o) download(o, fileName(p && p.name ? p.name : 'طفل')); },
    reset: t => {
      const p = Store.getPlayer(t.dataset.id); if (!p) return;
      confirmBox(`تصفير كل تقدّم «${esc(p.name || 'بدون اسم')}»؟ النجوم والمراحل والشهادات ستُمسح.`, '↺ تصفير', () => { Store.resetPlayer(p.id); panel(); });
    },
    delete: t => {
      const p = Store.getPlayer(t.dataset.id); if (!p) return;
      confirmBox(`حذف «${esc(p.name || 'بدون اسم')}» نهائياً من هذا الجهاز؟ لا يمكن التراجع إلا من نسخة احتياطية.`, '🗑 حذف', () => { Store.removePlayer(p.id); panel(); });
    },
    confirm: () => { const f = confirmFn; confirmFn = null; if (f) f(); },
    // فك التشفير يأخذ لحظة (PBKDF2): نعطّل الزر وننتظر، ولا نرجع للوحة لو الأهل خرجوا
    family: () => {
      const b = document.querySelector('[data-p="family"]'), e = $('#pFamErr');
      if (b) b.disabled = true; if (e) e.textContent = '…';
      Store.enableFamily(val('pFam')).then(ok => {
        if (ok) { A().closeModal(); A().renderHome(); message('✔ تم', 'وضع العائلة مفعّل.'); return; }
        const e2 = $('#pFamErr'), b2 = document.querySelector('[data-p="family"]');
        if (e2) e2.textContent = 'الرمز غير صحيح'; if (b2) b2.disabled = false;
      });
    },
    'fam-hide': () => confirmBox('إخفاء وضع العائلة؟ الجهاز يرجع للوضع العام، والتقدّم يبقى محفوظاً، والرجوع بالضغط المطوّل على الشعار وكتابة الرمز.', '🙈 إخفاء', () => { Store.hideFamily(); A().renderHome(); }),
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-p]');
    if (!t || t.disabled || !A() || !A().tapOk(t, t.dataset.p)) return; // حارس الضغطات المشترك (لا ملفّين من ضغطتين)
    const f = PACT[t.dataset.p];
    if (f) f(t, e);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const map = { pGate: 'gate', pPin: 'pin-ok', pPin2: 'pin-save', pFam: 'family' }, k = e.target && map[e.target.id];
    if (k) PACT[k]();
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'pVoice') { Store.settings.voice = e.target.checked; Store.save(); if (!e.target.checked) Voice.stop(); }
    if (e.target.id === 'pFile') importFile(e.target.files && e.target.files[0]);
  });

  window.Parents = { open, panel, gate, gateNumber, familyPrompt };
})();
