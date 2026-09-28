// The 3D presence report. Reads the audit's report data (see src/lib/types.ts, ReportData)
// from the page and draws it. All wording comes from the data; nothing here is invented.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const DATA = JSON.parse(document.getElementById('audit-data').textContent);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V3 = THREE.Vector3;
const clamp01 = v => Math.min(1, Math.max(0, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const small = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
const FONT = '"Archivo", "Helvetica Neue", Arial, sans-serif';
const fmtUsers = n => n >= 1e9 ? (n / 1e9).toFixed(2).replace(/0$/, '') + 'B' : Math.round(n / 1e6) + 'M';
const fmt = n => (n == null ? 'not checked' : Number(n).toLocaleString('en-US'));
const nz = v => (v == null ? 0 : v);

// ---------- data ----------
const CATS = DATA.categories.map(c => c.label);
const LAYOUT = { client: { x: 0, z: -14, w: 14 }, a: { x: -32, z: -8, w: 11 }, b: { x: 32, z: -8, w: 11 }, c: { x: 56, z: 6, w: 10 } };
const BRANDS = DATA.brands.map(b => ({ ...b, ...LAYOUT[b.id], floors: b.client ? 34 : 14 + Math.round(nz(b.overall) / 100 * 14) }));
const byId = Object.fromEntries(BRANDS.map(b => [b.id, b]));
const CLIENT = byId.client;
const COMPS = BRANDS.filter(b => !b.client);
const KEYWORDS = DATA.keywords.slice(0, 12);
const PLATFORMS = DATA.platforms;
const STOPTEXT = Object.fromEntries(DATA.stops.map(s => [s.key, s]));
const EV = DATA.evidence || {};
const srcRow = ids => { const e = (ids || []).map(i => EV[i]).find(Boolean); return e ? [['Source', `${e.source}, ${e.date}${e.sample ? ' (sample)' : ''}`]] : []; };
const nameOf = id => (id && byId[id] ? byId[id].name : 'Nobody tracked');

$('#chip').textContent = DATA.sample ? 'Sample data, not a real audit' : `${DATA.client.industry} · ${new Date(DATA.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

// ---------- renderer ----------
const canvas = $('#gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('#fallback').style.display = 'grid'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
scene.fog = new THREE.Fog('#ebe3d8', 520, 1300);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.maxPolarAngle = 1.5; controls.minDistance = 6; controls.maxDistance = 380;
controls.autoRotateSpeed = 0.3;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.35, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

{
  const g = new THREE.SphereGeometry(1400, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#9fbbe0') }, mid: { value: new THREE.Color('#dfe6ee') }, low: { value: new THREE.Color('#f4e4d2') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(low, mid, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(g, m));
}
scene.add(new THREE.HemisphereLight('#e6eef9', '#b9ab97', 0.95));
const sun = new THREE.DirectionalLight('#ffeeda', 2.6);
sun.position.set(-90, 130, 80); sun.castShadow = true;
sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 450 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
scene.add(sun);

// ---------- helpers ----------
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const api = { c, x, t, draw(fn) { x.clearRect(0, 0, w, h); fn(x, w, h); t.needsUpdate = true; } };
  if (draw) api.draw(draw);
  return api;
}
function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function rrShape(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function rrGeo(w, d, r, h) { const g = new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: h, bevelEnabled: false, curveSegments: 10 }); g.rotateX(-Math.PI / 2); return g; }
function wrap(x, text, maxW) {
  const words = String(text).split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const glowMat = (hex, k = 1.8) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false });
const white = new THREE.MeshStandardMaterial({ color: '#f6f3ee', roughness: 0.62, metalness: 0.0 });
const stone = new THREE.MeshStandardMaterial({ color: '#ebe6de', roughness: 0.85 });
const dark = new THREE.MeshStandardMaterial({ color: '#2a313b', roughness: 0.4, metalness: 0.6 });
const clickables = [];
const hit = (mesh, info) => { mesh.userData.info = info; clickables.push(mesh); return mesh; };
const proxy = (w, h, d, x, y, z, info) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); scene.add(m); return hit(m, info); };

// ---------- ground, plaza, trees ----------
{
  const g = new THREE.Mesh(new THREE.CircleGeometry(900, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8d0c3', roughness: 0.95 }));
  g.receiveShadow = true; scene.add(g);
  const plaza = new THREE.Mesh(rrGeo(150, 34, 6, 0.25), stone); plaza.position.set(8, 0, 4); plaza.receiveShadow = true; scene.add(plaza);
  const lineM = new THREE.MeshStandardMaterial({ color: '#d9d2c7', roughness: 0.9 });
  for (let x = -66; x <= 82; x += 6) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 33), lineM); l.position.set(x, 0.27, 4); scene.add(l); }
  const treeM = new THREE.MeshStandardMaterial({ color: '#c9d6bf', roughness: 0.9 });
  const trunkM = new THREE.MeshStandardMaterial({ color: '#d8d0c3', roughness: 0.9 });
  const sph = new THREE.IcosahedronGeometry(1, 2);
  const trees = new THREE.InstancedMesh(sph, treeM, 120), trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 2, 6), trunkM, 120);
  const m4 = new THREE.Matrix4(); let n = 0; let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const spots = [];
  for (let x = -64; x <= 80; x += 9) spots.push([x, 20.5]);
  for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 150 + r() * 90; spots.push([Math.cos(a) * d, Math.sin(a) * d * 0.6 - 20]); }
  for (const [x, z] of spots) {
    const s = 1.3 + r() * 1.2;
    m4.compose(new V3(x, 2 + s, z), new THREE.Quaternion(), new V3(s, s * 1.15, s)); trees.setMatrixAt(n, m4);
    m4.compose(new V3(x, 1, z), new THREE.Quaternion(), new V3(1, 1, 1)); trunks.setMatrixAt(n, m4); n++;
  }
  trees.count = trunks.count = n; trees.castShadow = true; trees.receiveShadow = true;
  scene.add(trees, trunks);
}

// ---------- logo: the client's own logo when the audit found one, otherwise initials ----------
let logoImg = null;
function drawLogo(x, w, h) {
  x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h);
  const cx = w / 2;
  if (logoImg) {
    const box = w * 0.7, s = Math.min(box / logoImg.width, box * 0.62 / logoImg.height);
    const iw = logoImg.width * s, ih = logoImg.height * s;
    x.drawImage(logoImg, cx - iw / 2, h * 0.4 - ih / 2, iw, ih);
  } else {
    const cy = h * 0.4, R = w * 0.25;
    x.fillStyle = CLIENT.color; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 ${Math.round(w * 0.2)}px ${FONT}`; x.fillText(DATA.client.initials, cx, cy + w * 0.07);
  }
  x.fillStyle = '#1d2430'; x.textAlign = 'center';
  let fs = Math.round(w * 0.075); x.font = `800 ${fs}px ${FONT}`;
  const lines = wrap(x, DATA.client.name.toUpperCase(), w * 0.86).slice(0, 2);
  if (lines.length > 1) { fs = Math.round(w * 0.06); x.font = `800 ${fs}px ${FONT}`; }
  lines.forEach((l, i) => x.fillText(l, cx, h * (lines.length > 1 ? 0.8 : 0.86) + i * fs * 1.1));
}
const logoTex = tex(512, 512, drawLogo);
if (DATA.client.logo) { const im = new Image(); im.onload = () => { logoImg = im; logoTex.draw(drawLogo); updateCard(planP); }; im.src = DATA.client.logo; }

// ---------- towers ----------
const FH = 2;
const bld = {};
const glassMat = new THREE.MeshStandardMaterial({ color: '#4d6a86', roughness: 0.12, metalness: 0.85, envMapIntensity: 0.9 });
const heroGlass = new THREE.MeshStandardMaterial({ color: '#6e5330', roughness: 0.16, metalness: 0.85, envMapIntensity: 0.9 });
const doorCol = s => new THREE.Color(s == null ? '#9aa3ae' : s >= 80 ? '#36b37e' : s >= 50 ? '#e8a92e' : '#e25c4b');
function flowW(d) { return d == null ? 0.4 : Math.min(11, Math.max(0.4, d / 16)); }

for (const b of BRANDS) {
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z); scene.add(g);
  const w = b.w, floors = b.floors, hero = !!b.client;
  const twist = hero ? 0.021 : 0.012, taper = hero ? 0.22 : 0.14, r = w * 0.28;
  const pw = w + 8;
  const podium = new THREE.Mesh(rrGeo(pw, pw, 2.5, 4), stone); podium.castShadow = podium.receiveShadow = true; g.add(podium);
  const pcap = new THREE.Mesh(rrGeo(pw + 0.6, pw + 0.6, 2.8, 0.35), white); pcap.position.y = 4; pcap.castShadow = true; g.add(pcap);
  const band = new THREE.Mesh(rrGeo(pw + 0.25, pw + 0.25, 2.6, 0.25), glowMat(b.color, hero ? 1.6 : 1.0)); band.position.y = 0.2; g.add(band);
  const glassG = rrGeo(w, w, r, FH - 0.32), slabG = rrGeo(w + 0.7, w + 0.7, r + 0.35, 0.32), glowG = rrGeo(w + 1.0, w + 1.0, r + 0.5, 0.14);
  const glass = new THREE.InstancedMesh(glassG, hero ? heroGlass : glassMat, floors);
  const slabs = new THREE.InstancedMesh(slabG, white, floors);
  const glows = new THREE.InstancedMesh(glowG, new THREE.MeshBasicMaterial({ color: new THREE.Color(b.color).multiplyScalar(2.2), toneMapped: false }), floors);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new V3(0, 1, 0);
  const floorM = [];
  for (let i = 0; i < floors; i++) {
    const y = 4.35 + i * FH, s = 1 - taper * (i / floors), rot = twist * i;
    q.setFromAxisAngle(up, rot);
    m4.compose(new V3(0, y + 0.32, 0), q, new V3(s, 1, s)); glass.setMatrixAt(i, m4);
    m4.compose(new V3(0, y, 0), q, new V3(s, 1, s)); slabs.setMatrixAt(i, m4);
    floorM.push({ y, s, rot });
  }
  glass.castShadow = slabs.castShadow = true; glass.receiveShadow = slabs.receiveShadow = true;
  g.add(glass, slabs, glows);
  const setGlow = (months) => {
    for (let i = 0; i < floors; i++) {
      const m = i - (floors - 12), lit = m >= 0 && months[m];
      const f = floorM[i];
      q.setFromAxisAngle(up, f.rot);
      m4.compose(new V3(0, f.y + 0.1, 0), q, lit ? new V3(f.s, 1, f.s) : new V3(0.0001, 0.0001, 0.0001));
      glows.setMatrixAt(i, m4);
    }
    glows.instanceMatrix.needsUpdate = true;
  };
  setGlow(b.months);
  const topY = 4.35 + floors * FH;
  const ts = 1 - taper;
  if (hero) {
    const crown = new THREE.Group(); crown.position.y = topY + 0.4; crown.rotation.y = twist * floors; g.add(crown);
    const cw = w * ts * 0.95;
    const logoM = new THREE.MeshBasicMaterial({ map: logoTex.t, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(cw, cw, cw), [logoM, logoM, white, white, logoM, logoM]); cube.position.y = cw / 2 + 1.2; cube.castShadow = true; crown.add(cube);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(cw * 0.78, 0.18, 8, 64).rotateX(Math.PI / 2), glowMat(b.color, 2.4)); ring.position.y = 0.6; crown.add(ring);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.25, 9, 8), white); spire.position.y = cw + 1.2 + 4.5; crown.add(spire);
    bld.heroTop = topY + cw + 1.2;
  } else {
    const cap = new THREE.Mesh(rrGeo(w * ts + 0.9, w * ts + 0.9, r, 0.6), white); cap.position.y = topY; cap.rotation.y = twist * floors; g.add(cap);
    const letter = tex(128, 128, (x, W) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, W, W); x.fillStyle = b.color; x.font = `800 84px ${FONT}`; x.textAlign = 'center'; x.fillText(b.id.toUpperCase(), W / 2, 96); });
    const lm = new THREE.MeshBasicMaterial({ map: letter.t, toneMapped: false });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), [lm, lm, white, white, lm, lm]); cube.position.y = topY + 2.2; cube.rotation.y = twist * floors; cube.castShadow = true; g.add(cube);
  }
  const front = pw / 2 + 0.03;
  const screen = tex(256, 144);
  const scM = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: screen.t, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
  scM.position.set(-pw / 2 + 4.6, 2.1, front); g.add(scM);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.0), dark); frame.position.set(-pw / 2 + 4.6, 2.1, front - 0.01); g.add(frame);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.1), new THREE.MeshBasicMaterial({ color: doorCol(b.speed).multiplyScalar(1.1), toneMapped: false }));
  door.position.set(pw / 2 - 4, 1.55, front); g.add(door);
  const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.75, 4, 8), new THREE.MeshStandardMaterial({ color: '#faf8f4', roughness: 0.8 }), 44);
  let s0 = Math.abs(b.x * 13) + 5; const rnd = () => ((s0 = (s0 * 16807 + 11) % 2147483647) / 2147483647);
  for (let i = 0; i < 44; i++) { m4.compose(new V3(b.x - pw / 2 + 1 + rnd() * (pw - 2), 0.85, b.z + pw / 2 + 1.2 + rnd() * 5), q.identity(), new V3(1, 1, 1)); crowd.setMatrixAt(i, m4); }
  crowd.count = Math.min(44, Math.max(1, Math.round(nz(b.reviews) / 8))); crowd.castShadow = true; scene.add(crowd);
  const flowTex = tex(64, 256, (x, W, H) => { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 32) { x.fillStyle = '#fff'; x.fillRect(0, y, W, 16); } });
  flowTex.t.wrapT = THREE.RepeatWrapping; flowTex.t.repeat.set(1, 7);
  const flow = new THREE.Mesh(new THREE.PlaneGeometry(1, 70).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: flowTex.t, color: new THREE.Color(b.color).multiplyScalar(1.15), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
  flow.position.set(b.x, 0.3, 57); flow.scale.x = flowW(b.domains); scene.add(flow);
  const bb = new THREE.Group(); bb.position.set(b.x + (b.client ? 9 : 8), 0, 44); scene.add(bb);
  const bbTex = tex(512, 224);
  const drawBB = (ads) => bbTex.draw((x, W, H) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, W, H); x.fillStyle = b.color; x.fillRect(0, 0, 12, H); x.fillStyle = '#5d6878'; x.font = `700 26px ${FONT}`; x.fillText('SEARCH ADS', 40, 56); x.fillStyle = '#1d2430'; x.font = `800 90px ${FONT}`; x.fillText(String(ads.n), 40, 150); x.font = `600 26px ${FONT}`; x.fillStyle = '#5d6878'; x.fillText('tracked searches', 40, 194); });
  for (const px of [-3.4, 3.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), white); p.position.set(px, 3, 0); p.castShadow = true; bb.add(p); }
  const bbP = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.2, 0.3), white); bbP.position.set(0, 7.6, -0.2); bbP.castShadow = true; bb.add(bbP);
  const bbF = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.9), new THREE.MeshBasicMaterial({ map: bbTex.t, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) })); bbF.position.set(0, 7.6, -0.04); bb.add(bbF);
  if (b.ads) drawBB(b.ads); else bb.visible = false;
  proxy(pw, topY + 8, pw, b.x, (topY + 8) / 2, b.z, () => brandInfo(b));
  hit(bbF, () => adInfo(b));
  hit(flow, () => linkInfo(b));
  hit(scM, () => videoInfo(b));
  bld[b.id] = { g, setGlow, screen, crowd, flow, bb, bbF, drawBB, door, topY };
}

// ---------- keyword district ----------
const kw = [];
{
  const plinth = new THREE.Mesh(rrGeo(52, 42, 4, 0.8), stone); plinth.position.set(-99, 0, -16); plinth.receiveShadow = true; scene.add(plinth);
  const playTex = tex(128, 128, (x) => { x.fillStyle = '#1d2430'; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(52, 40); x.lineTo(92, 64); x.lineTo(52, 88); x.fill(); });
  const ringTex = tex(128, 128, (x) => { x.strokeStyle = '#fff'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, 55, 0, 7); x.stroke(); });
  const maxVol = Math.max(1, ...KEYWORDS.map(k => nz(k.volume)));
  KEYWORDS.forEach((k0, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = -115.5 + col * 11, z = -29 + row * 12, h = 3 + (nz(k0.volume) / maxVol) * 38;
    const body = new THREE.Mesh(rrGeo(5.4, 5.4, 1.4, h), white); body.position.set(x, 0.8, z); body.castShadow = body.receiveShadow = true; scene.add(body);
    const capM = new THREE.MeshBasicMaterial({ color: '#d9d3ca', toneMapped: false });
    const cap = new THREE.Mesh(rrGeo(5.9, 5.9, 1.6, 1.6), capM); cap.position.set(x, 0.8 + h - 1.6, z); scene.add(cap);
    let marker = null, ring = null;
    if (k0.video) {
      marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: playTex.t, depthWrite: false })); marker.scale.setScalar(2.6); marker.position.set(x, 0.8 + h + 2.6, z); scene.add(marker);
      ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex.t, color: new THREE.Color('#e8a92e').multiplyScalar(1.8), toneMapped: false, transparent: true, depthWrite: false })); ring.scale.setScalar(3.6); ring.position.copy(marker.position); ring.visible = !k0.videoOwner; scene.add(ring);
    }
    const k = { ...k0, capM, x, z, h, marker, ring, delay: 0.55 + i * 0.03, now: k0.owner };
    hit(body, () => kwInfo(k)); hit(cap, () => kwInfo(k)); if (marker) hit(marker, () => kwInfo(k));
    kw.push(k);
  });
}
function paintTower(k, owner) {
  k.now = owner;
  if (owner === 'client') k.capM.color.set(CLIENT.color).multiplyScalar(2.0);
  else if (owner && byId[owner]) k.capM.color.set(byId[owner].color).multiplyScalar(0.95);
  else k.capM.color.set('#d9d3ca');
}

// ---------- territory map ----------
const tiles = [];
const MAP = DATA.map;
{
  const n = MAP.n, cx = 106, cz = -14, gap = 0.5, span = 38.5, S = (span - (n - 1) * gap) / n;
  const table = new THREE.Mesh(rrGeo(span + 5, span + 5, 3, 1.4), stone); table.position.set(cx, 0, cz); table.castShadow = table.receiveShadow = true; scene.add(table);
  const home = MAP.home;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const mat = new THREE.MeshStandardMaterial({ color: '#e2ddd5', roughness: 0.7 });
    const m = new THREE.Mesh(rrGeo(S, S, 0.6, 0.5), mat);
    const x = cx - span / 2 + S / 2 + i * (S + gap), z = cz - span / 2 + S / 2 + j * (S + gap);
    m.position.set(x, 1.4, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    const t = { m, mat, i, j, x, z, cur: MAP.grid[i]?.[j] ?? null, pro: MAP.planGrid[i]?.[j] ?? null, delay: 0.2 + Math.hypot(i - home[0], j - home[1]) * 0.12, now: null };
    hit(m, () => tileInfo(t));
    tiles.push(t);
  }
}
function paintTile(t, owner) {
  t.now = owner;
  if (owner === 'client') { t.mat.color.set(CLIENT.color); t.mat.emissive.set(CLIENT.color).multiplyScalar(0.55); t.m.scale.y = 3; }
  else if (owner && byId[owner]) { t.mat.color.set(byId[owner].color).lerp(new THREE.Color('#ffffff'), 0.45); t.mat.emissive.set(0); t.m.scale.y = 1; }
  else { t.mat.color.set('#e2ddd5'); t.mat.emissive.set(0); t.m.scale.y = 1; }
}

// ---------- AI answers board ----------
const aiTex = tex(768, 640);
{
  const g = new THREE.Group(); g.position.set(76, 0, 28); g.rotation.y = -0.5; scene.add(g);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 0.6), white); slab.position.set(0, 8.5, 0); slab.castShadow = true; g.add(slab);
  for (const px of [-4, 4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), white); p.position.set(px, 2, 0); g.add(p); }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 9.5), new THREE.MeshBasicMaterial({ map: aiTex.t, toneMapped: false, color: new THREE.Color(0.97, 0.97, 0.97) })); face.position.set(0, 8.5, 0.31); g.add(face);
  hit(face, () => aiInfo()); hit(slab, () => aiInfo());
}
function drawAI(p) {
  const AI = DATA.ai;
  aiTex.draw((x, w, h) => {
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#5d6878'; x.font = `700 24px ${FONT}`; x.fillText(`${AI.questions.length} BUYER QUESTIONS, ${AI.total} ANSWERS`, 36, 52);
    x.fillStyle = '#1d2430'; x.font = `700 32px ${FONT}`;
    wrap(x, `“${AI.headline}”`, w - 72).slice(0, 2).forEach((l, i) => x.fillText(l, 36, 98 + i * 38));
    AI.rows.slice(0, 4).forEach((row, i) => {
      const y = 214 + i * 64;
      x.fillStyle = '#efe9df'; rr(x, 30, y - 40, w - 60, 54, 12); x.fill();
      x.fillStyle = '#2a313b'; x.font = `600 26px ${FONT}`; x.fillText(row.assistant, 50, y - 4);
      let nx = 360;
      const list = [...row.named.slice(0, 3)];
      if (p > 0.5 && i < 3 && AI.projectedNamed) list.push('client');
      else if (row.clientCount > 0) list.push('client');
      for (const id of list) {
        const col = byId[id]?.color || '#8d96a3', ww = id === 'client' ? 70 : 48, lab = id === 'client' ? DATA.client.initials : id.toUpperCase();
        x.fillStyle = col; rr(x, nx, y - 32, ww, 38, 19); x.fill();
        x.fillStyle = '#fff'; x.font = `800 23px ${FONT}`; x.textAlign = 'center'; x.fillText(lab, nx + ww / 2, y - 5); x.textAlign = 'left';
        nx += ww + 10;
      }
      if (!list.length) { x.fillStyle = '#8d96a3'; x.font = `600 22px ${FONT}`; x.fillText('no local business named', nx, y - 5); }
    });
    x.fillStyle = '#b87c0b'; x.font = `800 30px ${FONT}`;
    const nm = DATA.client.name.length > 22 ? DATA.client.initials : DATA.client.name;
    x.fillText(p > 0.5 && AI.projectedNamed != null ? `${nm}: about ${AI.projectedNamed} of ${AI.total} (projected)` : `${nm}: named in ${AI.clientNamed} of ${AI.total}`, 36, h - 40);
  });
}

// ---------- audience graph ----------
const GC = new V3(0, 104, -130), GR = 38;
const graph = { nodes: [] };
{
  const center = new THREE.Mesh(new THREE.SphereGeometry(5.2, 40, 24), new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.35, metalness: 0.1, emissive: new THREE.Color(CLIENT.color).multiplyScalar(0.25) }));
  center.position.copy(GC); scene.add(center);
  const logoSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: logoTex.t, toneMapped: false })); logoSp.scale.setScalar(7.4); logoSp.position.copy(GC).add(new V3(0, 0, 5.4)); scene.add(logoSp);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.16, 8, 80), glowMat(CLIENT.color, 2.2)); halo.position.copy(GC); scene.add(halo);
  hit(center, () => brandInfo(CLIENT)); hit(logoSp, () => brandInfo(CLIENT));
  const pillCache = {};
  const pill = (text, color, kind) => {
    const key = text + kind;
    if (!pillCache[key]) pillCache[key] = tex(512, 96, (x, w) => {
      x.font = `600 34px ${FONT}`; let t = text; while (x.measureText(t).width > w - 90 && t.length > 8) t = t.slice(0, -2);
      if (t !== text) t = t.trim() + '…';
      const tw = Math.min(w - 20, x.measureText(t).width + 64);
      x.fillStyle = kind === 'search' ? '#1d2430' : '#fbf8f2'; rr(x, (w - tw) / 2, 12, tw, 72, 36); x.fill();
      x.strokeStyle = color; x.lineWidth = 4; x.stroke();
      x.fillStyle = kind === 'search' ? '#fbf8f2' : '#1d2430'; x.textAlign = 'center'; x.fillText(kind === 'search' ? '⌕ ' + t : t, w / 2, 60);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pillCache[key].t, toneMapped: false, depthWrite: false }));
    sp.scale.set(19, 19 * 96 / 512, 1); return sp;
  };
  const N = PLATFORMS.length;
  PLATFORMS.forEach((p, i) => {
    const a = Math.PI / 2 - i / N * Math.PI * 2;
    const pos = GC.clone().add(new V3(Math.cos(a) * GR, Math.sin(a) * GR * 0.78, Math.sin(i * 1.7) * 6));
    const rad = p.users ? 1.8 + Math.sqrt(p.users / 1e9) * 2.3 : 5.4;
    const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.3, metalness: 0.2 });
    const node = new THREE.Mesh(new THREE.SphereGeometry(rad, 36, 20), mat); node.position.copy(pos); scene.add(node);
    hit(node, () => platformInfo(p));
    const dots = p.comps.filter(c => byId[c]).map((c, k) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10), glowMat(byId[c].color, 1.3)); scene.add(d); return { d, c, k }; });
    const out = pos.clone().sub(GC).setZ(0).normalize();
    const perp = new V3(-out.y, out.x, 0);
    const content = p.content.slice(0, 3);
    const pills = content.map((txt, k) => {
      const kind = p.kind === 'search' || (p.kind === 'mixed' && txt === txt.toLowerCase()) ? 'search' : 'content';
      const sp = pill(txt, p.color, kind);
      const off = (k - (content.length - 1) / 2) * 5.0;
      sp.position.copy(pos).addScaledVector(out, rad + 15).addScaledVector(perp, off);
      scene.add(sp);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pos.clone().addScaledVector(out, rad), sp.position.clone().addScaledVector(out, -5)]), new THREE.LineBasicMaterial({ color: '#9aa3ae', transparent: true, opacity: 0.7 }));
      scene.add(line);
      hit(sp, () => contentInfo(p, txt, kind));
      return sp;
    });
    const edgeGroup = new THREE.Group(); scene.add(edgeGroup);
    graph.nodes.push({ p, pos, rad, node, dots, pills, edgeGroup, a, delay: 0.3 + i * 0.08, state: null });
  });
}
function drawEdge(n, status) {
  if (n.state === status) return; n.state = status;
  n.edgeGroup.clear();
  const from = GC.clone(), to = n.pos.clone();
  const dir = to.clone().sub(from).normalize();
  from.addScaledVector(dir, 6); to.addScaledVector(dir, -n.rad - 0.3);
  if (status === 'none' || status === 'unknown') {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineDashedMaterial({ color: status === 'unknown' ? '#b8bfc8' : '#8d96a3', dashSize: 1.2, gapSize: status === 'unknown' ? 2.0 : 1.0 }));
    l.computeLineDistances(); n.edgeGroup.add(l);
  } else {
    const r = status === 'active' ? 0.55 : 0.2;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 1, r, 10), glowMat(CLIENT.color, status === 'active' ? 2.2 : 1.4));
    n.edgeGroup.add(tube);
  }
}

// ---------- screens ----------
function drawScreen(b, t, planP) {
  bld[b.id].screen.draw((x, w, h) => {
    x.fillStyle = '#12161c'; x.fillRect(0, 0, w, h);
    const showClip = b.client ? planP > 0.5 : !!b.screen;
    if (!showClip) { x.fillStyle = '#5d6878'; x.font = `700 16px ${FONT}`; x.textAlign = 'center'; x.fillText(b.client ? 'NO RECENT VIDEO' : 'NO VIDEO FOUND', w / 2, h / 2 + 6); x.textAlign = 'left'; return; }
    const hue = b.client ? 40 : b.id === 'a' ? 215 : b.id === 'b' ? 265 : 165, gr = x.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, `hsl(${hue},55%,${30 + Math.sin(t) * 6}%)`); gr.addColorStop(1, `hsl(${hue + 30},45%,${18 + Math.cos(t * 0.7) * 5}%)`);
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + 0.04 * i})`; x.beginPath(); x.arc((t * 30 + i * 70) % (w + 60) - 30, 40 + i * 18, 18 + i * 4, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.moveTo(w / 2 - 12, h / 2 - 16); x.lineTo(w / 2 + 16, h / 2); x.lineTo(w / 2 - 12, h / 2 + 16); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, h - 26, w, 26); x.fillStyle = b.client ? '#f2c35e' : '#fff'; x.font = `700 12px ${FONT}`;
    x.fillText(b.client ? 'Planned: weekly shorts' : `${b.screen.label} · ${b.screen.views}`, 8, h - 9);
  });
}

// ---------- labels ----------
const labels = [];
function label(html, pos, zones, cls = '') {
  const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = html; $('#labels').appendChild(el);
  const l = { el, pos: pos.clone(), zones }; labels.push(l); return l;
}
const brandLabels = {};
for (const b of BRANDS) brandLabels[b.id] = label('', new V3(b.x, bld[b.id].topY + (b.client ? 26 : 7), b.z), ['all', 'street', 'store', 'comp'], b.client ? 'lbl-brand is-client' : 'lbl-brand');
kw.forEach(k => { k.label = label(`<b>${esc(k.term)}</b><span>${k.volume == null ? 'not measured' : k.volume.toLocaleString() + '/mo'}</span>`, new V3(k.x, 0.8 + k.h + (k.video ? 5.4 : 2.4), k.z), ['kw'], 'lbl-kw'); });
{ const t = tiles.find(t => t.i === MAP.home[0] && t.j === MAP.home[1]); if (t) label('Business location', new V3(t.x, 4.2, t.z), ['map'], 'lbl-hood'); }
graph.nodes.forEach(n => label(`<b>${esc(n.p.name)}</b><span>${n.p.users ? fmtUsers(n.p.users) + ' ' + esc(n.p.usersLabel || 'monthly users') : esc(n.p.usersLabel || '')}</span>`, n.pos.clone().add(new V3(0, -n.rad - 2.2, 0)), ['graph'], 'lbl-node'));
label('Top 12 floors = months with a YouTube upload', new V3(CLIENT.x + 13, 58, CLIENT.z), ['store'], 'lbl-note');
label('Door color = website speed', new V3(CLIENT.x + 7, 3.6, CLIENT.z + 11.2), ['store'], 'lbl-note');
label('Line width = sites linking in', new V3(-32, 0.5, 80), ['comp'], 'lbl-note');
label('People = reviews', new V3(CLIENT.x + 4, 2.4, CLIENT.z + 15), ['reviews'], 'lbl-note');
label('Gold line = the business is active · dots = competitors', new V3(GC.x, GC.y - GR * 0.78 - 16, GC.z), ['graph'], 'lbl-note center');
label('WHERE THE AUDIENCE IS', new V3(GC.x, GC.y + GR * 0.78 + 14, GC.z), ['all'], 'lbl-zone');
label('THE SEARCHES', new V3(-99, 50, -16), ['all'], 'lbl-zone');
label('THE MAP', new V3(106, 12, -14), ['all'], 'lbl-zone');
label('AI ANSWERS', new V3(76, 20, 28), ['all'], 'lbl-zone');

// ---------- detail drawer ----------
const median = arr => { const v = arr.filter(x => x != null).sort((a, b) => a - b); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2); };
const compMed = key => median(COMPS.map(b => b[key]));
function brandInfo(b) {
  const P = b.client && plan && CLIENT.proposed;
  const sc = P ? P.scores : b.scores;
  const months = P ? P.months : b.months;
  return { title: b.name, chip: b.client ? (P ? 'Your business · projected' : 'Your business') : 'Competitor', color: b.color,
    big: (P ? P.overall : b.overall) ?? '–', bigLabel: 'Presence score',
    rows: [['Google reviews', fmt(P ? P.reviews : b.reviews)], ['Rating', b.rating ?? 'not shown'], ['Sites linking in', fmt(P ? P.domains : b.domains)], ['Months with a YouTube upload (of 12)', months.filter(Boolean).length], ['Mobile speed score', fmt(P ? P.speed : b.speed)], ['Searches with their ad', b.ads?.n ?? 0]],
    bars: sc, note: b.client ? (P ? 'Projected scores are ranges from fixed rules; the middle of each range is shown.' : 'Each score compares against the competitor median, which scores 100.') : 'Public data collected for this audit.' };
}
function kwInfo(k) {
  const own = k.now;
  return { title: k.term, chip: 'Search', color: own ? byId[own]?.color : '#8d96a3', big: k.volume == null ? '–' : k.volume.toLocaleString(), bigLabel: 'Searches per month (Google estimate)',
    rows: [['Ranks first locally', nameOf(k.owner)], ['Google shows video results', k.video ? 'Yes' : 'No'], ['Owns the video result', k.video ? (k.videoOwner ? nameOf(k.videoOwner) : 'No local business yet') : '–'], ['In the 90-day plan', k.planOwner === 'client' ? 'Targeted' : 'Not a first target'], ...srcRow(k.evidence)],
    note: k.video && !k.videoOwner ? 'An open video result: the fastest win for new video.' : 'Search volumes are Google Ads estimates for the area.' };
}
function tileInfo(t) {
  return { title: t.i === MAP.home[0] && t.j === MAP.home[1] ? 'Business location' : `Map spot ${t.i + 1}-${t.j + 1}`, chip: 'Google map, top 3', color: t.now ? byId[t.now]?.color : '#8d96a3',
    rows: [['Top 3 here', t.now ? nameOf(t.now) : 'None of the tracked businesses'], [DATA.client.name, t.now === 'client' ? 'Top 3' : 'Not in top 3'], ['After the 90-day plan', t.pro === 'client' ? 'Projected top 3' : 'Unchanged']],
    note: `Each tile is a Google Maps search for "${MAP.keyword}" from that spot.` };
}
function platformInfo(p) {
  const st = plan ? p.planStatus : p.status;
  const word = { active: 'Active', weak: 'Weak', none: 'Not present', unknown: 'Not checked' }[st];
  return { title: p.name, chip: `Fit for this business: ${p.fit}`, color: p.color, big: p.users ? fmtUsers(p.users) : '–', bigLabel: p.users ? (p.usersLabel || 'Monthly users worldwide') : (p.usersLabel || ''),
    rows: [[DATA.client.name, word], ['Competitors active', p.comps.length ? p.comps.map(nameOf).join(', ') : 'None found'], ['What works here', p.content.join(' · ')], ['In the plan', p.fix]],
    note: p.note };
}
function contentInfo(p, txt, kind) {
  return { title: txt, chip: kind === 'search' ? `Search on ${p.name}` : `Content that works on ${p.name}`, color: p.color,
    rows: [['Platform', p.name], ['Competitors active', p.comps.length ? p.comps.map(nameOf).join(', ') : 'None found'], ['In the plan', p.fix]],
    note: kind === 'search' ? 'A search or question buyers use; the audit tracks who shows up for it.' : 'A content format that performs in this industry.' };
}
function aiInfo() {
  const AI = DATA.ai;
  return { title: 'AI answers', chip: 'ChatGPT, Claude, Gemini, Google', color: '#2f8a6d', big: plan && AI.projectedNamed != null ? `${AI.projectedNamed} / ${AI.total}` : `${AI.clientNamed} / ${AI.total}`, bigLabel: plan && AI.projectedNamed != null ? 'Answers naming the business (projected)' : 'Answers naming the business',
    rows: [...AI.rows.map(r => [r.assistant, `${r.clientCount} of ${r.total} name ${DATA.client.name.length > 20 ? 'it' : DATA.client.name}; ${r.named.length ? 'most named: ' + r.named.map(nameOf).join(', ') : 'no competitor named'}`]), ...AI.questions.slice(0, 6).map((q, i) => [`Question ${i + 1}`, q])],
    note: 'Each question was asked with web search on, and repeated because answers vary between runs. A mention counts only if the name or website appears in the answer.' };
}
function adInfo(b) { const ads = b.ads || { n: 0 }; return { title: `${b.name}: search ads`, chip: 'Paid ads', color: b.color, big: ads.n, bigLabel: 'Tracked searches where their ad showed', rows: [['Tracked searches', KEYWORDS.length]], note: 'Counted from the ads Google showed on the tracked searches.' }; }
function linkInfo(b) { const d = b.client && plan && CLIENT.proposed ? CLIENT.proposed.domains : b.domains; return { title: `${b.name}: sites linking in`, chip: 'Backlinks', color: b.color, big: fmt(d), bigLabel: 'Referring domains', rows: [['Competitor median', fmt(compMed('domains'))]], note: 'Links from other sites help Google trust a business.' }; }
function videoInfo(b) { return { title: `${b.name}: video`, chip: 'YouTube', color: b.color, big: b.months.filter(Boolean).length, bigLabel: 'Months with an upload, last 12', rows: b.screen ? [['Most-viewed in searches', b.screen.label], ['Views', b.screen.views]] : [['Video in YouTube searches', 'None found']], note: 'From the YouTube channel and YouTube searches for the tracked terms.' }; }

let drawerOpen = null;
function openDrawer(fn) {
  const d = fn(); drawerOpen = fn;
  $('#dTitle').textContent = d.title;
  $('#dChip').textContent = d.chip; $('#dChip').style.setProperty('--c', d.color || '#999');
  $('#dBig').hidden = d.big === undefined;
  if (d.big !== undefined) { $('#dBigN').textContent = d.big; $('#dBigL').textContent = d.bigLabel; $('#dBigN').style.color = d.color || '#1d2430'; }
  $('#dRows').innerHTML = d.rows.map(([k, v]) => `<div class="drow${k === 'Source' ? ' src' : ''}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  $('#dBars').hidden = !d.bars;
  if (d.bars) $('#dBars').innerHTML = d.bars.map((v, i) => `<div class="cat${v == null ? ' na' : ''}"><span class="cname">${esc(CATS[i])}</span><span class="bar"><i class="fill" style="width:${nz(v)}%;background:${d.color}"></i></span><span class="cval">${v == null ? '–' : v}</span></div>`).join('');
  $('#dNote').textContent = d.note || '';
  document.body.classList.add('drawer-open');
}
function closeDrawer() { drawerOpen = null; document.body.classList.remove('drawer-open'); }
$('#dClose').onclick = closeDrawer;

const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const h = pick(e); if (h) openDrawer(h.object.userData.info); else closeDrawer();
});
canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; canvas.style.cursor = pick(e) ? 'pointer' : ''; });
function pick(e) {
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(clickables.filter(o => o.visible !== false && (!o.parent || o.parent.visible !== false)), false);
  return hits[0] || null;
}

// ---------- the 90-day plan ----------
let plan = false, planP = 0, planTarget = 0;
const PM = CLIENT.proposed || { scores: CLIENT.scores, months: CLIENT.months, reviews: CLIENT.reviews, domains: CLIENT.domains, speed: CLIENT.speed, ads: null, overall: CLIENT.overall };
function applyPlan(p) {
  const local = d => clamp01((p * 1.6 - d) / 0.35);
  const B = bld.client;
  const months = CLIENT.months.map((a, f) => (a === PM.months[f] ? a : (local(0.05 + f * 0.04) > 0.5 ? PM.months[f] : a)));
  B.setGlow(months);
  B.flow.scale.x = flowW(CLIENT.domains == null ? null : CLIENT.domains + (nz(PM.domains) - CLIENT.domains) * local(0.2));
  B.crowd.count = Math.round(Math.max(1, Math.min(44, (nz(CLIENT.reviews) + (nz(PM.reviews) - nz(CLIENT.reviews)) * local(0.15)) / 8)));
  B.door.material.color.copy(doorCol(CLIENT.speed == null ? null : CLIENT.speed + (nz(PM.speed) - CLIENT.speed) * local(0.1))).multiplyScalar(1.1);
  for (const t of tiles) paintTile(t, t.cur === t.pro ? t.cur : (local(t.delay) > 0.5 ? t.pro : t.cur));
  for (const k of kw) { const lp = local(k.delay); paintTower(k, k.owner === k.planOwner ? k.owner : (lp > 0.5 ? k.planOwner : k.owner)); if (k.ring) k.ring.visible = !k.videoOwner && !(k.planOwner === 'client' && lp > 0.5); }
  for (const n of graph.nodes) drawEdge(n, local(n.delay) > 0.5 ? n.p.planStatus : n.p.status);
}
applyPlan(0);
drawAI(0);

// ---------- scorecard ----------
const card = $('#cats');
const medianAt = i => median(COMPS.map(b => b.scores[i]));
CATS.forEach((c, i) => { const row = document.createElement('div'); row.className = 'cat'; const m = medianAt(i); row.innerHTML = `<span class="cname">${esc(c)}</span><span class="bar"><i class="fill"></i>${m != null ? `<i class="tick" style="left:${Math.min(100, m)}%"></i>` : ''}</span><span class="cval">0</span>`; card.appendChild(row); });
const rowsEl = [...card.querySelectorAll('.cat')], fills = [...card.querySelectorAll('.fill')], vals = [...card.querySelectorAll('.cval')];
const topComp = COMPS.length ? Math.max(...COMPS.map(b => nz(b.overall))) : null;
$('#topComp').textContent = topComp ?? '–';
const scoresAt = p => CLIENT.scores.map((v, i) => (v == null ? null : v + (nz(PM.scores[i] ?? v) - v) * ease(clamp01((p * 1.6 - 0.1 - i * 0.05) / 0.5))));
function updateCard(p) {
  const sc = scoresAt(p).map(v => (v == null ? null : Math.round(v)));
  sc.forEach((v, i) => { rowsEl[i].classList.toggle('na', v == null); fills[i].style.width = nz(v) + '%'; vals[i].textContent = v == null ? '–' : v; fills[i].classList.toggle('gain', v != null && v > nz(CLIENT.scores[i])); });
  const ov = p > 0.02 ? Math.round(nz(CLIENT.overall) + (nz(PM.overall) - nz(CLIENT.overall)) * ease(clamp01(p))) : CLIENT.overall;
  $('#score').textContent = ov ?? '–';
  $('#scoreLbl').textContent = p > 0.02 ? DATA.labels.scorePlan : DATA.labels.scoreToday;
  brandLabels.client.el.innerHTML = `<img src="${logoTex.c.toDataURL()}" alt=""><span>${esc(CLIENT.name)}</span><b>${ov ?? '–'}</b>`;
}
COMPS.forEach(b => { brandLabels[b.id].el.innerHTML = `<i style="background:${b.color}"></i><span>${esc(b.name)}</span><b>${b.overall ?? '–'}</b>`; });

// ---------- guided stops ----------
const CAM = {
  overview: { zones: ['all', 'street'], pos: [130, 125, 235], tgt: [0, 50, -50] },
  graph: { zones: ['graph'], pos: [0, 94, 18], tgt: [0, 94, -130] },
  kw: { zones: ['kw'], pos: [-46, 70, 92], tgt: [-99, 16, -16] },
  map: { zones: ['map'], pos: [90, 52, 42], tgt: [106, 0, -14] },
  store: { zones: ['store'], pos: [72, 42, 112], tgt: [0, 38, -14] },
  reviews: { zones: ['reviews'], pos: [22, 7, 30], tgt: [0, 2, 2] },
  video: { zones: ['video'], pos: [-3, 4.5, 16], tgt: [-6.4, 2.2, -3] },
  ai: { zones: ['ai'], pos: [62, 11, 50], tgt: [76, 8.5, 28] },
  comp: { zones: ['comp', 'street'], pos: [-20, 42, 132], tgt: [4, 6, 28] },
  plan: { zones: ['all', 'street'], pos: [130, 125, 235], tgt: [0, 50, -50], forcePlan: true },
};
const STOPS = DATA.stops.filter(s => CAM[s.key]).map(s => ({ ...s, ...CAM[s.key] }));
let cur = 0, fly = null, activeZones = STOPS[0].zones;
function renderStop() {
  const s = STOPS[cur], p = plan;
  $('#stopNum').textContent = `${String(cur + 1).padStart(2, '0')} / ${String(STOPS.length).padStart(2, '0')}`;
  $('#stopName').textContent = s.label;
  $('#title').textContent = p ? s.tp : s.t;
  const body = p ? s.bp : s.b;
  $('#body').textContent = body; $('#body').hidden = !body;
  $('#list').hidden = !s.list;
  if (s.list) $('#list').innerHTML = s.list.map(x => `<li>${esc(x)}</li>`).join('');
  document.querySelectorAll('.dot').forEach((d, i) => d.setAttribute('aria-current', i === cur ? 'step' : 'false'));
}
function go(i) {
  $('#intro').classList.add('done');
  cur = (i + STOPS.length) % STOPS.length;
  const s = STOPS[cur];
  activeZones = s.zones;
  if (s.forcePlan && !plan) setPlan(true);
  fly = { t: 0, dur: 2.3, p0: camera.position.clone(), t0: controls.target.clone(), p1: new V3(...s.pos), t1: new V3(...s.tgt) };
  if (window.__instant) fly.t = 1;
  controls.autoRotate = false;
  renderStop();
}
function setPlan(on) {
  plan = on; planTarget = on ? 1 : 0;
  $('#plan').setAttribute('aria-pressed', on);
  $('#planLbl').textContent = on ? DATA.labels.planOn : DATA.labels.planOff;
  renderStop();
  if (drawerOpen) setTimeout(() => drawerOpen && openDrawer(drawerOpen), 1800);
}
{
  const nav = $('#dots');
  STOPS.forEach((s, i) => { const b = document.createElement('button'); b.className = 'dot'; b.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${esc(s.label)}`; b.onclick = () => go(i); nav.appendChild(b); });
  $('#prev').onclick = () => go(cur - 1); $('#next').onclick = () => go(cur + 1);
  $('#plan').onclick = () => setPlan(!plan);
  addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); if (e.key.toLowerCase() === 'p') setPlan(!plan); if (e.key === 'Escape') closeDrawer(); });
  controls.addEventListener('start', () => { fly = null; controls.autoRotate = false; });
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  camera.aspect = w / h; camera.fov = w / h < 0.9 ? 58 : 40; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock(), tmp = new V3();
let lastScreen = 0, lastAI = -1;
camera.position.set(40, 420, 420); controls.target.set(0, 30, -40);
fly = { t: 0, dur: 4.2, p0: camera.position.clone(), t0: controls.target.clone(), p1: new V3(...STOPS[0].pos), t1: new V3(...STOPS[0].tgt), intro: true };
renderStop();
setTimeout(() => $('#intro').classList.add('done'), 3400);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (fly) {
    fly.t += dt / fly.dur; const e = ease(Math.min(1, fly.t));
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    if (!fly.intro) camera.position.y += Math.sin(e * Math.PI) * fly.p0.distanceTo(fly.p1) * 0.1;
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (fly.t >= 1) { fly = null; if (STOPS[cur].key === 'overview' || STOPS[cur].key === 'plan') controls.autoRotate = true; }
  }
  controls.update();
  if (camera.position.y < 1.2) camera.position.y = 1.2;
  if (planP !== planTarget) {
    planP = planTarget > planP ? Math.min(planTarget, planP + dt / 3.6) : Math.max(planTarget, planP - dt / 1.6);
    applyPlan(planP); updateCard(planP);
  }
  const aiState = planP > 0.8 ? 1 : 0; if (aiState !== lastAI) { drawAI(aiState); lastAI = aiState; }
  if (t - lastScreen > 1 / 20) { lastScreen = t; for (const b of BRANDS) drawScreen(b, t, planP); }
  for (const b of BRANDS) bld[b.id].flow.material.map.offset.y = -t * 0.35;
  for (const k of kw) if (k.ring && k.ring.visible) { const s = 3.4 + (Math.sin(t * 3 + k.x) * 0.5 + 0.5) * 1.3; k.ring.scale.setScalar(s); k.ring.material.opacity = 0.55 + Math.sin(t * 3 + k.x) * 0.35; }
  for (const n of graph.nodes) n.dots.forEach(({ d, k }) => { const a = t * 0.6 + k * 2.1 + n.a; d.position.copy(n.pos).add(new V3(Math.cos(a) * (n.rad + 1.8), Math.sin(a) * (n.rad + 1.8), 0.5)); });
  const W = innerWidth, H = innerHeight;
  for (const l of labels) {
    const show = l.zones.some(z => activeZones.includes(z));
    tmp.copy(l.pos).project(camera);
    const on = show && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    l.el.classList.toggle('on', on);
    if (on) l.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px, ${(-tmp.y * 0.5 + 0.5) * H}px)`;
  }
  composer.render();
  requestAnimationFrame(frame);
}
updateCard(0);
requestAnimationFrame(frame);
window.__gap = { go, setPlan, snap() { planP = planTarget; applyPlan(planP); updateCard(planP); }, open(kind) { if (kind === 'brand') openDrawer(() => brandInfo(CLIENT)); if (kind === 'node') openDrawer(() => platformInfo(PLATFORMS[1])); if (kind === 'ai') openDrawer(aiInfo); } };
