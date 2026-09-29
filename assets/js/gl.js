/* Kits4U — 3D engine (raw WebGL, no libraries).

   K4U.Scene(canvas)  full-bleed "Global Kit Vault": floodlit digital stadium,
                      perspective turf with pitch lines + a giant flag football
                      rising over the horizon. Drag to spin it.
   K4U.Orb(canvas)    a small transparent flag football (hero side slots, nation
                      tiles, collection header). All orbs share ONE WebGL
                      context and are blitted into their own 2D canvases, so
                      the page never approaches the browser's context limit.

   Each nation's flag is uploaded once as a texture; switching nation is a
   uniform change + synchronous redraw, so a swap lands in the same frame. */
(function () {
  'use strict';
  var K = (window.K4U = window.K4U || {});
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  K.reducedMotion = reduce;

  /* ---- football panel centres: 12 pentagons (icosahedron vertices) +
          20 hexagons (dodecahedron vertices = icosahedron face centres) ---- */
  var CENTRES = (function () {
    var t = (1 + Math.sqrt(5)) / 2, it = 1 / t, v = [], out = [], s = [-1, 1];
    v.push([0, 1, t], [0, -1, t], [0, 1, -t], [0, -1, -t], [1, t, 0], [-1, t, 0],
      [1, -t, 0], [-1, -t, 0], [t, 0, 1], [-t, 0, 1], [t, 0, -1], [-t, 0, -1]);
    s.forEach(function (x) { s.forEach(function (y) { s.forEach(function (z) { v.push([x, y, z]); }); }); });
    s.forEach(function (a) { s.forEach(function (b) { v.push([0, a * t, b * it], [a * it, 0, b * t], [a * t, b * it, 0]); }); });
    v.forEach(function (p) { var l = Math.hypot(p[0], p[1], p[2]); out.push(p[0] / l, p[1] / l, p[2] / l); });
    return new Float32Array(out);
  })();

  var HEAD = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif'
  ].join('\n');

  var VERT = 'attribute vec2 aPos; varying vec2 vP; void main(){ vP = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }';

  var BALL = [
    'uniform vec3 uC[32];',
    'uniform sampler2D uTexA;',
    'uniform sampler2D uTexB;',
    'uniform float uMix;',
    'uniform mat3 uRot;',
    'uniform vec3 uRim;',
    'vec4 shadeBall(vec2 p, float aa){',
    '  float r = length(p);',
    '  float z = sqrt(max(0.0, 1.0 - r * r));',
    '  vec3 n = vec3(p, z);',
    '  vec3 o = uRot * n;',
    '  float lon = atan(o.x, o.z);',
    '  float lat = asin(clamp(o.y, -1.0, 1.0));',
    '  vec2 uv = vec2(fract((lon / 6.2831853 + 0.5) * 2.0), 0.5 - lat / 3.1415927);',
    '  vec3 col = mix(texture2D(uTexA, uv).rgb, texture2D(uTexB, uv).rgb, uMix);',
    '  float d1 = -2.0; float d2 = -2.0; float pent = 0.0;',
    '  for (int i = 0; i < 32; i++) {',
    '    float d = dot(o, uC[i]);',
    '    if (d > d1) { d2 = d1; d1 = d; pent = i < 12 ? 1.0 : 0.0; }',
    '    else if (d > d2) { d2 = d; }',
    '  }',
    '  float e = d1 - d2;',
    '  float seam = 1.0 - smoothstep(0.003, 0.012, e);',
    '  float pillow = smoothstep(0.0, 0.09, e);',
    '  col *= mix(0.74, 1.0, pillow);',
    '  col *= mix(1.0, 0.9, pent);',
    '  col = mix(col, vec3(0.05, 0.06, 0.07), seam * 0.9);',
    '  vec3 L = normalize(vec3(-0.5, 0.62, 0.62));',
    '  float dif = max(dot(n, L), 0.0);',
    '  vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));',
    '  float spec = pow(max(dot(n, Hh), 0.0), 48.0) * 0.5 * pillow;',
    '  float fres = pow(1.0 - z, 2.5);',
    '  vec3 lit = col * (0.2 + 0.95 * dif) + spec + uRim * fres * 0.55;',
    '  float a = 1.0 - smoothstep(1.0 - aa, 1.0, r);',
    '  return vec4(lit, a);',
    '}'
  ].join('\n');

  var ORB_FRAG = HEAD + '\nvarying vec2 vP;\nuniform float uAA;\n' + BALL + '\n' + [
    'void main(){',
    '  vec2 p = vP / 0.97;',
    '  if (length(p) > 1.0) discard;',
    '  vec4 c = shadeBall(p, uAA);',
    '  gl_FragColor = vec4(c.rgb * c.a, c.a);',
    '}'
  ].join('\n');

  function sceneFrag(deriv) {
    return (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n' : '') + HEAD + '\n' + [
      'varying vec2 vP;',
      'uniform vec2 uRes;',
      'uniform float uTime;',
      'uniform vec3 uBall;',
      'uniform float uHz;',
      'uniform vec3 uTint;',
      'uniform float uAA;',
      BALL,
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
      'float aaw(float v){',
      '#ifdef HAS_DERIV',
      '  return fwidth(v);',
      '#else',
      '  return 0.02;',
      '#endif',
      '}',
      'float lineM(float d, float w){ float f = aaw(d) * 1.5 + 1e-4; return 1.0 - smoothstep(w, w + f, abs(d)); }',
      'float gridM(float v, float w){ float f = aaw(v) * 1.5 + 1e-4; return 1.0 - smoothstep(w, w + f, abs(fract(v + 0.5) - 0.5)); }',
      'void main(){',
      '  vec2 fc = gl_FragCoord.xy;',
      '  float H = uRes.y;',
      '  vec2 uv = fc / uRes;',
      '  vec3 col = mix(vec3(0.014, 0.018, 0.026), vec3(0.004, 0.005, 0.008), uv.y);',
      /* floodlights: two pylons in the top corners, beams aimed at the ball */
      '  for (int k = 0; k < 2; k++) {',
      '    float side = k == 0 ? -1.0 : 1.0;',
      '    vec2 lp = vec2(uRes.x * 0.5 + side * max(uRes.x * 0.46, H * 0.5), H * 1.04);',
      '    vec2 d = (fc - lp) / H;',
      '    float dist = length(d);',
      '    col += vec3(0.85, 0.92, 1.0) * 0.22 * exp(-dist * 5.0);',
      '    vec2 tg = (vec2(uBall.x, uHz) - lp) / H;',
      '    float ang = acos(clamp(dot(normalize(d), normalize(tg)), -1.0, 1.0));',
      '    float beam = exp(-ang * ang * 70.0) * (1.0 - smoothstep(0.05, 1.6, dist));',
      '    col += mix(vec3(0.8, 0.9, 1.0), uTint, 0.35) * beam * 0.075;',
      '  }',
      '  float hd = (fc.y - uHz) / H;',
      /* stands: camera flashes twinkling above the horizon */
      '  if (hd > 0.0 && hd < 0.16) {',
      '    vec2 cell = floor(fc / (3.0 * uAA));',
      '    float h = hash(cell);',
      '    float tw = 0.5 + 0.5 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);',
      '    float band = (1.0 - smoothstep(0.02, 0.16, hd)) * smoothstep(0.0, 0.01, hd);',
      '    col += step(0.9965, h) * tw * band * 0.55;',
      '    col += vec3(0.02, 0.025, 0.035) * band;',
      '  }',
      '  col += uTint * 0.13 * exp(-abs(hd) * 13.0);',
      '  col += vec3(0.75, 0.85, 1.0) * 0.05 * exp(-abs(hd) * 45.0);',
      /* turf floor */
      '  if (hd < 0.0) {',
      '    float dy = -hd;',
      '    float z = 0.9 / dy;',
      '    float x = (fc.x - uBall.x) / H * z;',
      '    float s = step(0.5, fract(z / 3.0));',
      '    vec3 turf = mix(vec3(0.016, 0.046, 0.026), vec3(0.024, 0.064, 0.036), s);',
      '    float zc = 11.0;',
      '    float ln = lineM(z - zc, 0.07);',
      '    ln = max(ln, lineM(length(vec2(x, (z - zc))) - 5.0, 0.07));',
      '    ln = max(ln, lineM(abs(x) - 22.0, 0.07));',
      '    float gr = max(gridM(x / 2.0, 0.012), gridM(z / 2.0, 0.012));',
      '    float scan = exp(-pow(fract(z / 24.0 - uTime * 0.05) - 0.5, 2.0) * 900.0);',
      '    float fog = exp(-z * 0.03);',
      '    vec3 fl = turf + vec3(0.9) * ln * 0.22 + vec3(0.55, 1.0, 0.75) * gr * 0.05 + uTint * scan * 0.05;',
      '    fl += uTint * 0.06 * exp(-length(vec2(x, z - zc)) * 0.12);',
      '    col = mix(col, fl, fog);',
      '  }',
      /* the ball */
      '  vec2 bp = (fc - uBall.xy) / uBall.z;',
      '  float br = length(bp);',
      '  if (br > 1.0) {',
      '    col += uRim * 0.24 * exp(-(br - 1.0) * 7.0);',
      '    if (hd < 0.0) col *= 1.0 - 0.45 * exp(-(br - 1.0) * 5.0);',
      '  } else {',
      '    vec4 b = shadeBall(bp, uAA / uBall.z * 1.5);',
      '    col = mix(col, b.rgb, b.a);',
      '  }',
      '  float vg = length((uv - vec2(0.5, 0.45)) * vec2(uRes.x / H, 1.0));',
      '  col *= mix(1.0, 0.55, smoothstep(0.45, 1.25, vg));',
      '  col += (hash(fc + fract(uTime) * 91.0) - 0.5) / 255.0;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');
  }

  /* ---- tiny GL helpers ---- */
  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log);
    }
    return sh;
  }
  function program(gl, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, name);
    }
    gl.useProgram(p);
    gl.uniform3fv(u.uC, CENTRES);
    gl.uniform1i(u.uTexA, 0);
    gl.uniform1i(u.uTexB, 1);
    return { p: p, u: u };
  }
  function quad(gl) {
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  function textures(gl) {
    var map = {};
    return function (code) {
      if (map[code]) return map[code];
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, K.flagCanvas(code, 512, 512));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return (map[code] = t);
    };
  }
  function getGL(canvas, opts) {
    try {
      return canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    } catch (e) { return null; }
  }
  // o = Ry(spin) * Rx(tilt) * n, column-major for uniformMatrix3fv
  function rotation(spin, tilt) {
    var cy = Math.cos(spin), sy = Math.sin(spin), cx = Math.cos(tilt), sx = Math.sin(tilt);
    return new Float32Array([cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx]);
  }
  function hexRGB(h) {
    var n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* ---- 2D fallback when WebGL is unavailable ---- */
  function drawBall2D(ctx, code, cx, cy, r, spin) {
    var flag = K.flagCanvas(code, 512, 512);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    var w = r * 2, off = (((spin / Math.PI) % 1) + 1) % 1 * w;
    for (var i = -1; i <= 1; i++) ctx.drawImage(flag, cx - r - off + i * w, cy - r, w, w);
    var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.28)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, w, w);
    ctx.restore();
  }

  /* ---- shared frame ticker (pauses when the tab is hidden) ---- */
  var jobs = [], raf = 0, last = 0;
  function frame(t) {
    raf = 0;
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t;
    var busy = false;
    for (var i = 0; i < jobs.length; i++) if (jobs[i](dt, t / 1000)) busy = true;
    if (busy && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  K.tick = function () { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', K.tick);

  /* =====================================================================
     Scene
     ===================================================================== */
  function Scene(canvas, code) {
    this.canvas = canvas;
    this.code = code;
    this.from = code;
    this.mix = 1;
    this.tint = hexRGB(K.countries[code].tint);
    this.tintFrom = this.tint;
    this.tintT = 1;
    this.spin = 0.6;
    this.tilt = 0.28;
    this.vel = 0;
    this.time = 0;
    this.visible = true;
    this.dirty = true;
    this.layout = { cx: 0, cy: 0, r: 0, hz: 0 };

    var gl = getGL(canvas, { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (gl) {
      try {
        var deriv = !!gl.getExtension('OES_standard_derivatives');
        this.prog = program(gl, sceneFrag(deriv));
        quad(gl);
        this.tex = textures(gl);
        this.gl = gl;
      } catch (e) {
        if (window.console) console.warn('Kits4U: WebGL scene unavailable, using 2D fallback.', e);
        this.gl = null;
      }
    }
    if (!this.gl) this.ctx = canvas.getContext('2d');

    var self = this;
    this.resize();
    window.addEventListener('resize', function () { self.resize(); self.dirty = true; K.tick(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) K.tick(); }).observe(canvas);
    }
    this.bindDrag();
    jobs.push(function (dt, t) { return self.step(dt, t); });
    K.tick();
  }

  Scene.prototype.resize = function () {
    var c = this.canvas, w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w * h * dpr * dpr > 2600000) dpr = Math.sqrt(2600000 / (w * h));
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    this.dpr = dpr;
    // ball: a giant match ball rising over the stadium horizon
    var W = c.width, H = c.height, landscape = W > H;
    var r = landscape ? Math.min(H * 0.37, W * 0.3) : Math.min(W * 0.6, H * 0.3);
    this.layout = { cx: W / 2, cy: -r * 0.08, r: r, hz: -r * 0.08 + r * 0.78 };
  };

  Scene.prototype.set = function (code, instant) {
    if (!K.countries[code]) return;
    if (instant || code === this.code) {
      this.code = this.from = code;
      this.mix = 1;
      this.tint = this.tintFrom = hexRGB(K.countries[code].tint);
      this.tintT = 1;
    } else {
      this.from = this.mix < 0.5 ? this.from : this.code;
      this.code = code;
      this.mix = 0;
      this.tintFrom = this.currentTint();
      this.tint = hexRGB(K.countries[code].tint);
      this.tintT = 0;
    }
    this.dirty = true;
    K.tick();
  };
  Scene.prototype.currentTint = function () { return lerp3(this.tintFrom, this.tint, ease(this.tintT)); };

  Scene.prototype.bindDrag = function () {
    var self = this, c = this.canvas, down = null, lastX = 0, lastY = 0, lastT = 0;
    function onBall(e) {
      var rect = c.getBoundingClientRect(), L = self.layout, d = self.dpr;
      var x = (e.clientX - rect.left) * d, y = (rect.height - (e.clientY - rect.top)) * d;
      return Math.hypot(x - L.cx, y - L.cy) < L.r * 1.05;
    }
    c.addEventListener('pointerdown', function (e) {
      if (!onBall(e)) return;
      down = e.pointerId;
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      self.vel = 0;
      c.classList.add('is-dragging');
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
    });
    c.addEventListener('pointermove', function (e) {
      if (down === null) { c.classList.toggle('is-grab', onBall(e)); return; }
      var now = performance.now(), dx = e.clientX - lastX, dy = e.clientY - lastY;
      var k = 2.2 / Math.max(120, self.layout.r / self.dpr);
      self.spin -= dx * k;
      self.tilt = Math.max(-0.9, Math.min(0.9, self.tilt - dy * k));
      self.vel = (-dx * k) / Math.max(0.008, (now - lastT) / 1000);
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      self.dirty = true;
      K.tick();
    });
    function up() {
      if (down === null) return;
      down = null;
      c.classList.remove('is-dragging');
      self.vel = Math.max(-8, Math.min(8, self.vel));
      K.tick();
    }
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', function () { c.classList.remove('is-grab'); });
  };

  Scene.prototype.step = function (dt, t) {
    var moving = false;
    if (Math.abs(this.vel) > 0.01) {
      this.spin += this.vel * dt;
      this.vel *= Math.pow(0.04, dt);
      moving = true;
    }
    if (!reduce) { this.spin += dt * 0.22; this.time += dt; moving = true; }
    if (this.mix < 1) { this.mix = Math.min(1, this.mix + dt / 0.22); moving = true; }
    if (this.tintT < 1) { this.tintT = Math.min(1, this.tintT + dt / 0.6); moving = true; }
    if (!this.visible) return moving || this.mix < 1;
    if (moving || this.dirty) this.draw();
    this.dirty = false;
    return moving;
  };

  Scene.prototype.draw = function () {
    var L = this.layout, c = this.canvas;
    if (!this.gl) {
      var ctx = this.ctx;
      var g = ctx.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, '#020305'); g.addColorStop(0.7, '#08120c'); g.addColorStop(1, '#030604');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      drawBall2D(ctx, this.code, L.cx, c.height - L.cy, L.r, this.spin);
      return;
    }
    var gl = this.gl, u = this.prog.u, tint = this.currentTint();
    gl.viewport(0, 0, c.width, c.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex(this.from));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tex(this.code));
    gl.uniform1f(u.uMix, this.mix);
    gl.uniformMatrix3fv(u.uRot, false, rotation(this.spin, this.tilt));
    gl.uniform3fv(u.uRim, lerp3([0.8, 0.9, 1.0], tint, 0.55));
    gl.uniform3fv(u.uTint, tint);
    gl.uniform2f(u.uRes, c.width, c.height);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform3f(u.uBall, L.cx, L.cy, L.r);
    gl.uniform1f(u.uHz, L.hz);
    gl.uniform1f(u.uAA, this.dpr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (this.mix >= 1) this.from = this.code;
  };

  /* =====================================================================
     Orbs — shared offscreen renderer
     ===================================================================== */
  var shared;
  function renderer() {
    if (shared !== undefined) return shared;
    var c = document.createElement('canvas');
    c.width = c.height = 512;
    var gl = getGL(c, { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
    if (!gl) return (shared = null);
    try {
      var prog = program(gl, ORB_FRAG);
      quad(gl);
      shared = { canvas: c, gl: gl, prog: prog, tex: textures(gl) };
    } catch (e) {
      if (window.console) console.warn('Kits4U: WebGL orbs unavailable, using 2D fallback.', e);
      shared = null;
    }
    return shared;
  }

  var orbs = [];
  function Orb(canvas, code, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.code = this.from = code;
    this.mix = 1;
    this.speed = opts.speed == null ? 0.35 : opts.speed;
    this.spin = opts.spin == null ? Math.random() * 6.28 : opts.spin;
    this.tilt = opts.tilt == null ? 0.3 : opts.tilt;
    this.fade = opts.fade == null ? 0.25 : opts.fade;
    this.visible = true;
    this.boost = 0;
    var self = this;
    this.size();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; if (self.visible) { self.draw(); K.tick(); } }).observe(canvas);
    }
    orbs.push(this);
    this.draw();
    K.tick();
  }
  Orb.prototype.size = function () {
    var w = this.canvas.clientWidth || 120;
    var px = Math.max(32, Math.min(512, Math.round(w * Math.min(window.devicePixelRatio || 1, 2))));
    if (this.canvas.width !== px) { this.canvas.width = this.canvas.height = px; return true; }
    return false;
  };
  /* instant=true swaps texture with no crossfade and repaints synchronously */
  Orb.prototype.set = function (code, instant) {
    if (!K.countries[code]) return;
    if (instant || this.fade <= 0) { this.code = this.from = code; this.mix = 1; }
    else if (code !== this.code) { this.from = this.code; this.code = code; this.mix = 0; }
    this.draw();
    K.tick();
  };
  Orb.prototype.spinBy = function (v) { this.boost = v; K.tick(); };
  Orb.prototype.draw = function () {
    var w = this.canvas.width, ctx = this.ctx, R = renderer();
    ctx.clearRect(0, 0, w, w);
    if (!R) { drawBall2D(ctx, this.code, w / 2, w / 2, w * 0.485, this.spin); return; }
    var gl = R.gl, u = R.prog.u;
    gl.viewport(0, 0, w, w);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, R.tex(this.from));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, R.tex(this.code));
    gl.uniform1f(u.uMix, this.mix);
    gl.uniformMatrix3fv(u.uRot, false, rotation(this.spin, this.tilt));
    gl.uniform3fv(u.uRim, [0.85, 0.92, 1.0]);
    gl.uniform1f(u.uAA, 2.5 / w);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // blit the bottom-left w×w of the shared buffer (GL origin is bottom-left)
    ctx.drawImage(R.canvas, 0, 512 - w, w, w, 0, 0, w, w);
  };
  Orb.prototype.step = function (dt) {
    if (!this.canvas.isConnected) return false;
    var moving = false;
    if (!reduce && this.speed) { this.spin += dt * this.speed; moving = true; }
    if (Math.abs(this.boost) > 0.01) { this.spin += this.boost * dt; this.boost *= Math.pow(0.02, dt); moving = true; }
    if (this.mix < 1) { this.mix = Math.min(1, this.mix + dt / this.fade); moving = true; }
    if (this.visible && moving) this.draw();
    if (this.mix >= 1) this.from = this.code;
    return moving;
  };

  jobs.push(function (dt) {
    var any = false;
    for (var i = 0; i < orbs.length; i++) if (orbs[i].step(dt)) any = true;
    return any;
  });
  window.addEventListener('resize', function () {
    orbs.forEach(function (o) { if (o.size()) o.draw(); });
  });

  K.Scene = Scene;
  K.Orb = Orb;
})();
