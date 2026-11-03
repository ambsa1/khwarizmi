/* القسم ١: ما هو الكمبيوتر؟ — قصة قصيرة، لعبة "هل هو كمبيوتر؟"، وفرز الإدخال والمعالجة والإخراج */
(function (root) {
  'use strict';
  const CW = root.CW, U = CW.util, ART = CW.art;

  /* ---------- قصة الكمبيوتر ---------- */
  const story = {
    id: 'story', name: 'قصة الكمبيوتر', icon: '📖', minAge: 3,
    mount(el, A) {
      const slides = [
        { k: 'cw_st1', art: `<div class="cw-art xl">${ART.laptop('on')}</div>` },
        { k: 'cw_st2', art: `<div class="cw-art lg cw-glow">${ART.chip()}</div>` },
        { k: 'cw_st3', art: `<div class="cw-many">${['phone', 'tablet', 'watch', 'atm', 'laptop'].map(a => `<div class="cw-art md">${ART[a]('on')}</div>`).join('')}</div>` },
        { k: 'cw_st4', art: `<div class="cw-many"><div class="cw-art lg">${ART.phone('on')}</div><div class="cw-art md">${ART.tablet('on')}</div></div>` },
        { k: 'cw_st5', art: `<div class="cw-flow"><div class="cw-art md">${ART.keyboard()}</div><i>←</i><div class="cw-art sm cw-glow">${ART.chip()}</div><i>←</i><div class="cw-art md">${ART.monitor('on')}</div></div>` },
        { k: 'cw_st6', art: `<div class="cw-many"><div class="cw-art lg">${ART.monitor('on')}</div><div class="cw-art md">${ART.keyboard()}</div></div>` },
      ];
      el.innerHTML = `<div class="cw-story">
        <div class="cw-dots" id="d"></div>
        <div class="cw-story-main"><div class="cw-story-sj" id="sj"></div><div class="cw-slide" id="sl"></div></div>
        <p class="cw-cap" id="cap"></p>
        <div class="cw-nav"><button class="cw-round" data-x="prev" aria-label="السابق">→</button><button class="cw-go" data-x="next" aria-label="التالي">▶</button></div></div>`;
      const q = s => el.querySelector(s);
      const sj = A.siraj(q('#sj'));
      const setDot = A.dots(q('#d'), slides.length);
      let i = 0;
      function show(k) {
        i = Math.max(0, Math.min(slides.length - 1, k));
        const s = slides[i];
        q('#sl').innerHTML = s.art;
        q('#cap').textContent = A.text(s.k);
        setDot(i);
        q('[data-x="prev"]').style.visibility = i ? 'visible' : 'hidden';
        A.say(s.k);
        if (sj) { sj.talk(1800); if (i === 0 || i === slides.length - 1) sj.wave(); }
        if (root.gsap) gsap.from(q('#sl').querySelectorAll('.cw-art, i'), { scale: 0, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'back.out(2)' });
      }
      A.on(el, 'click', e => {
        const b = e.target.closest('[data-x]'); if (!b) return;
        A.sfx.tap();
        if (b.dataset.x === 'prev') show(i - 1);
        else if (i < slides.length - 1) show(i + 1);
        else A.win({ stars: 3 });
      });
      A.later(() => show(0), 250);
      return { solve() { for (let k = 0; k < slides.length; k++) q('[data-x="next"]').click(); } };
    },
  };

  /* ---------- هل هو كمبيوتر؟ ---------- */
  const YES = [['laptop', 1], ['phone', 1], ['tablet', 1], ['watch', 1], ['atm', 1], ['monitor', 1], ['tower', 1], ['🤖', 1]]; // يد اللعب 🎮 مش كمبيوتر، فحطّينا صندوق الكمبيوتر
  const NO = [['🛋️', 0], ['🍎', 0], ['🧸', 0], ['🌳', 0], ['⚽', 0], ['📚', 0], ['🥄', 0], ['🎈', 0]];
  const isit = {
    id: 'isit', name: 'هل هو كمبيوتر؟', icon: '🤔', minAge: 3,
    mount(el, A) {
      const half = A.age <= 4 ? 3 : 5;
      const items = U.shuffle(U.shuffle(YES).slice(0, half).concat(U.shuffle(NO).slice(0, half)));
      el.innerHTML = `<div class="cw-yn">
        <div class="cw-dots" id="d"></div>
        <div class="cw-card cw-yn-card" id="card"></div>
        <div class="cw-yn-btns"><button class="cw-yn-b yes" data-x="1" aria-label="نعم">✔<small>نعم</small></button>
          <button class="cw-yn-b no" data-x="0" aria-label="لا">✘<small>لا</small></button></div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), items.length);
      let i = 0, miss = 0, busy = false;
      const pic = it => (ART[it[0]] ? `<div class="cw-art lg">${ART[it[0]]('on')}</div>` : `<div class="cw-emo">${it[0]}</div>`);
      function show() {
        setDot(i);
        q('#card').innerHTML = pic(items[i]);
        if (root.gsap) gsap.fromTo(q('#card'), { scale: 0.5, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.45, ease: 'back.out(2)' });
        A.say('cw_isit');
        busy = false;
      }
      function answer(v, btn) {
        if (busy) return; busy = true;
        const it = items[i], ok = +v === it[1];
        if (ok) A.good(btn, it[1] ? 'cw_isit_yes' : 'cw_isit_no');
        else { miss++; A.bad(q('#card'), it[1] ? 'cw_isit_wy' : 'cw_isit_wn'); }
        q('#card').classList.add(it[1] ? 'is-yes' : 'is-no');
        A.later(() => {
          q('#card').classList.remove('is-yes', 'is-no');
          i++;
          if (i < items.length) show();
          else { setDot(items.length); A.win({ stars: miss <= 1 ? 3 : miss <= 3 ? 2 : 1 }); }
        }, 1500);
      }
      A.on(el, 'click', e => { const b = e.target.closest('[data-x]'); if (b) answer(b.dataset.x, b); });
      A.later(show, 200);
      return {
        async solve() {
          while (A.alive && i < items.length) {
            if (!busy) q(`[data-x="${items[i][1]}"]`).click();
            await A.wait(1700);
          }
        },
      };
    },
  };

  /* ---------- إدخال، معالجة، إخراج ---------- */
  const IPO = [['keyboard', 'in'], ['mouse', 'in'], ['mic', 'in'], ['camera', 'in'], ['chip', 'proc'], ['monitor', 'out'], ['speaker', 'out'], ['printer', 'out'], ['headphones', 'out']];
  const ipo = {
    id: 'ipo', name: 'يدخل، يفكّر، يخرج', icon: '🔄', minAge: 7,
    mount(el, A) {
      const items = U.shuffle(IPO);
      el.innerHTML = `<div class="cw-ipo">
        <div class="cw-dots" id="d"></div>
        <div class="cw-ipo-item" id="it"></div>
        <div class="cw-bins">
          <button class="cw-bin" data-b="in" style="--bc:#3d8bff"><span class="cw-bin-ic">⌨️</span><b>إدخال</b><span class="cw-bin-got"></span></button>
          <button class="cw-bin" data-b="proc" style="--bc:#ff9a2e"><span class="cw-bin-ic">🧠</span><b>معالجة</b><span class="cw-bin-got"></span></button>
          <button class="cw-bin" data-b="out" style="--bc:#16a865"><span class="cw-bin-ic">🖥️</span><b>إخراج</b><span class="cw-bin-got"></span></button>
        </div></div>`;
      const q = s => el.querySelector(s);
      const setDot = A.dots(q('#d'), items.length);
      const seen = {};
      let i = 0, miss = 0, busy = false, card = null;
      function show() {
        setDot(i);
        const [id] = items[i];
        q('#it').innerHTML = `<div class="cw-card cw-drag-card"><div class="cw-art md">${ART[id]()}</div><small>${A.text('cw_p_' + id)}</small></div>`;
        card = q('#it .cw-card');
        if (root.gsap) gsap.from(card, { scale: 0.4, opacity: 0, duration: 0.4, ease: 'back.out(2)' });
        A.say(i === 0 ? ['cw_ipo_intro', 'cw_p_' + id] : 'cw_p_' + id, { pri: 'instruction' }); // اسم الجزء هنا هو سؤال الجولة
        busy = false;
        A.drag(card, {
          enabled: () => !busy,
          drop(x, y) { const bin = [...el.querySelectorAll('.cw-bin')].find(b => A.hit(b, x, y, 10)); if (!bin) return false; return choose(bin); },
        });
      }
      function choose(bin) {
        if (busy) return false;
        const [id, kind] = items[i];
        if (bin.dataset.b !== kind) { miss++; A.bad(bin, 'cw_ipo_wrong'); return false; }
        busy = true;
        bin.querySelector('.cw-bin-got').insertAdjacentHTML('beforeend', `<span class="cw-art xs">${ART[id]()}</span>`);
        const first = !seen[kind]; seen[kind] = 1;
        if (first) A.good(bin, 'cw_ipo_' + kind); else { A.good(bin); A.praise(['cw_good1', 'cw_good2', 'cw_good3']); }
        if (root.gsap) gsap.to(card, { scale: 0, opacity: 0, duration: 0.3 });
        const next = () => {
          i++;
          if (i < items.length) show();
          else { setDot(items.length); A.win({ stars: miss <= 1 ? 3 : miss <= 4 ? 2 : 1 }); }
        };
        if (first) A.afterVoice(next, 1200, 9000); else A.later(next, 1100); // التعريف الأول يُسمع كاملاً
        return true;
      }
      A.on(el, 'click', e => { const b = e.target.closest('.cw-bin'); if (b && card) choose(b); });
      A.later(show, 200);
      return {
        async solve() {
          while (A.alive && i < items.length) {
            if (!busy) q(`.cw-bin[data-b="${items[i][1]}"]`).click();
            await A.wait(2800);
          }
        },
      };
    },
  };

  CW.register({
    id: 'what', order: 1, name: 'ما هو الكمبيوتر؟', icon: '💻', color: '#10a88f', voice: 'cw_s_what', minAge: 3,
    rec: a => a <= 6, activities: [story, isit, ipo],
  });
})(window);
