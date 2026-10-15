// kits4u "Who's That Kit?" drop teaser. Every frame is a pure function of t.
const W = 1080, H = 1920;
export const DURATION = 30;

const KITS = [
  { key: 'portugal', name: 'PORTUGAL', ed: 'WAVE AWAY', hints: ['🟢🔴 red & green', '📍 Lisbon'], focus: [0.45, 0.62] },
  { key: 'germany', name: 'GERMANY', ed: 'RETRO BLACK', hints: ['⭐⭐⭐⭐ 4 stars', '🦅 eagle badge'], focus: [0.63, 0.37] },
  { key: 'italy', name: 'ITALY', ed: 'RENAISSANCE', hints: ['🏛️ old-school art', '🍕 pizza nation'], focus: [0.47, 0.32] },
  { key: 'england', name: 'ENGLAND', ed: 'LION EDITION', hints: ['🦁 big cat energy', "🏠 it's coming home"], focus: [0.45, 0.55] },
  { key: 'japan', name: 'JAPAN', ed: 'DRAGON EDITION', hints: ['🐉 mythical beast', '🌅 rising sun'], focus: [0.38, 0.3] },
  { key: 'brazil', name: 'BRAZIL', ed: 'CRISTO EDITION', hints: ['⭐⭐⭐⭐⭐ 5 stars', '🗿 famous statue'], focus: [0.45, 0.35] }
];
const HOOK_END = 2, SLOT = 4, REVEAL = 2.5, END_START = HOOK_END + KITS.length * SLOT; // 26

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOutExpo = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const eOutBack = (k, s = 2) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const eInCubic = k => k * k * k;
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const $ = id => document.getElementById(id);
const ctx = $('c').getContext('2d');

const R = rng(11);
const STARS = Array.from({ length: 700 }, () => ({ x: R() * W, y: R() * H, b: Math.pow(R(), 2.2), w: 1 + R() * 4, p: R() * 6.3, d: 0.2 + R() * 0.8 }));

/* ---------------- drawing helpers ---------------- */
function background(t) {
  ctx.fillStyle = '#03060A'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const blob = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(260 + 80 * Math.sin(t * 0.4), 420, 700, '110,60,255', 0.22);
  blob(860, 1100 + 90 * Math.cos(t * 0.3), 760, '46,107,255', 0.22);
  blob(400, 1700, 600, '76,155,255', 0.14);
  ctx.globalCompositeOperation = 'source-over';
  for (const s of STARS) {
    const y = (s.y + t * 40 * s.d) % H;
    const a = (0.25 + 0.75 * s.b) * (0.6 + 0.4 * Math.sin(t * s.w + s.p));
    ctx.fillStyle = `rgba(220,236,255,${a})`;
    ctx.beginPath(); ctx.arc(s.x, y, 0.6 + s.b * 1.8, 0, 6.283); ctx.fill();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const small = document.createElement('canvas');
const sctx = small.getContext('2d');
// draw a photo into a rect, zoomed on a focus point and pixelated by block size P
function photo(img, x, y, w, h, Z, focus, P) {
  const vs = img.width / Z;
  const sx = clamp(focus[0] * img.width - vs / 2, 0, img.width - vs);
  const sy = clamp(focus[1] * img.height - vs / 2, 0, img.height - vs);
  if (P <= 1.2) { ctx.drawImage(img, sx, sy, vs, vs, x, y, w, h); return; }
  const n = Math.max(2, Math.round(w / P));
  small.width = n; small.height = n;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(img, sx, sy, vs, vs, 0, 0, n, n);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, n, n, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}

function card(img, cx, cy, size, rot, Z, focus, P, dim = 0) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  // glow + chrome frame
  ctx.shadowColor = 'rgba(76,155,255,.75)'; ctx.shadowBlur = 60;
  const g = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  g.addColorStop(0, '#EAF8FF'); g.addColorStop(0.3, '#9ED8FF'); g.addColorStop(0.55, '#2E6BFF'); g.addColorStop(1, '#A8E0FF');
  ctx.fillStyle = g;
  roundRect(-size / 2 - 7, -size / 2 - 7, size + 14, size + 14, 52); ctx.fill();
  ctx.shadowBlur = 0;
  roundRect(-size / 2, -size / 2, size, size, 46); ctx.clip();
  photo(img, -size / 2, -size / 2, size, size, Z, focus, P);
  if (dim > 0) { ctx.fillStyle = `rgba(3,6,10,${dim})`; ctx.fillRect(-size / 2, -size / 2, size, size); }
  ctx.restore();
}

function timer(x, y, u) {
  const left = clamp(1 - u / REVEAL);
  const n = u < 1 ? 3 : u < 2 ? 2 : 1;                 // ticks land on beats: 0, 1.0, 2.0
  const pulse = 1 + 0.18 * Math.exp(-((u < 1 ? u : u < 2 ? u - 1 : u - 2) / 0.12));
  ctx.save();
  ctx.translate(x, y); ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(3,6,10,.85)';
  ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.283); ctx.fill();
  ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(158,216,255,.25)';
  ctx.beginPath(); ctx.arc(0, 0, 58, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = n === 1 ? '#ff5a6e' : '#9ED8FF';
  ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(0, 0, 58, -Math.PI / 2, -Math.PI / 2 + 6.283 * left); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = '800 72px Manrope'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 0, 4);
  ctx.restore();
}

function burst(x, y, t0, t, n, seed, spread) {
  const k = (t - t0) / 0.8;
  if (k < 0 || k > 1) return;
  const r = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, sp = spread * (0.4 + r() * 0.6), d = sp * eOutExpo(k), d0 = sp * eOutExpo(Math.max(0, k - 0.08));
    ctx.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${1 - k})` : `rgba(158,216,255,${1 - k})`;
    ctx.lineWidth = 2 + r() * 4;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.stroke();
  }
  ctx.restore();
}

/* ---------------- DOM text ---------------- */
function show(el, t, tin, tout, from = 1.6, dy = 0) {
  if (t < tin || t > tout) { el.style.display = 'none'; return 0; }
  el.style.display = '';
  const ki = eOutExpo(prog(t, tin, tin + 0.22)), ko = eInCubic(prog(t, tout - 0.15, tout));
  el.style.opacity = String(clamp(ki * 1.6) * (1 - ko));
  el.style.transform = `translateY(${(1 - ki) * dy}px) scale(${lerp(from, 1, ki) * (1 - 0.08 * ko)})`;
  el.style.filter = ki < 0.97 || ko > 0 ? `blur(${((1 - ki) * 14 + ko * 10).toFixed(1)}px)` : 'none';
  return ki;
}

/* ---------------- frame ---------------- */
const IMGS = {};
function render(t) {
  background(t);
  let shake = 0;

  // hook: kits flicker behind the title
  if (t < HOOK_END) {
    const i = Math.floor(t / 0.22) % KITS.length;
    const k = KITS[i];
    card(IMGS[k.key], 540, 1250, 500, Math.sin(t * 9) * 0.05, 2.2, k.focus, 36, 0.3);
  }
  show($('hook1'), t, 0.04, HOOK_END - 0.02, 2.2);
  show($('hook2'), t, 0.45, HOOK_END - 0.02, 1.4, 20);

  // the six guesses
  const slot = Math.floor((t - HOOK_END) / SLOT);
  const inKits = t >= HOOK_END && slot < KITS.length;
  show($('head'), t, HOOK_END + 0.02, END_START - 0.02, 1.3);
  KITS.forEach((k, i) => {
    const S = HOOK_END + i * SLOT;
    const u = t - S;
    if (u < 0 || u >= SLOT) return;
    $('headtxt').textContent = `DROP ${i + 1}/6`;
    [...$('dots').children].forEach((d, j) => d.classList.toggle('on', j < i || (j === i && u >= REVEAL)));
    const enter = eOutExpo(prog(u, 0, 0.32)), exit = eInCubic(prog(u, SLOT - 0.22, SLOT));
    const r = clamp((u - REVEAL) / 0.45);
    const Zpre = lerp(3.2, 2.5, clamp(u / REVEAL));
    const Z = u < REVEAL ? Zpre : lerp(2.5, 1, eOutExpo(r));
    const P = u < REVEAL ? lerp(56, 30, clamp(u / REVEAL)) : lerp(30, 1, clamp((u - REVEAL) / 0.16));
    if (u >= REVEAL) shake = 18 * Math.exp(-(u - REVEAL) / 0.1);
    const cx = 540 + (1 - enter) * 1100 - exit * 1100 + (Math.random() - 0.5) * 0;
    const sx = shake * Math.sin(t * 91), sy = shake * Math.cos(t * 77);
    const size = 860 * (u >= REVEAL ? 1 + 0.06 * Math.exp(-(u - REVEAL) / 0.18) : 1);
    card(IMGS[k.key], cx + sx, 740 + sy, size, (1 - enter) * 0.25 - exit * 0.2, Z, u < REVEAL ? k.focus : [lerp(k.focus[0], 0.5, eOutExpo(r)), lerp(k.focus[1], 0.5, eOutExpo(r))], P, u < REVEAL ? 0.1 : 0);
    if (u < REVEAL) timer(200 + (1 - enter) * 1100, 380, u);
    if (u >= REVEAL && u < REVEAL + 0.25) { ctx.fillStyle = `rgba(235,248,255,${0.85 * (1 - (u - REVEAL) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
    burst(540, 740, S + REVEAL, t, 90, 100 + i, 700);
    $('hint1t').textContent = k.hints[0];
    $('hint2t').textContent = k.hints[1];
    $('namet').textContent = k.name;
    $('edt').textContent = k.ed;
  });
  const u = t - HOOK_END - slot * SLOT;
  const live = inKits ? u : -1;
  show($('q'), live, 0.2, REVEAL, 0.3);
  if (inKits && live >= 0.2 && live < REVEAL) $('q').style.transform += ` rotate(${Math.sin(t * 6) * 6}deg)`;
  show($('hint1'), live, 0.55, REVEAL, 1.6, 30);
  show($('hint2'), live, 1.35, REVEAL, 1.6, 30);
  show($('name'), live, REVEAL + 0.08, SLOT - 0.05, 1.9);

  // end: the line-up
  if (t >= END_START) {
    const e = t - END_START;
    KITS.forEach((k, i) => {
      const a = eOutBack(prog(e, i * 0.07, i * 0.07 + 0.35), 2.4);
      if (a <= 0) return;
      const col = i % 3, row = Math.floor(i / 3);
      const x = 230 + col * 310, y = 730 + row * 320;
      const bob = Math.sin(t * 3 + i) * 6;
      card(IMGS[k.key], x, y + bob, 280 * a, Math.sin(t * 2 + i) * 0.03, 1, [0.5, 0.5], 1);
    });
    burst(540, 880, END_START, t, 120, 7, 900);
  }
  show($('end1'), t, END_START + 0.05, END_START + 2.0, 1.8);
  show($('end2'), t, END_START + 2.0, DURATION + 1, 1.8);
  show($('end3'), t, END_START + 2.1, DURATION + 1, 1.5, 20);
  show($('end4'), t, END_START + 2.3, DURATION + 1, 1.3, 20);

  $('stage').style.transform = shake > 0.5 ? `translate(${shake * Math.sin(t * 83) * 0.5}px, ${shake * Math.cos(t * 71) * 0.5}px)` : 'none';
}

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
window.ready = (async () => {
  await Promise.all(KITS.map(k => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { IMGS[k.key] = im; res(); };
    im.onerror = rej;
    im.src = `photos/${k.key}.jpg`;
  })));
  await Promise.all(['800 100px Manrope', '700 100px Manrope', 'italic 400 100px "Instrument Serif"'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  return true;
})();
window.setUrl = u => ($('url').textContent = u);
window.renderFrame = async t => { render(t); await nextFrame(); };
window.renderCover = async () => {
  // cover: title over the dragon kit, half pixelated
  render(0.3);
  background(0.3);
  card(IMGS.japan, 540, 1250, 520, -0.04, 1.6, [0.4, 0.38], 14, 0.15);
  $('hook2').querySelector('.pill').textContent = '6 drops · 27 OCT 🔥';
  Object.assign($('hook2').style, { display: '', opacity: '1', transform: 'none', filter: 'none' });
  Object.assign($('hook1').style, { display: '', opacity: '1', transform: 'none', filter: 'none' });
  await nextFrame();
};
window.DURATION = DURATION;
