// Retro arcade football short: a pixel player beats three defenders and scores
// a bicycle kick on a synthwave neon pitch, then "DROPPING 27 OCT".
// Low-res pixel scene (270×480) upscaled ×4, with full-res text, CRT scanlines
// and glow on top. Every frame is a pure function of t.
const W = 1080, H = 1920, LW = 270, LH = 480, S = 4;
export const DURATION = 24;
const GY = 350;                     // feet line in low-res pixels

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = k => 1 - Math.pow(1 - k, 3);
const eInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eOutBack = (k, s = 2.4) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const main = document.getElementById('c').getContext('2d');
const low = document.createElement('canvas'); low.width = LW; low.height = LH;
const g = low.getContext('2d');

/* ---------------- palette & kits ---------------- */
const SKIN = '#e9b98a', HAIR = '#2b1708';
const HOME = { shirt: '#22e1ff', stripe: null, shorts: '#ffffff', socks: '#22e1ff' };
const DEF = { shirt: '#ff3b5c', stripe: null, shorts: '#1b1b2e', socks: '#ff3b5c' };
const KEEPER = { shirt: '#b6ff3b', stripe: null, shorts: '#1b1b2e', socks: '#b6ff3b' };
const KITS = [
  { name: 'BRAZIL', shirt: '#ffd400', stripe: null, shorts: '#1f4fd1', socks: '#ffffff', trim: '#0aa04a' },
  { name: 'ARGENTINA', shirt: '#ffffff', stripe: '#6cb6ff', shorts: '#14204a', socks: '#ffffff' },
  { name: 'JAPAN', shirt: '#14204a', stripe: null, shorts: '#14204a', socks: '#14204a', trim: '#e8b04a' },
  { name: 'ENGLAND', shirt: '#ffffff', stripe: null, shorts: '#14204a', socks: '#ffffff', trim: '#d4213d' },
  { name: 'GERMANY', shirt: '#111111', stripe: null, shorts: '#111111', socks: '#111111', trim: '#e8b04a' },
  { name: 'PORTUGAL', shirt: '#c8102e', stripe: null, shorts: '#0a6b3a', socks: '#c8102e', trim: '#0a6b3a' },
  { name: 'ITALY', shirt: '#1f5fd1', stripe: null, shorts: '#ffffff', socks: '#1f5fd1', trim: '#ffffff' }
];

/* ---------------- timeline ---------------- */
const RUN0 = 2, KICK = 13.5, GOAL = 14.5, CELEB = 17, END = 20;
const SPEED = 70;
const playerX = t => (t < RUN0 ? 0 : t < KICK ? SPEED * (t - RUN0) : SPEED * (KICK - RUN0) + (t < CELEB ? 0 : Math.min(50, 60 * (t - CELEB))));
const D1 = 240, D2 = 450, D3 = 650, GOALX = 890, KEEPX = 918, GH = 78, GW = 66;
const EVENTS = [
  { t: 5.2, text: 'NUTMEG!', pts: 1000, col: '#22e1ff' },
  { t: 8.3, text: 'RAINBOW\nFLICK!', pts: 1500, col: '#ff3bd4' },
  { t: 11.3, text: 'ELASTICO!', pts: 2000, col: '#ffd400' },
  { t: 11.75, text: 'ANKLES\nGONE', pts: 0, col: '#ff3b5c' },
  { t: 13.45, text: 'BICYCLE\nKICK!!', pts: 0, col: '#b6ff3b' }
];

/* ---------------- low-res drawing ---------------- */
const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function sky(t, camX) {
  const grd = g.createLinearGradient(0, 0, 0, 250);
  grd.addColorStop(0, '#0b0020'); grd.addColorStop(0.55, '#3a0b63'); grd.addColorStop(1, '#ff2e88');
  g.fillStyle = grd; g.fillRect(0, 0, LW, 260);
  const r = rng(3);
  for (let i = 0; i < 90; i++) {
    const x = r() * LW, y = r() * 170, tw = Math.sin(t * (2 + r() * 4) + r() * 6) > 0.2;
    if (tw) px(x, y, 1, 1, r() < 0.3 ? '#9ff' : '#fff');
  }
  // striped synthwave sun
  const cx = 135, cy = 205, R = 52;
  const sg = g.createLinearGradient(0, cy - R, 0, cy + R);
  sg.addColorStop(0, '#fff36b'); sg.addColorStop(0.5, '#ff8a3d'); sg.addColorStop(1, '#ff2e88');
  g.fillStyle = sg;
  for (let y = -R; y <= 0; y++) {
    const yy = cy + y;
    const band = y > -R * 0.55 && ((y + Math.floor(t * 12)) % 8 + 8) % 8 < 2 + Math.floor((y + R) / 14);
    if (band) continue;
    const w = Math.sqrt(R * R - y * y);
    g.fillRect(Math.round(cx - w), yy, Math.round(w * 2), 1);
  }
  // mountains with neon ridge
  const off = -(camX * 0.15) % 120;
  for (let k = -1; k < 4; k++) {
    const bx = off + k * 120;
    g.fillStyle = '#1a0636';
    g.beginPath(); g.moveTo(bx, 250); g.lineTo(bx + 40, 196); g.lineTo(bx + 70, 222); g.lineTo(bx + 95, 188); g.lineTo(bx + 120, 250); g.fill();
    g.strokeStyle = '#ff3bd4'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(bx, 250); g.lineTo(bx + 40, 196); g.lineTo(bx + 70, 222); g.lineTo(bx + 95, 188); g.lineTo(bx + 120, 250); g.stroke();
  }
}

function stands(t, camX, hype) {
  px(0, 250, LW, 72, '#120626');
  px(0, 250, LW, 2, '#22e1ff');
  const off = -(camX * 0.5);
  const cols = ['#ff3b5c', '#22e1ff', '#ffd400', '#ffffff', '#ff3bd4', '#b6ff3b'];
  for (let row = 0; row < 6; row++) {
    for (let i = -2; i < 70; i++) {
      const wx = i * 4 + ((off % 4) + 4) % 4 + (row % 2) * 2;
      const seed = (Math.floor((i * 4 - off) / 4) * 31 + row * 7) & 1023;
      const jump = hype * Math.max(0, Math.sin(t * 14 + seed)) * 3;
      px(wx, 258 + row * 10 - jump, 2, 2, cols[seed % cols.length]);
      px(wx, 260 + row * 10 - jump, 2, 3, '#2a1446');
    }
  }
  // floodlights
  for (const fx of [30, 240]) {
    px(fx, 206, 2, 50, '#3a2a5a'); px(fx - 6, 202, 14, 5, '#fff');
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(fx - 6, 207); g.lineTo(fx - 50, 330); g.lineTo(fx + 50, 330); g.lineTo(fx + 8, 207); g.fill();
  }
  px(0, 318, LW, 4, '#0a0418');
}

function pitch(camX) {
  for (let x = -((camX % 40) + 40) % 40 - 40; x < LW + 40; x += 40) {
    px(x, 322, 20, LH - 322, '#0d6b3a');
    px(x + 20, 322, 20, LH - 322, '#0b5c32');
  }
  px(0, 322, LW, 1, '#e8fff0');
  // neon perspective lines near the bottom
  g.strokeStyle = 'rgba(34,225,255,.35)'; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) { const y = 400 + k * k * 9; g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); }
}

function goalFrame(camX, bulge) {
  const x = GOALX - camX;
  if (x > LW + 10 || x < -60) return;
  // net
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let yy = GY - GH + 2; yy < GY; yy += 4) for (let xx = 0; xx < GW - 6 + bulge * (1 - Math.abs((yy - (GY - GH + 12)) / GH)) * 10; xx += 4) px(x + 4 + xx, yy, 1, 1, 'rgba(255,255,255,.55)');
  px(x, GY - GH, 4, GH, '#fff');           // post
  px(x, GY - GH, GW, 4, '#fff');           // crossbar
  px(x + GW - 3, GY - GH, 3, GH, '#bbb');
}

function sprite(x, y, kit, pose, frame, flip = 1, rot = 0, pivotMid = false) {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (rot) { if (pivotMid) g.translate(0, -22); g.rotate(rot); if (pivotMid) g.translate(0, 22); }
  g.scale(2 * flip, 2);                       // sprites are drawn at double size
  const leg = pose === 'run' ? [[-2, 0], [2, 0], [0, -1], [-1, 1]][frame % 4] : [0, 0];
  const sh = kit.shirt;
  // legs + socks + boots
  if (pose === 'slide') {
    px(-6, -6, 10, 3, kit.socks); px(-8, -6, 2, 3, '#111');
  } else {
    px(-3 + leg[0], -8, 2, 8, SKIN); px(1 + leg[1], -8, 2, 8, SKIN);
    px(-3 + leg[0], -5, 2, 4, kit.socks); px(1 + leg[1], -5, 2, 4, kit.socks);
    px(-4 + leg[0], -1, 3, 1, '#111'); px(1 + leg[1], -1, 3, 1, '#111');
  }
  const by = pose === 'slide' ? 4 : 0;
  px(-4, -11 + by, 8, 3, kit.shorts);
  // shirt
  px(-4, -19 + by, 8, 8, sh);
  if (kit.stripe) { px(-2, -19 + by, 2, 8, kit.stripe); px(2, -19 + by, 1, 8, kit.stripe); }
  if (kit.trim) px(-4, -19 + by, 8, 1, kit.trim);
  // arms
  if (pose === 'celebrate' || pose === 'slide') {
    px(-6, -26 + by, 2, 8, sh); px(4, -26 + by, 2, 8, sh); px(-6, -28 + by, 2, 2, SKIN); px(4, -28 + by, 2, 2, SKIN);
  } else {
    const sw = pose === 'run' ? (frame % 2 ? 1 : -1) : 0;
    px(-6, -18 + by + sw, 2, 5, sh); px(4, -18 + by - sw, 2, 5, sh); px(-6, -13 + by + sw, 2, 2, SKIN); px(4, -13 + by - sw, 2, 2, SKIN);
  }
  // head
  px(-3, -25 + by, 6, 6, SKIN); px(-3, -26 + by, 6, 2, HAIR); px(1, -23 + by, 1, 1, '#111');
  g.restore();
}

function ball(x, y, t, trail = 0, prevs = []) {
  for (let i = 0; i < prevs.length; i++) {
    g.globalAlpha = 0.15 + 0.5 * (i / prevs.length);
    px(prevs[i][0] - 3, prevs[i][1] - 3, 6, 6, '#22e1ff');
  }
  g.globalAlpha = 1;
  px(x - 3, y - 3, 7, 7, '#fff');
  const f = Math.floor(t * 12) % 2;
  px(x - 3 + f * 3, y - 3 + f, 3, 2, '#111'); px(x - f, y + 1 + f, 2, 2, '#111');
}

/* ---------------- full-res text ---------------- */
function text(str, x, y, size, col, opts = {}) {
  main.save();
  main.font = `${size}px "Press Start 2P"`;
  main.textAlign = opts.align || 'center'; main.textBaseline = 'middle';
  const lines = String(str).split('\n');
  lines.forEach((ln, i) => {
    const yy = y + (i - (lines.length - 1) / 2) * size * 1.35;
    main.lineJoin = 'round';
    main.lineWidth = size * 0.35; main.strokeStyle = '#000'; main.strokeText(ln, x, yy + size * 0.12);
    main.shadowColor = col; main.shadowBlur = opts.glow ?? 30;
    main.fillStyle = col; main.fillText(ln, x, yy);
    main.shadowBlur = 0;
    if (opts.shine) { main.fillStyle = 'rgba(255,255,255,.35)'; main.fillText(ln, x, yy - size * 0.08); }
  });
  main.restore();
}

/* ---------------- frame ---------------- */
function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  let shake = 0;

  if (t < END) {
    const P = playerX(t);
    const camX = Math.max(0, Math.min(P, 805) - 90);
    // celebration zoom on the player
    const zk = eInOut(prog(t, CELEB - 0.2, CELEB + 0.6));
    const zoom = 1 + 0.9 * zk;
    const hype = t >= GOAL ? 1 : 0.3;
    if (zoom > 1) {
      const fx = P + 10 - camX, fy = GY - 30;
      g.translate(fx, fy); g.scale(zoom, zoom); g.translate(-fx, -fy + 40 * zk / zoom);
    }
    sky(t, camX); stands(t, camX, hype); pitch(camX);

    const frame = Math.floor(t * 10);
    // defenders
    const d1 = D1 - camX, d2 = D2 - camX, d3 = D3 - camX;
    sprite(d1, GY, DEF, 'stand', 0, -1);
    sprite(d2, GY, DEF, 'stand', 0, t > 8.4 ? 1 : -1);
    const fall = eOut(prog(t, 11.35, 11.7));
    sprite(d3 - fall * 10, GY - fall * 6, DEF, 'stand', 0, -1, -fall * Math.PI / 2);
    if (fall >= 1) {                                        // little dizzy stars
      for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(d3 - 34 + Math.cos(a) * 10, GY - 22 + Math.sin(a) * 3, 3, 3, '#ffd400'); }
    }
    // keeper
    const dive = eOut(prog(t, 13.85, 14.35));
    sprite(KEEPX - camX + dive * 26, GY - Math.sin(dive * Math.PI) * 40, KEEPER, dive > 0 ? 'celebrate' : 'stand', 0, -1, dive * 1.3, true);
    goalFrame(camX, t >= GOAL ? Math.exp(-(t - GOAL) / 0.4) * Math.abs(Math.sin((t - GOAL) * 18)) * 2 + 1 : 0);

    // player
    let py = GY, pose = 'run', prot = 0;
    if (t < RUN0) pose = 'stand';
    const hop = (a, b, h) => (t > a && t < b ? Math.sin(Math.PI * prog(t, a, b)) * h : 0);
    py -= hop(5.1, 5.5, 34);
    if (t >= 12.9 && t < KICK + 0.9) {                      // bicycle kick: jump + flip
      const k = prog(t, 13.2, 14.1);
      py -= Math.sin(Math.PI * k) * 36;
      prot = -eInOut(k) * Math.PI * 1.15;
      pose = 'stand';
    }
    if (t >= KICK + 0.9 && t < CELEB) pose = 'celebrate';
    if (t >= CELEB) pose = t < CELEB + 0.8 ? 'slide' : 'celebrate';
    let kit = HOME;
    if (t >= CELEB) kit = KITS[Math.floor((t - CELEB) / 0.42) % KITS.length];
    sprite(P - camX, py, kit, pose, frame, 1, prot, true);

    // ball
    let bx = P + 16, by = GY - 4 - Math.abs(Math.sin(t * 9)) * 6;
    const trail = [];
    if (t >= 5.0 && t < 5.5) { bx = lerp(P + 16, D1 + 30, prog(t, 5.0, 5.4)); by = GY - 4; }
    if (t >= 8.05 && t < 8.75) { const k = prog(t, 8.05, 8.7); bx = lerp(430, 496, k); by = GY - 4 - Math.sin(Math.PI * k) * 80; }
    if (t >= 11.0 && t < 11.6) { bx = P + 16 + Math.sin(prog(t, 11, 11.6) * Math.PI * 4) * 10; }
    if (t >= 12.6 && t < 13.6) { const k = prog(t, 12.6, 13.5); bx = P + 16 - k * 10; by = GY - 4 - eOut(k) * 70; }
    if (t >= 13.6) {
      const k = eInOut(prog(t, 13.6, GOAL));
      bx = lerp(P + 6, GOALX + 12, k); by = lerp(GY - 74, GY - GH + 10, k) - Math.sin(Math.PI * k) * 14;
      for (let j = 1; j <= 8; j++) {
        const kk = eInOut(prog(t - j * 0.035, 13.6, GOAL));
        trail.unshift([lerp(P + 6, GOALX + 12, kk), lerp(GY - 74, GY - GH + 10, kk) - Math.sin(Math.PI * kk) * 14]);
      }
      if (t >= GOAL) { bx = GOALX + 40; by = GY - 40; }
    }
    if (t < CELEB) ball(bx - camX, by, t, 0, t >= 13.6 && t < GOAL ? trail.map(p => [p[0] - camX, p[1]]) : []);

    // celebrations: confetti + pixel fireworks
    if (t >= GOAL) {
      const r = rng(9);
      for (let i = 0; i < 140; i++) {
        const x0 = r() * LW, sp = 40 + r() * 70, ph = r() * 6, c = ['#ff3b5c', '#22e1ff', '#ffd400', '#ff3bd4', '#b6ff3b', '#fff'][i % 6];
        const y = -20 + (t - GOAL) * sp + r() * 60 - 60;
        if (y > -5 && y < LH) px(x0 + Math.sin((t - GOAL) * 3 + ph) * 8, y, 2, 2, c);
      }
      for (const [ft, fx, fy, c] of [[GOAL + 0.2, 70, 90, '#ffd400'], [GOAL + 0.7, 200, 70, '#22e1ff'], [GOAL + 1.2, 130, 120, '#ff3bd4'], [GOAL + 1.8, 60, 60, '#b6ff3b'], [GOAL + 2.3, 210, 110, '#ff3b5c'], [CELEB + 0.5, 120, 80, '#ffd400'], [CELEB + 1.4, 190, 60, '#22e1ff']]) {
        const k = (t - ft) / 1.1;
        if (k < 0 || k > 1) continue;
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * 6.283, d = 34 * eOut(k);
          px(fx + Math.cos(a) * d, fy + Math.sin(a) * d + k * k * 18, 2, 2, k > 0.7 && i % 2 ? '#fff' : c);
        }
      }
      if (t < GOAL + 0.6) shake = 6 * (1 - (t - GOAL) / 0.6);
    }
    // slow-mo look for the bicycle kick
    if (t >= 13.3 && t < GOAL) {
      const a = Math.sin(Math.PI * prog(t, 13.3, GOAL));
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = `rgba(40,0,80,${0.35 * a})`; g.fillRect(0, 0, LW, LH);
      px(0, 0, LW, 40 * a, '#000'); px(0, LH - 40 * a, LW, 40 * a, '#000');
    }
    if (t < 13 && t >= RUN0 && EVENTS.some(e => t >= e.t && t < e.t + 0.12)) shake = 4;
  } else {
    // end screen: synthwave grid
    sky(t, (t - END) * 60);
    px(0, 250, LW, LH - 250, '#0b0020');
    g.strokeStyle = '#ff3bd4'; g.lineWidth = 1;
    for (let k = 0; k < 14; k++) {
      const z = ((k + ((t - END) * 2.5) % 1) / 14);
      const y = 250 + Math.pow(z, 2.2) * 230;
      g.globalAlpha = 0.25 + 0.75 * z; g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke();
    }
    for (let k = -10; k <= 10; k++) { g.globalAlpha = 0.6; g.beginPath(); g.moveTo(135 + k * 8, 250); g.lineTo(135 + k * 60, LH); g.stroke(); }
    g.globalAlpha = 1;
    px(0, 250, LW, 2, '#22e1ff');
  }

  // upscale with a little CRT
  main.setTransform(1, 0, 0, 1, 0, 0);
  main.imageSmoothingEnabled = false;
  main.fillStyle = '#000'; main.fillRect(0, 0, W, H);
  const sx = Math.round((Math.random() * 0 + Math.sin(t * 91)) * shake * S), sy = Math.round(Math.cos(t * 77) * shake * S);
  main.drawImage(low, sx, sy, W, H);

  // HUD
  if (t >= RUN0 && t < END) {
    const got = EVENTS.filter(e => t >= e.t).reduce((s, e) => s + e.pts, 0) + (t >= GOAL ? 5000 : 0);
    const shown = Math.round(got);
    text(`SCORE ${String(shown).padStart(6, '0')}`, 80, 200, 34, '#ffffff', { align: 'left', glow: 14 });
    const combo = EVENTS.filter(e => t >= e.t && e.pts > 0).length + (t >= GOAL ? 1 : 0);
    if (combo > 0) text(`x${combo} COMBO`, 930, 200, 34, ['#22e1ff', '#ff3bd4', '#ffd400', '#b6ff3b'][(combo - 1) % 4], { align: 'right', glow: 20 });
  }

  // hook
  if (t < 0.5) {                                             // CRT power on
    main.fillStyle = '#000'; main.fillRect(0, 0, W, H);
    const k = eOut(prog(t, 0.05, 0.4));
    main.fillStyle = '#fff'; main.fillRect(0, H / 2 - Math.max(2, k * H / 2), W, Math.max(4, k * H));
    main.fillStyle = `rgba(0,0,0,${k})`; main.fillRect(0, 0, W, H);
  }
  if (t >= 0.35 && t < RUN0) {
    const k = eOutBack(prog(t, 0.35, 0.6));
    main.save(); main.translate(540, 720); main.scale(k, k);
    text('WAIT\nFOR IT...', 0, 0, 96, '#ffd400', { glow: 40, shine: true });
    main.restore();
    if (Math.floor(t * 4) % 2 === 0) text('PLAYER 1  READY', 540, 1000, 40, '#22e1ff');
  }
  // move pop-ups
  for (const [i, e] of EVENTS.entries()) {
    const dur = Math.min(1.0, (EVENTS[i + 1]?.t ?? 99) - e.t - 0.02);
    const k = (t - e.t) / dur;
    if (k < 0 || k > 1) continue;
    const s = eOutBack(clamp(k * 5), 3) * (1 - 0.1 * k);
    main.save(); main.translate(540, 640 - k * 60); main.rotate(-0.06); main.scale(s, s);
    main.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    text(e.text, 0, 0, 84, e.col, { glow: 40, shine: true });
    if (e.pts) text(`+${e.pts}`, 0, 150, 48, '#ffffff');
    main.restore();
  }
  // GOAL
  if (t >= GOAL && t < CELEB) {
    const k = t - GOAL;
    const s = eOutBack(clamp(k * 3), 3) * (1 + 0.05 * Math.sin(k * 12));
    const cols = ['#ffd400', '#ff3bd4', '#22e1ff', '#b6ff3b'];
    main.save(); main.translate(540, 700); main.rotate(Math.sin(k * 6) * 0.04); main.scale(s, s);
    text('GOOOAL!', 0, 0, 150, cols[Math.floor(k * 8) % 4], { glow: 60, shine: true });
    main.restore();
    if (k > 0.5) text('+5000', 540, 900, 60, '#fff');
  }
  if (t >= CELEB && t < END) {
    const kit = KITS[Math.floor((t - CELEB) / 0.42) % KITS.length];
    const k = eOutBack(clamp((t - CELEB) * 3), 2.5);
    main.save(); main.translate(540, 560); main.scale(k, k);
    text('NEW KITS\nUNLOCKED', 0, 0, 84, '#ffd400', { glow: 40, shine: true });
    main.restore();
    text(kit.name, 540, 820, 64, kit.name === 'GERMANY' || kit.name === 'JAPAN' ? '#e8b04a' : kit.shirt === '#ffffff' ? '#ffffff' : kit.shirt, { glow: 30 });
  }
  // end card
  if (t >= END) {
    const e = t - END;
    const k1 = eOutBack(clamp(e * 3), 2.6);
    main.save(); main.translate(540, 520); main.scale(k1, k1);
    text('NEW KITS', 0, 0, 96, '#22e1ff', { glow: 40, shine: true });
    main.restore();
    const k2 = eOutBack(clamp((e - 0.35) * 3), 2.6);
    main.save(); main.translate(540, 700); main.scale(k2, k2);
    text('DROPPING', 0, 0, 72, '#ffffff', { glow: 24 });
    main.restore();
    const k3 = eOutBack(clamp((e - 0.7) * 3), 3);
    const pulse = 1 + 0.06 * Math.max(0, Math.sin(e * 7));
    main.save(); main.translate(540, 900); main.scale(k3 * pulse, k3 * pulse);
    text('27 OCT', 0, 0, 150, ['#ffd400', '#ff3bd4'][Math.floor(e * 4) % 2], { glow: 60, shine: true });
    main.restore();
    if (e > 1.3) text('kits4u.store', 540, 1130, 44, '#b6ff3b', { glow: 20 });
    if (e > 1.6 && Math.floor(e * 3) % 2 === 0) text('PRESS FOLLOW >', 540, 1260, 40, '#ffffff', { glow: 16 });
    if (e < 0.25) { main.fillStyle = `rgba(255,255,255,${1 - e / 0.25})`; main.fillRect(0, 0, W, H); }
  }

  // CRT scanlines + vignette
  main.fillStyle = 'rgba(0,0,0,.22)';
  for (let y = 0; y < H; y += 4) main.fillRect(0, y, W, 1);
  const v = main.createRadialGradient(540, 960, 600, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
  main.fillStyle = v; main.fillRect(0, 0, W, H);
}

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
window.ready = (async () => {
  await document.fonts.load('40px "Press Start 2P"');
  await document.fonts.ready;
  return true;
})();
window.setUrl = () => {};
window.renderFrame = async t => { render(t); await nextFrame(); };
window.renderCover = async () => {
  render(15.2);
  text('WAIT FOR IT...', 540, 1060, 56, '#22e1ff', { glow: 30 });
  await nextFrame();
};
