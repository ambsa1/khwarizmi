/* سراج: روبوت صغير في راسه مصباح. مرسوم أجزاء منفصلة (المصباح، الراس، العيون، الفم، الأيادي، الجسم)
   عشان كل جزء يتحرك وحده بمكتبة الحركة GSAP. */
(function (root) {
  'use strict';

  // لون أغمق من اللون الأساسي، للحواف
  function darken(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 - f)));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  const MOUTH = {
    smile: 'M84 106 Q100 121 116 106',
    open: 'M86 104 Q100 128 114 104 Z',
    sad: 'M84 117 Q100 104 116 117',
    wow: 'M94 108 Q100 122 106 108 Q100 100 94 108 Z',
    sleepy: 'M91 111 Q100 115 109 111',
  };

  let uid = 0;
  function svg(color, opts) {
    const o = Object.assign({ lit: true, shadow: true }, opts);
    const dark = darken(color, 0.32);
    const n = ++uid; // معرّفات فريدة لكل نسخة من سراج في الصفحة
    return raw(color, o, dark).replace(/sg-glow/g, 'sg-glow-' + n).replace(/sg-body-/g, 'sg-body-' + n + '-');
  }
  function raw(color, o, dark) {
    return `<svg class="siraj-svg" viewBox="0 0 200 230" aria-hidden="true">
      <defs><radialGradient id="sg-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#fff3b0" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd23e" stop-opacity=".55"/><stop offset="1" stop-color="#ffd23e" stop-opacity="0"/></radialGradient>
        <linearGradient id="sg-body-${color.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${darken(color, 0.12)}"/></linearGradient></defs>
      ${o.shadow ? '<ellipse class="s-shadow" cx="100" cy="222" rx="52" ry="7" fill="rgba(0,0,0,.22)"/>' : ''}
      <g class="s-all">
        <g class="s-feet"><rect x="70" y="196" width="24" height="18" rx="8" fill="${dark}"/><rect x="106" y="196" width="24" height="18" rx="8" fill="${dark}"/></g>
        <g class="s-arm s-arm-l"><rect x="22" y="146" width="24" height="50" rx="12" fill="url(#sg-body-${color.slice(1)})" stroke="${dark}" stroke-width="4"/><circle cx="34" cy="198" r="10" fill="#e6ecf7" stroke="${dark}" stroke-width="3"/></g>
        <g class="s-arm s-arm-r"><rect x="154" y="146" width="24" height="50" rx="12" fill="url(#sg-body-${color.slice(1)})" stroke="${dark}" stroke-width="4"/><circle cx="166" cy="198" r="10" fill="#e6ecf7" stroke="${dark}" stroke-width="3"/></g>
        <g class="s-body"><rect x="56" y="136" width="88" height="68" rx="28" fill="url(#sg-body-${color.slice(1)})" stroke="${dark}" stroke-width="4"/>
          <circle class="s-chest" cx="100" cy="170" r="11" fill="#ffd23e" stroke="#f0a500" stroke-width="3"/></g>
        <g class="s-head">
          <g class="s-lamp">
            <circle class="s-glow" cx="100" cy="26" r="40" fill="url(#sg-glow)" opacity="${o.lit ? 1 : 0}"/>
            <rect x="93" y="36" width="14" height="20" rx="5" fill="#a7b0c8" stroke="#7d86a0" stroke-width="3"/>
            <circle class="s-bulb" cx="100" cy="26" r="17" fill="${o.lit ? '#ffd23e' : '#a29d86'}" stroke="${o.lit ? '#f0a500' : '#7d7964'}" stroke-width="4"/>
            <ellipse cx="94" cy="20" rx="5" ry="3.5" fill="#fff" opacity=".75"/>
          </g>
          <rect x="34" y="50" width="132" height="96" rx="42" fill="url(#sg-body-${color.slice(1)})" stroke="${dark}" stroke-width="4.5"/>
          <rect x="50" y="64" width="100" height="66" rx="28" fill="#eef6ff" stroke="${darken(color, 0.15)}" stroke-width="2"/>
          <g class="s-eyes"><ellipse cx="80" cy="92" rx="11" ry="13" fill="#1d2433"/><ellipse cx="120" cy="92" rx="11" ry="13" fill="#1d2433"/>
            <circle cx="84" cy="86" r="4" fill="#fff"/><circle cx="124" cy="86" r="4" fill="#fff"/></g>
          <circle cx="64" cy="112" r="6" fill="#ff9db0" opacity=".75"/><circle cx="136" cy="112" r="6" fill="#ff9db0" opacity=".75"/>
          <path class="s-mouth" d="${MOUTH.smile}" stroke="#1d2433" stroke-width="5" fill="#1d2433" fill-opacity="0" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      </g></svg>`;
  }

  // يركّب سراج داخل عنصر ويرجع أدوات تحريكه
  function create(el, color, opts) {
    el.innerHTML = svg(color, opts);
    const q = s => el.querySelector(s);
    const all = q('.s-all'), head = q('.s-head'), eyes = q('.s-eyes'), mouth = q('.s-mouth');
    const armL = q('.s-arm-l'), armR = q('.s-arm-r'), glow = q('.s-glow'), body = q('.s-body'), shadow = q('.s-shadow');
    gsap.set(armL, { svgOrigin: '34 150' });
    gsap.set(armR, { svgOrigin: '166 150' });
    gsap.set(eyes, { svgOrigin: '100 92' });
    gsap.set(all, { svgOrigin: '100 214' });
    gsap.set(head, { svgOrigin: '100 140' });

    const idle = gsap.timeline({ repeat: -1, yoyo: true });
    idle.to(head, { y: -3, duration: 1.1, ease: 'sine.inOut' }, 0).to(body, { scaleY: 1.02, svgOrigin: '100 204', duration: 1.1, ease: 'sine.inOut' }, 0);
    const glowTl = gsap.to(glow, { opacity: 0.6, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    let blinkTimer = null;
    const blink = () => {
      gsap.to(eyes, { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 });
      blinkTimer = setTimeout(blink, 2200 + Math.random() * 2600);
    };
    blinkTimer = setTimeout(blink, 1500);

    function setMouthShape(k) {
      mouth.setAttribute('d', MOUTH[k]);
      mouth.setAttribute('fill-opacity', k === 'open' || k === 'wow' ? 1 : 0);
    }
    let talkTimer = null, talkEnd = null, talkRes = null;
    // الحركة الجديدة تاخد مكان القديمة على نفس الجزء (بدل ما يتصارعوا فيرتعش سراج مع الضغطات السريعة)
    const tl = o => gsap.timeline(Object.assign({ defaults: { overwrite: 'auto' } }, o));

    const api = {
      el,
      // يحرّك الفم لمدة معيّنة (أثناء الكلام). كلام جديد ينهي القديم بدل ما يقفل فمه في النص
      talk(ms) {
        clearInterval(talkTimer); clearTimeout(talkEnd); if (talkRes) talkRes();
        let open = false;
        talkTimer = setInterval(() => { open = !open; setMouthShape(open ? 'open' : 'smile'); }, 130);
        return new Promise(res => {
          talkRes = res;
          talkEnd = setTimeout(() => { clearInterval(talkTimer); talkRes = null; setMouthShape('smile'); res(); }, ms);
        });
      },
      wave() {
        return tl().to(armR, { rotation: -150, duration: 0.25, ease: 'back.out(2)' })
          .to(armR, { rotation: -110, duration: 0.18, repeat: 3, yoyo: true, ease: 'sine.inOut' })
          .to(armR, { rotation: 0, duration: 0.3, ease: 'back.out(2)' });
      },
      jump() {
        return tl()
          .to(all, { scaleY: 0.86, scaleX: 1.1, duration: 0.12 })
          .to(all, { y: -60, scaleY: 1.1, scaleX: 0.94, duration: 0.3, ease: 'power2.out' })
          .to(all, { y: 0, scaleY: 1, scaleX: 1, duration: 0.3, ease: 'bounce.out' });
      },
      // رقصة الحفلة: يهتز يميناً ويساراً ويرفع ذراعيه، ثم لفّة صغيرة
      dance() {
        setMouthShape('open');
        return tl({ onComplete: () => setMouthShape('smile') })
          .to([armL, armR], { rotation: i => (i ? -140 : 140), duration: 0.2, ease: 'back.out(2)' }, 0)
          .to(all, { rotation: -12, x: -8, duration: 0.18, ease: 'sine.inOut' }, 0)
          .to(all, { rotation: 12, x: 8, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut' })
          .to(all, { rotation: 0, x: 0, scaleX: 1, duration: 0.25, ease: 'back.out(2)' })
          .to([armL, armR], { rotation: 0, duration: 0.25 }, '<');
      },
      happy() {
        setMouthShape('open');
        return tl({ onComplete: () => setMouthShape('smile') })
          .to([armL, armR], { rotation: i => (i ? -150 : 150), duration: 0.25, ease: 'back.out(2)' }, 0)
          .to(all, { y: -50, duration: 0.28, ease: 'power2.out', yoyo: true, repeat: 3 }, 0)
          .to([armL, armR], { rotation: 0, duration: 0.3 }, '>-0.1');
      },
      sad() {
        setMouthShape('sad');
        return tl({ onComplete: () => setTimeout(() => setMouthShape('smile'), 900) })
          .to(head, { rotation: -10, duration: 0.3 }).to(head, { rotation: 0, duration: 0.5, delay: 0.6 });
      },
      wow() { setMouthShape('wow'); setTimeout(() => setMouthShape('smile'), 900); return gsap.fromTo(all, { scale: 1 }, { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1 }); },
      dizzy() {
        setMouthShape('wow');
        return tl({ onComplete: () => setMouthShape('smile') })
          .to(all, { rotation: 12, duration: 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' }).set(all, { rotation: 0 });
      },
      // نبضة التوهج المتكررة لازم تقف، وإلا ترجع تنوّر المصباح المطفي
      setLit(on) {
        const b = q('.s-bulb');
        b.setAttribute('fill', on ? '#ffd23e' : '#a29d86'); b.setAttribute('stroke', on ? '#f0a500' : '#7d7964');
        glowTl.pause();
        gsap.to(glow, { opacity: on ? 1 : 0, duration: 0.4, overwrite: true, onComplete: () => { if (on) glowTl.restart(); } });
      },
      // نعسان: المصباح مطفي، العيون شبه مقفولة، الراس مايل، والفم صغير
      sleep() {
        api.setLit(false);
        clearTimeout(blinkTimer); blinkTimer = null;
        gsap.killTweensOf(eyes); gsap.set(eyes, { scaleY: 0.15 });
        setMouthShape('sleepy');
        gsap.to(head, { rotation: 8, duration: 0.6, ease: 'sine.out' });
      },
      setChest(color) { gsap.to(q('.s-chest'), { attr: { fill: color }, duration: 0.15 }); },
      destroy() {
        clearTimeout(blinkTimer); clearInterval(talkTimer); clearTimeout(talkEnd); if (talkRes) { talkRes(); talkRes = null; }
        idle.kill(); glowTl.kill(); gsap.killTweensOf([all, head, eyes, armL, armR, glow, body, q('.s-chest')]);
      },
    };
    if (shadow) api.shadow = shadow;
    return api;
  }

  root.Siraj = { svg, create, darken, COLORS: ['#3d8bff', '#e8579a', '#22b573', '#ff9a2e', '#8b5cf6', '#14b8c4', '#e0b100', '#f0533f'] };
})(window);
