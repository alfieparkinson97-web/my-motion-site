/* Kits4U — "Launching 20.10" TikTok ad (1080x1920, 30fps, 25s).

   Everything on screen is a pure function of time: renderAt(t) poses the
   real site engine (K4U.Scene stadium + flag football, K4U.Orb, K4U.jerseySVG)
   and the DOM overlays for that instant. The recorder steps t frame by frame,
   so the MP4 has no dropped frames regardless of how slowly a frame renders.

   Preview: open the built kits4u-ad.html in a browser. Space = pause,
   arrows = seek, S = TikTok safe-zone overlay. ?t=12.5 freezes on a time. */
(function () {
  'use strict';
  var K = window.K4U;
  var W = 1080, H = 1920, FPS = 30, DURATION = 25;
  var SAFE = { l: 60, r: W - 140, t: 150, b: H - 420 };
  var VOLT = [201 / 255, 242 / 255, 74 / 255];
  var params = new URLSearchParams(location.search);
  var RECORD = params.has('record');

  // The ad drives every frame itself, so stop gl.js's real-time ticker.
  K.tick = function () {};

  /* ---------------- helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  function clamp(x, a, b) { return Math.min(b == null ? 1 : b, Math.max(a || 0, x)); }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  var E = {
    outCubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    inCubic: function (x) { return x * x * x; },
    inQuad: function (x) { return x * x; },
    outExpo: function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); },
    inOut: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    outBack: function (x) { var c = 1.9, d = c + 1; return 1 + d * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    inBack: function (x) { var c = 1.7; return (c + 1) * x * x * x - c * x * x; }
  };
  function hexRGB(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function mix3(a, b, x) { return [lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x)]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')'; }
  function show(el, on) { var v = on ? 'block' : 'none'; if (el.style.display !== v) el.style.display = v; }
  function css(el, o) { for (var k in o) el.style[k] = o[k]; }
  function tint(code) { return hexRGB(K.countries[code].tint); }

  /* ---------------- timeline ---------------- */
  var T = { s2: 2.0, s3: 7.0, s4: 12.0, s5: 16.0, s6: 20.0 };
  var STEP = 0.625;                                     // one flag per beat (96 BPM)
  var SPIN = ['bra', 'arg', 'nga', 'jpn', 'fra', 'ger', 'eng', 'ita'];
  var ENDSPIN = ['ger', 'jpn', 'arg', 'nga', 'fra', 'ita', 'eng', 'bra'];
  var SNAPS = SPIN.map(function (c, i) { return T.s2 + i * STEP; });
  var ENDSNAPS = ENDSPIN.map(function (c, i) { return T.s6 + i * STEP; });
  var NAME = 'SILVA', TYPE0 = 12.5, TYPE_DT = 0.15, STAMP = 14.12;
  var FLIPS = [8.0, 8.9, 9.8, 10.6];

  // [time, strength, decay] — camera shake + zoom punch
  var IMPACTS = [[0.55, 30, 8], [1.05, 16, 10], [1.62, 8, 10]]
    .concat(SNAPS.map(function (s, i) { return [s, i ? 9 : 16, 11]; }))
    .concat(FLIPS.map(function (f) { return [f + 0.2, 5, 12]; }))
    .concat(NAME.split('').map(function (c, i) { return [TYPE0 + i * TYPE_DT, 3.5, 16]; }))
    .concat([[STAMP, 34, 7], [17.3, 8, 12], [18.0, 10, 10], [18.6, 8, 12],
      [20.05, 22, 8], [20.38, 10, 12], [20.82, 28, 8], [21.95, 6, 12]]);
  // [time, alpha, decay seconds, layer]
  var FLASHES = [[0.55, 0.38, 0.07, 'W'], [2.0, 0.3, 0.06, 'W'], [7.0, 0.2, 0.06, 'W'], [12.0, 0.25, 0.07, 'W'],
    [STAMP, 0.4, 0.06, 'W'], [STAMP, 0.16, 0.18, 'V'], [16.0, 0.16, 0.06, 'W'], [18.0, 0.14, 0.12, 'V'],
    [20.0, 0.55, 0.07, 'W'], [20.82, 0.2, 0.16, 'V']]
    .concat(SNAPS.map(function (s) { return [s, 0.22, 0.1, 'T']; }));
  // camera whips (cut points)
  var WHIPS = [[T.s3, 'x'], [T.s5, 'y']];

  function camFX(t) {
    var x = 0, y = 0, r = 0, z = 0;
    IMPACTS.forEach(function (im, i) {
      var dt = t - im[0];
      if (dt < 0 || dt > 0.9) return;
      var e = im[1] * Math.exp(-dt * im[2]);
      x += e * Math.sin(dt * 71 + i * 1.3);
      y += e * Math.cos(dt * 59 + i * 2.1);
      r += e * 0.018 * Math.sin(dt * 43 + i);
      z += e * 0.0015;
    });
    var bx = 0, by = 0, blur = 0;
    WHIPS.forEach(function (w) {
      var tc = w[0], off = 0;
      if (t >= tc - 0.13 && t < tc) off = -E.inQuad(seg(t, tc - 0.13, tc));
      else if (t >= tc && t < tc + 0.16) off = 1 - E.outCubic(seg(t, tc, tc + 0.16));
      if (!off) return;
      blur = Math.abs(off) * 34;
      if (w[1] === 'x') bx = off * 760; else by = off * 900;
    });
    return { x: x + bx, y: y + by, r: r, z: z, blur: blur };
  }
  function flash(t, layer) {
    var a = 0;
    FLASHES.forEach(function (f) {
      if (f[3] !== layer) return;
      var dt = t - f[0];
      if (dt >= 0 && dt < f[2] * 6) a += f[1] * Math.exp(-dt / f[2]);
    });
    return Math.min(1, a);
  }

  // nation on the ball at time t (from, code, crossfade, tint)
  function nationAt(t) {
    var list = t >= T.s6 ? ENDSPIN : SPIN, snaps = t >= T.s6 ? ENDSNAPS : SNAPS, fade = t >= T.s6 ? 0.16 : 0.07;
    if (t < T.s2) return { from: 'eng', code: 'eng', mix: 1, tint: tint('eng') };
    var i = 0;
    while (i < snaps.length - 1 && t >= snaps[i + 1]) i++;
    var prev = i ? list[i - 1] : (t >= T.s6 ? 'ita' : 'eng');
    var x = seg(t, snaps[i], snaps[i] + fade);
    return { from: prev, code: list[i], mix: x, tint: mix3(tint(prev), tint(list[i]), E.outCubic(seg(t, snaps[i], snaps[i] + 0.3))) };
  }
  function spinAt(t) {
    var s = 0.5 + 0.9 * t + Math.PI * 2 * E.inOut(seg(t, 1.4, 1.85));
    SNAPS.concat(ENDSNAPS).forEach(function (n) { s += 1.25 * E.outCubic(seg(t, n, n + 0.4)); });
    return s;
  }

  /* ---------------- GL scene (the real site engine) ---------------- */
  var canvas = $('gl'), scene;
  function poseScene(t) {
    var n = nationAt(t), st = { cx: 540, cy: 99999, r: 1, hz: 1700, tint: VOLT, rim: true };
    if (t < T.s2) {                                     // hook: ball slams up over the horizon
      var up = E.outBack(seg(t, 0.12, 0.55)), go = E.inOut(seg(t, 1.85, 2.0));
      st = { cx: 540, cy: lerp(lerp(2500, 1265, up), 1200, go), r: lerp(470, 520, go), hz: lerp(1350, 1300, go) };
    } else if (t < T.s3) {                              // nation cycle
      var s = SNAPS[Math.min(7, Math.floor((t - T.s2) / STEP))];
      st = { cx: 540, cy: 1200, r: 520 * (1 + 0.07 * Math.exp(-(t - s) * 9)), hz: 1300 };
    } else if (t >= T.s6) {                             // end card
      var e = ENDSNAPS[Math.min(7, Math.floor((t - T.s6) / STEP))];
      st = { cx: 540, cy: lerp(2300, 1135, E.outBack(seg(t, T.s6, T.s6 + 0.38))), r: 242 * (1 + 0.05 * Math.exp(-(t - e) * 9)), hz: 1255 };
    }
    var tn = t >= T.s3 && t < T.s6 ? VOLT : n.tint;
    scene.from = n.from; scene.code = n.code; scene.mix = n.mix;
    scene.tint = scene.tintFrom = tn; scene.tintT = 1;
    scene.spin = spinAt(t);
    scene.tilt = 0.28 + 0.08 * Math.sin(t * 0.8);
    scene.time = t;
    var k = canvas.width / W;
    scene.layout = { cx: st.cx * k, cy: (H - st.cy) * k, r: st.r * k, hz: (H - st.hz) * k };
    scene.draw();
  }

  /* ---------------- type fitting ---------------- */
  // Shrink a line until it fits the safe width; returns the font size used.
  function fitLine(el, max, width) {
    el.style.fontSize = max + 'px';
    var w = el.scrollWidth;
    var size = w > width ? Math.floor(max * width / w) : max;
    el.style.fontSize = size + 'px';
    return size;
  }
  function stackLines(stack) { return Array.prototype.slice.call(stack.children); }
  // mask-wipe a stack's lines in and out
  function maskAnim(lines, t, tin, tout) {
    lines.forEach(function (ln, i) {
      var pin = E.outExpo(seg(t, tin + i * 0.08, tin + i * 0.08 + 0.38));
      var pout = tout == null ? 0 : E.inCubic(seg(t, tout + i * 0.05, tout + i * 0.05 + 0.2));
      ln.firstChild.style.transform = 'translateY(' + ((1 - pin) * 150 - pout * 150).toFixed(2) + '%)';
    });
  }

  /* ---------------- scene 1 ---------------- */
  var h1 = [$('h1a'), $('h1b'), $('h1c')];
  function scene1(t) {
    var go = seg(t, 1.86, 2.0);
    [[0.55, 0], [0.62, 0], [1.05, 1]].forEach(function (cfg, i) {
      var p = seg(t, cfg[0], cfg[0] + (cfg[1] ? 0.14 : 0.2));
      var el = h1[i], sc, y;
      if (cfg[1]) { sc = lerp(1.07, 1, E.outExpo(p)); y = 0; }     // YOUR KIT. slams in
      else { sc = 1; y = lerp(50, 0, E.outExpo(p)); }
      y -= 40 * E.inQuad(go);
      css(el, {
        opacity: (Math.min(1, p * 3) * (1 - go)).toFixed(3),
        transform: 'translateY(' + y.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')',
        filter: 'blur(' + ((1 - E.outExpo(p)) * 18 + go * 14).toFixed(1) + 'px)' + (cfg[1] ? ' drop-shadow(0 0 26px rgba(201,242,74,.55))' : '')
      });
    });
  }

  /* ---------------- scene 2 ---------------- */
  var s2name = $('s2name'), s2ghost = $('s2ghost'), s2bar = $('s2bar'), s2count = $('s2count'), s2cur = -1, s2size = {};
  function scene2(t) {
    var i = Math.min(7, Math.floor((t - T.s2) / STEP)), s = SNAPS[i], dt = t - s, code = SPIN[i];
    if (i !== s2cur) {
      s2cur = i;
      s2name.textContent = s2ghost.textContent = K.countries[code].name.toUpperCase();
      s2name.style.fontSize = s2ghost.style.fontSize = s2size[code] + 'px';
      s2count.textContent = '0' + (i + 1) + ' / 08';
      s2name.style.textShadow = '0 0 60px ' + K.countries[code].tint + ', 0 8px 40px rgba(0,0,0,.6)';
    }
    var p = E.outExpo(seg(dt, 0, 0.22)), out = i === 7 ? E.inQuad(seg(t, 6.86, 7.0)) : 0;
    css(s2name, {
      opacity: (seg(dt, 0, 0.05) * (1 - out)).toFixed(3),
      transform: 'translateY(' + ((1 - p) * 24).toFixed(1) + 'px) scale(' + lerp(1.07, 1, p).toFixed(4) + ')',
      filter: 'blur(' + ((1 - seg(dt, 0, 0.12)) * 10).toFixed(1) + 'px)'
    });
    var g = seg(dt, 0, 0.45);
    css(s2ghost, { opacity: ((1 - g) * 0.7 * seg(dt, 0, 0.04)).toFixed(3), transform: 'scale(' + lerp(1, 1.22, E.outCubic(g)).toFixed(4) + ')' });
    var bw = 190 * E.outExpo(seg(dt, 0.04, 0.3)) * (1 - out);
    css(s2bar, { width: bw.toFixed(1) + 'px', marginLeft: (-bw / 2).toFixed(1) + 'px' });
    css(s2count, { opacity: (Math.min(1, seg(t, T.s2, T.s2 + 0.1)) * (1 - out)).toFixed(3), transform: 'translateY(' + ((1 - E.outExpo(seg(dt, 0, 0.18))) * -14).toFixed(1) + 'px)' });
  }

  /* ---------------- scene 3: jersey grid ---------------- */
  var cells = [], sets = [];
  function buildGrid() {
    var typeOrder = { home: 0, away: 1, third: 2, retro: 3 };
    var L = K.kits.filter(function (k) { return k.id !== 'bra-home'; }).sort(function (a, b) {
      return typeOrder[a.type] - typeOrder[b.type] || K.ORDER.indexOf(a.country) - K.ORDER.indexOf(b.country);
    });
    sets = [L.slice(0, 9), L.slice(9, 18), L.slice(18, 26)];
    sets[2].splice(4, 0, K.kitById('bra-home'));         // centre card of the last set becomes the hero shirt
    var nums = [[7, 10, 9, 11, 4, 8, 5, 23, 1], [14, 6, 19, 3, 21, 2, 17, 22, 12]];
    var grid = $('grid');
    for (var i = 0; i < 9; i++) {
      var r = Math.floor(i / 3), c = i % 3;
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.left = (70 + c * 295) + 'px';
      cell.style.top = (500 + r * 330) + 'px';
      cell.innerHTML = '<div class="card"><div class="face front"></div><div class="face back"></div></div>';
      grid.appendChild(cell);
      var fronts = sets.map(function (s) { return s[i]; }).map(function (kit) {
        return K.jerseySVG(kit, { view: 'front' }) + (kit.badge ? '<span class="tag">' + kit.badge.toUpperCase() + '</span>' : '');
      });
      var backs = [0, 1].map(function (si) { return K.jerseySVG(sets[si][i], { view: 'back', number: nums[si][i] }); });
      cells.push({ el: cell, card: cell.firstChild, front: cell.firstChild.children[0], back: cell.firstChild.children[1],
        r: r, c: c, fronts: fronts, backs: backs, fi: -1, bi: -1 });
    }
  }
  var s3title;
  function scene3(t) {
    maskAnim(s3title, t, 7.04, 11.3);
    cells.forEach(function (o, i) {
      var d = i * 0.04, enter = seg(t, 7.0 + d, 7.0 + d + 0.5);
      var angle = -180 * (1 - E.outCubic(enter)), pop = 0, d2 = (o.r + o.c) * 0.045;
      FLIPS.forEach(function (f) {
        var p = seg(t, f + d2, f + d2 + 0.36);
        angle += 180 * E.inOut(p);
        pop = Math.max(pop, Math.sin(Math.PI * p));
      });
      var fi = clamp(Math.floor((angle + 90) / 360), 0, 2), bi = clamp(Math.floor((angle - 90) / 360), 0, 1);
      if (fi !== o.fi) { o.fi = fi; o.front.innerHTML = o.fronts[fi]; }
      if (bi !== o.bi) { o.bi = bi; o.back.innerHTML = o.backs[bi]; }
      var x = (o.r % 2 ? 1 : -1) * 1150 * (1 - E.outExpo(enter)), y = 0, rz = 0, op = 1;
      if (i === 4) op = t < 11.3 ? 1 : 0;                // handed over to the scene-4 hero shirt
      else {
        var ex = E.inCubic(seg(t, 11.3 + (o.r + o.c) * 0.03, 11.68 + (o.r + o.c) * 0.03));
        var dx = o.c - 1, dy = o.r - 1, n = Math.hypot(dx, dy) || 1;
        x += dx / n * 1300 * ex; y += dy / n * 1300 * ex; rz = dx * 25 * ex;
      }
      css(o.card, { transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotateZ(' + rz.toFixed(2) + 'deg) rotateY(' + angle.toFixed(2) + 'deg) scale(' + (1 + 0.07 * pop).toFixed(4) + ')' });
      o.el.style.opacity = op;
    });
  }

  /* ---------------- scene 4: personalised jersey ---------------- */
  var J = $('J'), jglow = $('jglow'), ring = $('ring'), jfront = J.children[0], jback = J.children[1];
  var nameEl, numEl, cursor, typed = -1, s4title;
  function buildJersey() {
    var kit = K.kitById('bra-home');
    jfront.insertAdjacentHTML('beforeend', K.jerseySVG(kit, { view: 'front' }));
    jback.insertAdjacentHTML('beforeend', K.jerseySVG(kit, { view: 'back', name: NAME, number: 10 }));
    var svg = jback.querySelector('svg'), texts = svg.querySelectorAll('text');
    nameEl = texts[1]; numEl = texts[2];
    cursor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    cursor.setAttribute('width', '5'); cursor.setAttribute('height', '32'); cursor.setAttribute('y', '101'); cursor.setAttribute('rx', '1.5');
    cursor.setAttribute('fill', '#c9f24a');
    svg.appendChild(cursor);
    jback.appendChild(ring);                              // ring above the shirt
  }
  function scene4(t) {
    maskAnim(s4title, t, 11.95);
    // zoom out of the grid: the centre card becomes the hero shirt and flips to its back
    var z = E.inOut(seg(t, 11.3, 11.95));
    var sc = lerp(0.2975, 1, z), tx = 0, ty = lerp(20, 0, z), ry = 720 + 180 * z;
    var push = 0.05 * seg(t, 12, 16), wind = 0.045 * E.inQuad(seg(t, 13.72, STAMP)) * (t < STAMP ? 1 : 0);
    var hit = t >= STAMP ? 0.05 * Math.exp(-(t - STAMP) * 10) : 0;
    var sway = 7 * Math.sin((t - 14.4) * 2.4) * seg(t, 14.3, 14.8);
    css(J, { transform: 'translate(' + tx + 'px,' + ty.toFixed(1) + 'px) scale(' + (sc + push + wind - hit).toFixed(4) + ') rotateY(' + (ry + sway).toFixed(2) + 'deg)' });
    var bgo = (1 - z).toFixed(3);
    J.querySelectorAll('.jbg').forEach(function (b) { b.style.opacity = bgo; });
    // name types itself on
    var n = t < TYPE0 ? 0 : Math.min(NAME.length, Math.floor((t - TYPE0) / TYPE_DT) + 1);
    if (n !== typed) { typed = n; nameEl.textContent = NAME.slice(0, n); }
    var len = n ? nameEl.getComputedTextLength() : 0;
    cursor.setAttribute('x', (200 + len / 2 + 5).toFixed(1));
    var blinkOn = (t - 12) % 0.5 < 0.3 || (t >= TYPE0 && t < TYPE0 + NAME.length * TYPE_DT + 0.1);
    cursor.style.opacity = t > 12.1 && t < 13.75 && blinkOn ? 1 : 0;
    // number 10 stamps in
    var sp = seg(t, STAMP - 0.13, STAMP);
    var ns = t < STAMP ? lerp(3.4, 1, E.inCubic(sp)) : 1 + 0.06 * Math.exp(-(t - STAMP) * 12) * Math.cos((t - STAMP) * 38);
    numEl.setAttribute('transform', 'translate(200 236) scale(' + ns.toFixed(4) + ') translate(-200 -236)');
    numEl.style.opacity = t < STAMP - 0.13 ? 0 : Math.min(1, sp * 2.5);
    var rp = seg(t, STAMP, STAMP + 0.5);
    css(ring, { opacity: (t >= STAMP ? 1 - rp : 0).toFixed(3), width: lerp(140, 980, E.outCubic(rp)).toFixed(1) + 'px', height: lerp(140, 980, E.outCubic(rp)).toFixed(1) + 'px', borderWidth: lerp(18, 2, rp).toFixed(1) + 'px' });
    jglow.style.opacity = (seg(t, 12.0, 12.6) * 0.5 + (t >= STAMP ? 0.6 * Math.exp(-(t - STAMP) * 2.5) : 0)).toFixed(3);
  }

  /* ---------------- scene 5: website montage ---------------- */
  var phone = $('phone'), imHero = $('imHero'), imHome = $('imHome'), imCol = $('imCol'), sglare = $('sglare');
  var S = 588 / 780, SCREEN_H = 1310, HOME_MAX = 3280 * S - SCREEN_H;
  var orbs = [], s5a, s5b;
  // where each nation's orb sits in the home screenshot (image px), and where it flies to
  var ORB_X = [201, 576], ORB_Y = [1730, 2110, 2490, 2870];
  function buildOrbs() {
    K.ORDER.forEach(function (code, i) {
      var c = document.createElement('canvas');
      c.className = 'orb';
      $('orbs').appendChild(c);
      var col = i % 2, row = Math.floor(i / 2);
      var sx = 206 + ORB_X[col] * S, sy = 536 + ORB_Y[row] * S - HOME_MAX;
      orbs.push({ el: c, orb: new K.Orb(c, code, { speed: 0, spin: i, tilt: 0.3, fade: 0 }),
        sx: sx, sy: sy, dx: col ? 892 : 108, dy: 690 + row * 262, i: i });
    });
  }
  function scene5(t) {
    maskAnim(s5a, t, 16.05, 17.85);
    maskAnim(s5b, t, 18.0, 19.78);
    // phone tilt + exit zoom
    var ex = E.inCubic(seg(t, 19.78, 20.0));
    var rx = 7 + 3 * Math.sin(t * 1.3), ry = -9 + 7 * Math.sin(t * 0.9 + 1), rz = -2 + 1.5 * Math.sin(t * 1.1);
    var punch = 0.025 * (Math.exp(-Math.max(0, t - 17.3) * 10) * (t >= 17.3) + Math.exp(-Math.max(0, t - 18.6) * 10) * (t >= 18.6));
    css(phone, { transform: 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + (1 + punch + ex * 0.9).toFixed(4) + ')',
      opacity: (1 - ex).toFixed(3), filter: ex ? 'blur(' + (ex * 20).toFixed(1) + 'px)' : 'none' });
    // screen: hero -> scroll whip to featured kits + nations -> swipe to collections
    var up = E.inOut(seg(t, 17.15, 17.35));
    var scroll = HOME_MAX * E.inOut(seg(t, 17.35, 17.95));
    var sw = E.inOut(seg(t, 18.6, 18.8));
    var colScroll = 900 * E.inOut(seg(t, 18.85, 19.85));
    css(imHero, { transform: 'translateY(' + (-up * SCREEN_H).toFixed(1) + 'px) scale(' + (1 + 0.05 * seg(t, 16, 17.15)).toFixed(4) + ')', display: up < 1 ? 'block' : 'none' });
    css(imHome, { transform: 'translate(' + (-sw * 588).toFixed(1) + 'px,' + ((1 - up) * SCREEN_H - scroll).toFixed(1) + 'px)', display: up > 0 && sw < 1 ? 'block' : 'none' });
    css(imCol, { transform: 'translate(' + ((1 - sw) * 588).toFixed(1) + 'px,' + (-colScroll).toFixed(1) + 'px)', display: sw > 0 ? 'block' : 'none' });
    var blur = Math.max(Math.sin(Math.PI * up), Math.sin(Math.PI * sw), Math.sin(Math.PI * seg(t, 17.35, 17.95)) * 0.6);
    $('screen').style.filter = blur > 0.02 ? 'blur(' + (blur * 6).toFixed(1) + 'px)' : 'none';
    sglare.style.transform = 'translateX(' + (Math.sin(t * 0.8) * 160).toFixed(1) + 'px)';
    // the nation orbs burst out of the website's nation grid
    orbs.forEach(function (o) {
      var a = 18.0 + o.i * 0.035, p = E.outBack(seg(t, a, a + 0.42)), q = E.inBack(seg(t, 19.32 + o.i * 0.03, 19.6 + o.i * 0.03));
      var vis = t >= a && q < 1;
      show(o.el, vis);
      if (!vis) return;
      var x = lerp(o.sx, o.dx, p), y = lerp(o.sy, o.dy, p) + 10 * Math.sin(t * 2.6 + o.i) * seg(t, a + 0.4, a + 0.7);
      var sc = lerp(104 / 170, 1, clamp(p, 0, 1.2)) * (1 - q);
      css(o.el, { transform: 'translate(' + (x - 85).toFixed(1) + 'px,' + (y - 85).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')' });
      o.orb.spin = t * 1.8 + o.i * 0.8 + 3 * E.outCubic(seg(t, a, a + 0.5));
      o.orb.draw();
    });
  }

  /* ---------------- scene 6: end card ---------------- */
  var logo = $('logo'), e1 = $('e1'), e2 = $('e2'), shine = $('shine'), dateIn = $('dateIn'), cta = $('cta'), ctaRing = $('ctaRing');
  function scene6(t) {
    var lp = seg(t, 20.1, 20.42);
    css(logo, { opacity: Math.min(1, lp * 3).toFixed(3), transform: 'scale(' + lerp(0.6, 1, E.outBack(lp)).toFixed(4) + ')' });
    var p1 = seg(t, 20.38, 20.58);
    css(e1, { opacity: Math.min(1, p1 * 2.5).toFixed(3), transform: 'translateY(' + ((1 - E.outExpo(p1)) * 70).toFixed(1) + 'px)', filter: 'blur(' + ((1 - E.outExpo(p1)) * 14).toFixed(1) + 'px)' });
    var p2 = seg(t, 20.69, 20.82);
    var s2 = t < 20.82 ? lerp(1.1, 1, E.inCubic(p2)) : 1 + 0.04 * Math.exp(-(t - 20.82) * 12) * Math.cos((t - 20.82) * 40);
    var breathe = 1 + 0.012 * Math.sin((t - 21) * 3.2) * seg(t, 21, 21.5);
    css(e2, { opacity: Math.min(1, p2 * 3).toFixed(3), transform: 'scale(' + (s2 * breathe).toFixed(4) + ')' });
    var gl = seg(t, 23.15, 23.75);
    shine.style.opacity = gl > 0 && gl < 1 ? 1 : 0;
    shine.style.backgroundPosition = lerp(100, 0, gl).toFixed(1) + '% 0';
    var dp = seg(t, 21.3, 21.75);
    css(dateIn, { clipPath: 'inset(-20% ' + ((1 - E.outCubic(dp)) * 100).toFixed(2) + '% -20% 0)', opacity: dp > 0 ? 1 : 0 });
    var cp = seg(t, 21.9, 22.3), pulse = 0;
    [22.9, 23.9].forEach(function (pt) { var x = seg(t, pt, pt + 0.55); if (x > 0 && x < 1) pulse = Math.max(pulse, Math.sin(Math.PI * Math.min(1, x * 2))); });
    css(cta, { opacity: Math.min(1, cp * 3).toFixed(3), transform: 'translateY(' + ((1 - E.outBack(cp)) * 50).toFixed(1) + 'px) scale(' + (lerp(0.7, 1, E.outBack(cp)) * (1 + 0.045 * pulse)).toFixed(4) + ')' });
    var rr = 0, ro = 0;
    [22.9, 23.9].forEach(function (pt) { var x = seg(t, pt, pt + 0.6); if (x > 0 && x < 1) { rr = x; ro = 1 - x; } });
    css(ctaRing, { opacity: ro.toFixed(3), transform: 'scale(' + (1 + rr * 0.18).toFixed(4) + ',' + (1 + rr * 0.5).toFixed(4) + ')' });
  }

  /* ---------------- frame ---------------- */
  var layers = { s1: $('s1'), s2: $('s2'), s3: $('s3'), s4: $('s4'), s5: $('s5'), s6: $('s6') };
  var cam = $('cam'), dim = $('dim'), black = $('black'), fW = $('flashW'), fV = $('flashV'), fT = $('flashT');
  var now = 0;
  function renderAt(t) {
    t = clamp(t, 0, DURATION - 1e-6);
    now = t;
    poseScene(t);
    var a = t < T.s2, b = t >= T.s2 && t < T.s3, c = t >= T.s3 && t < 11.95, d = t >= 11.3 && t < T.s5, e = t >= T.s5 && t < T.s6, f = t >= T.s6;
    show(layers.s1, a); show(layers.s2, b); show(layers.s3, c); show(layers.s4, d); show(layers.s5, e); show(layers.s6, f);
    if (a) scene1(t);
    if (b) scene2(t);
    if (c) scene3(t);
    if (d) scene4(t);
    if (e) scene5(t);
    if (f) scene6(t);
    var fx = camFX(t);
    css(cam, { transform: 'translate(' + fx.x.toFixed(2) + 'px,' + fx.y.toFixed(2) + 'px) rotate(' + fx.r.toFixed(3) + 'deg) scale(' + (1 + fx.z).toFixed(4) + ')',
      filter: fx.blur > 0.5 ? 'blur(' + fx.blur.toFixed(1) + 'px)' : 'none' });
    dim.style.opacity = (t >= T.s3 && t < T.s6 ? 0.55 : 0).toFixed(3);
    // hook opens on black; the stadium floodlights hit as the ball lands
    black.style.opacity = (t < 0.55 ? 1 - 0.8 * E.inQuad(seg(t, 0.12, 0.55)) : 0.2 * (1 - seg(t, 0.55, 0.65))).toFixed(3);
    fW.style.opacity = flash(t, 'W').toFixed(3);
    fV.style.opacity = flash(t, 'V').toFixed(3);
    var ft = flash(t, 'T');
    fT.style.opacity = ft.toFixed(3);
    if (ft > 0) fT.style.background = 'radial-gradient(80% 50% at 50% 45%, ' + rgba(nationAt(t).tint, 0.9) + ', ' + rgba(nationAt(t).tint, 0) + ')';
  }

  /* ---------------- safe-zone audit (used by the recorder) ---------------- */
  function opacityOf(el) {
    var o = 1;
    for (; el && el.nodeType === 1; el = el.parentElement) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= +cs.opacity;
    }
    return o;
  }
  // Layout is checked against the safe zone with camera shake/whips removed;
  // overflow past the frame edge is checked as rendered.
  function audit() {
    var out = [], keep = cam.style.transform;
    collect(out, true);
    cam.style.transform = 'none';
    collect(out, false);
    cam.style.transform = keep;
    return out;
  }
  function collect(out, asRendered) {
    document.querySelectorAll('.chk').forEach(function (el) {
      var o = opacityOf(el);
      if (o < 0.05) return;
      var r = el.getBoundingClientRect(), fit = $('fit').getBoundingClientRect(), k = fit.width / W;
      var box = { l: (r.left - fit.left) / k, r: (r.right - fit.left) / k, t: (r.top - fit.top) / k, b: (r.bottom - fit.top) / k };
      if (box.r - box.l < 2) return;
      var off = box.l < 0 || box.r > W || box.t < 0 || box.b > H;
      var unsafe = box.l < SAFE.l - 1 || box.r > SAFE.r + 1 || box.t < SAFE.t - 1 || box.b > SAFE.b + 1;
      if (asRendered ? off : unsafe) out.push({ id: el.id || el.textContent.trim().slice(0, 24), opacity: +o.toFixed(2), problem: asRendered ? 'off-frame' : 'outside safe zone', box: [box.l, box.t, box.r, box.b].map(Math.round) });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    scene = new K.Scene(canvas, 'eng');
    buildGrid();
    buildJersey();
    s3title = stackLines(layers.s3.querySelector('.stack'));
    s4title = stackLines(layers.s4.querySelector('.stack'));
    s5a = stackLines($('s5a')); s5b = stackLines($('s5b'));
    // fit every headline into the 860px safe width (layers must be visible to measure)
    Object.keys(layers).forEach(function (k) { layers[k].style.display = 'block'; });
    h1.forEach(function (el) { fitLine(el, 196, 800); });   // 800 x 1.07 slam stays in the safe zone
    s3title.concat(s4title).concat(s5a).concat(s5b).forEach(function (el) { fitLine(el, 116, 860); });
    fitLine(e1, 132, 860); fitLine(e2, 330, 770);
    fitLine(cta.firstChild, 46, 790);
    K.ORDER.forEach(function (code) {
      s2name.textContent = K.countries[code].name.toUpperCase();
      s2size[code] = fitLine(s2name, 230, 800);
    });
    buildOrbs();
    Object.keys(layers).forEach(function (k) { layers[k].style.display = 'none'; });
    window.renderAt = renderAt;
    window.adAudit = audit;
    window.AD = { W: W, H: H, FPS: FPS, DURATION: DURATION, FRAMES: Math.round(DURATION * FPS) };
    renderAt(0);
    window.adReady = true;
    if (!RECORD) preview();
  }

  function preview() {
    function fit() { $('fit').style.transform = 'translate(-50%, -50%) scale(' + Math.min(innerWidth / W, innerHeight / H) + ')'; }
    fit();
    addEventListener('resize', fit);
    if (params.has('safe')) $('safe').style.display = 'block';
    var hud = $('hud');
    hud.style.display = 'block';
    var frozen = params.has('t'), paused = frozen, t0 = performance.now() - (frozen ? +params.get('t') : 0) * 1000;
    if (frozen) renderAt(+params.get('t'));
    addEventListener('keydown', function (e) {
      if (e.key === ' ') { paused = !paused; t0 = performance.now() - now * 1000; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var nt = clamp(now + (e.key === 'ArrowRight' ? 1 : -1), 0, DURATION); t0 = performance.now() - nt * 1000; renderAt(nt); }
      if (e.key === 's' || e.key === 'S') { var sf = $('safe'); sf.style.display = sf.style.display === 'block' ? 'none' : 'block'; }
    });
    (function loop() {
      if (!paused) renderAt(((performance.now() - t0) / 1000) % DURATION);
      hud.textContent = now.toFixed(2) + 's  ·  space pause · ←/→ seek · S safe zone';
      requestAnimationFrame(loop);
    })();
  }

  var families = ['400 10px Prata', '600 10px Poppins', '700 10px Poppins', '500 10px Poppins', '400 10px "Hanken Grotesk"', '800 10px "Hanken Grotesk"'];
  Promise.all(families.map(function (f) { return document.fonts.load(f); })).then(function () { return document.fonts.ready; })
    .then(function () {
      var imgs = Array.prototype.slice.call(document.images);
      return Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : null; }));
    }).then(boot);
})();
