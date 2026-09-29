/* Kits4U — homepage: hero nation switcher, entrance driver, sections. */
(function () {
  'use strict';
  var K = window.K4U;
  var ORDER = K.ORDER, N = ORDER.length;

  /* =====================================================================
     HERO — nation switcher (planet switcher, mapped to nations)
     ===================================================================== */
  var scene = new K.Scene(document.getElementById('vault'), ORDER[0]);
  var titleFit = document.querySelector('h1.title .fit');
  var title = document.querySelector('h1.title');
  var lede = document.querySelector('p.lede');
  var cta = document.getElementById('hero-cta');
  var status = document.getElementById('hero-status');
  var current = null;

  var slots = ['l', 'r'].map(function (side) {
    var btn = document.querySelector('.slot-' + side);
    return {
      side: side,
      btn: btn,
      orb: new K.Orb(btn.querySelector('canvas'), ORDER[side === 'l' ? N - 1 : 1], { fade: 0, speed: 0.45, tilt: 0.25 }),
      label: document.querySelector('.label-' + side)
    };
  });

  // Headline fits its column: long names (ARGENTINA) scale down on narrow screens.
  function fitTitle() {
    titleFit.style.transform = '';
    var avail = title.clientWidth - 8, w = titleFit.offsetWidth;
    if (w > avail && avail > 0) titleFit.style.transform = 'scale(' + (avail / w).toFixed(4) + ')';
  }

  function show(next) {
    var c = K.countries[next];
    if (!c || next === current) return;                 // 1. unknown or already featured
    var first = current === null;
    current = next;
    var i = ORDER.indexOf(next);

    scene.set(next, first);                              // 2–3. backdrop crossfades (.22s)
    titleFit.textContent = c.name.toUpperCase();         // 4. headline
    fitTitle();
    lede.innerHTML = c.lede;                             // 5. lede
    cta.textContent = 'SHOP ' + c.name.toUpperCase();
    cta.href = 'collections.html?country=' + next;

    // 6. slots: previous nation on the left, next on the right. The orb swaps
    //    its texture and repaints synchronously — same frame, no flash.
    var rest = [ORDER[(i - 1 + N) % N], ORDER[(i + 1) % N]];
    slots.forEach(function (s, k) {
      var code = rest[k], cc = K.countries[code];
      s.orb.set(code, true);
      s.orb.spinBy(k ? 5 : -5);
      s.btn.dataset.nation = code;
      s.btn.setAttribute('aria-label', 'Show ' + cc.name.toUpperCase());
      s.label.innerHTML = '<span class="full">' + cc.name.toUpperCase() + '</span><span class="code">' + cc.fifa + '</span>';
    });
    if (!first) status.textContent = 'Showing ' + c.name + ' kits';
  }

  function warm(code) { if (scene.gl) scene.tex(code); }

  slots.forEach(function (s) {
    s.btn.addEventListener('click', function () { show(this.dataset.nation); });
    s.btn.addEventListener('pointerenter', function () { warm(this.dataset.nation); });
    s.btn.addEventListener('focus', function () { warm(this.dataset.nation); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
    if (window.scrollY > innerHeight * 0.6) return;
    var i = ORDER.indexOf(current);
    if (e.key === 'ArrowLeft') show(ORDER[(i - 1 + N) % N]);
    if (e.key === 'ArrowRight') show(ORDER[(i + 1) % N]);
  });

  // Pull the remaining flag textures up once the page is idle.
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 2500); };
  requestAnimationFrame(function () { idle(function () { ORDER.forEach(warm); }, { timeout: 4000 }); });

  window.addEventListener('resize', fitTitle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);

  document.querySelector('.scroll').addEventListener('click', function () {
    document.getElementById('kits').scrollIntoView({ behavior: K.reducedMotion ? 'auto' : 'smooth' });
  });

  show(ORDER[0]);

  /* =====================================================================
     ENTRANCE — runs once, then deletes itself
     ===================================================================== */
  (function () {
    var root = document.documentElement;
    if (!root.classList.contains('anim')) return;
    var started = false;
    function go() {
      if (started) return;
      started = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.classList.add('play');
          setTimeout(function () { root.classList.remove('anim', 'play'); }, 2150);
        });
      });
    }
    setTimeout(go, 500);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  })();

  /* =====================================================================
     SECTIONS
     ===================================================================== */
  var featured = document.getElementById('featured');
  var picks = ORDER.map(function (c) { return K.kitById(c + '-home'); })
    .concat(['ger-retro', 'nga-away', 'jpn-third', 'arg-retro'].map(K.kitById));
  featured.innerHTML = picks.map(function (k) { return K.kitCard(k); }).join('');

  var grid = document.getElementById('nation-grid');
  grid.innerHTML = ORDER.map(function (code) {
    var c = K.countries[code], n = K.kitsFor(code).length;
    return '<a class="nation-tile" href="collections.html?country=' + code + '" style="--tint:' + c.tint + '">' +
      '<canvas data-orb="' + code + '" aria-hidden="true"></canvas>' +
      '<span><span class="nation-tile__name">' + K.esc(c.name) + '</span>' +
      '<span class="nation-tile__meta" style="display:block">' + n + ' kits &middot; ' + K.esc(c.region) + '</span></span></a>';
  }).join('');
  grid.querySelectorAll('canvas[data-orb]').forEach(function (cv, i) {
    var orb = new K.Orb(cv, cv.dataset.orb, { speed: 0.3, spin: i * 0.8 });
    cv.parentNode.addEventListener('pointerenter', function () { orb.spinBy(6); });
  });

  // Wear Your Passion — live personalisation preview
  var art = document.getElementById('passion-art');
  var pName = document.getElementById('p-name'), pNum = document.getElementById('p-num');
  var pCta = document.getElementById('passion-cta');
  var demoKit = K.kitById('bra-home');
  var holder = document.createElement('div');
  holder.style.width = '100%';
  holder.style.display = 'flex';
  holder.style.justifyContent = 'center';
  art.appendChild(holder);
  function renderPassion() {
    pNum.value = pNum.value.replace(/\D/g, '').slice(0, 2);
    holder.innerHTML = K.jerseySVG(demoKit, { view: 'back', name: pName.value, number: pNum.value });
    pCta.href = 'product.html?kit=bra-home&name=' + encodeURIComponent(pName.value.trim()) + '&number=' + encodeURIComponent(pNum.value);
  }
  pName.addEventListener('input', renderPassion);
  pNum.addEventListener('input', renderPassion);
  document.getElementById('passion-form').addEventListener('submit', function (e) { e.preventDefault(); location.href = pCta.href; });
  renderPassion();

  document.getElementById('flag-row').innerHTML = ORDER.map(function (c) {
    return '<img src="' + K.flagURL(c, 60, 40) + '" alt="' + K.esc(K.countries[c].name) + '" title="' + K.esc(K.countries[c].name) + '">';
  }).join('');
})();
