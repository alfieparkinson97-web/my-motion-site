// kits4u "I ranked the 6 craziest kits" tier-list TikTok. Every frame is a pure function of t.
const W = 1080, H = 1920;
export const DURATION = 26;

// order = reveal order; the joke is that every single one ends up in S tier
const KITS = [
  { key: 'germany', tier: 'S', score: '9.2', take: 'Clean. Simple. <span class="yel">Dangerous.</span> 🖤' },
  { key: 'portugal', tier: 'S', score: '9.0', take: 'Waves so clean it\'s <span class="yel">illegal</span> 🌊' },
  { key: 'italy', tier: 'S', score: '9.3', take: 'Michelangelo <span class="yel">designed this</span> 🎨' },
  { key: 'england', tier: 'S', score: '9.5', take: 'The lion is <span class="yel">actually roaring</span> 🦁' },
  { key: 'brazil', tier: 'S', score: '9.7', take: 'Wearing this = <span class="yel">instant blessing</span> 🙏' },
  { key: 'japan', tier: 'S', score: '9.9', take: '<span class="yel">Final boss</span> kit. No debate 🐉' }
];
const TIERS = ['S', 'A', 'B', 'C'];
const TIER_COL = { S: '#ff6b6b', A: '#ffb36b', B: '#ffe14d', C: '#9be86b' };
const HOOK_END = 2, SLOT = 3, END_START = HOOK_END + KITS.length * SLOT; // 20

// board geometry
const ROW_Y = [170, 316, 462, 608], ROW_H = 136, LABEL_X = 60, LABEL_W = 136, ROW_X = 206, ROW_R = 950, THUMB = 108;
// showcase card
const CX = 540, CY = 1205, CS = 500;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOutExpo = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const eInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eOutBack = (k, s = 2.2) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const eInCubic = k => k * k * k;
const $ = id => document.getElementById(id);
const ctx = $('c').getContext('2d');
const IMGS = {}, BLUR = {};

// where each kit lands on the board
const SLOTPOS = (() => {
  const count = {}, out = [];
  KITS.forEach(k => {
    const r = TIERS.indexOf(k.tier), j = (count[k.tier] = (count[k.tier] || 0) + 1) - 1;
    out.push({ x: ROW_X + 14 + j * (THUMB + 12) + THUMB / 2, y: ROW_Y[r] + ROW_H / 2 });
  });
  return out;
})();

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function photo(key, cx, cy, s, rot = 0, border = 8) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = '#000';
  rr(-s / 2 - border, -s / 2 - border + 10, s + border * 2, s + border * 2, 26 * s / 560 + 8); ctx.fill();   // hard drop shadow
  ctx.fillStyle = '#fff';
  rr(-s / 2 - border, -s / 2 - border, s + border * 2, s + border * 2, 26 * s / 560 + 8); ctx.fill();
  rr(-s / 2, -s / 2, s, s, 22 * s / 560 + 4); ctx.clip();
  ctx.drawImage(IMGS[key], -s / 2, -s / 2, s, s);
  ctx.restore();
}
function outlined(text, x, y, size, fill = '#fff', stroke = 16) {
  ctx.font = `800 ${size}px Manrope, "Noto Color Emoji"`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = '#000';
  ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function background(key, t) {
  ctx.drawImage(BLUR[key], 0, 0);
  ctx.fillStyle = 'rgba(8,8,12,.55)'; ctx.fillRect(0, 0, W, H);
  // moving diagonal stripes for energy
  ctx.save();
  ctx.globalAlpha = 0.06; ctx.fillStyle = '#fff';
  const off = (t * 120) % 160;
  for (let x = -H; x < W + H; x += 160) { ctx.beginPath(); ctx.moveTo(x + off, 0); ctx.lineTo(x + off + 60, 0); ctx.lineTo(x + off + 60 - H, H); ctx.lineTo(x + off - H, H); ctx.fill(); }
  ctx.restore();
}

function board(t, bounce) {
  TIERS.forEach((tier, r) => {
    const y = ROW_Y[r];
    ctx.fillStyle = 'rgba(14,14,18,.88)';
    rr(LABEL_X, y, ROW_R - LABEL_X, ROW_H, 18); ctx.fill();
    const b = bounce[tier] || 0;
    ctx.save();
    ctx.translate(LABEL_X + LABEL_W / 2, y + ROW_H / 2); ctx.scale(1 + 0.25 * b, 1 + 0.25 * b);
    ctx.fillStyle = TIER_COL[tier];
    rr(-LABEL_W / 2, -ROW_H / 2, LABEL_W, ROW_H, 18); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = '800 84px Manrope'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tier, 0, 6);
    ctx.restore();
  });
}

function burst(x, y, t0, t, n, seed, spread, col) {
  const k = (t - t0) / 0.7;
  if (k < 0 || k > 1) return;
  const r = rng(seed);
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, sp = spread * (0.4 + r() * 0.6), d = sp * eOutExpo(k), d0 = sp * eOutExpo(Math.max(0, k - 0.1));
    ctx.strokeStyle = r() < 0.5 ? col : '#fff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 5 + r() * 6;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0); ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.stroke();
  }
  ctx.restore();
}

function show(el, t, tin, tout, from = 1.6) {
  if (t < tin || t > tout) { el.style.display = 'none'; return 0; }
  el.style.display = '';
  const ki = eOutBack(prog(t, tin, tin + 0.2), 2.5), ko = eInCubic(prog(t, tout - 0.12, tout));
  el.style.opacity = String(clamp(prog(t, tin, tin + 0.08)) * (1 - ko));
  el.style.transform = `scale(${lerp(from, 1, ki) * (1 - 0.15 * ko)}) rotate(${(1 - clamp(ki)) * -4}deg)`;
  return ki;
}

function render(t) {
  const slot = Math.floor((t - HOOK_END) / SLOT);
  const cur = t < HOOK_END ? Math.floor(t / 0.25) % KITS.length : Math.min(KITS.length - 1, slot);
  background(t >= END_START ? 'japan' : KITS[cur].key, t);

  // tier label bounce when a kit lands
  const bounce = {};
  KITS.forEach((k, i) => {
    const land = HOOK_END + i * SLOT + 2.75;
    if (t >= land) bounce[k.tier] = Math.max(bounce[k.tier] || 0, Math.exp(-(t - land) / 0.12));
  });
  board(t, bounce);
  // placed thumbnails
  KITS.forEach((k, i) => {
    const land = HOOK_END + i * SLOT + 2.75;
    if (t >= land) {
      const p = SLOTPOS[i], s = THUMB * (1 + 0.15 * Math.exp(-(t - land) / 0.1));
      photo(k.key, p.x, p.y, s - 8, 0, 4);
    }
  });

  let shake = 0;
  // hook: flickering kits behind the title
  if (t < HOOK_END) {
    const k = KITS[cur];
    photo(k.key, CX, CY + 20, 420, Math.sin(t * 20) * 0.06);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 880, W, 700);
    shake = 10 * Math.exp(-(t % 0.25) / 0.06) * (t < 1.8);
  }
  show($('hook1'), t, 0.03, HOOK_END - 0.02, 2.2);
  show($('hook2'), t, 0.6, HOOK_END - 0.02, 1.6);

  // the six kits
  KITS.forEach((k, i) => {
    const S = HOOK_END + i * SLOT, u = t - S;
    if (u < 0 || u >= SLOT) return;
    const enter = eOutBack(prog(u, 0, 0.25), 1.8);
    const fly = eInOut(prog(u, 2.2, 2.75));
    if (u < 0.15) shake = 22 * (1 - u / 0.15);
    if (u >= 1.5 && u < 1.7) shake = Math.max(shake, 18 * (1 - (u - 1.5) / 0.2));
    if (u < 2.75) {
      const p = SLOTPOS[i];
      const x = lerp(CX, p.x, fly), y = lerp(CY, p.y, fly), s = lerp(CS * (1.4 - 0.4 * enter), THUMB - 8, fly);
      photo(k.key, x, y, s, (1 - enter) * 0.2 + Math.sin(u * 3) * 0.02 * (1 - fly), lerp(10, 4, fly));
      if (u < 0.12) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - u / 0.12)})`; ctx.fillRect(0, 0, W, H); }
      // score: spins, then lands with the tier stamp
      if (u >= 0.45 && u < 2.2) {
        const landed = u >= 1.5;
        const r = rng(Math.floor(u * 30) + i * 100);
        const txt = landed ? `${k.score}/10` : `${(r() * 9 + 1).toFixed(1)}/10`;
        const pop = landed ? 1 + 0.35 * Math.exp(-(u - 1.5) / 0.1) : 1;
        ctx.save(); ctx.translate(CX, CY + CS / 2 - 40); ctx.scale(pop, pop);
        outlined(txt, 0, 0, 104, landed ? '#ffe14d' : '#fff', 18);
        ctx.restore();
        if (landed) {
          const st = eOutBack(prog(u, 1.5, 1.7), 3);
          ctx.save(); ctx.translate(CX + CS / 2 - 50, CY - CS / 2 + 60); ctx.rotate(0.18); ctx.scale(st * 1.0, st * 1.0);
          ctx.fillStyle = '#000'; rr(-90, -82, 180, 180, 30); ctx.fill();
          ctx.fillStyle = TIER_COL[k.tier]; rr(-90, -90, 180, 180, 30); ctx.fill();
          ctx.fillStyle = '#111'; ctx.font = '800 140px Manrope'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(k.tier, 0, 8);
          ctx.restore();
          burst(CX + CS / 2 - 50, CY - CS / 2 + 60, S + 1.5, t, 40, i + 1, 260, TIER_COL[k.tier]);
        }
      }
    }
    $('take').innerHTML = k.take;
  });
  const u = t >= HOOK_END && t < END_START ? (t - HOOK_END) % SLOT : -1;
  show($('take'), u, 0.12, 2.2, 1.7);

  // end card
  if (t >= END_START) burst(540, 520, END_START, t, 120, 77, 700, '#ffe14d');
  show($('end1'), t, END_START + 0.05, END_START + 3, 2);
  show($('end2'), t, END_START + 0.5, END_START + 3, 1.5);
  show($('end3'), t, END_START + 3, DURATION + 1, 2);
  show($('end4'), t, END_START + 3.25, DURATION + 1, 1.5);
  show($('end5'), t, END_START + 3.5, DURATION + 1, 1.4);

  $('stage').style.transform = shake > 0.5 ? `translate(${shake * Math.sin(t * 97)}px, ${shake * Math.cos(t * 83)}px)` : 'none';
}

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
window.ready = (async () => {
  await Promise.all(KITS.map(k => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      IMGS[k.key] = im;
      // blurred full-bleed background version
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.filter = 'blur(38px) saturate(1.3)';
      x.drawImage(im, -420, 0, H, H);
      BLUR[k.key] = c; res();
    };
    im.onerror = rej;
    im.src = `../drop/photos/${k.key}.jpg`;
  })));
  await document.fonts.load('800 100px Manrope');
  await document.fonts.ready;
  return true;
})();
window.setUrl = u => ($('url').textContent = u);
window.renderFrame = async t => { render(t); await nextFrame(); };
window.renderCover = async () => {
  render(END_START - 0.01);
  $('take').style.display = 'none';
  const h = $('hook1'); Object.assign(h.style, { display: '', opacity: '1', transform: 'none' });
  await nextFrame();
};
