// kits4u launch TikTok — every frame is a pure function of time t (seconds).
// render.mjs calls window.renderFrame(t) for each frame and screenshots the page.
import * as THREE from 'three';
import { createGame, SHOTS, PICKUPS } from './game.js';
import { detailedShirtSVG } from './shirt.js';

const K = window.K4U;
const W = 1080, H = 1920;
export const DURATION = 22;

/* ---------- maths ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOutExpo = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const eOutCubic = k => 1 - Math.pow(1 - k, 3);
const eInCubic = k => k * k * k;
const eInOutCubic = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eOutBack = (k, s = 1.7) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const D2R = Math.PI / 180;
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const $ = id => document.getElementById(id);

/* ---------- timeline (120 BPM: one beat = 0.5s, every cut lands on a beat) ---------- */
const CUTS = [2, 5, 8, 9, 10, 11, 14, 18];
let COVER = false;

/* ======================================================================
   2D layers: background (stars, nebula, halo) and fx (lines, particles)
   ====================================================================== */
const bg = $('bg').getContext('2d');
const fx = $('fx').getContext('2d');

const SR = rng(7);
const STARS = Array.from({ length: 1600 }, () => ({
  x: (SR() * 2 - 1) * 1800, y: (SR() * 2 - 1) * 2800,
  d: 0.25 + SR() * 0.75, b: Math.pow(SR(), 2.4), w: 1 + SR() * 5, p: SR() * 6.283, blue: SR() < 0.3
}));
// warp stars for the game: unit directions with a cycling depth
const WARP = Array.from({ length: 500 }, () => {
  const a = SR() * 6.283, r = 0.08 + Math.pow(SR(), 0.7) * 1.3;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, z0: SR(), b: SR() };
});

function starZoom(t) {
  if (t < 2) return lerp(6, 1, eOutExpo(prog(t, 0, 1.35)));
  if (t < 5) return 1 + 0.7 * eInOutCubic(prog(t, 2, 3.1)) + 0.06 * (t - 2) + 1.2 * eInCubic(prog(t, 4.55, 5));
  if (t < 8) return 1 + 0.035 * (t - 5);
  if (t < 11) return 1.05 + 0.08 * (t - 8);
  if (t < 14) return 1;
  if (t < 18) return lerp(3.5, 1, eOutExpo(prog(t, 14, 14.9))) - 0.02 * Math.max(0, t - 15);
  return 0.92 - 0.01 * (t - 18);
}

function drawStars(t, alpha = 1) {
  const z = starZoom(t), zp = starZoom(t - 1 / 30);
  const cx = W / 2, cy = 960;
  for (const s of STARS) {
    const f = 1 + (z - 1) * s.d, fp = 1 + (zp - 1) * s.d;
    const x = cx + s.x * f / (1 + (1 - s.d) * 0.6), y = cy + s.y * f / (1 + (1 - s.d) * 0.6);
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const xp = cx + s.x * fp / (1 + (1 - s.d) * 0.6), yp = cy + s.y * fp / (1 + (1 - s.d) * 0.6);
    const tw = 0.6 + 0.4 * Math.sin(t * s.w + s.p);
    const a = (0.25 + 0.75 * s.b) * tw * alpha;
    const r = 0.6 + s.b * 1.9;
    const col = s.blue ? '190,220,255' : '255,255,255';
    const dx = x - xp, dy = y - yp, len = Math.hypot(dx, dy);
    if (len > 2) {
      bg.strokeStyle = `rgba(${col},${a})`;
      bg.lineWidth = r * 1.2;
      bg.beginPath(); bg.moveTo(xp - dx * 0.8, yp - dy * 0.8); bg.lineTo(x, y); bg.stroke();
    } else {
      bg.fillStyle = `rgba(${col},${a})`;
      bg.beginPath(); bg.arc(x, y, r, 0, 6.283); bg.fill();
      if (s.b > 0.8) {
        // soft glow + diffraction glint on the brightest stars
        bg.fillStyle = `rgba(158,216,255,${a * 0.16})`;
        bg.beginPath(); bg.arc(x, y, r * 5, 0, 6.283); bg.fill();
        bg.strokeStyle = `rgba(220,240,255,${a * 0.5})`; bg.lineWidth = 1;
        bg.beginPath(); bg.moveTo(x - r * 7, y); bg.lineTo(x + r * 7, y); bg.moveTo(x, y - r * 7); bg.lineTo(x, y + r * 7); bg.stroke();
      }
    }
  }
}

function drawWarp(t, speed, alpha) {
  const cx = W / 2, cy = 820;
  bg.lineCap = 'round';
  for (const s of WARP) {
    const z = 1 - (((s.z0 + t * speed) % 1) + 1) % 1; // 1 → 0 as the star approaches
    const zp = Math.min(1, z + speed / 30 * 1.6);
    const k = 1 / (0.04 + z), kp = 1 / (0.04 + zp);
    const x = cx + s.x * 300 * k, y = cy + s.y * 300 * k;
    const xp = cx + s.x * 300 * kp, yp = cy + s.y * 300 * kp;
    if (xp < -50 || xp > W + 50 || yp < -50 || yp > H + 50) continue;
    const a = clamp((1 - z) * 1.4) * (0.3 + 0.7 * s.b) * alpha;
    bg.strokeStyle = s.b > 0.7 ? `rgba(158,216,255,${a})` : `rgba(255,255,255,${a})`;
    bg.lineWidth = 0.6 + (1 - z) * 2.6;
    bg.beginPath(); bg.moveTo(xp, yp); bg.lineTo(x, y); bg.stroke();
  }
}

function blob(ctx, x, y, rx, ry, rgb, a) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

function drawNebula(t, mood) {
  const z = 1 + (starZoom(t) - 1) * 0.12;
  const cx = W / 2, cy = 960;
  bg.globalCompositeOperation = 'lighter';
  const m = mood || 1;
  blob(bg, cx + (-330 + 30 * Math.sin(t * 0.3)) * z, cy + (-520) * z, 760 * z, 520 * z, '110,60,255', 0.20 * m);
  blob(bg, cx + (360) * z, cy + (-180 + 40 * Math.cos(t * 0.25)) * z, 700 * z, 900 * z, '46,107,255', 0.18 * m);
  blob(bg, cx + (-260) * z, cy + (620) * z, 820 * z, 560 * z, '76,155,255', 0.12 * m);
  blob(bg, cx + (300) * z, cy + (860) * z, 600 * z, 420 * z, '150,70,255', 0.14 * m);
  bg.globalCompositeOperation = 'source-over';
}

function drawHalo(sx, sy, r, a) {
  bg.save();
  bg.globalCompositeOperation = 'lighter';
  const g = bg.createRadialGradient(sx, sy, r * 0.9, sx, sy, r * 1.32);
  g.addColorStop(0, `rgba(120,190,255,${0.85 * a})`);
  g.addColorStop(0.12, `rgba(76,155,255,${0.5 * a})`);
  g.addColorStop(0.45, `rgba(46,107,255,${0.16 * a})`);
  g.addColorStop(1, 'rgba(46,107,255,0)');
  bg.fillStyle = g;
  bg.beginPath(); bg.arc(sx, sy, r * 1.32, 0, 6.283); bg.fill();
  bg.restore();
}

/* ---------- fx helpers ---------- */
function glowLine(pts, width, rgb, a) {
  if (pts.length < 2) return;
  fx.save();
  fx.lineCap = 'round'; fx.lineJoin = 'round';
  fx.globalCompositeOperation = 'lighter';
  const path = () => { fx.beginPath(); fx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) fx.lineTo(pts[i][0], pts[i][1]); };
  fx.strokeStyle = `rgba(${rgb},${a * 0.18})`; fx.lineWidth = width * 7; path(); fx.stroke();
  fx.strokeStyle = `rgba(${rgb},${a * 0.45})`; fx.lineWidth = width * 2.6; path(); fx.stroke();
  fx.strokeStyle = `rgba(235,248,255,${a})`; fx.lineWidth = width; path(); fx.stroke();
  fx.restore();
}
function glowDot(x, y, r, a, rgb = '158,216,255') {
  fx.save();
  fx.globalCompositeOperation = 'lighter';
  const g = fx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.18, `rgba(${rgb},${a * 0.8})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  fx.fillStyle = g; fx.beginPath(); fx.arc(x, y, r, 0, 6.283); fx.fill();
  fx.restore();
}
function glint(x, y, s, a, rot = 0) {
  // four-point sparkle
  fx.save();
  fx.globalCompositeOperation = 'lighter';
  fx.translate(x, y); fx.rotate(rot);
  fx.fillStyle = `rgba(235,248,255,${a})`;
  fx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? s * 0.16 : s, ang = (i * Math.PI) / 4;
    fx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
  }
  fx.fill();
  fx.restore();
  glowDot(x, y, s * 0.9, a * 0.6);
}
function ripple(x, y, k, maxR, a = 1) {
  // a finger tap: solid touch dot + expanding ring
  if (k <= 0 || k >= 1) return;
  fx.save();
  fx.strokeStyle = `rgba(234,248,255,${(1 - k) * a})`;
  fx.lineWidth = 6 * (1 - k) + 1;
  fx.beginPath(); fx.arc(x, y, 20 + maxR * eOutCubic(k), 0, 6.283); fx.stroke();
  fx.fillStyle = `rgba(255,255,255,${0.55 * (1 - eInCubic(k)) * a})`;
  fx.beginPath(); fx.arc(x, y, 34 * (1 - 0.3 * k), 0, 6.283); fx.fill();
  fx.restore();
}
function burst(x, y, t0, t, n, seed, spread, life = 1.1, rgb = '158,216,255') {
  const k = (t - t0) / life;
  if (k < 0 || k > 1) return;
  const r = rng(seed);
  fx.save();
  fx.globalCompositeOperation = 'lighter';
  fx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ang = r() * 6.283, sp = spread * (0.3 + r() * 0.7), w = 1 + r() * 3.5, lag = r() * 0.15;
    const kk = clamp((k - lag) / (1 - lag));
    if (kk <= 0) continue;
    const d = sp * eOutExpo(kk), d0 = sp * eOutExpo(Math.max(0, kk - 0.06));
    const a = (1 - kk) * (0.5 + r() * 0.5);
    fx.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(${rgb},${a})`;
    fx.lineWidth = w;
    fx.beginPath();
    fx.moveTo(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0);
    fx.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
    fx.stroke();
  }
  fx.restore();
}
function whoosh(t) {
  // light streak + flash around each beat-cut
  for (const c of CUTS) {
    const k = (t - c) / 0.2;
    if (k < -1 || k > 1) continue;
    const a = 1 - Math.abs(k);
    fx.save();
    fx.globalCompositeOperation = 'lighter';
    const y = 960 + (c * 397 % 600) - 300;
    fx.translate(W / 2 + k * 700, y);
    fx.rotate(-0.22);
    const g = fx.createLinearGradient(-900, 0, 900, 0);
    g.addColorStop(0, 'rgba(46,107,255,0)');
    g.addColorStop(0.45, `rgba(158,216,255,${0.5 * a})`);
    g.addColorStop(0.5, `rgba(255,255,255,${0.95 * a})`);
    g.addColorStop(0.55, `rgba(158,216,255,${0.5 * a})`);
    g.addColorStop(1, 'rgba(46,107,255,0)');
    fx.fillStyle = g;
    fx.fillRect(-1100, -5 * a - 1, 2200, 10 * a + 2);
    const g2 = fx.createLinearGradient(0, -260, 0, 260);
    g2.addColorStop(0, 'rgba(76,155,255,0)');
    g2.addColorStop(0.5, `rgba(76,155,255,${0.22 * a})`);
    g2.addColorStop(1, 'rgba(76,155,255,0)');
    fx.fillStyle = g2;
    fx.fillRect(-1100, -260, 2200, 520);
    fx.restore();
    fx.fillStyle = `rgba(200,230,255,${0.16 * Math.pow(a, 3)})`;
    fx.fillRect(0, 0, W, H);
  }
}
function vignette() {
  const g = fx.createRadialGradient(W / 2, 960, 500, W / 2, 960, 1250);
  g.addColorStop(0, 'rgba(3,6,10,0)');
  g.addColorStop(1, 'rgba(3,6,10,0.55)');
  fx.fillStyle = g; fx.fillRect(0, 0, W, H);
}

/* ======================================================================
   WebGL: the Earth, the football moon and the Asteroid Rush game
   ====================================================================== */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const loader = new THREE.TextureLoader();
async function tex(url) {
  const t = await loader.loadAsync(url);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const globeScene = new THREE.Scene();
const globeCam = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
const SUN = new THREE.Vector3(-0.6, 0.35, 0.75).normalize();

const earthMat = new THREE.ShaderMaterial({
  uniforms: { dayMap: { value: null }, nightMap: { value: null }, waterMap: { value: null }, sunDir: { value: SUN.clone() }, nightBoost: { value: 2.2 } },
  vertexShader: `
    varying vec2 vUv; varying vec3 vN; varying vec3 vP;
    void main() {
      vUv = uv;
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform sampler2D dayMap, nightMap, waterMap;
    uniform vec3 sunDir; uniform float nightBoost;
    varying vec2 vUv; varying vec3 vN; varying vec3 vP;
    void main() {
      vec3 n = normalize(vN);
      vec3 v = normalize(cameraPosition - vP);
      vec3 l = normalize(sunDir);
      float d = dot(n, l);
      vec3 day = texture2D(dayMap, vUv).rgb;
      day = pow(day, vec3(1.08)) * vec3(0.96, 1.0, 1.08);
      vec3 night = texture2D(nightMap, vUv).rgb;
      float water = texture2D(waterMap, vUv).r;
      float dayK = smoothstep(-0.10, 0.22, d);
      vec3 dayCol = day * (0.10 + 1.25 * max(d, 0.0));
      float lum = dot(night, vec3(0.333));
      vec3 lights = pow(vec3(lum), vec3(1.6)) * vec3(1.0, 0.76, 0.46) * nightBoost * 1.6;
      vec3 col = mix(lights + day * 0.035, dayCol, dayK);
      vec3 h = normalize(l + v);
      col += vec3(0.75, 0.88, 1.0) * pow(max(dot(n, h), 0.0), 140.0) * water * 0.18 * dayK;
      float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
      col += vec3(0.30, 0.62, 1.0) * fres * (0.22 + 1.0 * smoothstep(-0.3, 0.4, d));
      col += vec3(1.0, 0.45, 0.2) * 0.07 * exp(-pow(d * 7.0, 2.0));
      gl_FragColor = vec4(col, 1.0);
    }`
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), earthMat);
globeScene.add(earth);

// football moon: truncated-icosahedron panels as a weighted spherical Voronoi
const PHI = (1 + Math.sqrt(5)) / 2;
const ico = [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI], [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1]].map(v => new THREE.Vector3(...v));
const centers = ico.map(v => v.clone().normalize());
for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) {
  if (Math.abs(ico[i].distanceTo(ico[j]) - 2) < 1e-3 && Math.abs(ico[i].distanceTo(ico[k]) - 2) < 1e-3 && Math.abs(ico[j].distanceTo(ico[k]) - 2) < 1e-3)
    centers.push(ico[i].clone().add(ico[j]).add(ico[k]).normalize());
}
const moonMat = new THREE.ShaderMaterial({
  uniforms: { centers: { value: centers }, sunDir: { value: SUN.clone() } },
  vertexShader: `
    varying vec3 vO; varying vec3 vN; varying vec3 vP;
    void main() {
      vO = position;
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform vec3 centers[32]; uniform vec3 sunDir;
    varying vec3 vO; varying vec3 vN; varying vec3 vP;
    void main() {
      vec3 p = normalize(vO);
      float s1 = 9.0, s2 = 9.0; int i1 = 0;
      for (int i = 0; i < 32; i++) {
        float s = acos(clamp(dot(p, centers[i]), -1.0, 1.0)) - (i < 12 ? 0.3505 : 0.4153);
        if (s < s1) { s2 = s1; s1 = s; i1 = i; } else if (s < s2) { s2 = s; }
      }
      float seam = 1.0 - smoothstep(0.010, 0.026, s2 - s1);
      vec3 base = i1 < 12 ? vec3(0.06, 0.08, 0.12) : vec3(0.92, 0.95, 1.0);
      base *= 1.0 - seam * 0.55;
      vec3 n = normalize(vN), l = normalize(sunDir), v = normalize(cameraPosition - vP);
      float diff = max(dot(n, l), 0.0);
      float spec = pow(max(dot(n, normalize(l + v)), 0.0), 50.0) * (1.0 - seam);
      float fres = pow(1.0 - max(dot(n, v), 0.0), 2.5);
      vec3 col = base * (0.10 + 1.05 * diff) + vec3(0.8, 0.9, 1.0) * spec * 0.6 + vec3(0.30, 0.6, 1.0) * fres * 0.9;
      gl_FragColor = vec4(col, 1.0);
    }`
});
const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), moonMat);
globeScene.add(moon);

function latLon(lat, lon, r = 1) {
  const phi = (lon + 180) * D2R, th = (90 - lat) * D2R;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r);
}
function project(v, cam) {
  const p = v.clone().project(cam);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z };
}

/* ---------- Asteroid Rush (game.js) ---------- */
const game = createGame(renderer, rng);

/* ======================================================================
   DOM: shirt cards, flags, text
   ====================================================================== */
const KITS = ['eng-home', 'bra-retro', 'arg-home', 'ita-away', 'jpn-home', 'eng-retro'].map(K.kitById);
const cardsEl = $('cards');
const CARDS = KITS.map(kit => {
  const el = document.createElement('div');
  el.className = 'card';
  const label = K.types[kit.type].label + (kit.type === 'retro' ? ' ' + kit.season : '');
  el.innerHTML = '<div class="in">' + detailedShirtSVG(kit) + '<div class="meta"><div class="nation">' + K.countries[kit.country].name +
    '</div><div class="type">' + label.toUpperCase() + '</div></div><div class="gloss"></div></div>';
  cardsEl.appendChild(el);
  return { el, meta: el.querySelector('.meta'), gloss: el.querySelector('.gloss'), svg: el.querySelector('svg') };
});

// extra flags not in the storefront set
const extraFlags = {
  esp(ctx, w, h) { ctx.fillStyle = '#aa151b'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f1bf00'; ctx.fillRect(0, h / 4, w, h / 2); },
  por(ctx, w, h) { ctx.fillStyle = '#da291c'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#046a38'; ctx.fillRect(0, 0, w * 0.4, h);
    ctx.fillStyle = '#ffe900'; ctx.beginPath(); ctx.arc(w * 0.4, h / 2, h * 0.22, 0, 6.283); ctx.fill(); },
  ned(ctx, w, h) { ['#ae1c28', '#ffffff', '#21468b'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, (i * h) / 3, w, h / 3 + 1); }); }
};
// Europe: country (lat, lon) → chip position on screen
const FLAGS = [
  { code: 'eng', lat: 52.6, lon: -1.6, x: 175, y: 720 },
  { code: 'ned', lat: 52.2, lon: 5.6, x: 455, y: 640 },
  { code: 'ger', lat: 51.0, lon: 10.3, x: 760, y: 700 },
  { code: 'fra', lat: 46.6, lon: 2.4, x: 865, y: 1010 },
  { code: 'ita', lat: 42.8, lon: 12.6, x: 790, y: 1390 },
  { code: 'esp', lat: 40.2, lon: -3.7, x: 430, y: 1435 },
  { code: 'por', lat: 39.6, lon: -8.0, x: 160, y: 1190 }
];
FLAGS.forEach(f => {
  const el = document.createElement('div');
  el.className = 'flag';
  const c = document.createElement('canvas');
  c.width = 264; c.height = 176;
  const ctx = c.getContext('2d');
  if (extraFlags[f.code]) extraFlags[f.code](ctx, 264, 176); else K.drawFlag(ctx, f.code, 264, 176);
  const fwrap = document.createElement('div'); fwrap.className = 'f'; fwrap.appendChild(c);
  el.appendChild(fwrap);
  $('flags').appendChild(el);
  f.el = el;
});

// odometer: each column rolls through random digits and lands on 20.10
const ODO = [];
{
  const r = rng(2010);
  '20.10'.split('').forEach((ch, i) => {
    const col = document.createElement('div');
    col.className = 'col' + (ch === '.' ? ' dot' : '');
    const strip = document.createElement('div');
    strip.className = 'strip';
    const n = ch === '.' ? 1 : 22 + i * 4;
    for (let j = 0; j < n; j++) {
      const d = document.createElement('div');
      d.className = 'chrome';
      d.textContent = ch === '.' ? '.' : j === n - 1 ? ch : String(Math.floor(r() * 10));
      strip.appendChild(d);
    }
    col.appendChild(strip);
    $('odo').appendChild(col);
    ODO.push({ strip, n, land: [15.55, 15.72, 0, 15.86, 16.0][i] });
  });
}

/* text in/out: slam in (scale + blur), soft exit */
function show(el, t, tin, tout, o = {}) {
  const dur = o.dur || 0.24, outDur = o.outDur || 0.18;
  if (t < tin || t > tout) { el.style.display = 'none'; return 0; }
  el.style.display = '';
  const ki = eOutExpo(prog(t, tin, tin + dur));
  const ko = eInCubic(prog(t, tout - outDur, tout));
  const s = lerp(o.from ?? 1.7, 1, ki) * lerp(1, o.outScale ?? 0.94, ko);
  const blur = (1 - ki) * 18 + ko * 14;
  const dy = (1 - ki) * (o.dy || 0) - ko * (o.outDy ?? 40);
  const dx = (1 - ki) * (o.dx || 0) + ko * (o.outDx || 0);
  el.style.opacity = String(clamp(ki * 1.6) * (1 - ko));
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
  el.style.transformOrigin = o.origin || '540px 50%';
  el.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
  // chrome sheen sweeps once after landing
  el.querySelectorAll('.chrome').forEach(c => c.style.setProperty('--sheen', (100 - 100 * eInOutCubic(prog(t, tin + 0.15, tin + 0.95))) + '%'));
  return ki * (1 - ko);
}

/* ======================================================================
   Globe camera per scene
   ====================================================================== */
function globeState(t) {
  // returns null when the globe is not on screen
  const s = { D: 7.4, lat: 18, lon: 20, cy: 1180, sun: SUN.clone(), moon: null, a: 1, boost: 2.2 };
  if (t < 2) {
    const k = eOutExpo(prog(t, 0, 1.45));
    s.D = lerp(1.32, 7.4, k);
    s.lat = lerp(8, 20, k);
    s.lon = 75 - 34 * t;
    s.cy = lerp(960, 1250, k);
    s.moon = { ang: 2.2 + t * 0.9, r: 1.85, size: 0.2 };
  } else if (t < 5) {
    const k = eInOutCubic(prog(t, 2, 3.15));
    s.D = lerp(7.4, 2.55, k) - 0.12 * prog(t, 3.15, 4.55) - 0.9 * eInCubic(prog(t, 4.55, 5));
    s.lat = lerp(20, 47, k);
    s.lon = lerp(75 - 68, 8 - 360, eOutCubic(prog(t, 2, 3.25))) + 0.8 * (t - 3.25) * (t > 3.25);
    s.cy = lerp(1250, 1050, k);
    s.moon = t < 2.6 ? { ang: 2.2 + t * 0.9, r: 1.85, size: 0.2 } : null;
  } else if (t >= 8 && t < 9) {
    const k = t - 8;
    s.D = 3.5 - 0.25 * k; s.lat = 30; s.lon = 18 - 6 * k; s.cy = 1580;
    const a = lerp(25, -120, eInOutCubic(k)) * D2R;
    s.sun = new THREE.Vector3(Math.sin(a), 0.25, Math.cos(a)).normalize();
    s.boost = 3.4;
  } else if (t >= 9 && t < 10) {
    const k = t - 9;
    s.D = 6.4 - 0.3 * k; s.lat = 22; s.lon = -30 - 8 * k; s.cy = 1420;
    s.sun = new THREE.Vector3(-0.75, 0.3, 0.6).normalize();
    s.moon = { ang: lerp(1.0, -1.0, k), r: 2.9, size: 0.27, front: true };
  } else if (t >= 10 && t < 11) {
    const k = t - 10;
    s.D = 4.6; s.lat = 40; s.lon = 30 - 5 * k; s.cy = 2250;
    s.sun = new THREE.Vector3(-0.2, 0.75, -0.65).normalize();
    s.boost = 3;
  } else if (t >= 14) {
    const k = eOutExpo(prog(t, 14, 15.2));
    s.D = lerp(1.7, 12, k);
    s.lat = lerp(35, 18, k);
    s.lon = 40 - 14 * (t - 14);
    s.cy = lerp(960, 1470, k);
    if (t >= 18) s.cy = 1470 + 40 * eInOutCubic(prog(t, 18, 22));
    s.sun = new THREE.Vector3(-0.85, 0.3, 0.35).normalize();
    s.moon = { ang: 1.4 + t * 0.55, r: 1.55, size: 0.2 };
    s.a = clamp((t - 14) / 0.12);
  } else return null;
  return s;
}

function setGlobe(s) {
  earth.rotation.set(s.lat * D2R, -(s.lon + 90) * D2R, 0, 'XYZ');
  earth.updateMatrixWorld();
  earthMat.uniforms.sunDir.value.copy(s.sun);
  earthMat.uniforms.nightBoost.value = s.boost;
  moonMat.uniforms.sunDir.value.copy(s.sun);
  globeCam.position.set(0, 0, s.D);
  globeCam.lookAt(0, 0, 0);
  globeCam.setViewOffset(W, H, 0, 960 - s.cy, W, H);
  globeCam.updateMatrixWorld();
  if (s.moon) {
    const m = s.moon;
    const p = new THREE.Vector3(Math.sin(m.ang) * m.r, Math.sin(m.ang + 1) * 0.35 * m.r * (m.front ? 0.4 : 1), Math.cos(m.ang) * m.r);
    if (m.front) p.y += 0.05;
    moon.position.copy(p);
    moon.scale.setScalar(m.size);
    moon.rotation.set(0.4, s.lon * 0.05 + m.ang * 2.5, 0.2);
    moon.visible = true;
  } else moon.visible = false;
  return { r: Math.tan(Math.asin(1 / s.D)) / Math.tan(15 * D2R) * 960, cy: s.cy };
}

/* ======================================================================
   frame
   ====================================================================== */
/* game overlay: reticle, sparks, score pop-ups */
function popText(txt, x, y, k, size = 64) {
  if (k <= 0 || k >= 1) return;
  fx.save();
  fx.globalAlpha = Math.min(1, (1 - k) * 2.2);
  fx.font = `800 ${size * (0.8 + 0.4 * eOutBack(Math.min(1, k * 4), 3))}px Manrope`;
  fx.textAlign = 'center';
  fx.shadowColor = 'rgba(76,155,255,.95)'; fx.shadowBlur = 24;
  const g = fx.createLinearGradient(0, y - size, 0, y);
  g.addColorStop(0, '#EAF8FF'); g.addColorStop(0.5, '#9ED8FF'); g.addColorStop(1, '#4C9BFF');
  fx.fillStyle = g;
  fx.fillText(txt, x, y - 120 * eOutCubic(k));
  fx.restore();
}
function drawGameFx(t, ev) {
  // reticle locked ahead of the ship
  const r = project(ev.reticle, game.cam);
  let fire = 0;
  for (const [tf] of SHOTS) if (t >= tf && t < tf + 0.2) fire = 1 - (t - tf) / 0.2;
  fx.save();
  fx.translate(r.x, r.y); fx.rotate(t * 0.8);
  fx.globalCompositeOperation = 'lighter';
  fx.strokeStyle = `rgba(158,216,255,${0.55 + 0.45 * fire})`; fx.lineWidth = 3;
  const R = 46 - 8 * fire;
  for (let i = 0; i < 4; i++) { fx.beginPath(); fx.arc(0, 0, R, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + 1.3); fx.stroke(); }
  fx.rotate(-t * 1.6);
  for (let i = 0; i < 4; i++) { fx.rotate(Math.PI / 2); fx.beginPath(); fx.moveTo(R + 8, 0); fx.lineTo(R + 22, 0); fx.stroke(); }
  fx.fillStyle = 'rgba(234,248,255,.9)'; fx.beginPath(); fx.arc(0, 0, 3.5, 0, 6.283); fx.fill();
  fx.restore();
  for (const h of ev.hits) {
    const p = project(h.pos.clone().add(new THREE.Vector3(0, 0, ROCK_SPEED_FX * 0.6 * (t - h.t0))), game.cam);
    burst(p.x, p.y, h.t0, t, 60, Math.round(h.t0 * 100), 480, 0.8, '255,190,120');
    burst(p.x, p.y, h.t0, t, 36, Math.round(h.t0 * 100) + 1, 340, 0.7);
    popText('+500', p.x, p.y - 40, prog(t, h.t0, h.t0 + 0.8));
  }
  for (const pk of ev.pickups) {
    const p = project(pk.pos, game.cam);
    const k = prog(t, pk.t0, pk.t0 + 0.8);
    glowDot(p.x, p.y, 220 * (1 - k), 1 - k);
    const rr = rng(Math.round(pk.t0 * 100));
    for (let j = 0; j < 14; j++) {
      const a = rr() * 6.283, d = 60 + rr() * 260;
      glint(p.x + Math.cos(a) * d * eOutCubic(k), p.y + Math.sin(a) * d * eOutCubic(k), 8 + rr() * 14, 1 - k, rr() * 3);
    }
    popText('+250', p.x, p.y - 60, k, 54);
  }
}
const ROCK_SPEED_FX = 46;

function render(t) {
  bg.fillStyle = '#03060A'; bg.fillRect(0, 0, W, H);
  fx.clearRect(0, 0, W, H);
  const inGame = t >= 11 && t < 14;

  // background
  drawNebula(t, inGame ? 0.6 : t >= 5 && t < 8 ? 1.25 : 1);
  if (inGame) drawWarp(t, 0.9, 1);
  else drawStars(t, 1);

  // WebGL
  const gs = globeState(t);
  if (inGame) {
    const ev = game.update(t);
    renderer.render(game.scene, game.cam);
    drawGameFx(t, ev);
  } else if (gs) {
    const g = setGlobe(gs);
    drawHalo(W / 2, g.cy, g.r, gs.a);
    renderer.render(globeScene, globeCam);
  } else {
    renderer.clear();
  }

  {
    const g = fx.createLinearGradient(0, 0, 0, 820);
    g.addColorStop(0, 'rgba(3,6,10,0.7)'); g.addColorStop(0.55, 'rgba(3,6,10,0.4)'); g.addColorStop(1, 'rgba(3,6,10,0)');
    fx.fillStyle = g; fx.fillRect(0, 0, W, 820);
  }
  // stage camera punch on each cut
  let punch = 0;
  for (const c of CUTS) if (t >= c) punch = Math.max(punch, 0.045 * Math.exp(-(t - c) / 0.11));
  $('stage').style.transform = `scale(${1 + punch})`;

  /* ---- 1 · hook ---- */
  show($('s1a'), t, 0.06, 1.98, { from: 2.1 });
  show($('s1b'), t, 0.82, 1.98, { from: 1.9, dy: 30 });

  /* ---- 2 · spin the globe, flags branch out ---- */
  show($('s2'), t, 2.12, 4.7, { from: 1.6 });
  if (t >= 2 && t < 5 && gs) {
    const center = project(new THREE.Vector3(0, 0, 0), globeCam);
    FLAGS.forEach((f, i) => {
      const P = project(latLon(f.lat, f.lon).applyMatrix4(earth.matrixWorld), globeCam);
      const t0 = 3.0 + i * 0.07;
      const k = eOutCubic(prog(t, t0, t0 + 0.42));
      // country hotspot
      if (t > 2.85) {
        const pk = prog(t, 2.85, 3.1);
        glowDot(P.x, P.y, 46 * pk, 0.9 * pk);
        const ring = (((t - 2.9 - i * 0.05) % 0.9 + 0.9) % 0.9) / 0.9;
        fx.strokeStyle = `rgba(158,216,255,${0.7 * (1 - ring) * pk})`; fx.lineWidth = 2;
        fx.beginPath(); fx.arc(P.x, P.y, 8 + 34 * ring, 0, 6.283); fx.stroke();
      }
      // curved glowing line from the country to its flag
      const out = Math.hypot(f.x - center.x, f.y - center.y) || 1;
      const cxp = (P.x + f.x) / 2 + (f.x - center.x) / out * 90, cyp = (P.y + f.y) / 2 + (f.y - center.y) / out * 90 - 40;
      const pts = [];
      const N = 40;
      for (let j = 0; j <= N * k; j++) {
        const u = j / N;
        pts.push([(1 - u) * (1 - u) * P.x + 2 * (1 - u) * u * cxp + u * u * f.x, (1 - u) * (1 - u) * P.y + 2 * (1 - u) * u * cyp + u * u * f.y]);
      }
      const fade = 1 - prog(t, 4.6, 4.85);
      glowLine(pts, 3.4, '76,155,255', 1 * fade);
      if (k > 0 && k < 1) glowDot(pts[pts.length - 1][0], pts[pts.length - 1][1], 30, 1);
      // travelling pulses once connected
      if (k >= 1) {
        const u = ((t - t0 - 0.42) * 1.4) % 1;
        const x = (1 - u) * (1 - u) * P.x + 2 * (1 - u) * u * cxp + u * u * f.x, y = (1 - u) * (1 - u) * P.y + 2 * (1 - u) * u * cyp + u * u * f.y;
        glowDot(x, y, 16, 0.9 * fade);
      }
      // flag chip
      const pk = eOutBack(prog(t, t0 + 0.3, t0 + 0.62), 2.2);
      const tap = f.code === 'eng' ? Math.exp(-Math.pow((t - 4.22) / 0.12, 2)) * 0.22 : 0;
      const sel = f.code === 'eng' ? eOutCubic(prog(t, 4.2, 4.5)) : 0;
      const sc = Math.max(0, pk) * (1 + tap + sel * 0.25) * (1 - eInCubic(prog(t, 4.62, 4.9)) * (f.code === 'eng' ? -1.5 : 1));
      f.el.style.display = pk > 0 && t < 4.95 ? '' : 'none';
      f.el.style.transform = `translate(${f.x}px, ${f.y + Math.sin(t * 2.4 + i) * 6}px) scale(${sc})`;
      f.el.style.opacity = String(clamp(pk * 2) * (f.code === 'eng' ? 1 - prog(t, 4.8, 4.95) : 1 - sel * 0.55));
    });
    const eng = FLAGS[0];
    ripple(eng.x + 18, eng.y + 22, prog(t, 4.16, 4.66), 110);
  } else FLAGS.forEach(f => (f.el.style.display = 'none'));

  /* ---- 3 · shirts on chrome cards ---- */
  show($('s3'), t, 5.08, 7.85, { from: 1.6 });
  if (t >= 5 && t < 8) {
    cardsEl.style.display = '';
    const st = t - 5;
    const kk = Math.min(5, Math.floor(st / 0.5)), f = st - kk * 0.5;
    const cur = kk - 1 + eOutExpo(clamp(f / 0.34));
    const exit = eInCubic(prog(t, 7.75, 8));
    CARDS.forEach((c, i) => {
      const o = i - cur, ao = Math.abs(o);
      if (ao > 2.2) { c.el.style.display = 'none'; return; }
      c.el.style.display = '';
      const bob = ao < 1 ? (1 - ao) : 0;
      const tx = o * 480, tz = -ao * 340 - exit * 600;
      const ry = -o * 40 + bob * Math.sin(t * 1.9 + i) * 9;
      const rx = bob * (5 + Math.sin(t * 2.3 + i) * 5);
      const ty = Math.sin(t * 2 + i) * 10 * bob - exit * 200;
      c.el.style.transform = `translate3d(${tx}px, ${ty}px, ${tz}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${o * 2}deg)`;
      c.el.style.opacity = String(clamp(2.2 - ao) * (1 - exit));
      c.el.style.filter = `brightness(${1 - 0.5 * Math.min(ao, 1)})`;
      c.el.style.zIndex = String(10 - Math.round(ao * 2));
      c.meta.style.opacity = String(clamp(1 - ao * 2.5));
      c.svg.style.transform = `rotate(${Math.sin(t * 2.6 + i) * 2.2 * bob - o * 3}deg)`;
      const arrive = 5 + i * 0.5;
      c.gloss.style.backgroundPosition = (100 - 100 * eInOutCubic(prog(t, arrive + 0.12, arrive + 0.62))) + '% 0';
    });
  } else cardsEl.style.display = 'none';

  /* ---- 4 · features ---- */
  show($('f1'), t, 8.04, 8.97, { from: 1, dx: 260, outDx: -220, outDy: 0, outDur: 0.12 });
  show($('f2'), t, 9.04, 9.97, { from: 1, dx: 260, outDx: -220, outDy: 0, outDur: 0.12 });
  show($('f3'), t, 10.04, 10.97, { from: 1, dx: 260, outDx: -220, outDy: 0, outDur: 0.12 });
  show($('f3chip'), t, 10.55, 10.97, { from: 0.4, outDur: 0.12 });
  if (t >= 10 && t < 11) {
    // the shooting star, the tap and the sparkles
    const k = prog(t, 10.08, 10.47);
    const x0 = 980, y0 = 640, x1 = 560, y1 = 930;
    const hx = lerp(x0, x1, eOutCubic(k) * 0.4 + k * 0.6), hy = lerp(y0, y1, eOutCubic(k) * 0.4 + k * 0.6);
    if (t < 10.5) {
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
      const tl = 420 * clamp(k * 3);
      const tx = hx - dx / L * tl, ty = hy - dy / L * tl;
      fx.save();
      fx.globalCompositeOperation = 'lighter';
      const g = fx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(76,155,255,0)'); g.addColorStop(0.7, 'rgba(158,216,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      fx.strokeStyle = g; fx.lineCap = 'round';
      fx.lineWidth = 7; fx.beginPath(); fx.moveTo(tx, ty); fx.lineTo(hx, hy); fx.stroke();
      fx.restore();
      glint(hx, hy, 46, 1, t * 3);
      for (let j = 0; j < 6; j++) glint(hx - dx / L * (60 + j * 55) + Math.sin(j * 7) * 14, hy - dy / L * (60 + j * 55) + Math.cos(j * 5) * 14, 10 - j, 0.7 - j * 0.1, j);
    }
    ripple(x1, y1, prog(t, 10.44, 10.9), 140);
    if (t >= 10.47) {
      glowDot(x1, y1, 300 * (1 - prog(t, 10.47, 10.8)), 1 - prog(t, 10.47, 10.8));
      burst(x1, y1, 10.47, t, 90, 77, 520, 0.6);
      const r = rng(5);
      for (let j = 0; j < 18; j++) {
        const a = r() * 6.283, d = 80 + r() * 380, tt = prog(t, 10.47 + r() * 0.15, 10.95);
        if (tt > 0 && tt < 1) glint(x1 + Math.cos(a) * d * eOutCubic(tt), y1 + Math.sin(a) * d * eOutCubic(tt), 8 + r() * 16, Math.sin(tt * Math.PI), r() * 3);
      }
    }
  }

  /* ---- 5 · Asteroid Rush ---- */
  show($('hud'), t, 11.05, 13.92, { from: 1, dy: -30, outDur: 0.12 });
  if (inGame) {
    const hitsSoFar = SHOTS.filter(s => t >= s[1]).length;
    const got = PICKUPS.filter(p => t >= p).length;
    const score = Math.floor((t - 11) * 1310) + hitsSoFar * 500 + got * 250;
    $('score').textContent = String(score).padStart(6, '0');
    $('shield').style.width = (100 - 12 * Math.min(1, Math.max(0, (t - 12.3) * 3)) + 8 * got) + '%';
  }
  show($('w1'), t, 11.22, 13.9, { from: 2 });
  show($('w2'), t, 11.98, 13.9, { from: 2.2 });
  show($('w3'), t, 12.74, 13.9, { from: 2 });

  /* ---- 6 · launch reveal ---- */
  {
    const el = $('launching');
    const v = show(el, t, 14.5, 17.92, { from: 1.15, dur: 0.6 });
    if (v) el.style.letterSpacing = lerp(1.1, 0.42, eOutExpo(prog(t, 14.5, 15.3))) + 'em';
  }
  {
    const el = $('odo');
    show(el, t, 14.95, 17.92, { from: 1, dur: 0.12 });
    ODO.forEach(c => {
      if (!c.land) return;
      const k = eOutCubic(prog(t, 14.95, c.land));
      const idx = k * (c.n - 1);
      const speed = c.n * (1 - k);
      c.strip.style.transform = `translateY(${-idx * 420}px)`;
      c.strip.style.filter = t < c.land ? `blur(${Math.min(6, speed * 0.25)}px)` : 'none';
    });
    // glow pulse on every beat after the lock
    let pulse = 0;
    if (t >= 16) pulse = Math.exp(-((t - 16) % 0.5) / 0.18) * (t < 16.5 ? 1.6 : 0.8);
    const lock = t >= 16 ? eOutBack(prog(t, 16, 16.25), 3) : 0;
    el.style.filter = `drop-shadow(0 0 ${24 + 50 * pulse}px rgba(76,155,255,${0.6 + 0.35 * pulse})) drop-shadow(0 6px 3px rgba(0,10,40,.6))`;
    if (t >= 16) el.style.transform = `scale(${1 + 0.12 * (1 - lock) + 0.03 * pulse})`;
  }
  show($('sub6'), t, 16.3, 17.92, { from: 1.4, dy: 20 });
  if (t >= 15.95 && t < 18) {
    const cx = 540, cy = 910;
    // flash, shock ring, stars bursting outward
    fx.fillStyle = `rgba(220,240,255,${0.55 * (1 - prog(t, 16, 16.3))})`;
    if (t >= 16) fx.fillRect(0, 0, W, H);
    const rk = prog(t, 16, 16.7);
    if (rk > 0 && rk < 1) {
      fx.save(); fx.globalCompositeOperation = 'lighter';
      fx.strokeStyle = `rgba(158,216,255,${1 - rk})`; fx.lineWidth = 14 * (1 - rk) + 1;
      fx.beginPath(); fx.ellipse(cx, cy, 80 + 900 * eOutExpo(rk), (80 + 900 * eOutExpo(rk)) * 0.62, 0, 0, 6.283); fx.stroke();
      fx.restore();
    }
    burst(cx, cy, 16, t, 220, 1610, 1200, 1.5);
    burst(cx, cy, 16.05, t, 80, 1611, 700, 1.2, '120,90,255');
    const r = rng(99);
    for (let j = 0; j < 26; j++) {
      const x = 90 + r() * 900, y = 560 + r() * 760, ph = r() * 3, sz = 8 + r() * 18;
      const a = Math.max(0, Math.sin((t - 16.1) * 3 + ph)) * clamp((t - 16.1) * 3);
      if (a > 0.02) glint(x, y, sz, a, ph);
    }
  }

  /* ---- 7 · end card ---- */
  const lv = show($('logo'), t, 18.04, 22.5, { from: 1.5 });
  show($('url'), t, 18.25, 22.5, { from: 1.4, dy: 20 });
  show($('tag1'), t, 18.5, 19.7, { from: 1.25, dy: 24 });
  show($('tag2'), t, 19.72, 20.9, { from: 1.25, dy: 24 });
  show($('follow'), t, 20.92, 22.5, { from: 1.25, dy: 24 });
  if (lv > 0) {
    // an orbit ring with a little moon around the wordmark
    const cx = 540, cy = 645, a0 = (t - 18) * 2.6 + 1.2;
    const k = eOutExpo(prog(t, 18.1, 18.8));
    fx.save();
    fx.translate(cx, cy); fx.rotate(-0.16);
    const rx = 470 * k, ry = 120 * k;
    const g = fx.createLinearGradient(-rx, 0, rx, 0);
    g.addColorStop(0, 'rgba(46,107,255,0)'); g.addColorStop(0.3, 'rgba(158,216,255,.75)'); g.addColorStop(0.7, 'rgba(234,248,255,.9)'); g.addColorStop(1, 'rgba(46,107,255,0)');
    fx.strokeStyle = g; fx.lineWidth = 3;
    fx.beginPath(); fx.ellipse(0, 0, rx, ry, 0, Math.PI * 0.02, Math.PI * 0.98); fx.stroke();
    fx.restore();
    const mx = cx + Math.cos(a0) * rx * Math.cos(-0.16) - Math.sin(a0) * ry * Math.sin(-0.16);
    const my = cy + Math.cos(a0) * rx * Math.sin(-0.16) + Math.sin(a0) * ry * Math.cos(-0.16);
    if (Math.sin(a0) > -0.2 && k > 0.5) glowDot(mx, my, 34, 1);
    const pulse = t >= 18 ? Math.exp(-((t - 18) % 0.5) / 0.2) : 0;
    $('url').querySelector('.url').style.boxShadow = `0 0 ${40 + 30 * pulse}px rgba(76,155,255,${0.6 + 0.3 * pulse}), inset 0 0 26px rgba(76,155,255,.3)`;
    const r = rng(18);
    for (let j = 0; j < 14; j++) {
      const x = 90 + r() * 880, y = 380 + r() * 900, ph = r() * 6;
      const a = Math.max(0, Math.sin((t - 18) * 2.2 + ph)) * clamp((t - 18.2) * 2) * 0.8;
      if (a > 0.02) glint(x, y, 6 + r() * 12, a, ph);
    }
    burst(540, 645, 18.04, t, 120, 1804, 900, 1.2);
  }

  whoosh(t);
  vignette();
  if (t > DURATION - 0.25) { fx.fillStyle = `rgba(3,6,10,${prog(t, DURATION - 0.25, DURATION) * 0.0})`; fx.fillRect(0, 0, W, H); }
}

/* ---------- bootstrapping ---------- */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
window.ready = (async () => {
  const [day, night, water] = await Promise.all([tex('assets/earth-blue-marble.jpg'), tex('assets/earth-night.jpg'), tex('assets/earth-water.png')]);
  earthMat.uniforms.dayMap.value = day;
  earthMat.uniforms.nightMap.value = night;
  earthMat.uniforms.waterMap.value = water;
  await Promise.all([
    document.fonts.load('800 100px Manrope'), document.fonts.load('700 100px Manrope'), document.fonts.load('600 100px Manrope'),
    document.fonts.load('italic 400 100px "Instrument Serif"')
  ]);
  await document.fonts.ready;
  // compile both scenes up front
  renderer.compile(globeScene, globeCam);
  renderer.compile(game.scene, game.cam);
  return true;
})();
// reports visible text that falls outside TikTok's safe zone
window.safeCheck = () => {
  const bad = [];
  document.querySelectorAll('#stage > .abs, .card .meta').forEach(el => {
    if (el.offsetParent === null && getComputedStyle(el).display === 'none') return;
    if (parseFloat(getComputedStyle(el).opacity) < 0.5) return;
    if (el.style.filter && el.style.filter !== 'none') return; // mid-animation
    const rects = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      if (!tw.currentNode.textContent.trim()) continue;
      const r = document.createRange(); r.selectNodeContents(tw.currentNode);
      rects.push(...r.getClientRects());
    }
    for (const b of rects) {
      if (b.width < 1) continue;
      if (b.left < 40 || b.right > 950 || b.top < 150 || b.bottom > 1520) bad.push(`${el.id || el.className}: ${Math.round(b.left)},${Math.round(b.top)} → ${Math.round(b.right)},${Math.round(b.bottom)}`);
    }
  });
  return bad;
};
window.setUrl = u => ($('urltext').textContent = u);
window.renderFrame = async t => { COVER = false; render(t); await nextFrame(); };
window.renderCover = async () => {
  COVER = true;
  render(17.35);
  // add the wordmark above the date for the cover
  const logo = $('logo');
  logo.style.display = ''; logo.style.opacity = '1'; logo.style.filter = 'none';
  logo.style.transform = 'translateY(-330px) scale(.6)';
  await nextFrame();
};
