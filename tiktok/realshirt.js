// Photo-style shirt renders for the shirt cards.
// The storefront's shirt artwork (assets/js/jersey.js) supplies the colours and
// graphics; this relights it like a studio "ghost mannequin" product shot:
// a height map gives the body volume, drape folds, seams and the knit, and a
// WebGL shader shades that with a soft key light, fill, fabric sheen and
// ambient occlusion. Edges get a gentle warp so the silhouette reads as cloth.
import * as THREE from 'three';

const K = window.K4U;
const S = 2.5;                 // artwork 400×440 → 1000×1100
const PAD = 60;
const CW = 1000 + PAD * 2, CH = 1100 + PAD * 2;

function canvas(w = CW, h = CH) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function loadSVG(svg) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// fold strokes in artwork coordinates: [path, width, ridge(+1)/valley(-1)]
const FOLDS = [
  ['M112 168 Q 160 204 178 262', 22, -1], ['M120 160 Q 168 196 188 252', 14, 1],
  ['M290 172 Q 244 210 230 264', 22, -1], ['M282 164 Q 236 200 220 254', 14, 1],
  ['M150 292 Q 164 352 148 414', 26, -1], ['M164 292 Q 178 352 164 414', 14, 1],
  ['M252 286 Q 238 350 256 414', 26, -1], ['M238 288 Q 226 350 242 414', 14, 1],
  ['M196 330 Q 214 372 204 416', 18, -1],
  ['M110 360 Q 200 372 292 356', 12, -1], ['M112 382 Q 200 396 290 380', 10, 1],
  ['M60 122 Q 80 136 76 162', 14, -1], ['M340 122 Q 320 138 324 162', 14, -1],
  ['M48 140 Q 62 150 60 166', 8, 1], ['M352 140 Q 338 150 340 166', 8, 1],
  ['M140 70 Q 170 90 200 92 Q 230 90 260 70', 16, 1],
  ['M100 120 Q 200 150 300 120', 30, 1]
];
// seams (slight grooves)
const SEAMS = ['M104 49 Q 98 96 92 150', 'M296 49 Q 302 96 308 150', 'M92 150 L 94 410', 'M308 150 L 306 410'];

let gl = null;
function relighter() {
  if (gl) return gl;
  const c = canvas();
  const renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setSize(CW, CH, false);
  renderer.setClearColor(0x000000, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { albedo: { value: null }, dome: { value: null }, folds: { value: null }, rmask: { value: null }, texel: { value: new THREE.Vector2(1 / CW, 1 / CH) }, seed: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D albedo, dome, folds, rmask; uniform vec2 texel; uniform float seed;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + seed) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ return vnoise(p)*.55 + vnoise(p*2.1)*.28 + vnoise(p*4.3)*.17; }
      float H(vec2 uv){
        float d = texture2D(dome, uv).r;
        float f = texture2D(folds, uv).r - 0.5;
        float soft = (fbm(uv * 9.0) - 0.5) * 0.05;
        return d * 0.95 + f * 0.75 + soft;
      }
      vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec2 uv = vUv;
        // gentle cloth warp so straight edges go soft and organic
        uv += (vec2(fbm(uv * 4.0 + 3.1), fbm(uv * 4.0 + 8.7)) - 0.5) * 0.010;
        vec4 a = texture2D(albedo, uv);
        float m = smoothstep(0.42, 0.58, texture2D(rmask, uv).r);
        if (m < 0.003) { gl_FragColor = vec4(0.); return; }
        if (a.a < 0.5) a.rgb = texture2D(albedo, uv + vec2(0.0, 0.004)).a > 0.5 ? texture2D(albedo, uv + vec2(0.0, 0.004)).rgb : a.rgb;
        vec2 e = texel * 2.5;
        float hx = H(uv + vec2(e.x, 0.)) - H(uv - vec2(e.x, 0.));
        float hy = H(uv + vec2(0., e.y)) - H(uv - vec2(0., e.y));
        vec3 n = normalize(vec3(-hx * 34.0, -hy * 34.0, 1.0));
        // knit: fine interlock ribs + a little fibre noise
        vec2 px = uv / texel;
        float knit = sin((px.x + px.y) * 1.25) * sin((px.x - px.y) * 1.25);
        n = normalize(n + vec3(knit * 0.05, knit * 0.05, 0.) + vec3(vnoise(px * 0.7) - .5, vnoise(px * 0.7 + 9.) - .5, 0.) * 0.06);
        vec3 V = vec3(0., 0., 1.);
        vec3 L1 = normalize(vec3(-0.55, 0.65, 0.75));   // soft key, top left
        vec3 L2 = normalize(vec3(0.7, -0.1, 0.6));      // fill, right
        float k1 = max(dot(n, L1) * 0.8 + 0.2, 0.);    // wrapped diffuse = soft cloth
        float k2 = max(dot(n, L2), 0.);
        float spec = pow(max(dot(n, normalize(L1 + V)), 0.), 22.0) * 0.07;
        float h = texture2D(dome, uv).r;
        float ao = mix(0.55, 1.0, smoothstep(0.02, 0.45, h));
        float fa = texture2D(folds, uv).r - 0.5;
        ao *= 1.0 - max(-fa, 0.) * 0.9;
        vec3 base = toLin(a.rgb);
        vec3 col = base * (0.18 + 0.95 * k1 + 0.22 * k2) * ao + vec3(spec) * mix(0.5, 1.0, ao);
        // fabric sheen at grazing angles
        col += base * pow(1.0 - n.z, 2.0) * 0.25;
        col = pow(col, vec3(1.0 / 2.2));
        gl_FragColor = vec4(col, m);
      }`
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const cam = new THREE.Camera();
  gl = { c, renderer, mat, scene, cam };
  return gl;
}

function strokePath(ctx, d, w, style) {
  ctx.save();
  ctx.translate(PAD, PAD); ctx.scale(S, S);
  ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.stroke(new Path2D(d));
  ctx.restore();
}

export async function realisticShirtURL(kit, seed = 0) {
  // flat artwork: drop the cartoon outline and painted shadow, keep colours/graphics
  let svg = K.jerseySVG(kit)
    .replace(/<ellipse[^>]*\/>/, '')
    .replace(/<path d="M160 36 C 178 60[^"]*Z" fill="none" stroke="#000"[^>]*\/>/, '')
    .replace('<svg ', `<svg width="${1000}" height="${1100}" `);
  const img = await loadSVG(svg);

  const albedo = canvas();
  const actx = albedo.getContext('2d');
  actx.drawImage(img, PAD, PAD, 1000, 1100);

  // body volume: stacked blurs of the silhouette = a soft inflated dome
  const mask = canvas();
  const mctx = mask.getContext('2d');
  mctx.drawImage(albedo, 0, 0);
  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, CW, CH);
  const dome = canvas();
  const dctx = dome.getContext('2d');
  dctx.fillStyle = '#000'; dctx.fillRect(0, 0, CW, CH);
  for (const [r, a] of [[90, 0.45], [40, 0.35], [14, 0.25]]) {
    dctx.filter = `blur(${r}px)`; dctx.globalAlpha = a; dctx.globalCompositeOperation = 'lighter';
    dctx.drawImage(mask, 0, 0);
  }
  dctx.filter = 'none'; dctx.globalAlpha = 1; dctx.globalCompositeOperation = 'source-over';

  // folds + seams around mid-grey
  const folds = canvas();
  const fctx = folds.getContext('2d');
  fctx.fillStyle = 'rgb(128,128,128)'; fctx.fillRect(0, 0, CW, CH);
  const fl = canvas(); const flc = fl.getContext('2d');
  for (const [d, w, s] of FOLDS) strokePath(flc, d, w, s > 0 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.6)');
  fctx.filter = 'blur(16px)'; fctx.drawImage(fl, 0, 0); fctx.filter = 'none';
  const sm = canvas(); const smc = sm.getContext('2d');
  for (const d of SEAMS) strokePath(smc, d, 2.2, 'rgba(0,0,0,.55)');
  fctx.filter = 'blur(2px)'; fctx.drawImage(sm, 0, 0); fctx.filter = 'none';

  // rounded silhouette: blur the mask, the shader thresholds it softly
  const rmask = canvas();
  const rctx = rmask.getContext('2d');
  rctx.fillStyle = '#000'; rctx.fillRect(0, 0, CW, CH);
  rctx.filter = 'blur(9px)'; rctx.drawImage(mask, 0, 0); rctx.filter = 'none';
  const g = relighter();
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
  g.mat.uniforms.albedo.value = tex(albedo);
  g.mat.uniforms.dome.value = tex(dome);
  g.mat.uniforms.folds.value = tex(folds);
  g.mat.uniforms.rmask.value = tex(rmask);
  g.mat.uniforms.seed.value = seed;
  g.renderer.render(g.scene, g.cam);

  // composite: soft contact shadow, then the relit shirt
  const out = canvas();
  const o = out.getContext('2d');
  o.filter = 'blur(26px)'; o.globalAlpha = 0.45;
  o.drawImage(mask, 14, 30);
  o.filter = 'blur(6px)'; o.globalAlpha = 0.25;
  o.drawImage(mask, 4, 8);
  o.filter = 'none'; o.globalAlpha = 1;
  o.globalCompositeOperation = 'source-over';
  // shadow canvases are white; tint them dark
  o.globalCompositeOperation = 'source-in';
  o.fillStyle = 'rgba(20,28,40,1)'; o.fillRect(0, 0, CW, CH);
  o.globalCompositeOperation = 'source-over';
  o.drawImage(g.c, 0, 0);
  Object.values(g.mat.uniforms).forEach(u => u.value && u.value.dispose && u.value.dispose());
  return out.toDataURL('image/png');
}
