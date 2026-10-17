// Asteroid Rush: the in-video 3D game sequence (t = 11 → 14 s).
// Everything is a pure function of time so frames render deterministically.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const T0 = 11;
export const ROCK_SPEED = 46;
const BOLT_SPEED = 170;
// [fire time, hit time]
export const SHOTS = [[11.55, 11.8], [12.05, 12.3], [12.55, 12.8], [13.3, 13.55], [13.6, 13.82]];
export const PICKUPS = [12.08, 12.6, 13.15];
const ROLL = [12.82, 13.22];

export const shipX = t => 1.35 * Math.sin((t - T0) * 2.4);
export const shipY = t => 0.35 * Math.sin((t - T0) * 1.7 + 1);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eOut = k => 1 - Math.pow(1 - k, 3);

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const radialTex = stops => canvasTex(128, 128, (x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});

export function createGame(renderer, rng) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.1, 600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0x5a78b8, 0.45));
  const key = new THREE.DirectionalLight(0xfff1e0, 3.0); key.position.set(-5, 6, 2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x4c9bff, 3.4); rim.position.set(6, 1, -8); scene.add(rim);
  const under = new THREE.DirectionalLight(0x7a5cff, 0.9); under.position.set(0, -6, 3); scene.add(under);

  const glowBlue = radialTex([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(158,216,255,.9)'], [0.5, 'rgba(46,107,255,.35)'], [1, 'rgba(46,107,255,0)']]);
  const glowFire = radialTex([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,236,190,.95)'], [0.4, 'rgba(255,150,60,.6)'], [0.7, 'rgba(120,60,255,.18)'], [1, 'rgba(60,40,255,0)']]);
  const glowRed = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,80,80,.9)'], [1, 'rgba(255,0,0,0)']]);
  const glowGreen = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(80,255,150,.9)'], [1, 'rgba(0,255,100,0)']]);
  const ringTex = canvasTex(256, 256, (x) => {
    const g = x.createRadialGradient(128, 128, 60, 128, 128, 128);
    g.addColorStop(0, 'rgba(158,216,255,0)'); g.addColorStop(0.7, 'rgba(200,235,255,.9)'); g.addColorStop(0.8, 'rgba(76,155,255,.5)'); g.addColorStop(1, 'rgba(46,107,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  });
  const sprite = (map, s = 1) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    m.scale.set(s, s, 1);
    return m;
  };

  /* ---------------- the ship ---------------- */
  const hullTex = canvasTex(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#dfe8f4'); g.addColorStop(0.5, '#f4f8fd'); g.addColorStop(1, '#d4deeb');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // nose cone and tail in dark chrome-blue
    x.fillStyle = '#16233d'; x.fillRect(0, 0, w, h * 0.09);
    x.fillStyle = '#1d2c4a'; x.fillRect(0, h * 0.9, w, h * 0.1);
    // livery bands
    x.fillStyle = '#2E6BFF'; x.fillRect(0, h * 0.56, w, h * 0.045);
    x.fillStyle = '#9ED8FF'; x.fillRect(0, h * 0.61, w, h * 0.012);
    // panel seams + rivets
    x.strokeStyle = 'rgba(30,40,60,.45)'; x.lineWidth = 2;
    [0.14, 0.27, 0.4, 0.5, 0.7, 0.8].forEach(v => { x.beginPath(); x.moveTo(0, v * h); x.lineTo(w, v * h); x.stroke(); });
    for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(i * w / 16, h * 0.14); x.lineTo(i * w / 16, h * (i % 2 ? 0.5 : 0.4)); x.stroke(); }
    for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo((i + 0.5) * w / 12, h * 0.62); x.lineTo((i + 0.5) * w / 12, h * 0.9); x.stroke(); }
    x.fillStyle = 'rgba(30,40,60,.5)';
    for (const v of [0.27, 0.7]) for (let i = 0; i < 64; i++) { x.beginPath(); x.arc(i * w / 64 + 4, v * h + 6, 1.6, 0, 6.283); x.fill(); }
    // vents
    x.fillStyle = 'rgba(20,28,45,.75)';
    for (let i = 0; i < 6; i++) x.fillRect(w * 0.2 + i * 14, h * 0.74, 8, h * 0.08);
    for (let i = 0; i < 6; i++) x.fillRect(w * 0.7 + i * 14, h * 0.74, 8, h * 0.08);
    // a little grime
    const r = rng(11);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(40,50,70,${r() * 0.05})`; x.fillRect(r() * w, r() * h, 2 + r() * 30, 1 + r() * 4); }
  });
  const wingTex = canvasTex(1024, 768, (x, w, h) => {
    x.fillStyle = '#eef3fa'; x.fillRect(0, 0, w, h);
    // UV space: u = (sx - 0.3) / 2.05, v = (sy + 0.9) / 1.5 — leading edge from (0.3, 0.6) to (2.3, -0.45)
    const P = (sx, sy) => [(sx - 0.3) / 2.05 * w, (1 - (sy + 0.9) / 1.5) * h];
    const band = (o, width, col) => {
      x.strokeStyle = col; x.lineWidth = width;
      x.beginPath(); x.moveTo(...P(0.3, 0.6 - o)); x.lineTo(...P(2.3, -0.45 - o)); x.stroke();
    };
    band(0.07, 34, '#16233d');
    band(0.17, 22, '#2E6BFF');
    band(0.23, 6, '#9ED8FF');
    x.strokeStyle = 'rgba(30,40,60,.4)'; x.lineWidth = 2;
    for (let i = 1; i < 7; i++) { x.beginPath(); x.moveTo(...P(0.3 + i * 0.3, 0.6)); x.lineTo(...P(0.3 + i * 0.3, -0.9)); x.stroke(); }
    for (let j = 1; j < 4; j++) { x.beginPath(); x.moveTo(...P(0.3, -0.9 + j * 0.3)); x.lineTo(...P(2.4, -0.9 + j * 0.3)); x.stroke(); }
    // flap at the trailing edge
    x.fillStyle = 'rgba(25,35,55,.25)';
    x.beginPath(); x.moveTo(...P(0.5, -0.78)); x.lineTo(...P(1.9, -0.78)); x.lineTo(...P(1.9, -0.9)); x.lineTo(...P(0.5, -0.9)); x.fill();
  });
  wingTex.repeat.set(1, 1);

  const paint = new THREE.MeshPhysicalMaterial({ map: hullTex, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.2 });
  const wingPaint = new THREE.MeshPhysicalMaterial({ map: wingTex, metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2a3446, metalness: 0.9, roughness: 0.32, envMapIntensity: 1.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6f2ff, metalness: 1, roughness: 0.12, envMapIntensity: 1.8 });
  const neon = new THREE.MeshStandardMaterial({ color: 0x2e6bff, emissive: 0x6fb4ff, emissiveIntensity: 2.2, roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1c3d, metalness: 0.1, roughness: 0.03, clearcoat: 1, emissive: 0x2e6bff, emissiveIntensity: 0.28, envMapIntensity: 2.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.8 });

  const ship = new THREE.Group();
  const hullPts = [[0, -2.0], [0.07, -1.88], [0.18, -1.6], [0.3, -1.1], [0.39, -0.5], [0.44, 0.1], [0.44, 0.7], [0.38, 1.12], [0.3, 1.3], [0, 1.3]];
  const hull = new THREE.Mesh(new THREE.LatheGeometry(hullPts.map(p => new THREE.Vector2(p[0], p[1])), 48), paint);
  hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, 0.72); ship.add(hull);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.5), gunmetal);
  spine.position.set(0, 0.33, 0.45); ship.add(spine);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), glass);
  canopy.scale.set(0.24, 0.19, 0.66); canopy.position.set(0, 0.22, -0.62); ship.add(canopy);
  for (const z of [-0.95, -0.55, -0.2]) {
    const k = Math.sqrt(Math.max(0, 1 - ((z + 0.62) / 0.66) ** 2));
    const fr = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 40, Math.PI), chrome);
    fr.scale.set(0.245 * k + 0.004, 0.195 * k + 0.004, 1); fr.position.set(0, 0.22, z); ship.add(fr);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1.25), chrome);
  ridge.position.set(0, 0.415, -0.6); ship.add(ridge);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.3, 0.6); wingShape.lineTo(2.3, -0.45); wingShape.lineTo(2.35, -0.85); wingShape.lineTo(0.3, -0.9); wingShape.lineTo(0.3, 0.6);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
  // remap UVs to 0..1 over the wing's footprint so the livery lands right
  {
    const uv = wingGeo.attributes.uv, p = wingGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - 0.3) / 2.05, (p.getY(i) + 0.9) / 1.5);
  }
  ship.userData.lights = [];
  ship.userData.cannons = [];
  for (const sx of [1, -1]) {
    const w = new THREE.Mesh(wingGeo, wingPaint);
    w.rotation.x = -Math.PI / 2; w.scale.set(sx, 1, 1); w.position.set(0, -0.08, 0.05); ship.add(w);
    // wing tip pod + nav light
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 6, 12), gunmetal);
    tip.rotation.x = Math.PI / 2; tip.position.set(sx * 2.34, -0.03, 0.6); ship.add(tip);
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: sx > 0 ? 0x66ffaa : 0xff5566 }));
    nav.position.set(sx * 2.34, -0.03, 0.3); ship.add(nav);
    const navGlow = sprite(sx > 0 ? glowGreen : glowRed, 0.7);
    navGlow.position.copy(nav.position); ship.add(navGlow);
    ship.userData.lights.push(navGlow);
    // neon strip along the wing
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.02, 0.04), neon);
    strip.position.set(sx * 1.32, 0.0, 0.48); strip.rotation.y = sx * 0.0; ship.add(strip);
    // cannon under the wing
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.1, 14), gunmetal);
    gun.rotation.x = Math.PI / 2; gun.position.set(sx * 0.95, -0.16, -0.35); ship.add(gun);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 16), chrome);
    muzzle.position.set(sx * 0.95, -0.16, -0.92); ship.add(muzzle);
    const flash = sprite(glowBlue, 0.01);
    flash.position.set(sx * 0.95, -0.16, -1.05); ship.add(flash);
    ship.userData.cannons.push(flash);
    // side intake
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.17, 0.55), gunmetal);
    intake.position.set(sx * 0.42, 0.02, -0.05); ship.add(intake);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.13), black);
    mouth.position.set(sx * 0.42, 0.02, -0.33); mouth.rotation.y = Math.PI; ship.add(mouth);
    // V-tail fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.55), paint);
    fin.position.set(sx * 0.3, 0.42, 1.0); fin.rotation.z = -sx * 0.38; fin.rotation.x = -0.25; ship.add(fin);
    const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.4), neon);
    finTip.position.set(sx * 0.41, 0.69, 1.06); finTip.rotation.z = -sx * 0.38; finTip.rotation.x = -0.25; ship.add(finTip);
  }
  // twin engines
  ship.userData.plumes = [];
  ship.userData.flames = [];
  const plumeMat = new THREE.ShaderMaterial({
    uniforms: { flick: { value: 1 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float flick; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float a = pow(1.0 - vUv.y, 1.6) * pow(abs(dot(vN, vV)), 1.5) * flick; vec3 c = mix(vec3(0.18,0.42,1.0), vec3(0.92,0.97,1.0), pow(1.0 - vUv.y, 3.0)); gl_FragColor = vec4(c * a, a); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  for (const sx of [1, -1]) {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.15, 28), gunmetal);
    nac.rotation.x = Math.PI / 2; nac.position.set(sx * 0.58, -0.04, 0.75); ship.add(nac);
    for (const z of [0.4, 0.75]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.018, 8, 32), chrome);
      band.position.set(sx * 0.58, -0.04, z); ship.add(band);
    }
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.04, 10, 32), chrome);
    lip.position.set(sx * 0.58, -0.04, 1.33); ship.add(lip);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), neon);
    core.position.set(sx * 0.58, -0.04, 1.31); ship.add(core);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 20), chrome);
    cone.rotation.x = Math.PI / 2; cone.position.set(sx * 0.58, -0.04, 1.36); ship.add(cone);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.3, 28, 1, true), plumeMat);
    plume.rotation.x = Math.PI / 2; plume.position.set(sx * 0.58, -0.04, 1.33 + 0.65); ship.add(plume);
    ship.userData.plumes.push(plume);
    const f = sprite(glowBlue, 1.2);
    f.position.set(sx * 0.58, -0.04, 1.45); ship.add(f);
    ship.userData.flames.push(f);
  }
  const strobe = sprite(glowBlue, 0.6);
  strobe.position.set(0, 0.5, 1.25); ship.add(strobe);
  ship.userData.strobe = strobe;
  ship.scale.setScalar(0.92);
  scene.add(ship);

  /* ---------------- rocks ---------------- */
  function rockGeo(seed, detail) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail));
    const r = rng(seed);
    const dirs = Array.from({ length: 6 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(1.4 + r() * 2.6));
    const amps = dirs.map(() => 0.05 + r() * 0.08);
    const craters = Array.from({ length: 7 }, () => ({ c: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), rad: 0.22 + r() * 0.35, d: 0.06 + r() * 0.1 }));
    const pos = g.attributes.position, v = new THREE.Vector3();
    const col = new Float32Array(pos.count * 3);
    const hash = p => { const s = Math.sin(p.x * 127.1 + p.y * 311.7 + p.z * 74.7) * 43758.5453; return s - Math.floor(s); };
    const tint = r();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      let d = 1, shadeK = 0;
      dirs.forEach((dd, j) => (d += Math.sin(v.dot(dd) * 3 + j) * amps[j]));
      for (const c of craters) {
        const x = Math.acos(clamp(v.dot(c.c), -1, 1)) / c.rad;
        if (x < 1) { d -= c.d * (1 - x * x); shadeK -= 0.35 * (1 - x); }
        d += c.d * 0.45 * Math.exp(-(((x - 1.05) / 0.16) ** 2));
        shadeK += 0.25 * Math.exp(-(((x - 1.05) / 0.16) ** 2));
      }
      const n = hash(v);
      d += (n - 0.5) * 0.03;
      v.multiplyScalar(d);
      pos.setXYZ(i, v.x, v.y * 0.86, v.z);
      // dusty grey-brown with lighter rims, darker crater floors and a few blue mineral flecks
      let cr = 0.085 + tint * 0.02, cg = 0.075 + tint * 0.01, cb = 0.07;
      const k = 1 + shadeK + (n - 0.5) * 0.25;
      cr *= k; cg *= k; cb *= k;
      if (n > 0.965) { cr = 0.1; cg = 0.3; cb = 0.85; }
      col.set([cr, cg, cb], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.05, envMapIntensity: 0.35 });
  const rockGeos = [1, 2, 3, 4, 5, 6].map(s => rockGeo(s, 5));
  const smallGeo = rockGeo(9, 1);
  const GR = rng(42);
  const ROCKS = [];
  for (let i = 0; i < 64; i++) {
    let x = (GR() * 2 - 1) * 16, y = (GR() * 2 - 1) * 9 + 1.5;
    if (Math.abs(x) < 3 && Math.abs(y) < 2.2) x += Math.sign(x || 1) * 3.5;
    let s = 0.5 + Math.pow(GR(), 2) * 2.6;
    if (Math.abs(x) < 8 && Math.abs(y) < 5) s = Math.min(s, 1.3);
    s = Math.min(s, 1.9); y = Math.max(y, -3.5);
    const m = new THREE.Mesh(rockGeos[i % 6], rockMat);
    m.scale.setScalar(s);
    ROCKS.push({ m, x, y, z0: -GR() * 130, rx: GR() * 6, ry: GR() * 6, sp: 0.3 + GR() * 0.9, target: 0 });
    scene.add(m);
  }
  SHOTS.forEach(([tf, th], i) => {
    const m = new THREE.Mesh(rockGeos[i % 6], rockMat);
    m.scale.setScalar(1.35);
    const zHit = -BOLT_SPEED * (th - tf) - 2;
    ROCKS.push({ m, x: shipX(tf), y: shipY(tf), z0: zHit - ROCK_SPEED * (th - T0), rx: i, ry: i * 2, sp: 0.8, target: th });
    scene.add(m);
  });

  // fine debris and dust for speed
  const DEB = 260;
  const debris = new THREE.InstancedMesh(smallGeo, rockMat, DEB);
  const debData = Array.from({ length: DEB }, () => ({ x: (GR() * 2 - 1) * 14, y: (GR() * 2 - 1) * 8 + 1, z0: -GR() * 120, s: 0.05 + GR() * 0.16, r: GR() * 6 }));
  scene.add(debris);
  const DUST = 1400;
  const dustGeo = new THREE.BufferGeometry();
  const dustBase = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustBase.set([(GR() * 2 - 1) * 18, (GR() * 2 - 1) * 10 + 1, -GR() * 140], i * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xbfe0ff, size: 0.07, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  // a ringed planet far behind
  const planet = new THREE.Mesh(new THREE.SphereGeometry(30, 96, 64), new THREE.ShaderMaterial({
    uniforms: { L: { value: new THREE.Vector3(-0.6, 0.5, 0.6).normalize() } },
    vertexShader: 'varying vec3 vN; varying vec3 vO; varying vec3 vV; void main(){ vO = position; vN = normalize(mat3(modelMatrix)*normal); vec4 wp = modelMatrix*vec4(position,1.); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }',
    fragmentShader: `uniform vec3 L; varying vec3 vN; varying vec3 vO; varying vec3 vV;
      void main(){
        float y = vO.y / 30.0;
        float b = sin(y * 22.0 + sin(y * 7.0 + vO.x * 0.08) * 1.6) * 0.5 + 0.5;
        float b2 = sin(y * 61.0 + vO.z * 0.05) * 0.5 + 0.5;
        vec3 c = mix(vec3(0.20, 0.16, 0.42), vec3(0.42, 0.58, 0.95), b);
        c = mix(c, vec3(0.75, 0.82, 1.0), b2 * 0.18);
        float d = max(dot(normalize(vN), L), 0.0);
        float fres = pow(1.0 - max(dot(normalize(vN), vV), 0.0), 2.5);
        gl_FragColor = vec4(c * (0.05 + 1.0 * d) + vec3(0.3, 0.55, 1.0) * fres * 0.6, 1.0);
      }`
  }));
  planet.position.set(-34, 22, -175);
  planet.rotation.z = 0.35;
  scene.add(planet);
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(38, 62, 128, 1), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float r = length(vP.xy); float k = (r - 38.0) / 24.0; float a = (0.35 + 0.35 * sin(k * 40.0) * sin(k * 13.0)) * smoothstep(0.0, 0.08, k) * smoothstep(1.0, 0.85, k); gl_FragColor = vec4(vec3(0.62, 0.74, 1.0) * a, a); }',
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  ringMesh.position.copy(planet.position);
  ringMesh.rotation.set(1.25, 0.2, 0.35);
  scene.add(ringMesh);

  /* ---------------- lasers, pickups, explosions ---------------- */
  const boltCore = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const boltGlow = new THREE.MeshBasicMaterial({ color: 0x4c9bff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const BOLTS = SHOTS.map(() => {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8), boltCore);
      c.rotation.x = Math.PI / 2; c.position.x = sx * 0.87; g.add(c);
      const o = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.8, 12), boltGlow);
      o.rotation.x = Math.PI / 2; o.position.x = sx * 0.87; g.add(o);
      const head = sprite(glowBlue, 1.1); head.position.set(sx * 0.87, 0, -1.8); g.add(head);
    }
    scene.add(g);
    return g;
  });

  const tokenMat = new THREE.MeshStandardMaterial({ color: 0x9ed8ff, emissive: 0x2e6bff, emissiveIntensity: 1.2, metalness: 0.9, roughness: 0.15, envMapIntensity: 2 });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.14 : 0.32;
    i ? starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.03, bevelSegments: 2 });
  starGeo.center();
  const TOKENS = PICKUPS.map(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 16, 48), tokenMat));
    g.add(new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9ed8ff, emissiveIntensity: 1.5, metalness: 0.6, roughness: 0.2 })));
    g.add(sprite(glowBlue, 2.4));
    scene.add(g);
    return g;
  });

  const BOOMS = SHOTS.map((s, i) => {
    const g = new THREE.Group();
    const fire = sprite(glowFire, 1); g.add(fire);
    const fire2 = sprite(glowFire, 1); g.add(fire2);
    const ring = sprite(ringTex, 1); g.add(ring);
    const r = rng(500 + i);
    const chunks = Array.from({ length: 12 }, () => {
      const m = new THREE.Mesh(smallGeo, rockMat);
      g.add(m);
      return { m, v: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(4 + r() * 7), s: 0.12 + r() * 0.2, spin: r() * 10 };
    });
    scene.add(g);
    return { g, fire, fire2, ring, chunks };
  });

  /* ---------------- per-frame ---------------- */
  function update(t) {
    const gt = t - T0;
    const sx = shipX(t), sy = shipY(t);
    const vx = 1.35 * 2.4 * Math.cos(gt * 2.4);
    const roll = eInOut(prog(t, ROLL[0], ROLL[1])) * Math.PI * 2;
    ship.position.set(sx, sy, 0);
    ship.rotation.set(0.06 + Math.sin(t * 3.1) * 0.02, -vx * 0.05, -vx * 0.22 - roll);
    const fl = 0.9 + 0.12 * Math.sin(t * 57) + 0.08 * Math.sin(t * 91);
    ship.userData.flames.forEach(f => f.scale.set(1.3 * fl, 1.3 * fl, 1));
    ship.userData.plumes.forEach(p => p.scale.set(1, 0.9 + 0.2 * fl, 1));
    plumeMat.uniforms.flick.value = fl;
    ship.userData.lights.forEach(l => { const on = (t * 2) % 1 < 0.18 ? 0.55 : 0.25; l.scale.set(on, on, 1); });
    ship.userData.strobe.material.opacity = (t * 1.5 + 0.5) % 1 < 0.08 ? 1 : 0;
    ship.userData.cannons.forEach(c => {
      let k = 0;
      for (const [tf] of SHOTS) if (t >= tf && t < tf + 0.1) k = 1 - (t - tf) / 0.1;
      c.scale.set(0.01 + k * 1.4, 0.01 + k * 1.4, 1);
    });

    // camera with a little shake after each blast
    let shake = 0;
    for (const [, th] of SHOTS) if (t >= th) shake += 0.12 * Math.exp(-(t - th) / 0.12);
    cam.position.set(sx * 0.5 + Math.sin(t * 71) * shake, sy * 0.5 + 2.4 + Math.cos(t * 63) * shake, 10.5);
    cam.lookAt(sx * 0.65, sy * 0.5 + 1.2, -8);
    cam.rotation.z += -vx * 0.02;
    cam.setViewOffset(1080, 1920, 0, -330, 1080, 1920);
    cam.updateMatrixWorld();

    const hits = [];
    for (const r of ROCKS) {
      let z = r.z0 + ROCK_SPEED * gt;
      if (!r.target) z = ((z + 125) % 135 + 135) % 135 - 125;
      r.m.position.set(r.x, r.y, z);
      r.m.rotation.set(r.rx + t * r.sp, r.ry + t * r.sp * 0.7, 0);
      r.m.visible = !(r.target && t >= r.target) && z < -3;
      if (r.target && t >= r.target && t < r.target + 0.9) hits.push({ pos: new THREE.Vector3(r.x, r.y, r.z0 + ROCK_SPEED * (r.target - T0)), t0: r.target });
    }
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    debData.forEach((d, i) => {
      const z = ((d.z0 + ROCK_SPEED * 1.1 * gt + 115) % 125 + 125) % 125 - 115;
      p.set(d.x, d.y, z);
      e.set(d.r + t * 2, d.r * 2 + t * 1.5, 0);
      q.setFromEuler(e);
      sc.setScalar(z < 2 ? d.s : 0.0001);
      mtx.compose(p, q, sc);
      debris.setMatrixAt(i, mtx);
    });
    debris.instanceMatrix.needsUpdate = true;
    const dp = dustGeo.attributes.position;
    for (let i = 0; i < DUST; i++) {
      const z = ((dustBase[i * 3 + 2] + ROCK_SPEED * 1.2 * gt + 135) % 145 + 145) % 145 - 135;
      dp.setXYZ(i, dustBase[i * 3], dustBase[i * 3 + 1], z);
    }
    dp.needsUpdate = true;

    BOLTS.forEach((b, i) => {
      const [tf, th] = SHOTS[i];
      b.visible = t >= tf && t < th;
      b.position.set(shipX(tf), shipY(tf) - 0.15, -1.2 - BOLT_SPEED * (t - tf));
    });

    BOOMS.forEach((bm, i) => {
      const th = SHOTS[i][1];
      const k = t - th;
      bm.g.visible = k >= 0 && k < 1.2;
      if (!bm.g.visible) return;
      const hp = hits.find(h => h.t0 === th)?.pos || new THREE.Vector3(shipX(SHOTS[i][0]), shipY(SHOTS[i][0]), -40);
      bm.g.position.copy(hp).add(new THREE.Vector3(0, 0, ROCK_SPEED * 0.6 * k));
      const f = eOut(clamp(k / 0.45));
      bm.fire.scale.setScalar(1 + 7 * f); bm.fire.material.opacity = 1 - clamp(k / 0.55);
      bm.fire2.scale.setScalar(0.5 + 4 * eOut(clamp(k / 0.25))); bm.fire2.material.opacity = 1 - clamp(k / 0.3);
      bm.ring.scale.setScalar(1 + 14 * eOut(clamp(k / 0.6))); bm.ring.material.opacity = 1 - clamp(k / 0.6);
      bm.chunks.forEach(c => {
        c.m.position.copy(c.v).multiplyScalar(k * (1 - k * 0.3));
        c.m.rotation.set(c.spin * k, c.spin * k * 0.7, 0);
        c.m.scale.setScalar(c.s * (1 - clamp(k / 1.2)));
      });
    });

    const pickups = [];
    TOKENS.forEach((g, i) => {
      const tp = PICKUPS[i];
      const z = ROCK_SPEED * (t - tp);
      g.visible = t < tp && z > -110;
      g.position.set(shipX(tp), shipY(tp) + 0.05, z);
      g.rotation.set(0, t * 4 + i, 0);
      if (t >= tp && t < tp + 0.8) pickups.push({ pos: new THREE.Vector3(shipX(tp), shipY(tp) + 0.6, 0), t0: tp });
    });

    return { hits, pickups, reticle: new THREE.Vector3(sx, sy, -26) };
  }

  return { scene, cam, update };
}
