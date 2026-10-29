// A client's plan (90 days by default) as a voyage: one buoy per week, the client's yacht sails the course from the
// start marina, past the launch event, to the last-day lighthouse. Built by plans/build.mjs; every word
// and date comes from the plan data embedded in the page (see plans/README.md).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const PLAN = JSON.parse(document.getElementById('plan-data').textContent);
const LOGO_URI = document.getElementById('logo-data').textContent.trim();
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V3 = THREE.Vector3;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const TH = PLAN.theme || {};
const FONT = `"${TH.font || 'Archivo'}", "Helvetica Neue", Arial, sans-serif`;
const GOLD = TH.accent || '#e8a92e', GOLD_INK = TH.accentInk || '#b87c0b', NAVY = TH.navy || '#0f2c4a';
const WEEKS = PLAN.weeks;
const PH = Object.fromEntries(PLAN.phases.map(p => [p.id, p]));
const KIND = { video: 'Video', short: 'Shorts', article: 'Article', note: 'Note', post: 'Post', setup: 'Setup', report: 'Report' };
const isPhone = () => innerWidth <= 760;
const lowPower = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;

// ---------- shared check marks (same key as the checklist page) ----------
let state = {};
const load = () => { try { state = JSON.parse(localStorage.getItem(PLAN.storeKey) || '{}') || {}; } catch { state = {}; } };
const save = () => { try { localStorage.setItem(PLAN.storeKey, JSON.stringify(state)); } catch {} };
load();
const SHOTS = PLAN.launch.shots;
const LAUNCH_IDX = WEEKS.findIndex(w => w.phase === PLAN.launchPhase);
const weekIds = i => [...WEEKS[i].you, ...WEEKS[i].out, ...(i === LAUNCH_IDX ? SHOTS : [])].map(x => x.id);
const ALL_IDS = [...new Set(WEEKS.flatMap((w, i) => weekIds(i)))];
const weekDone = i => weekIds(i).every(id => state[id]);

// which week is it today
const today = new Date();
let todayIdx = 0;
WEEKS.forEach((w, i) => { if (today >= new Date(w.start + 'T00:00:00')) todayIdx = i; });

// ---------- renderer ----------
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no webgl');
} catch (e) { document.body.classList.add('nogl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const HAZE = '#c6e3ea';
scene.fog = new THREE.Fog(HAZE, 420, 1500); // stretched for long courses once the course is laid out
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 4000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.42; controls.minDistance = 22; controls.maxDistance = 900; // raised for long courses below

function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const api = { c, x, t, draw(fn) { x.clearRect(0, 0, w, h); fn(x, w, h); t.needsUpdate = true; } };
  if (draw) api.draw(draw);
  return api;
}
function rrPath(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function rrShape(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function rrGeo(w, d, r, h) { const g = new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: h, bevelEnabled: false, curveSegments: 10 }); g.rotateX(-Math.PI / 2); return g; }
const glowMat = (hex, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- sky ----------
{
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { top: { value: new THREE.Color('#3a9cc6') }, mid: { value: new THREE.Color('#86c7de') }, low: { value: new THREE.Color('#cfe8ee') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.7, h)) : mix(low, mid, smoothstep(-0.02, 0.08, h)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), m); sky.renderOrder = -1; scene.add(sky);
  const cloudTex = tex(256, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.55, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const cm = new THREE.SpriteMaterial({ map: cloudTex.t, fog: false, depthWrite: false, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 22; i++) { const a = rnd() * Math.PI * 2, d = 1150 + rnd() * 400, s = 180 + rnd() * 240; const c = new THREE.Sprite(cm); c.position.set(Math.cos(a) * d, 220 + rnd() * 320, Math.sin(a) * d); c.scale.set(s * 2.2, s * 0.6, 1); scene.add(c); }
}
scene.add(new THREE.HemisphereLight('#d6f1fb', '#c9bfa8', 0.92));
const sun = new THREE.DirectionalLight('#fff0d8', 2.35);
sun.castShadow = true;
sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 400 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);
const SUN_OFF = new V3(-90, 150, 110);

// ---------- course ----------
const COAST_Z = -92;
const START = new V3(-500, 0, -52); // just off the start marina
// a gentle zigzag offshore; the launch week's buoy sits close to shore, in front of the event
const ZIGZAG = [-6, 20, 4, 8, 2, 28, 12, -6, 18, 34, 14, 28, 16];
// buoys 70 apart for a 13-week plan; longer plans pack them a little tighter so the course stays one coastline
const STEP = WEEKS.length <= 13 ? 70 : Math.max(48, Math.round(910 / (WEEKS.length - 1)));
const BUOYS = WEEKS.map((w, i) => new V3(-410 + i * STEP, 0, i === LAUNCH_IDX ? -34 : ZIGZAG[i % ZIGZAG.length]));
const ISLE = new V3(BUOYS[BUOYS.length - 1].x + 124, 0, 6);
// the course's middle and its size against the 13-week course (1 = 13 weeks), for the overview, fog and coastline
const CX = (START.x + ISLE.x) / 2, K = (ISLE.x + 60 - (START.x - 60)) / 1160;
const X0 = START.x - 800, X1 = ISLE.x + 800;
controls.maxDistance = 900 * Math.max(1, K);
const curve = new THREE.CatmullRomCurve3([START, ...BUOYS, new V3(ISLE.x - 64, 0, ISLE.z + 14)], false, 'centripetal', 0.5);
const CL = curve.getLength();
const SAMPLES = 2400, samp = curve.getSpacedPoints(SAMPLES);
const uOf = p => { let best = 0, bd = 1e9; samp.forEach((s, k) => { const d = s.distanceToSquared(p); if (d < bd) { bd = d; best = k; } }); return best / SAMPLES; };
const WEEK_U = BUOYS.map(uOf).map((v, i) => Math.max(0.004, v - (i === BUOYS.length - 1 ? 18 : 30) / CL)); // the yacht stops just short of each buoy

// ---------- water ----------
const waterU = { time: { value: 0 } };
{
  const m = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { ...waterU, hk: { value: Math.max(1, K) }, shallow: { value: new THREE.Color('#7fd3cb') }, mid: { value: new THREE.Color('#2fa5b8') }, deep: { value: new THREE.Color('#14739a') }, haze: { value: new THREE.Color(HAZE) }, isle: { value: new THREE.Vector2(ISLE.x, ISLE.z) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float time, hk; uniform vec3 shallow, mid, deep, haze; uniform vec2 isle; varying vec3 vW;
      void main(){
        float d = vW.z - (${COAST_Z.toFixed(1)});
        float di = length(vW.xz - isle) - 44.0;
        float s = min(d, di);
        vec3 c = mix(shallow, mid, smoothstep(0.0, 60.0, s));
        c = mix(c, deep, smoothstep(80.0, 460.0, d) * smoothstep(20.0, 120.0, di));
        float n = sin(vW.x * 0.09 + time * 0.7) * sin(vW.z * 0.12 - time * 0.55) + 0.6 * sin((vW.x - vW.z) * 0.21 + time * 1.1) + 0.4 * sin(vW.x * 0.37 - time * 1.4 + sin(vW.z * 0.2));
        c += n * 0.02;
        c += pow(max(0.0, n - 1.2) / 0.8, 3.0) * 0.4;
        float dist = length(vW - cameraPosition);
        c = mix(c, haze, smoothstep(420.0 * hk, 1600.0 * hk, dist));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), m);
  scene.add(water);
  // a shadow catcher on the water so the yacht sits on it
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.16 }));
  sc.position.y = 0.02; sc.receiveShadow = true; scene.add(sc);
}

// ---------- coast: beach, palms, a white skyline ----------
const white = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.55 });
const wood = new THREE.MeshStandardMaterial({ color: '#a8875f', roughness: 0.85 });
const sandMat = new THREE.MeshStandardMaterial({ color: '#d4bd90', roughness: 0.95 });
const grassMat = new THREE.MeshStandardMaterial({ color: '#6f9d58', roughness: 0.95 });
{
  scene.fog.near = 420 * Math.max(1, K); scene.fog.far = 1500 * Math.max(1, K);
  const CW = X1 - X0 + 1000;
  const sand = new THREE.Mesh(new THREE.BoxGeometry(CW, 1.6, 18), sandMat); sand.position.set(CX, -0.2, COAST_Z - 9); sand.receiveShadow = true; scene.add(sand);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(CW, 2, 900), grassMat); grass.position.set(CX, 0, COAST_Z - 18 - 450); grass.receiveShadow = true; scene.add(grass);
  const road = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.1, 9), new THREE.MeshStandardMaterial({ color: '#c7c0b2', roughness: 0.9 })); road.position.set(CX, 1.05, COAST_Z - 30); scene.add(road);
}
// palms
{
  const crownPts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; crownPts.push(new THREE.Vector2(0.05 + t * 4.2, 0.6 * Math.sin(t * Math.PI) - t * t * 1.4)); }
  const pts = [];
  for (let x = X0; x <= X1; x += 11 + rnd() * 8) pts.push([x + (rnd() - 0.5) * 4, COAST_Z - 12 - rnd() * 6]);
  for (let a = 0; a < Math.PI * 2; a += 0.35 + rnd() * 0.2) pts.push([ISLE.x + Math.cos(a) * 30, ISLE.z + Math.sin(a) * 24]);
  const pc = new THREE.InstancedMesh(new THREE.LatheGeometry(crownPts, 9), new THREE.MeshStandardMaterial({ color: '#3f7b3d', roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), pts.length);
  const pt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.38, 9, 7).translate(0, 4.5, 0), new THREE.MeshStandardMaterial({ color: '#a8916f', roughness: 0.9 }), pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  pts.forEach(([x, z], i) => {
    const lean = (rnd() - 0.5) * 0.35, h = 0.85 + rnd() * 0.4, y = Math.hypot(x - ISLE.x, z - ISLE.z) < 60 ? 1.6 : 0.6;
    q.setFromEuler(new THREE.Euler(lean * 0.6, rnd() * 6.28, lean));
    m4.compose(new V3(x, y, z), q, new V3(1, h, 1)); pt.setMatrixAt(i, m4);
    const top = new V3(0, 9 * h, 0).applyQuaternion(q).add(new V3(x, y, z));
    q.setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0));
    m4.compose(top, q, new V3(1, 1, 1)); pc.setMatrixAt(i, m4);
  });
  pc.castShadow = pt.castShadow = true;
  scene.add(pc, pt);
}
// buildings: taller around the launch event, lower elsewhere
{
  const band = tex(64, 256, (x, w, h) => { x.fillStyle = '#e9e6df'; x.fillRect(0, 0, w, h); x.fillStyle = '#4d6d84'; for (let i = 0; i < 10; i++) x.fillRect(0, i * 25.6 + 9, w, 11); });
  const topT = new THREE.MeshStandardMaterial({ color: '#e6e2d9', roughness: 0.7 });
  const side = new THREE.MeshStandardMaterial({ map: band.t, roughness: 0.45, metalness: 0.05 });
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const n = Math.round((lowPower ? 150 : 260) * Math.max(1, K));
  const bm = new THREE.InstancedMesh(geo, [side, side, topT, topT, side, side], n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const fx = BUOYS[LAUNCH_IDX].x;
  for (let i = 0; i < n; i++) {
    const x = X0 + rnd() * (X1 - X0), z = COAST_Z - 70 - rnd() * 280;
    const k = Math.exp(-((x - fx) ** 2) / (2 * 150 ** 2)), k2 = Math.exp(-((x - START.x) ** 2) / (2 * 120 ** 2));
    const h = 6 + rnd() * 10 + k * (24 + rnd() * 60) + k2 * rnd() * 16;
    const w = 10 + rnd() * 16, d = 10 + rnd() * 14;
    q.setFromAxisAngle(new V3(0, 1, 0), (rnd() - 0.5) * 0.2);
    m4.compose(new V3(x, 1, z), q, new V3(w, h, d)); bm.setMatrixAt(i, m4);
  }
  bm.castShadow = false; bm.receiveShadow = true; scene.add(bm);
}

// ---------- yachts ----------
const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.05, envMapIntensity: 1.1 });
const yWhite = new THREE.MeshStandardMaterial({ color: '#dfddd6', roughness: 0.3, metalness: 0.02 });
const yGlass = new THREE.MeshStandardMaterial({ color: '#17222d', roughness: 0.1, metalness: 0.75, envMapIntensity: 1.3 });
function hullGeo(L, W, H, stripe) {
  const sh = new THREE.Shape();
  sh.moveTo(-W * 0.44, L / 2); sh.lineTo(W * 0.44, L / 2); sh.quadraticCurveTo(W / 2, L / 2, W / 2, L * 0.42);
  sh.lineTo(W / 2, -L * 0.06); sh.quadraticCurveTo(W / 2, -L * 0.38, 0, -L / 2); sh.quadraticCurveTo(-W / 2, -L * 0.38, -W / 2, -L * 0.06);
  sh.lineTo(-W / 2, L * 0.42); sh.quadraticCurveTo(-W / 2, L / 2, -W * 0.44, L / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: H, steps: 10, bevelEnabled: false, curveSegments: 20 });
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, n = pos.count, oy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i); oy[i] = y;
    const t = 1 - y / H, zn = pos.getZ(i) / (L / 2);
    pos.setX(i, pos.getX(i) * (1 - 0.4 * t * t));
    if (zn > 0) pos.setY(i, y + (1 - t) * zn * zn * H * 0.32 + t * zn * zn * H * 0.62);
  }
  const col = new Float32Array(n * 3);
  const cWhite = new THREE.Color('#dfddd6'), cTeak = new THREE.Color('#a07850'), cBottom = new THREE.Color('#16283d'), cStripe = new THREE.Color(stripe);
  for (let k = 0; k < n; k += 3) {
    const a = oy[k], b = oy[k + 1], c = oy[k + 2], f = (a + b + c) / 3 / H;
    const cc = a === H && b === H && c === H ? cTeak : a === 0 && b === 0 && c === 0 ? cBottom : f < 0.3 ? cBottom : Math.floor(f * 10) === 6 ? cStripe : cWhite;
    for (let j = 0; j < 3; j++) { col[(k + j) * 3] = cc.r; col[(k + j) * 3 + 1] = cc.g; col[(k + j) * 3 + 2] = cc.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
const logoTex = tex(512, 512, (x, w, h) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h); });
{
  const img = new Image();
  img.onload = () => logoTex.draw((x, w, h) => {
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h);
    const s = Math.min(w * 0.84 / img.width, h * 0.7 / img.height), iw = img.width * s, ih = img.height * s;
    x.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  });
  img.src = LOGO_URI;
}
// a yacht with its bow toward +z, waterline at y=0
function makeYacht(L, stripe, hero) {
  const W = L * 0.235, H = L * 0.085;
  const g = new THREE.Group();
  const body = new THREE.Group(); body.position.y = -0.3 * H; g.add(body);
  const hull = new THREE.Mesh(hullGeo(L, W, H, stripe), hullMat); hull.castShadow = true; body.add(hull);
  const tier = (w, d, h, y, z, glassLen = 1) => {
    const r = Math.min(w, d) * 0.46;
    const m = new THREE.Mesh(rrGeo(w, d, r, h), yWhite); m.position.set(0, y, z); m.castShadow = true; body.add(m);
    const gd = d * glassLen, gz = z - d / 2 + gd / 2;
    const band = new THREE.Mesh(rrGeo(w * 1.02, gd * 1.01, Math.min(w * 1.02, gd) * 0.46, h * 0.42), yGlass); band.position.set(0, y + h * 0.3, gz); body.add(band);
    if (hero) { const trim = new THREE.Mesh(rrGeo(w * 1.03, d * 1.02, r * 1.02, 0.12), glowMat(GOLD, 1.3)); trim.position.set(0, y - 0.02, z); body.add(trim); }
  };
  const w1 = W * 0.8, d1 = L * 0.5, h1 = Math.max(1.2, L * 0.045), z1 = -L * 0.1;
  tier(w1, d1, h1, H, z1, 0.56);
  const w2 = W * 0.66, d2 = L * 0.33, h2 = h1 * 0.85, z2 = -L * 0.14;
  tier(w2, d2, h2, H + h1, z2);
  const topY = H + h1 + h2, roofY = topY + h2 * 0.9;
  const roof = new THREE.Mesh(rrGeo(W * 0.62, L * 0.2, W * 0.26, 0.24), yWhite); roof.position.set(0, roofY, -L * 0.17); roof.castShadow = true; body.add(roof);
  for (const [px, pz] of [[-W * 0.22, -L * 0.1], [W * 0.22, -L * 0.1], [-W * 0.22, -L * 0.24], [W * 0.22, -L * 0.24]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, roofY - topY, 6), yWhite); post.position.set(px, (roofY + topY) / 2, pz); body.add(post); }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(W * 0.2, 0.18, 8, 24, Math.PI), yWhite); arch.position.set(0, roofY + 0.2, -L * 0.2); body.add(arch);
  if (hero) {
    const mastH = L * 0.1, mastTop = roofY + W * 0.2 + mastH;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, mastH, 8), yWhite); mast.position.set(0, roofY + W * 0.2 + mastH / 2, -L * 0.2); body.add(mast);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: logoTex.t, toneMapped: false, side: THREE.DoubleSide })); flag.position.set(0, mastTop - 1.3, -L * 0.2 - 1.35); flag.rotation.y = Math.PI / 2; body.add(flag);
    g.userData.flag = flag;
    const ls = Math.min(h1 * 0.9, 3.4);
    for (const s of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(ls, ls), new THREE.MeshBasicMaterial({ map: logoTex.t, toneMapped: false }));
      decal.position.set(s * (w1 / 2 + 0.03), H + h1 / 2, z1 + d1 * 0.22); decal.rotation.y = s * Math.PI / 2; body.add(decal);
    }
    // portholes, lit gold
    const pr = Math.max(0.2, L * 0.0055), yP = H * 0.46, half = (W / 2) * (1 - 0.4 * (1 - 0.46) ** 2) + 0.03;
    const ph = new THREE.InstancedMesh(new THREE.CylinderGeometry(pr, pr, 0.1, 12).rotateZ(Math.PI / 2), glowMat('#ffc94d', 2), 24);
    const m4 = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) { m4.makeTranslation(s * half, yP, -L * 0.42 + i * (L * 0.34 / 11)); ph.setMatrixAt(k++, m4); }
    body.add(ph);
  }
  g.userData = { ...g.userData, L, W, body };
  return g;
}

// the hero yacht
const HERO_L = 34;
const hero = makeYacht(HERO_L, GOLD, true);
scene.add(hero);
// wake: a V of foam behind the stern
const wakeTex = tex(256, 512, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.strokeStyle = g; x.lineCap = 'round';
  for (const s of [-1, 1]) { x.lineWidth = 14; x.beginPath(); x.moveTo(w / 2 + s * 16, 6); x.quadraticCurveTo(w / 2 + s * 50, h * 0.4, w / 2 + s * (w / 2 - 12), h - 10); x.stroke(); }
  const c = x.createRadialGradient(w / 2, 40, 4, w / 2, 160, 140); c.addColorStop(0, 'rgba(255,255,255,0.9)'); c.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = c; x.beginPath(); x.ellipse(w / 2, 120, 34, 200, 0, 0, 7); x.fill();
});
wakeTex.t.colorSpace = THREE.SRGBColorSpace;
const wake = new THREE.Mesh(new THREE.PlaneGeometry(26, 70).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: wakeTex.t, transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false }));
// plane: v=1 (top of canvas) at -z after rotation; flip so the narrow end sits at the stern
wake.rotation.y = Math.PI; wake.position.set(0, 0.06, -HERO_L / 2 - 33);
hero.add(wake);
const bowFoam = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
bowFoam.scale.set(3, 1, 5); bowFoam.position.set(0, 0.05, HERO_L * 0.36); hero.add(bowFoam);

// ---------- labels ----------
function label(text, sub, color = NAVY, worldW = 46) {
  const t = tex(640, 180, (x, w, h) => {
    x.font = `800 58px ${FONT}`; const tw = x.measureText(text).width;
    x.font = `700 34px ${FONT}`; const sw = sub ? x.measureText(sub).width : 0;
    const bw = Math.min(w - 8, Math.max(tw, sw) + 64), bh = sub ? 150 : 96, bx = (w - bw) / 2, by = (h - bh) / 2;
    x.fillStyle = 'rgba(255,255,255,0.94)'; rrPath(x, bx, by, bw, bh, 26); x.fill();
    x.fillStyle = color; x.fillRect(bx + 26, by + bh - 6, bw - 52, 4);
    x.textAlign = 'center'; x.fillStyle = NAVY; x.font = `800 58px ${FONT}`; x.fillText(text, w / 2, by + (sub ? 70 : 68));
    if (sub) { x.fillStyle = GOLD_INK; x.font = `700 34px ${FONT}`; x.fillText(sub, w / 2, by + 120); }
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(worldW, worldW * 180 / 640, 1); s.renderOrder = 5;
  s.userData.tex = t;
  return s;
}

// ---------- start marina ----------
{
  const x0 = START.x;
  const pier = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 60), wood); pier.position.set(x0 - 20, 0.3, COAST_Z + 30); pier.castShadow = pier.receiveShadow = true; scene.add(pier);
  for (const dz of [-14, 6, 24]) { const f = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 3), wood); f.position.set(x0 - 31, 0.25, COAST_Z + 30 + dz); f.receiveShadow = true; scene.add(f); }
  [[x0 - 34, COAST_Z + 22, 18, '#4a7fe0'], [x0 - 34, COAST_Z + 43, 16, '#9aa8b8']].forEach(([x, z, L, c]) => { const y = makeYacht(L, c, false); y.rotation.y = -Math.PI / 2; y.position.set(x, 0, z); scene.add(y); });
  const lb = label('Start', PLAN.startShort, PLAN.phases[0].color, 40); lb.position.set(x0 - 20, 24, COAST_Z + 18); scene.add(lb);
}

// ---------- the launch event: a boat show (docks and yachts) or a shore event (tents and a stage) ----------
const eventFlags = [];
{
  const fx = BUOYS[LAUNCH_IDX].x, dz = COAST_Z + 30, boatShow = PLAN.launch.venue === 'boat-show';
  const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(1.15), side: THREE.DoubleSide, toneMapped: false });
  const triangle = new THREE.BufferGeometry().setFromPoints([new V3(0, 0, 0), new V3(0, -1.6, 0), new V3(2.6, -0.8, 0)]); triangle.computeVertexNormals();
  const flagRow = (x0, n, step, y, z) => { for (let i = 0; i < n; i++) { const x = x0 + i * step; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), white); pole.position.set(x, y + 3.5, z); scene.add(pole); const f = new THREE.Mesh(triangle, fm); f.position.set(x, y + 6.9, z); scene.add(f); eventFlags.push(f); } };
  const tentG = new THREE.ConeGeometry(5, 4, 4).rotateY(Math.PI / 4).translate(0, 5, 0);
  const baseG = new THREE.BoxGeometry(7, 3, 7).translate(0, 1.5, 0);
  const tents = (n, step, z) => { for (let i = 0; i < n; i++) { const x = fx - (n - 1) * step / 2 + i * step; const t = new THREE.Mesh(tentG, white); t.position.set(x, 0.6, z); const b = new THREE.Mesh(baseG, white); b.position.set(x, 0.6, z); t.castShadow = b.castShadow = true; scene.add(t, b); } };
  if (boatShow) {
    // show docks with yachts moored bow-in, gold flags along the dock, tents on the beach
    const main = new THREE.Mesh(new THREE.BoxGeometry(170, 0.6, 5), wood); main.position.set(fx, 0.3, dz); main.castShadow = main.receiveShadow = true; scene.add(main);
    for (const x of [fx - 70, fx + 70]) { const c = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 32), wood); c.position.set(x, 0.3, COAST_Z + 14); c.receiveShadow = true; scene.add(c); }
    const cols = ['#9aa8b8', '#4a7fe0', '#2fa58d', '#c9a26a', '#8d69d8', '#9aa8b8', '#4a7fe0'];
    for (let i = 0; i < 7; i++) {
      const L = 15 + rnd() * 9, y = makeYacht(L, cols[i], false);
      y.rotation.y = Math.PI; // bow toward the dock
      y.position.set(fx - 72 + i * 24, 0, dz + 3 + L / 2 + 0.6); scene.add(y);
    }
    flagRow(fx - 84, 15, 12, 0.3, dz - 2);
    tents(8, 20, COAST_Z - 9);
  } else {
    // a waterfront event: a pier out to the course, a stage and a row of tents under gold flags
    const pier = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 40), wood); pier.position.set(fx, 0.3, COAST_Z + 18); pier.castShadow = pier.receiveShadow = true; scene.add(pier);
    const stage = new THREE.Mesh(new THREE.BoxGeometry(28, 2, 14).translate(0, 1, 0), white); stage.position.set(fx, 0.6, COAST_Z - 22); stage.castShadow = true; scene.add(stage);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 0.8, 16), new THREE.MeshStandardMaterial({ color: '#1f3550', roughness: 0.6 })); roof.position.set(fx, 13, COAST_Z - 22); roof.castShadow = true; scene.add(roof);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 10, 8), white); post.position.set(fx + sx * 13, 7.6, COAST_Z - 22 + sz * 6); scene.add(post); }
    tents(10, 16, COAST_Z - 9);
    flagRow(fx - 72, 13, 12, 0.6, COAST_Z - 1);
  }
  const lb = label(PLAN.launch.name, PLAN.launch.dates, PLAN.phases.find(p => p.id === PLAN.launchPhase).color, 52); lb.position.set(fx, 22, COAST_Z + 6); scene.add(lb);
}

// ---------- the day-90 lighthouse island ----------
let lamp;
{
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(46, 52, 2, 48), sandMat); sand.scale.set(1, 1, 0.8); sand.position.set(ISLE.x, -0.4, ISLE.z); sand.receiveShadow = true; scene.add(sand);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(34, 38, 2, 40), grassMat); grass.scale.set(1, 1, 0.8); grass.position.set(ISLE.x + 4, 0.4, ISLE.z - 4); grass.receiveShadow = true; scene.add(grass);
  const lx = ISLE.x + 8, lz = ISLE.z - 6;
  const goldM = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.4, metalness: 0.2 });
  const H = 34;
  for (let i = 0; i < 6; i++) {
    const r0 = 4.2 - i * 0.28, r1 = 4.2 - (i + 1) * 0.28;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H / 6, 24), i % 2 ? goldM : white); seg.position.set(lx, 1.4 + H / 12 + i * H / 6, lz); seg.castShadow = true; scene.add(seg);
  }
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.5, 24), new THREE.MeshStandardMaterial({ color: '#1f3550', roughness: 0.5 })); gal.position.set(lx, H + 1.6, lz); scene.add(gal);
  const room = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.2, 16), new THREE.MeshStandardMaterial({ color: '#ffe7a8', emissive: '#ffcb52', emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.9 })); room.position.set(lx, H + 3.5, lz); scene.add(room);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.6, 16), new THREE.MeshStandardMaterial({ color: '#1f3550', roughness: 0.5 })); cap.position.set(lx, H + 6.4, lz); scene.add(cap);
  const glowT = tex(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,230,160,1)'); g.addColorStop(0.3, 'rgba(255,200,90,0.55)'); g.addColorStop(1, 'rgba(255,200,90,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  lamp.position.set(lx, H + 3.6, lz); lamp.scale.set(16, 16, 1); scene.add(lamp);
  const keeper = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 7).translate(0, 2.25, 0), white); keeper.position.set(lx - 11, 1.4, lz + 4); keeper.castShadow = true; scene.add(keeper);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3, 4).rotateY(Math.PI / 4), new THREE.MeshStandardMaterial({ color: '#1f3550', roughness: 0.6 })); kr.scale.set(1, 1, 0.8); kr.position.set(lx - 11, 7.4, lz + 4); scene.add(kr);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 4), wood); dock.position.set(ISLE.x - 50, 0.3, ISLE.z + 8); dock.receiveShadow = true; scene.add(dock);
  const lb = label(`Day ${PLAN.days || 90}`, PLAN.endShort, PLAN.phases[PLAN.phases.length - 1].color, 44); lb.position.set(lx, H + 18, lz); scene.add(lb);
}

// ---------- the course: dotted line, buoys, numbers ----------
const DOT_STEP = 4.2, NDOTS = Math.floor(CL / DOT_STEP);
const dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), NDOTS);
const DOT_U = [];
{
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < NDOTS; i++) { const u = (i + 0.5) / NDOTS; DOT_U.push(u); const p = curve.getPointAt(u); m4.makeTranslation(p.x, 0.12, p.z); dots.setMatrixAt(i, m4); dots.setColorAt(i, new THREE.Color('#ffffff')); }
  scene.add(dots);
}
const DOT_GOLD = new THREE.Color('#ffb52e').multiplyScalar(1.1), DOT_WHITE = new THREE.Color('#ffffff');
let litDots = -1;
function paintDots(u) {
  const n = DOT_U.filter(d => d <= u).length;
  if (n === litDots) return; litDots = n;
  for (let i = 0; i < NDOTS; i++) dots.setColorAt(i, i < n ? DOT_GOLD : DOT_WHITE);
  dots.instanceColor.needsUpdate = true;
}

const buoyObjs = [], pickables = [];
function numTex(i) {
  const t = tex(128, 128);
  const draw = () => t.draw((x, w) => {
    const w0 = WEEKS[i], col = PH[w0.phase].color, done = weekDone(i);
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(w / 2, w / 2, 60, 0, 7); x.fill();
    x.fillStyle = done ? GOLD : col; x.beginPath(); x.arc(w / 2, w / 2, 50, 0, 7); x.fill();
    x.fillStyle = done ? '#2a1d00' : '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 ${done ? 60 : 56}px ${FONT}`; x.fillText(done ? '✓' : String(w0.n), w / 2, w / 2 + 3);
  });
  draw(); t.redraw = draw; return t;
}
BUOYS.forEach((p, i) => {
  const col = PH[WEEKS[i].phase].color;
  const g = new THREE.Group(); g.position.copy(p); g.scale.setScalar(1.7); scene.add(g);
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 2.4, 16), m); base.position.y = 0.6; base.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.5, 16), white); band.position.y = 1.2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.2, 16), m); cone.position.y = 3.4; cone.castShadow = true;
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), glowMat(col, 2)); light.position.y = 5.3;
  g.add(base, band, cone, light);
  const nt = numTex(i);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nt.t, transparent: true, depthWrite: false, fog: false })); sp.position.y = 10; sp.scale.set(5, 5, 1); sp.renderOrder = 6; g.add(sp);
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 24, 8), new THREE.MeshBasicMaterial({ visible: false })); proxy.position.y = 8; proxy.userData.week = i; g.add(proxy); pickables.push(proxy);
  buoyObjs.push({ g, nt, sp, phase: i * 0.7 });
});
// a pulsing gold ring around the selected week's buoy
const ring = new THREE.Mesh(new THREE.RingGeometry(8, 9.6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb52e').multiplyScalar(1.2), transparent: true, depthWrite: false, toneMapped: false }));
ring.position.y = 0.14; scene.add(ring);
// phase names floating over each stretch of the course
PLAN.phases.forEach(p => {
  const idx = WEEKS.map((w, i) => (w.phase === p.id ? i : -1)).filter(i => i >= 0);
  if (!idx.length || p.id === PLAN.launchPhase) return;
  const a = BUOYS[idx[0]], b = BUOYS[idx[idx.length - 1]];
  const lb = label(p.name, p.dates, p.color, 34); lb.position.set((a.x + b.x) / 2, 26, Math.max(a.z, b.z) + 30); scene.add(lb);
});

// ---------- a few boats passing offshore ----------
const passers = [];
[[16, '#9aa8b8', 190, 7], [13, '#4a7fe0', 300, -5], [18, '#c9a26a', 420, 6]].forEach(([L, c, z, v], i) => {
  const y = makeYacht(L, c, false); y.position.set(CX - 900 + i * 600, 0, z); y.rotation.y = v > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(y); passers.push({ y, v });
});

// ---------- camera framing: keep the yacht centered in the open part of the screen ----------
let baseFov = 40;
function freeRect() {
  const W = innerWidth, H = innerHeight;
  const r = { l: 0, r: W, t: 0, b: H };
  const panel = $('#panel'), dock = $('#dock'), top = $('#top');
  if (isPhone()) {
    r.t = top.getBoundingClientRect().bottom;
    r.b = Math.min(panel.getBoundingClientRect().top, dock.getBoundingClientRect().top);
  } else {
    r.r = panel.getBoundingClientRect().left;
    r.b = dock.getBoundingClientRect().top;
  }
  return r;
}
function resize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false);
  baseFov = isPhone() ? 52 : 40;
  const f = freeRect(), dx = W / 2 - (f.l + f.r) / 2, dy = H / 2 - (f.t + f.b) / 2;
  const FW = W + 2 * Math.abs(dx), FH = H + 2 * Math.abs(dy);
  camera.aspect = FW / FH;
  camera.fov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * FH / H) * 180 / Math.PI;
  camera.setViewOffset(FW, FH, dx > 0 ? 2 * dx : 0, dy > 0 ? 2 * dy : 0, W, H);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- yacht motion ----------
let u = 0, targetU = 0, yaw = 0, speedK = 0;
const lastPos = new V3();
function placeYacht(t, dt) {
  const p = curve.getPointAt(Math.min(0.9999, Math.max(0, u)));
  const tg = curve.getTangentAt(Math.min(0.9999, Math.max(0, u)));
  const dir = Math.sign(targetU - u) || 1;
  const want = Math.atan2(tg.x * dir, tg.z * dir);
  let d = want - yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  yaw += d * Math.min(1, dt * 3);
  hero.position.set(p.x, Math.sin(t * 1.3) * 0.18, p.z);
  hero.rotation.set(Math.sin(t * 0.8) * 0.012, yaw, Math.sin(t * 0.95) * 0.02 - d * 0.08);
}
const LAST = () => sel === WEEKS.length - 1;
// on the last week, frame the yacht with the day-90 island; on a phone, look east along the course so both fit
const followOff = () => (LAST() ? (isPhone() ? new V3(-150, 84, 64) : new V3(-84, 76, 172)) : isPhone() ? new V3(-44, 72, 142) : new V3(-62, 56, 128));
const tgtOff = () => (LAST() ? (isPhone() ? new V3(34, 8, -8) : new V3(40, 8, -16)) : new V3(isPhone() ? 10 : 18, 0, 0));
let fly = null, following = false;
function flyTo(dur = 1.8) { fly = { t0: performance.now(), dur: dur * 1000, pos: camera.position.clone(), tgt: controls.target.clone() }; following = false; }

// ---------- UI ----------
let sel = todayIdx, prevSel = -1, playing = false, playTimer = 0;
const chips = $('#chips');
chips.innerHTML = WEEKS.map((w, i) => `<button class="wk" data-i="${i}" style="--pc:${PH[w.phase].color}" aria-label="Week ${w.n}, ${esc(w.dates)}">${w.n}</button>`).join('');
const HOWTO = esc(PLAN.copy?.howto || 'How to record');
const isRec = t => { t = t.toLowerCase().replace(/^optional: /, ''); return t.startsWith('record ') || t.startsWith('phone clips') || t.startsWith('clips from the shot list') || t.startsWith('film a walkthrough'); };
const check = (it, kind) => `<li><label class="ck"><input type="checkbox" data-id="${esc(it.id)}"${state[it.id] ? ' checked' : ''}><span class="box" aria-hidden="true"></span><span class="t">${esc(it.text)}</span>${isRec(it.text) ? `<button type="button" class="howto" data-guide>${HOWTO}</button>` : ''}${kind ? `<em class="kind k-${esc(kind)}">${KIND[kind] || esc(kind)}</em>` : ''}</label></li>`;
function renderPanel() {
  const w = WEEKS[sel], p = PH[w.phase];
  $('#pbody').innerHTML = `
    <div class="ph-head"><span class="wn">Week ${w.n} of ${WEEKS.length}</span><span class="wd">${esc(w.dates)}</span><span class="chip" style="background:${p.color}">${esc(p.name)}</span>${sel === todayIdx ? '<span class="now">This week</span>' : ''}</div>
    <h2>${esc(w.focus)}</h2>
    ${w.note ? `<p class="note">${esc(w.note)}</p>` : ''}
    <div class="wprog"><div class="bar"><i id="wbar"></i></div><span id="wtxt"></span></div>
    <h3>Your part</h3><ul class="checks">${w.you.map(it => check(it)).join('')}</ul>
    <h3>What goes out</h3><ul class="checks">${w.out.map(it => check(it, it.kind)).join('')}</ul>
    ${sel === LAUNCH_IDX ? `<h3>${esc(PLAN.copy?.shotsTitle || 'Your shot list')}</h3><p class="sub">${esc(PLAN.launch.shotsNote)}${PLAN.copy?.shotsHowto === false ? '' : ` <button type="button" class="howto" data-guide>${HOWTO}</button>`}</p><ul class="checks">${SHOTS.map(it => check(it)).join('')}</ul>` : ''}`;
  $('#pbody').querySelectorAll('input[data-id]').forEach(b => b.addEventListener('change', () => {
    if (b.checked) state[b.dataset.id] = true; else delete state[b.dataset.id];
    save(); refreshProgress();
  }));
  $('#ptitle').textContent = `Week ${w.n} · ${w.focus}`;
  $('#prev').disabled = sel === 0; $('#next').disabled = sel === WEEKS.length - 1;
  chips.querySelectorAll('.wk').forEach((c, i) => { c.classList.toggle('on', i === sel); c.setAttribute('aria-current', i === sel ? 'step' : 'false'); });
  const on = chips.querySelector('.wk.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  $('#pbody').scrollTop = 0;
  refreshProgress();
}
function refreshProgress() {
  const done = ALL_IDS.filter(id => state[id]).length, pct = ALL_IDS.length ? done / ALL_IDS.length : 0;
  const C = 2 * Math.PI * 20;
  $('#ringfg').setAttribute('stroke-dasharray', `${(pct * C).toFixed(1)} ${C.toFixed(1)}`); $('#ringfg').style.opacity = done ? 1 : 0;
  $('#ringpct').textContent = Math.round(pct * 100) + '%';
  $('#ringtxt').textContent = `${done} of ${ALL_IDS.length} checked`;
  const ids = weekIds(sel), d = ids.filter(id => state[id]).length;
  const wb = $('#wbar'); if (wb) { wb.style.width = (ids.length ? d / ids.length * 100 : 0) + '%'; $('#wtxt').textContent = `${d}/${ids.length}`; }
  chips.querySelectorAll('.wk').forEach((c, i) => c.classList.toggle('done', weekDone(i)));
  buoyObjs.forEach(b => b.nt.redraw());
}
function select(i, opts = {}) {
  sel = Math.max(0, Math.min(WEEKS.length - 1, i));
  targetU = WEEK_U[sel];
  renderPanel();
  ring.position.x = BUOYS[sel].x; ring.position.z = BUOYS[sel].z;
  if (!opts.keepPlay) stopPlay();
  if (!fly && (camera.position.distanceTo(hero.position) > 420 || sel === WEEKS.length - 1 || prevSel === WEEKS.length - 1)) flyTo(2.4);
  prevSel = sel;
  try { history.replaceState(null, '', '#week-' + WEEKS[sel].n); } catch { /* sandboxed previews don't allow URL changes */ }
}
function stopPlay() { playing = false; $('#play').classList.remove('on'); $('#play span').textContent = 'Play voyage'; }
chips.addEventListener('click', e => { const b = e.target.closest('.wk'); if (b) select(+b.dataset.i); });
$('#prev').addEventListener('click', () => select(sel - 1));
$('#next').addEventListener('click', () => select(sel + 1));
$('#play').addEventListener('click', () => {
  if (playing) return stopPlay();
  playing = true; $('#play').classList.add('on'); $('#play span').textContent = 'Pause';
  select(sel === WEEKS.length - 1 ? 0 : sel + 1, { keepPlay: true }); playTimer = 0;
});
$('#phandle').addEventListener('click', () => { document.body.classList.toggle('sheet-min'); setTimeout(resize, 260); });
addEventListener('keydown', e => {
  if (!guide.hidden) return;
  if (e.target.closest && e.target.closest('input, button')) { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; }
  if (e.key === 'ArrowRight') select(sel + 1); else if (e.key === 'ArrowLeft') select(sel - 1);
});
// the recording guide opens over the scene
const guide = $('#guide');
const openGuide = () => { guide.hidden = false; $('#gclose').focus(); };
const closeGuide = () => { guide.hidden = true; };
document.addEventListener('click', e => { if (e.target.closest('[data-guide]')) { e.preventDefault(); e.stopPropagation(); openGuide(); } });
$('#gclose').addEventListener('click', closeGuide);
guide.addEventListener('click', e => { if (e.target === guide) closeGuide(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !guide.hidden) closeGuide(); });
addEventListener('storage', e => { if (e.key === PLAN.storeKey) { load(); renderPanel(); } });

// picking buoys
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
const pick = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.week : null; };
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; stopPlay(); });
canvas.addEventListener('pointerup', e => { if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null; if (moved < 6) { const w = pick(e); if (w != null) select(w); } });
canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || down) return; canvas.style.cursor = pick(e) != null ? 'pointer' : ''; });

// ---------- start ----------
const hashWeek = /^#week-(\d+)$/.exec(location.hash);
if (hashWeek) sel = Math.max(0, Math.min(WEEKS.length - 1, +hashWeek[1] - 1));
resize();
// open on the whole voyage, then sail from the marina to the selected week
const overviewAt = () => { camera.position.set(CX + 20, (isPhone() ? 1050 : 640) * K, (isPhone() ? 560 : 500) * K); controls.target.set(CX + (isPhone() ? 0 : 20), 0, -30); };
overviewAt();
u = 0; placeYacht(0, 1); lastPos.copy(hero.position);
paintDots(0);
renderPanel(); targetU = 0;
ring.position.set(BUOYS[sel].x, 0.14, BUOYS[sel].z);
setTimeout(() => { targetU = WEEK_U[sel]; flyTo(2.6); }, 1300);
document.body.classList.add('ready');

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  waterU.time.value = t;
  // sail toward the selected week
  const du = targetU - u;
  const step = Math.sign(du) * Math.min(Math.abs(du), dt * Math.max(0.018, Math.abs(du) * 1.1));
  u += step;
  const moving = Math.abs(du) > 0.0005;
  speedK += ((moving ? 1 : 0) - speedK) * Math.min(1, dt * 2);
  lastPos.copy(hero.position);
  placeYacht(t, dt);
  wake.material.opacity = 0.12 + 0.75 * speedK; wake.scale.set(1, 1, 0.5 + 0.5 * speedK);
  bowFoam.material.opacity = 0.55 * speedK;
  paintDots(u);
  // camera
  const desiredTgt = hero.position.clone().setY(3).add(tgtOff()), desiredPos = desiredTgt.clone().add(followOff());
  if (fly) {
    const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = ease(k);
    camera.position.lerpVectors(fly.pos, desiredPos, e); controls.target.lerpVectors(fly.tgt, desiredTgt, e);
    if (k >= 1) { fly = null; following = true; }
  } else if (following) {
    const dp = hero.position.clone().sub(lastPos); dp.y = 0;
    camera.position.add(dp); controls.target.add(dp);
  }
  sun.position.copy(hero.position).add(SUN_OFF); sun.target.position.copy(hero.position);
  // play mode: next week once the yacht arrives
  if (playing && !moving) { playTimer += dt; if (playTimer > 2.4) { playTimer = 0; if (sel >= WEEKS.length - 1) stopPlay(); else select(sel + 1, { keepPlay: true }); } }
  // ambient motion
  buoyObjs.forEach((b, i) => { b.g.position.y = Math.sin(t * 1.6 + b.phase) * 0.25; b.g.rotation.z = Math.sin(t * 1.2 + b.phase) * 0.05; const s = i === sel ? 6.2 : 5; b.sp.scale.setScalar(s); });
  const rp = (t * 0.8) % 1; ring.scale.setScalar(1 + rp * 0.9); ring.material.opacity = 0.9 * (1 - rp);
  eventFlags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.4 + i) * 0.35; });
  if (lamp) lamp.material.opacity = 0.75 + Math.sin(t * 2) * 0.25;
  passers.forEach(p => { p.y.position.x += p.v * dt; if (p.y.position.x > X1) p.y.position.x = X0; if (p.y.position.x < X0) p.y.position.x = X1; p.y.position.y = Math.sin(t + p.y.position.z) * 0.15; });
  if (hero.userData.flag) hero.userData.flag.rotation.y = Math.PI / 2 + Math.sin(t * 3) * 0.12;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__voyage = {
  select,
  jump(i) { select(i); u = targetU; fly = null; following = true; placeYacht(clock.elapsedTime, 1); const tg = hero.position.clone().setY(3).add(tgtOff()); controls.target.copy(tg); camera.position.copy(tg).add(followOff()); lastPos.copy(hero.position); },
  overview() { fly = null; following = false; overviewAt(); },
};
