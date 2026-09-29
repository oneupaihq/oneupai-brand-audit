// The 3D presence report. Reads the audit's report data (see src/lib/types.ts, ReportData)
// from the page and draws it. All wording comes from the data; nothing here is invented.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DATA = JSON.parse(document.getElementById('audit-data').textContent);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V3 = THREE.Vector3;
const clamp01 = v => Math.min(1, Math.max(0, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const small = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
const lowPower = small || (navigator.hardwareConcurrency || 8) <= 4;
const FONT = '"Archivo", "Helvetica Neue", Arial, sans-serif';
const fmtUsers = n => n >= 1e9 ? (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B' : Math.round(n / 1e6) + 'M';
const fmt = n => (n == null ? 'not checked' : Number(n).toLocaleString('en-US'));
const nz = v => (v == null ? 0 : v);

// ---------- data ----------
const MARINA = DATA.scene === 'marina';
const CATS = DATA.categories.map(c => c.label);
const LAYOUT = { client: { x: 0, z: -14, w: 14 }, a: { x: -32, z: -8, w: 11 }, b: { x: 32, z: -8, w: 11 }, c: { x: 56, z: 6, w: 10 } };
// marina: yachts moored side by side, bows lined up toward the promenade; the business's yacht is always the longest
const QUAY_Z = -30; // north quay: yachts moor bow-in here, sterns toward the harbour mouth
const yachtLen = b => (b.client ? 64 : 28 + Math.round(nz(b.overall) / 100 * 22));
if (MARINA) for (const [id, l] of Object.entries(LAYOUT)) { const b = DATA.brands.find(x => x.id === id); if (!b) continue; const L = yachtLen(b); Object.assign(l, { x: { client: 0, a: -30, b: 28, c: 52 }[id], L, W: L * 0.235, z: QUAY_Z + 2.5 + L / 2 }); }
const BRANDS = DATA.brands.map(b => ({ ...b, ...LAYOUT[b.id], floors: b.client ? 34 : 14 + Math.round(nz(b.overall) / 100 * 14) }));
const byId = Object.fromEntries(BRANDS.map(b => [b.id, b]));
const CLIENT = byId.client;
const COMPS = BRANDS.filter(b => !b.client);
const KEYWORDS = DATA.keywords.slice(0, 12);
const PLATFORMS = DATA.platforms;
const EV = DATA.evidence || {};
const srcRow = ids => { const e = (ids || []).map(i => EV[i]).find(Boolean); return e ? [['Source', `${e.source}, ${e.date}${e.sample ? ' (sample)' : ''}`]] : []; };
const nameOf = id => (id && byId[id] ? byId[id].name : 'Nobody tracked');

$('#chip').textContent = DATA.chip || (DATA.sample ? 'Sample data, not a real audit' : `${DATA.client.industry} · ${new Date(DATA.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);

// ---------- renderer ----------
const canvas = $('#gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('#fallback').style.display = 'grid'; throw e; }
let pixelRatio = Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.75);
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
const HAZE = '#d8f0f6';
scene.fog = new THREE.Fog(HAZE, 560, 1500);
const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.maxPolarAngle = 1.48; controls.minDistance = 6; controls.maxDistance = 420;
controls.autoRotateSpeed = 0.3;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.35, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let useBloom = !lowPower;

// sky: Bora Bora blue, deepest overhead, pale turquoise at the horizon
{
  const g = new THREE.SphereGeometry(1500, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#4fb8e0') }, mid: { value: new THREE.Color('#9fdcf0') }, low: { value: new THREE.Color('#e4f6f9') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.75, h)) : mix(low, mid, smoothstep(-0.02, 0.1, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  scene.add(new THREE.Mesh(g, m));
  // a few soft clouds
  const cloudTex = tex(256, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const cm = new THREE.SpriteMaterial({ map: cloudTex.t, fog: false, depthWrite: false, transparent: true, opacity: 0.85 });
  let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = 900 + r() * 350, s = 160 + r() * 220; const c = new THREE.Sprite(cm); c.position.set(Math.cos(a) * d, 180 + r() * 260, Math.sin(a) * d); c.scale.set(s * 2.2, s * 0.6, 1); scene.add(c); }
}
scene.add(new THREE.HemisphereLight('#d6f1fb', '#c9bfa8', 1.0));
const sun = new THREE.DirectionalLight('#fff0d8', 2.7);
sun.position.set(-110, 150, 110); sun.castShadow = true;
sun.shadow.mapSize.set(lowPower ? 1024 : 4096, lowPower ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 600 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.5;
scene.add(sun);

// ---------- helpers ----------
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
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
const white = new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.55, metalness: 0.0 });
const stone = new THREE.MeshStandardMaterial({ color: '#efece6', roughness: 0.85 });
const dark = new THREE.MeshStandardMaterial({ color: '#2a313b', roughness: 0.4, metalness: 0.6 });
const clickables = [];
const hit = (mesh, info, hl) => { mesh.userData.info = info; if (hl) mesh.userData.hl = hl; clickables.push(mesh); return mesh; };
const proxy = (w, h, d, x, y, z, info, hl) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); scene.add(m); return hit(m, info, hl); };
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- layout of the grounds ----------
const GC = new V3(0, 0, -124); // audience plaza center
const BASIN = { x0: -58, x1: 68, z0: QUAY_Z, z1: 56 };
const CHAN = { x0: -10, x1: 34 }; // harbour mouth: a channel from the basin straight out to the lagoon
const blocked = [
  ...(MARINA ? [[BASIN.x0 - 4, BASIN.x1 + 4, -57, BASIN.z1 + 4], [CHAN.x0 - 5, CHAN.x1 + 5, BASIN.z1, 200]] : [[-72, 92, -32, 24], [-46, 72, 22, 96]]), [-130, -68, -42, 10], [80, 134, -42, 14], [68, 94, 18, 48],
  [-200, 200, -66, -56], ...(MARINA ? [[-64, -56, 58, 124], [66, 74, 58, 124]] : [[-64, -56, -62, 124], [66, 74, -62, 124]]),
];
const isFree = (x, z, pad = 3) => !blocked.some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) && Math.hypot(x - GC.x, z - GC.z) > 70 && inIsle(x, z, 0.93);

// the island: lagoon all around, sand ring, grass, streets
const ISLE = { x: 0, z: -40, rx: 232, rz: 176 };
const inIsle = (x, z, k = 1) => ((x - ISLE.x) / (ISLE.rx * k)) ** 2 + ((z - ISLE.z) / (ISLE.rz * k)) ** 2 < 1;
{
  const ellipse = (rx, rz) => { const sh = new THREE.Shape(); sh.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0); return sh; };
  const flat = (shape, y, mat, seg = 96) => { const g = new THREE.ShapeGeometry(shape, seg).rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.set(ISLE.x, y, ISLE.z); m.receiveShadow = true; scene.add(m); return m; };
  const lagoonTex = tex(512, 512, (x, w, h) => { const g2 = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g2.addColorStop(0, '#a6ece2'); g2.addColorStop(0.16, '#8fe3dc'); g2.addColorStop(0.24, '#4fcbd3'); g2.addColorStop(0.42, '#27aac6'); g2.addColorStop(1, '#1a86ae'); x.fillStyle = g2; x.fillRect(0, 0, w, h); });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: lagoonTex.t, roughness: 0.1, metalness: 0.2, envMapIntensity: 1.3 }));
  water.position.set(ISLE.x, -0.3, ISLE.z); water.receiveShadow = true; scene.add(water);
  // marina: the island outline gets a notch: a basin in front of the boulevard, opening through a channel to the lagoon
  const notched = (rx, rz) => {
    const sh = new THREE.Shape(), P = (x, z) => [x - ISLE.x, -(z - ISLE.z)];
    const zEdge = x => ISLE.z + rz * Math.sqrt(Math.max(0, 1 - ((x - ISLE.x) / rx) ** 2));
    const ta = Math.acos((CHAN.x1 - ISLE.x) / rx), tb = Math.acos((CHAN.x0 - ISLE.x) / rx);
    const pts = [];
    for (let k = 0; k <= 160; k++) { const t = tb + (ta + Math.PI * 2 - tb) * (k / 160); pts.push(P(ISLE.x + rx * Math.cos(t), ISLE.z + rz * Math.sin(t))); }
    pts.push(P(CHAN.x1, zEdge(CHAN.x1)), P(CHAN.x1, BASIN.z1), P(BASIN.x1, BASIN.z1), P(BASIN.x1, BASIN.z0), P(BASIN.x0, BASIN.z0), P(BASIN.x0, BASIN.z1), P(CHAN.x0, BASIN.z1), P(CHAN.x0, zEdge(CHAN.x0)));
    sh.moveTo(...pts[0]); for (const q of pts.slice(1)) sh.lineTo(...q); sh.closePath();
    return sh;
  };
  const sandShape = MARINA ? notched(ISLE.rx + 16, ISLE.rz + 16) : ellipse(ISLE.rx + 16, ISLE.rz + 16);
  const grassShape = MARINA ? notched(ISLE.rx, ISLE.rz) : ellipse(ISLE.rx, ISLE.rz);
  flat(sandShape, -0.1, new THREE.MeshStandardMaterial({ color: '#f3e6c8', roughness: 1 }));
  flat(grassShape, 0, new THREE.MeshStandardMaterial({ color: '#dde8cc', roughness: 0.95 }));
  if (MARINA) {
    const bw = BASIN.x1 - BASIN.x0, bd = BASIN.z1 - BASIN.z0, bx = (BASIN.x0 + BASIN.x1) / 2, bz = (BASIN.z0 + BASIN.z1) / 2;
    const bTex = tex(64, 256, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#1f93b4'); g2.addColorStop(0.6, '#2aaec3'); g2.addColorStop(1, '#44c2cc'); x.fillStyle = g2; x.fillRect(0, 0, w, h); });
    const bwat = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: bTex.t, roughness: 0.06, metalness: 0.25, envMapIntensity: 1.4 }));
    bwat.position.set(bx, -0.25, bz); bwat.receiveShadow = true; scene.add(bwat);
    // the channel water fades into the lagoon at the harbour mouth
    const cw = CHAN.x1 - CHAN.x0, cEnd = ISLE.z + (ISLE.rz + 16), cd = cEnd - BASIN.z1;
    const cTex = tex(64, 256, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, 'rgba(58,186,206,0)'); g2.addColorStop(0.35, 'rgba(58,186,206,0.9)'); g2.addColorStop(1, 'rgba(68,194,204,1)'); x.fillStyle = g2; x.fillRect(0, 0, w, h); });
    const cwat = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: cTex.t, transparent: true, roughness: 0.06, metalness: 0.25, envMapIntensity: 1.4, depthWrite: false }));
    cwat.position.set((CHAN.x0 + CHAN.x1) / 2, -0.26, BASIN.z1 + cd / 2); scene.add(cwat);
    const quay = new THREE.MeshStandardMaterial({ color: '#e9e4da', roughness: 0.8 });
    const wall = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), quay); m.position.set(x, -0.4, z); m.receiveShadow = true; m.castShadow = true; scene.add(m); };
    wall(bw + 2, 1.2, bx, BASIN.z0 - 0.6);
    wall(CHAN.x0 - BASIN.x0 + 1, 1.2, (BASIN.x0 + CHAN.x0) / 2 - 0.5, BASIN.z1 + 0.6);
    wall(BASIN.x1 - CHAN.x1 + 1, 1.2, (CHAN.x1 + BASIN.x1) / 2 + 0.5, BASIN.z1 + 0.6);
    wall(1.2, bd, BASIN.x0 - 0.6, bz); wall(1.2, bd, BASIN.x1 + 0.6, bz);
    const armEnd = ISLE.z + ISLE.rz + 12, armLen = armEnd - BASIN.z1;
    wall(1.4, armLen, CHAN.x0 - 0.7, BASIN.z1 + armLen / 2); wall(1.4, armLen, CHAN.x1 + 0.7, BASIN.z1 + armLen / 2);
    // harbour lights on the two breakwater heads: red to port, green to starboard on the way in
    for (const [x, c] of [[CHAN.x0 - 0.7, '#e0473d'], [CHAN.x1 + 0.7, '#36b37e']]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 5, 16), new THREE.MeshStandardMaterial({ color: '#fbfaf7', roughness: 0.4 })); post.position.set(x, 2.3, armEnd); post.castShadow = true; scene.add(post);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.4, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); band.position.set(x, 2.8, armEnd); scene.add(band);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), glowMat(c, 2.2)); lamp.position.set(x, 5.3, armEnd); scene.add(lamp);
    }
    // mooring bollards along the quay
    const boll = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 10), new THREE.MeshStandardMaterial({ color: '#39424e', roughness: 0.5, metalness: 0.4 }), 40);
    let nb = 0; const m4b = new THREE.Matrix4();
    for (let x = BASIN.x0 + 4; x < BASIN.x1 - 2 && nb < 40; x += 6) { m4b.makeTranslation(x, 0.7, BASIN.z0 - 1.8); boll.setMatrixAt(nb++, m4b); }
    boll.count = nb; scene.add(boll);
  }
  {
    const pos = [], N = 256, walkMat = new THREE.MeshStandardMaterial({ color: '#f5f2ec', roughness: 0.9 });
    const at = (t, d) => [ISLE.x + (ISLE.rx - d) * Math.cos(t), ISLE.z + (ISLE.rz - d) * Math.sin(t)];
    const gap = (x, z) => MARINA && z > 0 && x > CHAN.x0 - 2 && x < CHAN.x1 + 2;
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI * 2, t1 = ((k + 1) / N) * Math.PI * 2;
      const [ax, az] = at(t0, 2), [bx2, bz2] = at(t1, 2), [cx, cz] = at(t1, 7), [dx, dz] = at(t0, 7);
      if (gap(ax, az) || gap(bx2, bz2)) continue;
      pos.push(ax, 0.05, az, cx, 0.05, cz, bx2, 0.05, bz2, ax, 0.05, az, dx, 0.05, dz, cx, 0.05, cz);
    }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.computeVertexNormals();
    const w = new THREE.Mesh(g2, walkMat); w.receiveShadow = true; walkMat.side = THREE.DoubleSide; scene.add(w);
  }
  const lineM = new THREE.MeshStandardMaterial({ color: '#e2ddd3', roughness: 0.9 });
  if (MARINA) {
    const prom = new THREE.Mesh(rrGeo(150, 24, 4, 0.25), stone); prom.position.set(5, 0, BASIN.z0 - 13); prom.receiveShadow = true; scene.add(prom);
    for (let x = -68; x <= 78; x += 6) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 19), lineM); l.position.set(x, 0.27, BASIN.z0 - 13); scene.add(l); }
  } else {
    const plaza = new THREE.Mesh(rrGeo(160, 40, 8, 0.25), stone); plaza.position.set(8, 0, 2); plaza.receiveShadow = true; scene.add(plaza);
    for (let x = -70; x <= 86; x += 6) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 39), lineM); l.position.set(x, 0.27, 2); scene.add(l); }
  }
  // streets: boulevard behind the towers and two cross streets down to the beach walk
  const road = new THREE.MeshStandardMaterial({ color: '#c7cbd1', roughness: 0.9 });
  const walk = new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.9 });
  const dash = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const street = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, horiz = w > d;
    const sw = new THREE.Mesh(new THREE.BoxGeometry(w + (horiz ? 0 : 3), 0.1, d + (horiz ? 3 : 0)), walk); sw.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); sw.receiveShadow = true; scene.add(sw);
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), road); r.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); r.receiveShadow = true; scene.add(r);
    const len = horiz ? w : d;
    for (let t = 3; t < len - 3; t += 8) { const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 3.5 : 0.35, 0.02, horiz ? 0.35 : 3.5), dash); m.position.set(horiz ? x0 + t : (x0 + x1) / 2, 0.11, horiz ? (z0 + z1) / 2 : z0 + t); scene.add(m); }
  };
  street(-200, 200, -64.5, -57.5);
  if (MARINA) { street(-63, -57, BASIN.z1 + 4, 122); street(67, 73, BASIN.z1 + 4, 122); } else { street(-63, -57, -57.5, 122); street(67, 73, -57.5, 122); }
  // audience plaza
  const ap = new THREE.Mesh(new THREE.CylinderGeometry(62, 62, 0.4, 96), stone); ap.position.set(GC.x, 0.2, GC.z); ap.receiveShadow = true; scene.add(ap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(62, 0.25, 6, 128).rotateX(Math.PI / 2), white); ring.position.set(GC.x, 0.42, GC.z); scene.add(ring);
  const path = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 20), stone); path.position.set(GC.x, 0.15, -54); path.receiveShadow = true; scene.add(path);
}

// trees: rounded street and park trees, palms along the water
{
  const canopyGeo = mergeGeometries([
    new THREE.IcosahedronGeometry(1, 2).translate(0, 0, 0),
    new THREE.IcosahedronGeometry(0.72, 2).translate(0.62, -0.2, 0.25),
    new THREE.IcosahedronGeometry(0.66, 2).translate(-0.55, -0.25, -0.3),
    new THREE.IcosahedronGeometry(0.6, 2).translate(0.05, 0.45, -0.1),
  ]);
  const spots = [];
  const along = (x0, z0, x1, z1, step, off) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / step); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; const nx = -(z1 - z0) / L, nzv = (x1 - x0) / L; for (const s of [-1, 1]) spots.push([x + nx * off * s, z + nzv * off * s, 1]); } };
  along(-190, -61, 190, -61, 14, 7.5);
  if (MARINA) { along(-60, BASIN.z1 + 10, -60, 112, 14, 6.5); along(70, BASIN.z1 + 10, 70, 112, 14, 6.5); } else { along(-60, -52, -60, 112, 14, 6.5); along(70, -52, 70, 112, 14, 6.5); }
  const budget = lowPower ? 160 : 360;
  for (let i = 0; spots.length < budget && i < 5000; i++) { const x = ISLE.x + (rnd() * 2 - 1) * ISLE.rx, z = ISLE.z + (rnd() * 2 - 1) * ISLE.rz; if (isFree(x, z, 5)) spots.push([x, z, 0.8 + rnd() * 0.6]); }
  const keep = spots.filter(([x, z]) => inIsle(x, z, 0.94) && !blocked.slice(0, 5).some(([x0, x1, z0, z1]) => x > x0 - 1 && x < x1 + 1 && z > z0 - 1 && z < z1 + 1) && Math.hypot(x - GC.x, z - GC.z) > 66 && !blocked.slice(5).some(([x0, x1, z0, z1]) => x > x0 - 1 && x < x1 + 1 && z > z0 - 1 && z < z1 + 1));
  const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: false });
  const trees = new THREE.InstancedMesh(canopyGeo, leaf, keep.length);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#b8a58c', roughness: 0.9 }), keep.length);
  const greens = ['#8cc27b', '#79b56b', '#9fcd88', '#6faa63', '#a8d392'].map(c => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  keep.forEach(([x, z, k], i) => {
    const s = (1.9 + rnd() * 1.1) * k;
    q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28);
    m4.compose(new V3(x, 2.3 + s * 0.9, z), q, new V3(s, s * 0.95, s)); trees.setMatrixAt(i, m4); trees.setColorAt(i, greens[i % greens.length]);
    m4.compose(new V3(x, 1.2, z), q.identity(), new V3(1, 1, 1)); trunks.setMatrixAt(i, m4);
  });
  trees.castShadow = true; trees.receiveShadow = true; trunks.castShadow = true;
  scene.add(trees, trunks);
  // palms on the waterfront
  const crownPts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; crownPts.push(new THREE.Vector2(0.05 + t * 4.2, 0.6 * Math.sin(t * Math.PI) - t * t * 1.4)); }
  const palmCrown = new THREE.LatheGeometry(crownPts, 9);
  const palmTrunk = new THREE.CylinderGeometry(0.22, 0.38, 9, 7).translate(0, 4.5, 0);
  const pts = []; for (let a = 0; a < Math.PI * 2; a += 0.05 + rnd() * 0.035) { const k = 1.02 + rnd() * 0.05; const px2 = ISLE.x + Math.cos(a) * ISLE.rx * k, pz2 = ISLE.z + Math.sin(a) * ISLE.rz * k; if (!(MARINA && pz2 > 0 && px2 > CHAN.x0 - 5 && px2 < CHAN.x1 + 5)) pts.push([px2, pz2]); }
  const pc = new THREE.InstancedMesh(palmCrown, new THREE.MeshStandardMaterial({ color: '#5fa05a', roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), pts.length);
  const pt = new THREE.InstancedMesh(palmTrunk, new THREE.MeshStandardMaterial({ color: '#c9b394', roughness: 0.9 }), pts.length);
  pts.forEach(([x, z], i) => {
    const lean = (rnd() - 0.5) * 0.35, h = 0.85 + rnd() * 0.35;
    q.setFromEuler(new THREE.Euler(lean * 0.6, rnd() * 6.28, lean));
    m4.compose(new V3(x, 0, z), q, new V3(1, h, 1)); pt.setMatrixAt(i, m4);
    const top = new V3(0, 9 * h, 0).applyQuaternion(q).add(new V3(x, 0, z));
    q.setFromEuler(new THREE.Euler(0, rnd() * 6.28, 0));
    m4.compose(top, q, new V3(1, 1, 1)); pc.setMatrixAt(i, m4);
  });
  pc.castShadow = pt.castShadow = true;
  scene.add(pc, pt);
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
// wide sign version for the monument in front of the client's tower
function drawSign(x, w, h) {
  x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h);
  x.fillStyle = CLIENT.color; x.fillRect(0, h - 14, w, 14);
  const sz = h * 0.62, lx = 34, ly = (h - 14 - sz) / 2;
  if (logoImg) { const s = Math.min(sz / logoImg.width, sz / logoImg.height); x.drawImage(logoImg, lx + (sz - logoImg.width * s) / 2, ly + (sz - logoImg.height * s) / 2, logoImg.width * s, logoImg.height * s); }
  else { x.fillStyle = CLIENT.color; x.beginPath(); x.arc(lx + sz / 2, ly + sz / 2, sz / 2, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = `800 ${Math.round(sz * 0.42)}px ${FONT}`; x.textAlign = 'center'; x.fillText(DATA.client.initials, lx + sz / 2, ly + sz * 0.64); }
  x.textAlign = 'left'; x.fillStyle = '#1d2430';
  let fs = 54; x.font = `800 ${fs}px ${FONT}`;
  while (x.measureText(DATA.client.name).width > w - sz - 90 && fs > 26) { fs -= 2; x.font = `800 ${fs}px ${FONT}`; }
  x.fillText(DATA.client.name, lx + sz + 28, h * 0.47);
  x.font = `600 24px ${FONT}`; x.fillStyle = '#5d6878'; x.fillText(`${DATA.client.industry} · ${DATA.client.market}`, lx + sz + 30, h * 0.47 + 40);
}
const signTex = tex(1024, 256, drawSign);
if (DATA.client.logo) { const im = new Image(); im.onload = () => { logoImg = im; logoTex.draw(drawLogo); signTex.draw(drawSign); updateCard(planP); }; im.src = DATA.client.logo; }

// ---------- towers ----------
const FH = 2;
const bld = {};
const glassMat = new THREE.MeshStandardMaterial({ color: '#5d82a6', roughness: 0.1, metalness: 0.8, envMapIntensity: 1.0 });
const heroGlass = new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: 0.16, metalness: 0.72, envMapIntensity: 1.05, emissive: new THREE.Color('#3a2400'), emissiveIntensity: 0.35 });
const doorCol = s => new THREE.Color(s == null ? '#9aa3ae' : s >= 80 ? '#36b37e' : s >= 50 ? '#e8a92e' : '#e25c4b');

// ---------- yachts (marina scene) ----------
const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.05, envMapIntensity: 1.1 });
const yWhite = new THREE.MeshStandardMaterial({ color: '#fbfaf7', roughness: 0.3, metalness: 0.02, envMapIntensity: 1.0 });
const yGlass = new THREE.MeshStandardMaterial({ color: '#17222d', roughness: 0.1, metalness: 0.75, envMapIntensity: 1.3 });
const teak = new THREE.MeshStandardMaterial({ color: '#b98f63', roughness: 0.8 });
const wood = new THREE.MeshStandardMaterial({ color: '#c3a47f', roughness: 0.85 });
function hullGeo(L, W, H, stripe) {
  const sh = new THREE.Shape();
  sh.moveTo(-W * 0.44, L / 2); sh.lineTo(W * 0.44, L / 2); sh.quadraticCurveTo(W / 2, L / 2, W / 2, L * 0.42);
  sh.lineTo(W / 2, -L * 0.06); sh.quadraticCurveTo(W / 2, -L * 0.38, 0, -L / 2); sh.quadraticCurveTo(-W / 2, -L * 0.38, -W / 2, -L * 0.06);
  sh.lineTo(-W / 2, L * 0.42); sh.quadraticCurveTo(-W / 2, L / 2, -W * 0.44, L / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: H, steps: 10, bevelEnabled: false, curveSegments: 20 });
  g.rotateX(-Math.PI / 2); // shape y becomes -z (bow toward +z), extrusion becomes height
  const pos = g.attributes.position, n = pos.count, oy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = pos.getY(i); oy[i] = y;
    const t = 1 - y / H, zn = pos.getZ(i) / (L / 2);
    pos.setX(i, pos.getX(i) * (1 - 0.4 * t * t));
    if (zn > 0) pos.setY(i, y + (1 - t) * zn * zn * H * 0.32 + t * zn * zn * H * 0.62);
  }
  const col = new Float32Array(n * 3);
  const cWhite = new THREE.Color('#fbfaf7'), cTeak = new THREE.Color('#b98f63'), cBottom = new THREE.Color('#1f3550'), cStripe = new THREE.Color(stripe);
  for (let k = 0; k < n; k += 3) {
    const a = oy[k], b = oy[k + 1], c = oy[k + 2], f = (a + b + c) / 3 / H;
    const cc = a === H && b === H && c === H ? cTeak : a === 0 && b === 0 && c === 0 ? cBottom : f < 0.3 ? cBottom : Math.floor(f * 10) === 6 ? cStripe : cWhite;
    for (let j = 0; j < 3; j++) { col[(k + j) * 3] = cc.r; col[(k + j) * 3 + 1] = cc.g; col[(k + j) * 3 + 2] = cc.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
function letterTex(b) { return tex(128, 128, (x, W) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, W, W); x.fillStyle = b.color; x.font = `800 84px ${FONT}`; x.textAlign = 'center'; x.fillText(b.id.toUpperCase(), W / 2, 96); }); }
function buildYacht(b) {
  const hero = !!b.client, L = b.L, W = b.W, H = L * 0.085;
  const zc = b.z, zs = zc + L / 2; // center and stern (bow toward the quay, stern toward the harbour mouth)
  const baseY = -0.25 - 0.3 * H;
  const g = new THREE.Group(); g.position.set(b.x, baseY, zc); g.rotation.y = Math.PI; scene.add(g);
  const hull = new THREE.Mesh(hullGeo(L, W, H, hero ? '#e8a92e' : b.color), hullMat); hull.castShadow = hull.receiveShadow = true; g.add(hull);
  // superstructure: sleek rounded decks with dark glass bands
  const ym = hero ? yWhite : yWhite.clone();
  const tier = (w, d, h, y, z, glassFrom = 0, glassLen = 1) => {
    const r = Math.min(w, d) * 0.46;
    const m = new THREE.Mesh(rrGeo(w, d, r, h), ym); m.position.set(0, y, z); m.castShadow = m.receiveShadow = true; g.add(m);
    const gd = d * glassLen, gz = z - d / 2 + d * glassFrom + gd / 2;
    const band = new THREE.Mesh(rrGeo(w * 1.02, gd * 1.01, Math.min(w * 1.02, gd) * 0.46, h * 0.42), yGlass); band.position.set(0, y + h * 0.3, gz); g.add(band);
    if (hero) { const trim = new THREE.Mesh(rrGeo(w * 1.03, d * 1.02, r * 1.02, 0.14), glowMat('#e8a92e', 1.3)); trim.position.set(0, y - 0.02, z); g.add(trim); }
    return m;
  };
  const w1 = W * 0.8, d1 = L * 0.5, h1 = Math.max(2, L * 0.045), z1 = -L * 0.1;
  tier(w1, d1, h1, H, z1, 0, 0.56);
  const w2 = W * 0.66, d2 = L * 0.33, h2 = h1 * 0.85, z2 = -L * 0.14;
  tier(w2, d2, h2, H + h1, z2);
  let topY = H + h1 + h2;
  // flybridge hardtop, radar arch, mast and flag
  const roofY = topY + h2 * 0.9;
  const roof = new THREE.Mesh(rrGeo(W * 0.62, L * 0.2, W * 0.26, 0.3), yWhite); roof.position.set(0, roofY, -L * 0.17); roof.castShadow = true; g.add(roof);
  for (const [px, pz] of [[-W * 0.22, -L * 0.1], [W * 0.22, -L * 0.1], [-W * 0.22, -L * 0.24], [W * 0.22, -L * 0.24]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, roofY - topY, 6), yWhite); post.position.set(px, (roofY + topY) / 2, pz); g.add(post); }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(W * 0.2, 0.22, 8, 24, Math.PI), yWhite); arch.position.set(0, roofY + 0.2, -L * 0.2); g.add(arch);
  const mastH = L * 0.1;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, mastH, 8), yWhite); mast.position.set(0, roofY + W * 0.2 + mastH / 2, -L * 0.2); g.add(mast);
  topY = roofY + W * 0.2 + mastH;
  const flagT = hero ? logoTex : letterTex(b);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: flagT.t, toneMapped: false, side: THREE.DoubleSide })); flag.position.set(0, topY - 1.4, -L * 0.2 - 1.45); flag.rotation.y = Math.PI / 2; g.add(flag);
  // logo (or letter) on both sides of the main deck, forward of the glass
  const ls = Math.min(h1 * 0.85, 3.2);
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(ls, ls), new THREE.MeshBasicMaterial({ map: (hero ? logoTex : flagT).t, toneMapped: false }));
    decal.position.set(side * (w1 / 2 + 0.03), H + h1 / 2, z1 + d1 * 0.2); decal.rotation.y = side * Math.PI / 2; g.add(decal);
  }
  // 12 portholes a side: the last 12 months, lit when there was a YouTube upload
  const pr = Math.max(0.22, L * 0.0055);
  const phGeo = new THREE.CylinderGeometry(pr, pr, 0.08, 14).rotateZ(Math.PI / 2);
  const dark = new THREE.InstancedMesh(phGeo, new THREE.MeshStandardMaterial({ color: '#22303f', roughness: 0.2, metalness: 0.6 }), 24);
  const lit = new THREE.InstancedMesh(new THREE.CylinderGeometry(pr * 1.15, pr * 1.15, 0.12, 14).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(hero ? '#ffc94d' : b.color).multiplyScalar(2.2), toneMapped: false }), 24);
  const slots = [];
  const m4 = new THREE.Matrix4();
  const yP = H * 0.46, half = (W / 2) * (1 - 0.4 * (1 - 0.46) ** 2) + 0.02;
  for (let i = 0; i < 12; i++) for (const side of [-1, 1]) { const z = -L * 0.42 + i * (L * 0.34 / 11); slots.push([side * half, yP, z]); m4.makeTranslation(side * half, yP, z); dark.setMatrixAt(slots.length - 1, m4); }
  g.add(dark, lit);
  const setGlow = months => {
    slots.forEach(([x, y, z], k) => { const on = months[Math.floor(k / 2)]; m4.compose(new V3(x + Math.sign(x) * 0.03, y, z), new THREE.Quaternion(), on ? new V3(1, 1, 1) : new V3(0.0001, 0.0001, 0.0001)); lit.setMatrixAt(k, m4); });
    lit.instanceMatrix.needsUpdate = true;
  };
  setGlow(b.months);
  // floating pier along the port side, from the promenade to the stern
  const px = b.x - W / 2 - 2.9, pLen = zs - BASIN.z0 + 1;
  const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, pLen), wood); pier.position.set(px, 0.05, BASIN.z0 - 0.5 + pLen / 2); pier.castShadow = pier.receiveShadow = true; scene.add(pier);
  // gangway from the pier to the deck, with its light showing website speed
  const deckY = baseY + H, gz = zc + L * 0.12;
  const gw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), yWhite); gw.position.set(px + 2.3, (0.3 + deckY) / 2, gz); gw.rotation.z = Math.atan2(deckY - 0.3, 2.2); g.parent.add(gw);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), new THREE.MeshBasicMaterial({ color: doorCol(b.speed).multiplyScalar(1.1), toneMapped: false }));
  door.position.set(px + 0.6, 1.05, gz + 1.2); scene.add(door);
  // reviews: people on the pier
  const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.75, 4, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), 44);
  let s0 = Math.abs(b.x * 13) + 5; const rn = () => ((s0 = (s0 * 16807 + 11) % 2147483647) / 2147483647);
  const shirts = ['#f7f3ea', '#e9eef5', '#f3e3c3', '#dcebe6'].map(c => new THREE.Color(c));
  for (let i = 0; i < 44; i++) { m4.compose(new V3(px - 1.1 + rn() * 2.2, 0.95, BASIN.z0 + 1 + rn() * (pLen - 3)), new THREE.Quaternion(), new V3(1, 1, 1)); crowd.setMatrixAt(i, m4); crowd.setColorAt(i, shirts[i % 4]); }
  crowd.count = Math.min(44, Math.max(1, Math.round(nz(b.reviews) / 8))); crowd.castShadow = true; scene.add(crowd);
  // video screen on a kiosk on the promenade
  const screen = tex(256, 144);
  const kx = b.x + W / 2 + 4, kz = BASIN.z0 - 5;
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 0.6), yWhite); kiosk.position.set(kx, 3.2, kz); kiosk.castShadow = true; scene.add(kiosk);
  const kLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), yWhite); kLeg.position.set(kx, 0.6, kz); scene.add(kLeg);
  const scM = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: screen.t, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
  scM.position.set(kx, 3.2, kz + 0.31); scene.add(scM);
  // search ads: banners on the promenade
  const bb = new THREE.Group(); bb.position.set(b.x + (hero ? 16 : 9), 0, BASIN.z0 - 18); scene.add(bb);
  const bbTex = tex(512, 224);
  const drawBB = (ads) => bbTex.draw((x, Wd, Ht) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, Wd, Ht); x.fillStyle = b.color; x.fillRect(0, 0, 12, Ht); x.fillStyle = '#5d6878'; x.font = `700 26px ${FONT}`; x.fillText('SEARCH ADS', 40, 56); x.fillStyle = '#1d2430'; x.font = `800 90px ${FONT}`; x.fillText(String(ads.n), 40, 150); x.font = `600 26px ${FONT}`; x.fillStyle = '#5d6878'; x.fillText('tracked searches', 40, 194); });
  for (const qx of [-3.4, 3.4]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), white); pole.position.set(qx, 3, 0); pole.castShadow = true; bb.add(pole); }
  const bbP = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.2, 0.3), white); bbP.position.set(0, 7.6, -0.2); bbP.castShadow = true; bb.add(bbP);
  const bbF = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.9), new THREE.MeshBasicMaterial({ map: bbTex.t, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) })); bbF.position.set(0, 7.6, -0.04); bb.add(bbF);
  if (b.ads) drawBB(b.ads); else bb.visible = false;
  if (hero) {
    const mon = new THREE.Group(); mon.position.set(b.x + 4, 0, BASIN.z0 - 11); scene.add(mon);
    const mb = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.6, 3), stone); mb.position.y = 0.3; mb.castShadow = true; mon.add(mb);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 4.4, 1.2), white); slab.position.y = 2.8; slab.castShadow = true; mon.add(slab);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 3.85), new THREE.MeshBasicMaterial({ map: signTex.t, toneMapped: false })); face.position.set(0, 2.8, 0.61); mon.add(face);
    hit(face, () => brandInfo(b));
  }
  const worldTop = baseY + topY;
  const hlMat = hero ? null : ym;
  proxy(W + 2, worldTop + 2, L, b.x, worldTop / 2, zc, () => brandInfo(b), { brand: b.id, mat: hlMat });
  hit(bbF, () => adInfo(b));
  hit(scM, () => videoInfo(b));
  if (hero) bld.heroTop = worldTop;
  bld[b.id] = { g, setGlow, screen, crowd, bb, bbF, drawBB, door, topY: worldTop, baseY, kiosk: new V3(kx, 3.2, kz), pier: new V3(px, 0, zs + pLen / 2), stern: zs, path: [new V3(px, 0, -55), new V3(px, 0, gz - 1)] };
}

for (const b of BRANDS) {
  if (MARINA) { buildYacht(b); continue; }
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z); scene.add(g);
  const w = b.w, floors = b.floors, hero = !!b.client;
  const twist = hero ? 0.021 : 0.012, taper = hero ? 0.22 : 0.14, r = w * 0.28;
  const pw = w + 8;
  const podium = new THREE.Mesh(rrGeo(pw, pw, 2.5, 4), stone); podium.castShadow = podium.receiveShadow = true; g.add(podium);
  const pcap = new THREE.Mesh(rrGeo(pw + 0.6, pw + 0.6, 2.8, 0.35), white); pcap.position.y = 4; pcap.castShadow = true; g.add(pcap);
  const band = new THREE.Mesh(rrGeo(pw + 0.25, pw + 0.25, 2.6, 0.25), glowMat(b.color, hero ? 1.6 : 1.0)); band.position.y = 0.2; g.add(band);
  const glassG = rrGeo(w, w, r, FH - 0.32), slabG = rrGeo(w + 0.7, w + 0.7, r + 0.35, 0.32), glowG = rrGeo(w + 1.0, w + 1.0, r + 0.5, 0.14);
  const gm = hero ? heroGlass : glassMat.clone();
  const glass = new THREE.InstancedMesh(glassG, gm, floors);
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
    const cw = w * ts * 1.05;
    const logoM = new THREE.MeshBasicMaterial({ map: logoTex.t, toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(cw, cw, cw), [logoM, logoM, white, white, logoM, logoM]); cube.position.y = cw / 2 + 1.2; cube.castShadow = true; crown.add(cube);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(cw * 0.8, 0.2, 8, 64).rotateX(Math.PI / 2), glowMat(b.color, 2.4)); ring.position.y = 0.6; crown.add(ring);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.25, 9, 8), white); spire.position.y = cw + 1.2 + 4.5; crown.add(spire);
    bld.heroTop = topY + cw + 1.2;
    // monument sign on the plaza in front of the tower
    const mon = new THREE.Group(); mon.position.set(0, 0, pw / 2 + 11); g.add(mon);
    const base = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.6, 3), stone); base.position.y = 0.3; base.castShadow = true; mon.add(base);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 4.4, 1.2), white); slab.position.y = 2.8; slab.castShadow = true; mon.add(slab);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 3.85), new THREE.MeshBasicMaterial({ map: signTex.t, toneMapped: false })); face.position.set(0, 2.8, 0.61); mon.add(face);
    hit(face, () => brandInfo(b));
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
  const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.75, 4, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), 44);
  let s0 = Math.abs(b.x * 13) + 5; const rn = () => ((s0 = (s0 * 16807 + 11) % 2147483647) / 2147483647);
  const shirts = ['#f7f3ea', '#e9eef5', '#f3e3c3', '#dcebe6'].map(c => new THREE.Color(c));
  for (let i = 0; i < 44; i++) { m4.compose(new V3(b.x - pw / 2 + 1 + rn() * (pw - 2), 0.85, b.z + pw / 2 + 1.2 + rn() * (hero ? 7 : 5)), q.identity(), new V3(1, 1, 1)); crowd.setMatrixAt(i, m4); crowd.setColorAt(i, shirts[i % 4]); }
  crowd.count = Math.min(44, Math.max(1, Math.round(nz(b.reviews) / 8))); crowd.castShadow = true; scene.add(crowd);
  const bb = new THREE.Group(); bb.position.set(b.x + (b.client ? 11 : 8), 0, 44); scene.add(bb);
  const bbTex = tex(512, 224);
  const drawBB = (ads) => bbTex.draw((x, W, H) => { x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, W, H); x.fillStyle = b.color; x.fillRect(0, 0, 12, H); x.fillStyle = '#5d6878'; x.font = `700 26px ${FONT}`; x.fillText('SEARCH ADS', 40, 56); x.fillStyle = '#1d2430'; x.font = `800 90px ${FONT}`; x.fillText(String(ads.n), 40, 150); x.font = `600 26px ${FONT}`; x.fillStyle = '#5d6878'; x.fillText('tracked searches', 40, 194); });
  for (const px of [-3.4, 3.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), white); p.position.set(px, 3, 0); p.castShadow = true; bb.add(p); }
  const bbP = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.2, 0.3), white); bbP.position.set(0, 7.6, -0.2); bbP.castShadow = true; bb.add(bbP);
  const bbF = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.9), new THREE.MeshBasicMaterial({ map: bbTex.t, toneMapped: false, color: new THREE.Color(0.95, 0.95, 0.95) })); bbF.position.set(0, 7.6, -0.04); bb.add(bbF);
  if (b.ads) drawBB(b.ads); else bb.visible = false;
  proxy(pw, topY + 8, pw, b.x, (topY + 8) / 2, b.z, () => brandInfo(b), { brand: b.id, mat: hero ? null : gm });
  hit(bbF, () => adInfo(b));
  hit(scM, () => videoInfo(b));
  bld[b.id] = { g, setGlow, screen, crowd, bb, bbF, drawBB, door, topY, path: [new V3(b.x, 0, 98), new V3(b.x, 0, b.z + pw / 2 + (hero ? 14 : 8))] };
}

// ---------- customers walking in: each business's stream is sized by its presence score ----------
const figGeo = mergeGeometries([new THREE.CapsuleGeometry(0.3, 0.7, 4, 8).translate(0, 0.65, 0), new THREE.SphereGeometry(0.27, 12, 8).translate(0, 1.55, 0)]).scale(1.45, 1.45, 1.45);
const MAXW = 70;
// Each stream is the buyers from the tracked searches that business ranks first on; the plan moves
// the searches it targets to the client. Falls back to the presence score if no volumes were measured.
const VOL_TOTAL = KEYWORDS.reduce((a, k) => a + nz(k.volume), 0);
const volWon = (id, after) => KEYWORDS.reduce((a, k) => a + ((after ? k.planOwner : k.owner) === id ? nz(k.volume) : 0), 0);
const BY_SEARCH = VOL_TOTAL > 0;
// Without volumes, each stream is the business's share of presence among the businesses shown. The crowd
// total stays fixed, so the share the client gains with the plan is taken from the competitors' streams.
const scoreOf = (b, after) => nz(after && b.client ? PM.overall : b.overall);
const scoreSum = (after) => BRANDS.reduce((a, b) => a + scoreOf(b, after), 0) || 1;
let shareT = null;
const crowdTotal = () => shareT ??= Math.min(52 * scoreSum(false) / Math.max(1, ...BRANDS.map(b => scoreOf(b, false))), (MAXW - 4) * scoreSum(true) / Math.max(1, scoreOf(CLIENT, true)));
const sharePct = (b, after) => Math.round(100 * scoreOf(b, after) / scoreSum(after));
const crowd = (b, after) => BY_SEARCH ? Math.round(3 + 57 * volWon(b.id, after) / VOL_TOTAL) : Math.max(3, Math.round(crowdTotal() * scoreOf(b, after) / scoreSum(after)));
const streams = BRANDS.map(b => {
  const [a0, a1] = bld[b.id].path;
  const len = a0.distanceTo(a1);
  const mesh = new THREE.InstancedMesh(figGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), MAXW);
  const base = new THREE.Color(b.client ? '#f6c453' : b.color).lerp(new THREE.Color('#ffffff'), b.client ? 0.15 : 0.45);
  const alt = new THREE.Color('#fbfaf6');
  for (let i = 0; i < MAXW; i++) mesh.setColorAt(i, i % 3 === 2 ? alt : base);
  mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh);
  const mid = a0.clone().add(a1).multiplyScalar(0.5);
  const dir = a1.clone().sub(a0).normalize();
  const box = proxy(6, 3, len, mid.x, 1.5, mid.z, () => streamInfo(b));
  box.rotation.y = Math.atan2(dir.x, dir.z);
  return { b, a0, a1, len, dir, mesh };
});
const tmp2 = new V3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new V3(), _s = new V3(1, 1, 1);
// With the plan on, the client's projected gain in buyers comes out of the competitors' streams:
// those walkers leave their own path partway, cross over, and arrive at the client's door in gold.
const _cA = new THREE.Color(), _gold = new THREE.Color('#f6c453');
function polyAt(pts, lens, total, f, out) {
  let d = f * total;
  for (let k = 0; k < lens.length; k++) { if (d <= lens[k] || k === lens.length - 1) return out.copy(pts[k]).lerp(pts[k + 1], Math.min(1, d / lens[k])); d -= lens[k]; }
  return out.copy(pts[pts.length - 1]);
}
const CS = () => streams.find(S => S.b.client);
// chevrons that flow along the crossing paths, pointing toward the client
const trailTex = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, 0, 64, 16);
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(14, 0); x.lineTo(34, 0); x.lineTo(50, 8); x.lineTo(34, 16); x.lineTo(14, 16); x.lineTo(30, 8); x.fill();
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
for (const S of streams) {
  if (S.b.client) continue;
  const C = CS();
  const pts = [S.a0.clone(), S.a0.clone().lerp(S.a1, 0.32), C.a0.clone().lerp(C.a1, 0.5), C.a1.clone()];
  const lens = pts.slice(1).map((q, k) => q.distanceTo(pts[k]));
  S.divert = { pts, lens, total: lens.reduce((a, b) => a + b, 0) };
  S.baseColor = new THREE.Color(S.b.color).lerp(new THREE.Color('#ffffff'), 0.45);
  const path = new THREE.CurvePath();
  const lift = pts.map(q => q.clone().setY(0.3));
  for (let k = 0; k < lift.length - 1; k++) path.add(new THREE.LineCurve3(lift[k], lift[k + 1]));
  const map = trailTex.clone(); map.needsUpdate = true; map.repeat.set(Math.max(1, Math.round(S.divert.total / 4.5)), 1);
  S.trail = new THREE.Mesh(new THREE.TubeGeometry(path, 160, MARINA ? 0.8 : 1.1, 8, false), new THREE.MeshBasicMaterial({ map, color: new THREE.Color('#f6c453').multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  S.trail.renderOrder = 2; S.trail.visible = false; scene.add(S.trail);
}
function drawStreams(t, p) {
  const e = ease(clamp01(p));
  const comps = streams.filter(S => !S.b.client);
  // each competitor's loss crosses over to the client; any extra gain comes from searches nobody held
  let fullCross = 0;
  for (const S of comps) {
    S.n = crowd(S.b, false); const loss = Math.max(0, S.n - crowd(S.b, true)); fullCross += loss; S.d = Math.round(loss * e);
    if (S.trail) { const o = loss > 0 ? clamp01((p - 0.05) / 0.35) : 0; S.trail.visible = o > 0.01; S.trail.material.opacity = o; S.trail.material.map.offset.x = -t * 0.9; }
  }
  const C = streams.find(S => S.b.client);
  const cBefore = crowd(C.b, false), cAfter = crowd(C.b, true);
  const cOwn = Math.max(1, Math.round(cBefore + Math.max(0, cAfter - cBefore - fullCross) * e));
  for (const S of streams) {
    const own = S.b.client ? cOwn : S.n - S.d;
    const total = S.b.client ? own : S.n;
    S.mesh.count = total;
    const speed = S.b.client ? 2.4 + p * 1.2 : 2.4;
    for (let i = 0; i < total; i++) {
      const lane = ((i * 7) % 5 - 2) * (MARINA ? 0.5 : 0.9);
      let f, dx, dz;
      if (i < own) {
        f = ((i * 0.6180339) % 1 + (t * speed) / S.len) % 1;
        _p.copy(S.a0).lerp(S.a1, f); dx = S.dir.x; dz = S.dir.z;
      } else {
        const D = S.divert, k = i - own;
        f = ((k * 0.6180339 + 0.37) % 1 + (t * 2.6) / D.total) % 1;
        polyAt(D.pts, D.lens, D.total, f, _p);
        polyAt(D.pts, D.lens, D.total, Math.min(1, f + 0.01), tmp2); dx = tmp2.x - _p.x; dz = tmp2.z - _p.z;
        const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
        _cA.copy(S.baseColor).lerp(_gold, clamp01((f - 0.25) / 0.3)); S.mesh.setColorAt(i, _cA);
      }
      _p.x += dz * lane; _p.z -= dx * lane;
      _p.y = Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.12 + 0.25;
      const fade = Math.min(1, f * 12, (1 - f) * 12);
      _s.setScalar(Math.max(0.001, fade * (i < own ? 1 : 1.3)));
      _q.setFromAxisAngle(new V3(0, 1, 0), Math.atan2(dx, dz));
      _m.compose(_p, _q, _s); S.mesh.setMatrixAt(i, _m);
    }
    if (!S.b.client) { S.recolored ||= []; for (let i = 0; i < own; i++) if (S.recolored[i]) { S.mesh.setColorAt(i, i % 3 === 2 ? _white : S.baseColor); S.recolored[i] = 0; } for (let i = own; i < total; i++) S.recolored[i] = 1; }
    S.mesh.instanceMatrix.needsUpdate = true;
    if (S.mesh.instanceColor) S.mesh.instanceColor.needsUpdate = true;
  }
}
const _white = new THREE.Color('#fbfaf6');

// ---------- keyword district ----------
const kw = [];
{
  const plinth = new THREE.Mesh(rrGeo(52, 42, 4, 0.8), stone); plinth.position.set(-99, 0, -16); plinth.receiveShadow = true; scene.add(plinth);
  const playTex = tex(128, 128, (x) => { x.fillStyle = '#1d2430'; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(52, 40); x.lineTo(92, 64); x.lineTo(52, 88); x.fill(); });
  const ringTex = tex(128, 128, (x) => { x.strokeStyle = '#fff'; x.lineWidth = 9; x.beginPath(); x.arc(64, 64, 55, 0, 7); x.stroke(); });
  const maxVol = Math.max(1, ...KEYWORDS.map(k => nz(k.volume)));
  KEYWORDS.forEach((k0, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = -115.5 + col * 11, z = -29 + row * 12, h = KEYWORDS.some(k => k.volume != null) ? 3 + (nz(k0.volume) / maxVol) * 38 : 16;
    const bodyM = new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.55 });
    const body = new THREE.Mesh(rrGeo(5.4, 5.4, 1.4, h), bodyM); body.position.set(x, 0.8, z); body.castShadow = body.receiveShadow = true; scene.add(body);
    const capM = new THREE.MeshBasicMaterial({ color: '#d9d3ca', toneMapped: false });
    const cap = new THREE.Mesh(rrGeo(5.9, 5.9, 1.6, 1.6), capM); cap.position.set(x, 0.8 + h - 1.6, z); scene.add(cap);
    let marker = null, ring = null;
    if (k0.video) {
      marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: playTex.t, depthWrite: false })); marker.scale.setScalar(2.6); marker.position.set(x, 0.8 + h + 2.6, z); scene.add(marker);
      ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex.t, color: new THREE.Color('#e8a92e').multiplyScalar(1.8), toneMapped: false, transparent: true, depthWrite: false })); ring.scale.setScalar(3.6); ring.position.copy(marker.position); ring.visible = !k0.videoOwner; scene.add(ring);
    }
    const k = { ...k0, capM, x, z, h, marker, ring, delay: 0.55 + i * 0.03, now: k0.owner };
    const hl = { mat: bodyM };
    hit(body, () => kwInfo(k), hl); hit(cap, () => kwInfo(k), hl); if (marker) hit(marker, () => kwInfo(k), hl);
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
const MAPC = { x: 106, z: -14 };
{
  const n = MAP.n, gap = 0.6, span = 40, S = (span - (n - 1) * gap) / n;
  const table = new THREE.Mesh(rrGeo(span + 6, span + 6, 3, 1.4), stone); table.position.set(MAPC.x, 0, MAPC.z); table.castShadow = table.receiveShadow = true; scene.add(table);
  const home = MAP.home;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const mat = new THREE.MeshStandardMaterial({ color: '#e2ddd5', roughness: 0.6 });
    const m = new THREE.Mesh(rrGeo(S, S, 0.7, 0.5), mat);
    const x = MAPC.x - span / 2 + S / 2 + i * (S + gap), z = MAPC.z - span / 2 + S / 2 + j * (S + gap);
    m.position.set(x, 1.4, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    const t = { m, mat, i, j, x, z, cur: MAP.grid[i]?.[j] ?? null, pro: MAP.planGrid[i]?.[j] ?? null, delay: 0.2 + Math.hypot(i - home[0], j - home[1]) * 0.12, now: null };
    hit(m, () => tileInfo(t), { mat });
    tiles.push(t);
  }
  // pin on the business location
  const ht = { i: home[0], j: home[1] };
  const hx = MAPC.x - span / 2 + S / 2 + ht.i * (S + gap), hz = MAPC.z - span / 2 + S / 2 + ht.j * (S + gap);
  const pin = new THREE.Group(); pin.position.set(hx, 3.2, hz); scene.add(pin);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), white); stem.position.y = 2; pin.add(stem);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), glowMat(CLIENT.color, 1.6)); head.position.y = 4.6; pin.add(head);
}
function paintTile(t, owner) {
  t.now = owner;
  if (owner === 'client') { t.mat.color.set(CLIENT.color); t.mat.emissive.set(CLIENT.color).multiplyScalar(0.5); t.m.scale.y = 3.2; }
  else if (owner && byId[owner]) { t.mat.color.set(byId[owner].color).lerp(new THREE.Color('#ffffff'), 0.12); t.mat.emissive.set(0); t.m.scale.y = 1.6; }
  else { t.mat.color.set('#e4e1da'); t.mat.emissive.set(0); t.m.scale.y = 1; }
  t.baseEmissive = t.mat.emissive.clone();
}

// ---------- AI answers board ----------
const aiTex = tex(1024, 853);
const AIPOS = { x: 80, z: 30 };
{
  const g = new THREE.Group(); g.position.set(AIPOS.x, 0, AIPOS.z); g.rotation.y = -0.5; scene.add(g);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 0.6), white); slab.position.set(0, 8.5, 0); slab.castShadow = true; g.add(slab);
  for (const px of [-4, 4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), white); p.position.set(px, 2, 0); g.add(p); }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 9.5), new THREE.MeshBasicMaterial({ map: aiTex.t, toneMapped: false, color: new THREE.Color(0.97, 0.97, 0.97) })); face.position.set(0, 8.5, 0.31); g.add(face);
  hit(face, () => aiInfo()); hit(slab, () => aiInfo());
}
function drawAI(p) {
  const AI = DATA.ai;
  aiTex.draw((x) => {
    const w = 768, h = 640;
    x.save(); x.scale(1024 / 768, 853 / 640);
    x.fillStyle = '#fbf8f2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#5d6878'; x.font = `700 24px ${FONT}`; x.fillText(AI.total ? `${AI.questions.length} BUYER QUESTIONS, ${AI.total} ANSWERS` : 'AI ASSISTANTS', 36, 52);
    x.fillStyle = '#1d2430'; x.font = `700 32px ${FONT}`;
    wrap(x, `“${AI.headline}”`, w - 72).slice(0, 2).forEach((l, i) => x.fillText(l, 36, 98 + i * 38));
    if (!AI.total) { x.fillStyle = '#8d96a3'; x.font = `700 34px ${FONT}`; x.fillText('Not checked in this audit', 36, 260); x.font = `600 24px ${FONT}`; x.fillText('The full audit asks ChatGPT, Claude and Gemini.', 36, 304); x.restore(); return; }
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
    x.restore();
  });
}

// ---------- platform icons: simple generic symbols (not the platforms' logos) ----------
function drawIcon(x, id, w) {
  x.save(); x.translate(w / 2, w / 2); const u = w / 100;
  x.fillStyle = '#ffffff'; x.strokeStyle = '#ffffff'; x.lineWidth = 7 * u; x.lineCap = 'round'; x.lineJoin = 'round';
  const circle = (cx, cy, r, fill) => { x.beginPath(); x.arc(cx * u, cy * u, r * u, 0, Math.PI * 2); fill ? x.fill() : x.stroke(); };
  const rrect = (X, Y, W, H, r, fill) => { rr(x, X * u, Y * u, W * u, H * u, r * u); fill ? x.fill() : x.stroke(); };
  if (id === 'google') { circle(-6, -6, 17, false); x.beginPath(); x.moveTo(7 * u, 7 * u); x.lineTo(22 * u, 22 * u); x.stroke(); }
  else if (id === 'youtube') { x.beginPath(); x.moveTo(-12 * u, -18 * u); x.lineTo(20 * u, 0); x.lineTo(-12 * u, 18 * u); x.closePath(); x.fill(); }
  else if (id === 'instagram') { rrect(-24, -17, 48, 36, 8, false); circle(0, 2, 10, false); rrect(-10, -24, 20, 8, 3, true); }
  else if (id === 'tiktok') { circle(-9, 15, 9, true); x.beginPath(); x.moveTo(0, 15 * u); x.lineTo(0, -22 * u); x.lineTo(17 * u, -14 * u); x.stroke(); }
  else if (id === 'facebook') { circle(-11, -9, 8, true); circle(11, -9, 8, true); x.beginPath(); x.arc(-11 * u, 17 * u, 13 * u, Math.PI, 0); x.fill(); x.beginPath(); x.arc(11 * u, 17 * u, 13 * u, Math.PI, 0); x.fill(); }
  else if (id === 'chatgpt') { rrect(-24, -20, 48, 32, 10, false); x.beginPath(); x.moveTo(-10 * u, 12 * u); x.lineTo(-16 * u, 24 * u); x.lineTo(2 * u, 12 * u); x.stroke(); circle(-10, -4, 3.5, true); circle(0, -4, 3.5, true); circle(10, -4, 3.5, true); }
  else if (id === 'pinterest') { circle(0, -8, 14, true); x.beginPath(); x.moveTo(0, 4 * u); x.lineTo(0, 26 * u); x.stroke(); }
  else if (id === 'linkedin') { rrect(-24, -10, 48, 32, 5, false); rrect(-9, -20, 18, 11, 3, false); x.beginPath(); x.moveTo(-24 * u, 3 * u); x.lineTo(24 * u, 3 * u); x.stroke(); }
  else { circle(0, 0, 18, false); }
  x.restore();
}
function iconTex(p) {
  return tex(128, 128, (x, w) => { x.fillStyle = p.color; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 3, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 5; x.stroke(); drawIcon(x, p.id, w); });
}

// ---------- audience plaza: platforms around the business, on the ground ----------
const GR = 40, NODE_Y = 9;
const graph = { nodes: [] };
const hubPos = new V3(GC.x, 11, GC.z);
{
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.5, 3, 48), white); ped.position.set(GC.x, 1.9, GC.z); ped.castShadow = ped.receiveShadow = true; scene.add(ped);
  const center = new THREE.Mesh(new THREE.SphereGeometry(5.2, 40, 24), new THREE.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.35, metalness: 0.1, emissive: new THREE.Color(CLIENT.color).multiplyScalar(0.25) }));
  center.position.copy(hubPos); center.castShadow = true; scene.add(center);
  const logoSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: logoTex.t, toneMapped: false })); logoSp.scale.setScalar(9); logoSp.position.copy(hubPos).add(new V3(0, 11, 0)); scene.add(logoSp);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.18, 8, 80).rotateX(Math.PI / 2), glowMat(CLIENT.color, 2.2)); halo.position.set(GC.x, 3.6, GC.z); scene.add(halo);
  hit(center, () => brandInfo(CLIENT)); hit(logoSp, () => brandInfo(CLIENT));
  const N = PLATFORMS.length;
  PLATFORMS.forEach((p, i) => {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
    const base = new V3(GC.x + Math.cos(a) * GR, 0, GC.z + Math.sin(a) * GR);
    const rad = p.users ? 1.8 + Math.sqrt(p.users / 1e9) * 2.3 : 5.0;
    const pos = base.clone().setY(NODE_Y + rad);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, pos.y - rad, 12), white); col.position.set(base.x, (pos.y - rad) / 2, base.z); col.castShadow = true; scene.add(col);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 0.5, 32), stone); foot.position.set(base.x, 0.45, base.z); foot.receiveShadow = true; scene.add(foot);
    const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.28, metalness: 0.2 });
    const node = new THREE.Mesh(new THREE.SphereGeometry(rad, 40, 24), mat); node.position.copy(pos); node.castShadow = true; scene.add(node);
    hit(node, () => platformInfo(p), { mat }); node.userData.platform = p;
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(p).t, toneMapped: false })); icon.scale.setScalar(Math.max(2.6, rad * 0.95)); scene.add(icon);
    icon.userData.platform = p; hit(icon, () => platformInfo(p), { mat });
    const dots = p.comps.filter(c => byId[c]).map((c, k) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 10), glowMat(byId[c].color, 1.3)); scene.add(d); return { d, c, k }; });
    const edgeGroup = new THREE.Group(); scene.add(edgeGroup);
    graph.nodes.push({ p, pos, base, rad, node, icon, dots, edgeGroup, a, delay: 0.3 + i * 0.08, state: null });
  });
}
function drawEdge(n, status) {
  if (n.state === status) return; n.state = status;
  n.edgeGroup.clear();
  const from = new V3(GC.x, 0.7, GC.z), to = n.base.clone().setY(0.7);
  const dir = to.clone().sub(from).normalize();
  from.addScaledVector(dir, 8.6); to.addScaledVector(dir, -3.1);
  if (status === 'none' || status === 'unknown') {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineDashedMaterial({ color: status === 'unknown' ? '#aab4bf' : '#6f7a88', dashSize: 1.4, gapSize: status === 'unknown' ? 2.2 : 1.1 }));
    l.computeLineDistances(); n.edgeGroup.add(l);
  } else {
    const w = status === 'active' ? 1.6 : 0.6;
    const len = from.distanceTo(to);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, len), glowMat(CLIENT.color, status === 'active' ? 2.0 : 1.3));
    strip.position.copy(from).add(to).multiplyScalar(0.5); strip.lookAt(to.x, strip.position.y, to.z);
    n.edgeGroup.add(strip);
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

// ---------- the 90-day plan wave ----------
const waves = [];
const waveTex = tex(256, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,210,110,0)'); g.addColorStop(0.75, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,200,90,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
function spawnWave(delay) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: waveTex.t, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.4, 1.1, 0.6) }));
  m.position.set(CLIENT.x, 0.5, CLIENT.z); m.visible = false; scene.add(m);
  waves.push({ m, t: -delay });
}

// ---------- labels ----------
const labels = [];
function label(html, pos, zones, cls = '', prio = null) {
  const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = html; $('#labels').appendChild(el);
  const l = { el, pos: pos.clone(), zones, prio, w: 0, h: 0 }; labels.push(l); return l;
}
const brandLabels = {};
for (const b of BRANDS) brandLabels[b.id] = label('', new V3(b.x, bld[b.id].topY + (MARINA ? (b.client ? 9 : 5) : (b.client ? 26 : 7)), b.z), ['all', 'street', 'store', 'comp'], b.client ? 'lbl-brand is-client' : 'lbl-brand', b.client ? 200 : 100);
const maxV = Math.max(1, ...kw.map(k => nz(k.volume)));
kw.forEach(k => { k.label = label(`<b>${esc(k.term)}</b><span>${k.volume == null ? 'not measured' : k.volume.toLocaleString() + '/mo'}</span>`, new V3(k.x, 0.8 + k.h + (k.video ? 5.4 : 2.4), k.z), ['kw'], 'lbl-kw', 10 + nz(k.volume) / maxV); });
graph.nodes.forEach(n => {
  label(`<b>${esc(n.p.name)}</b><span>${n.p.users ? fmtUsers(n.p.users) + ' ' + esc(n.p.usersLabel || 'monthly users') : esc(n.p.usersLabel || '')}</span>`, n.pos.clone().add(new V3(0, n.rad + 0.6, 0)), ['graph'], 'lbl-node', 30);
});
{
  const n = MAP.n, span = 40, gap = 0.6, S = (span - (n - 1) * gap) / n;
  const [hi, hj] = MAP.home;
  label('Business location', new V3(MAPC.x - span / 2 + S / 2 + hi * (S + gap), 10.5, MAPC.z - span / 2 + S / 2 + hj * (S + gap)), ['map'], 'lbl-hood', 40);
  const legend = BRANDS.map(b => `<span><i style="background:${b.color}"></i>${esc(b.name)}</span>`).join('') + '<span><i style="background:#e4e1da;border:1px solid #cfc9bf"></i>Nobody tracked</span>';
  label(legend, new V3(MAPC.x, 1.6, MAPC.z - span / 2 - 7), ['map'], 'lbl-legend', 50);
}
if (MARINA) {
  const C = bld.client, A = COMPS[0] && bld[COMPS[0].id];
  label('12 portholes = months with a YouTube upload', new V3(CLIENT.x + CLIENT.W / 2 + 1, C.baseY + CLIENT.L * 0.085 * 0.46 + 1.4, CLIENT.z + CLIENT.L * 0.12), ['store'], 'lbl-note');
  label('Gangway light = website speed', C.door.position.clone().add(new V3(0.8, 1.6, 0)), ['store', 'reviews'], 'lbl-note');
  label(BY_SEARCH ? 'People walking in = buyers from the searches each business ranks first on' : 'People walking in = share of presence; gold paths = people switching with the plan', bld.client.path[0].clone().lerp(bld.client.path[1], 0.35).add(new V3(2, 2, 0)), ['comp', 'all'], 'lbl-note', 5);
  label('People on the pier = reviews', new V3(C.pier.x + 2, 1.8, BASIN.z0 + 8), ['reviews'], 'lbl-note');
} else {
  label('Top 12 floors = months with a YouTube upload', new V3(CLIENT.x + 13, 58, CLIENT.z), ['store'], 'lbl-note');
  label('Door color = website speed', new V3(CLIENT.x + 7, 3.6, CLIENT.z + 11.2), ['store'], 'lbl-note');
  label(BY_SEARCH ? 'People walking in = buyers from the searches each business ranks first on' : 'People walking in = share of presence; gold paths = people switching with the plan', new V3(CLIENT.x + 2, 2.2, 74), ['comp'], 'lbl-note', 5);
  label('People = reviews', new V3(CLIENT.x + 4, 2.4, CLIENT.z + 15), ['reviews'], 'lbl-note');
}
label('WHERE THE AUDIENCE IS', new V3(GC.x, 34, GC.z), ['all'], 'lbl-zone', 1);
label('THE SEARCHES', new V3(-99, 50, -16), ['all'], 'lbl-zone', 1);
label('THE MAP', new V3(MAPC.x, 14, MAPC.z), ['all'], 'lbl-zone', 1);
label('AI ANSWERS', new V3(AIPOS.x, 20, AIPOS.z), ['all'], 'lbl-zone', 1);

// ---------- detail drawer ----------
const median = arr => { const v = arr.filter(x => x != null).sort((a, b) => a - b); if (!v.length) return null; const m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2); };
const compMed = key => median(COMPS.map(b => b[key]));
function brandInfo(b) {
  const P = b.client && plan && CLIENT.proposed;
  const sc = P ? P.scores : b.scores;
  const months = P ? P.months : b.months;
  return { title: b.name, chip: b.client ? (P ? 'Your business · projected' : 'Your business') : 'Competitor', color: b.color,
    big: (P ? P.overall : b.overall) ?? '–', bigLabel: 'Presence score',
    // Manual audits can supply their own rows (only what was actually checked).
    rows: (P ? P.rows || b.rows : b.rows) || [['Google reviews', fmt(P ? P.reviews : b.reviews)], ['Rating', b.rating ?? 'not shown'], ['Sites linking in', fmt(P ? P.domains : b.domains)], ['Months with a YouTube upload (of 12)', b.monthsChecked === false && !P ? 'not checked' : months.filter(Boolean).length], ['Mobile speed score', fmt(P ? P.speed : b.speed)], ['Searches with their ad', b.ads?.n ?? 0]],
    bars: sc, note: b.client ? (P ? 'Projected scores are ranges from fixed rules; the middle of each range is shown.' : 'Each score compares against the competitor median, which scores 100.') : 'Public data collected for this audit.' };
}
function kwInfo(k) {
  const own = k.now;
  return { title: k.term, chip: 'Search', color: own ? byId[own]?.color : '#8d96a3', big: k.volume == null ? '–' : k.volume.toLocaleString(), bigLabel: 'Searches per month (Google estimate)',
    rows: [['Ranks first locally', nameOf(k.owner)], ['Google shows video results', k.video == null ? 'Not checked' : k.video ? 'Yes' : 'No'], ['Owns the video result', k.video ? (k.videoOwner ? nameOf(k.videoOwner) : 'No local business yet') : '–'], ['In the 90-day plan', k.planOwner === 'client' ? 'Targeted' : 'Not a first target'], ...(k.rows || []), ...srcRow(k.evidence)],
    note: k.note ? k.note : k.video && !k.videoOwner ? 'An open video result: the fastest win for new video.' : 'Search volumes are Google Ads estimates for the area.' };
}
function tileInfo(t) {
  if (MAP.checked === false) return { title: 'Google map check', chip: 'Google map, top 3', color: '#8d96a3', rows: [['Status', 'Not checked in this audit']], note: 'The full audit runs a Google Maps search from each spot on this grid.' };
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
  if (!AI.total) return { title: 'AI answers', chip: 'ChatGPT, Claude, Gemini, Google', color: '#2f8a6d', big: '–', bigLabel: 'Not checked in this audit', rows: AI.questions.slice(0, 6).map((q, i) => [`Question ${i + 1}`, q]), note: 'The full audit asks each assistant these questions with web search on and counts who is named.' };
  return { title: 'AI answers', chip: 'ChatGPT, Claude, Gemini, Google', color: '#2f8a6d', big: plan && AI.projectedNamed != null ? `${AI.projectedNamed} / ${AI.total}` : `${AI.clientNamed} / ${AI.total}`, bigLabel: plan && AI.projectedNamed != null ? 'Answers naming the business (projected)' : 'Answers naming the business',
    rows: [...AI.rows.map(r => [r.assistant, `${r.clientCount} of ${r.total} name ${DATA.client.name.length > 20 ? 'it' : DATA.client.name}; ${r.named.length ? 'most named: ' + r.named.map(nameOf).join(', ') : 'no competitor named'}`]), ...AI.questions.slice(0, 6).map((q, i) => [`Question ${i + 1}`, q])],
    note: 'Each question was asked with web search on, and repeated because answers vary between runs. A mention counts only if the name or website appears in the answer.' };
}
function adInfo(b) { const ads = b.ads || { n: 0 }; return { title: `${b.name}: search ads`, chip: 'Paid ads', color: b.color, big: ads.n, bigLabel: 'Tracked searches where their ad showed', rows: [['Tracked searches', KEYWORDS.length]], note: 'Counted from the ads Google showed on the tracked searches.' }; }
function streamInfo(b) {
  const after = plan, vol = BY_SEARCH ? volWon(b.id, after) : null;
  const won = KEYWORDS.filter(k => (after ? k.planOwner : k.owner) === b.id);
  const S = streams.find(x => x.b.id === b.id);
  return { title: `${b.name}: buyers walking in`, chip: after && b.client ? 'Projected after 90 days' : after ? 'After the client\'s 90-day plan' : 'Today', color: b.color,
    big: BY_SEARCH ? vol.toLocaleString() : sharePct(b, after) + '%', bigLabel: BY_SEARCH ? 'Monthly searches where they rank first' : 'Share of people walking in',
    rows: [['Searches ranked first', `${won.length} of ${KEYWORDS.length}`], ...won.slice(0, 5).map(k => ['', `${k.term} (${fmt(k.volume)}/mo)`]),
      ...(BY_SEARCH ? [] : [['Presence score', after && b.client ? PM.overall : (b.overall ?? '–')]]),
      ...(after && !b.client && S?.d ? [['Switching to ' + DATA.client.name, S.d]] : [])],
    note: BY_SEARCH ? 'Each stream is the buyers searching the tracked terms that business ranks first on. The 90-day plan targets the searches with open video results and no clear leader.' : 'An illustration: each stream is that business\'s share of presence among the businesses shown, based on the areas checked. With the plan on, the share the client gains is taken from the competitors.' };
}
function linkInfo(b) { const d = b.client && plan && CLIENT.proposed ? CLIENT.proposed.domains : b.domains; return { title: `${b.name}: sites linking in`, chip: 'Backlinks', color: b.color, big: fmt(d), bigLabel: 'Referring domains', rows: [['Competitor median', fmt(compMed('domains'))]], note: 'Links from other sites help Google trust a business.' }; }
function videoInfo(b) { return { title: `${b.name}: video`, chip: 'YouTube', color: b.color, big: b.monthsChecked === false ? '–' : b.months.filter(Boolean).length, bigLabel: 'Months with an upload, last 12', rows: b.videoNote ? [['Finding', b.videoNote]] : b.screen ? [['Most-viewed in searches', b.screen.label], ['Views', b.screen.views]] : [['Video in YouTube searches', 'None found']], note: 'From the YouTube channel and YouTube searches for the tracked terms.' }; }

let drawerOpen = null;
const track = (k, l) => { try { window.__track?.(k, l); } catch { /* tracking never breaks the page */ } };
function openDrawer(fn) {
  const d = fn();
  if (fn !== drawerOpen) track('click', d.title);
  drawerOpen = fn;
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

// picking, hover highlight and tooltip
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
const tip = $('#tip');
let downAt = null, hoverObj = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const h = pick(e); if (h?.object.userData.platform) { closeDrawer(); openPlatform(h.object.userData.platform); } else if (h) { closePlatform(); openDrawer(h.object.userData.info); } else closeDrawer();
});
canvas.addEventListener('pointerleave', () => setHover(null));
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const h = pick(e);
  canvas.style.cursor = h ? 'pointer' : '';
  setHover(h ? h.object : null);
  if (h) { tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`; }
});
function setHover(o) {
  if (o === hoverObj) return;
  const prev = hoverObj?.userData.hl;
  if (prev?.mat?.emissive) prev.mat.emissive.copy(prev.base || new THREE.Color(0));
  if (prev?.brand) brandLabels[prev.brand].el.classList.remove('hot');
  hoverObj = o;
  const hl = o?.userData.hl;
  if (hl?.mat?.emissive) { hl.base = hl.mat.emissive.clone(); hl.mat.emissive.set('#6b4a0c').multiplyScalar(0.55).add(hl.base); }
  if (hl?.brand) brandLabels[hl.brand].el.classList.add('hot');
  if (o) { const d = o.userData.info(); tip.innerHTML = `${esc(d.title)}<small>Click for details</small>`; tip.classList.add('on'); }
  else tip.classList.remove('on');
}
function pick(e) {
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(clickables.filter(o => o.visible !== false && (!o.parent || o.parent.visible !== false)), false);
  return hits[0] || null;
}


// ---------- platform window ----------
const PSTATUS = { active: 'Active', weak: 'Weak', none: 'Not present', unknown: 'Not checked' };
function openPlatform(p) {
  track('click', p.name);
  const st = plan ? p.planStatus : p.status;
  const isSearch = t => p.kind === 'search' || (p.kind === 'mixed' && t === t.toLowerCase());
  const searches = p.content.filter(isSearch), formats = p.content.filter(t => !isSearch(t));
  const chips = (arr, cls) => arr.map(t => `<span class="pchip ${cls}" style="--c:${p.color}">${esc(t)}</span>`).join('');
  $('#pwin').innerHTML = `
    <button class="pclose" aria-label="Close">×</button>
    <div class="phead"><i style="background:${p.color}"></i><div><h2>${esc(p.name)}</h2><div class="pusers">${p.users ? fmtUsers(p.users) + ' ' + esc(p.usersLabel || 'monthly users') : esc(p.usersLabel || '')}</div></div></div>
    <div class="prow"><span>${esc(DATA.client.name)}${plan ? ' (after 90 days)' : ''}</span><b class="st-${st}">${PSTATUS[st]}</b></div>
    <div class="prow"><span>Competitors active</span><b>${p.comps.length ? p.comps.map(c => esc(nameOf(c))).join(', ') : 'None found'}</b></div>
    <div class="prow"><span>Fit for this business</span><b>${esc(p.fit)}</b></div>
    ${searches.length ? `<h3>What buyers search or ask</h3><div class="pchips">${chips(searches, 'search')}</div>` : ''}
    ${formats.length ? `<h3>Content that works here</h3><div class="pchips">${chips(formats, '')}</div>` : ''}
    <h3>In the 90-day plan</h3><p class="pfix">${esc(p.fix)}</p>
    <p class="pnote">${esc(p.note)}</p>`;
  $('#pwin .pclose').onclick = closePlatform;
  document.body.classList.add('pwin-open');
}
function closePlatform() { document.body.classList.remove('pwin-open'); }
$('#pback').onclick = closePlatform;

// ---------- what the 90-day plan changes ----------
function passed() {
  const losers = COMPS.filter(b => crowd(b, true) < crowd(b, false)).map(b => b.name);
  return losers.length ? (losers.length > 1 ? losers.slice(0, -1).join(', ') + ' and ' + losers.at(-1) : losers[0]) : 'the competitors';
}
function planSummary() {
  const cnt = (g, id) => g.flat().filter(x => x === id).length;
  const rows = [
    [DATA.labels?.scoreRow || 'Presence score', CLIENT.overall, PM.overall],
    ...(BY_SEARCH ? [['Monthly searches ranked first', volWon('client', false).toLocaleString(), volWon('client', true).toLocaleString()]] : [['Share of people walking in', sharePct(CLIENT, false) + '%', sharePct(CLIENT, true) + '%']]),
    ['Google reviews', CLIENT.reviews, PM.reviews],
    ['Top 3 on the map', `${cnt(MAP.grid, 'client')} of ${MAP.n * MAP.n}`, `${cnt(MAP.planGrid, 'client')} of ${MAP.n * MAP.n}`],
    ...(BY_SEARCH ? [['Searches ranked first', KEYWORDS.filter(k => k.owner === 'client').length, KEYWORDS.filter(k => k.planOwner === 'client').length]] : []),
    ['Named in AI answers', `${DATA.ai.clientNamed} of ${DATA.ai.total}`, DATA.ai.projectedNamed != null ? `${DATA.ai.projectedNamed} of ${DATA.ai.total}` : null],
    [MARINA ? 'Lit portholes (video months)' : 'Glowing floors (video months)', CLIENT.months.filter(Boolean).length, PM.months.filter(Boolean).length],
  ].filter(r => r[1] != null && r[2] != null && String(r[1]) !== String(r[2]));
  $('#planToast').innerHTML = `<button class="pclose" aria-label="Close">×</button><div class="tk">What changes in 90 days (projected)</div>` +
    rows.map(([k, a, b]) => `<div class="trow"><span>${esc(k)}</span><b><s>${esc(a)}</s> → ${esc(b)}</b></div>`).join('') +
    (COMPS.some(b => crowd(b, true) < crowd(b, false)) ? `<div class="tnote">Watch the gold paths: people leave ${esc(passed())} and walk over to ${esc(DATA.client.name)}, turning gold.</div>` : `<div class="tnote">The stream to ${esc(DATA.client.name)} grows as the plan's pages and videos go live.</div>`);
  $('#planToast .pclose').onclick = () => document.body.classList.remove('toast-on');
}
let toastTimer = null;

// ---------- the 90-day plan ----------
let plan = false, planP = 0, planTarget = 0;
const PM = CLIENT.proposed || { scores: CLIENT.scores, months: CLIENT.months, reviews: CLIENT.reviews, domains: CLIENT.domains, speed: CLIENT.speed, ads: null, overall: CLIENT.overall };
// the number of people who switch over, shown at the client's door while the plan is on
{
  const switched = COMPS.reduce((a, b) => a + Math.max(0, crowd(b, false) - crowd(b, true)), 0);
  const C = streams.find(S => S.b.client);
  if (switched > 0 && C) { const l = label(`<span><b>+${switched}</b> switching from competitors</span>`, C.a1.clone().setY(MARINA ? 5 : 8), ['all', 'street', 'comp', 'store'], 'lbl-gain', 160); l.planOnly = true; }
}
function applyPlan(p) {
  const local = d => clamp01((p * 1.6 - d) / 0.35);
  const B = bld.client;
  const months = CLIENT.months.map((a, f) => (a === PM.months[f] ? a : (local(0.05 + f * 0.04) > 0.5 ? PM.months[f] : a)));
  B.setGlow(months);
  B.crowd.count = Math.round(Math.max(1, Math.min(44, (nz(CLIENT.reviews) + (nz(PM.reviews) - nz(CLIENT.reviews)) * local(0.15)) / 8)));
  B.door.material.color.copy(doorCol(CLIENT.speed == null ? null : CLIENT.speed + (nz(PM.speed) - CLIENT.speed) * local(0.1))).multiplyScalar(1.1);
  for (const t of tiles) paintTile(t, t.cur === t.pro ? t.cur : (local(t.delay) > 0.5 ? t.pro : t.cur));
  for (const k of kw) { const lp = local(k.delay); paintTower(k, k.owner === k.planOwner ? k.owner : (lp > 0.5 ? k.planOwner : k.owner)); if (k.ring) k.ring.visible = !k.videoOwner && !(k.planOwner === 'client' && lp > 0.5); }
  for (const n of graph.nodes) drawEdge(n, local(n.delay) > 0.5 ? n.p.planStatus : n.p.status);
}
applyPlan(0);
drawAI(0);
planSummary();

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
  overview: { zones: ['all', 'street'], pos: [128, 102, 196], tgt: [0, 30, -44] },
  graph: { zones: ['graph'], pos: [GC.x + 22, 150, GC.z - 132], tgt: [GC.x, 0, GC.z - 4] },
  kw: { zones: ['kw'], pos: [-46, 70, 92], tgt: [-99, 16, -16] },
  map: { zones: ['map'], pos: [92, 58, 44], tgt: [MAPC.x, 0, MAPC.z] },
  store: { zones: ['store'], pos: [72, 42, 112], tgt: [0, 38, -14] },
  reviews: { zones: ['reviews'], pos: [34, 15, 54], tgt: [0, 3, 0] },
  video: { zones: ['video'], pos: [-3, 4.5, 16], tgt: [-6.4, 2.2, -3] },
  ai: { zones: ['ai'], pos: [AIPOS.x - 14, 11, AIPOS.z + 22], tgt: [AIPOS.x, 8.5, AIPOS.z] },
  comp: { zones: ['comp', 'street'], pos: [-20, 46, 140], tgt: [4, 6, 28] },
  plan: { zones: ['all', 'street'], pos: [128, 102, 196], tgt: [0, 30, -44], forcePlan: true },
};
if (MARINA) {
  const C = bld.client, K = C.kiosk, zc = CLIENT.z;
  Object.assign(CAM.overview, { pos: [112, 96, 206], tgt: [8, 2, -4] });
  Object.assign(CAM.plan, { pos: [112, 96, 206], tgt: [8, 2, -4] });
  Object.assign(CAM.store, { pos: [CLIENT.x + 50, 20, zc + 34], tgt: [CLIENT.x, 3, zc] });
  Object.assign(CAM.reviews, { pos: [C.pier.x + 2, 58, BASIN.z0 + 62], tgt: [C.pier.x - 2, 0, BASIN.z0 + 14] });
  Object.assign(CAM.video, { pos: [K.x + 20, 22, K.z + 28], tgt: [K.x, 3, K.z] });
  Object.assign(CAM.comp, { pos: [30, 96, 170], tgt: [8, 0, 18] });
}
const STOPS = DATA.stops.filter(s => CAM[s.key]).map(s => ({ ...s, ...CAM[s.key] }));
{
  const more = $('#more'), card = document.querySelector('.stop');
  if (more && card) more.onclick = (e) => { e.stopPropagation(); const open = card.classList.toggle('open'); more.textContent = open ? 'Less' : 'More'; more.setAttribute('aria-expanded', String(open)); };
  if (matchMedia('(pointer: coarse)').matches) { const h = document.querySelector('.hint'); if (h) h.textContent = 'Tap anything for details · drag to orbit · pinch to zoom'; }
}
let cur = 0, fly = null, flyQueue = [], activeZones = STOPS[0].zones;
function renderStop() {
  const s = STOPS[cur], p = plan;
  $('#stopNum').textContent = `${String(cur + 1)} / ${String(STOPS.length)}`;
  $('#stopName').textContent = s.label;
  $('#title').textContent = p ? s.tp : s.t;
  const body = p ? s.bp : s.b;
  $('#body').textContent = body; $('#body').hidden = !body;
  $('#list').hidden = !s.list;
  if (s.list) $('#list').innerHTML = s.list.map(x => `<li>${esc(x)}</li>`).join('');
  document.querySelectorAll('.dot').forEach((d, i) => d.setAttribute('aria-current', i === cur ? 'step' : 'false'));
  const dots = $('#dots'), d = dots.children[cur];
  if (d && dots.scrollWidth > dots.clientWidth) dots.scrollTo({ left: d.offsetLeft - dots.offsetLeft - dots.clientWidth / 2 + d.offsetWidth / 2, behavior: 'smooth' });
}
function flyTo(pos, tgt, dur, opts = {}) { return { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new V3(...pos), t1: new V3(...tgt), ...opts }; }
function go(i) {
  $('#intro').classList.add('done');
  cur = (i + STOPS.length) % STOPS.length;
  const s = STOPS[cur];
  activeZones = s.zones;
  track('stop', s.label);
  if (s.forcePlan && !plan) setPlan(true);
  flyQueue = [];
  fly = flyTo(s.pos, s.tgt, 2.3);
  if (window.__instant) fly.t = 1;
  controls.autoRotate = false;
  renderStop();
}
function setPlan(on) {
  const was = plan;
  if (on !== was) track('plan', on ? 'on' : 'off');
  plan = on; planTarget = on ? 1 : 0;
  $('#plan').setAttribute('aria-pressed', on);
  $('#planLbl').textContent = on ? DATA.labels.planOn : DATA.labels.planOff;
  if (on && !was) {
    spawnWave(0); spawnWave(0.5); spawnWave(1.0);
    if (['overview', 'plan'].includes(STOPS[cur]?.key)) {
      const pts = streams.flatMap(S => [S.a0, S.a1]), c = new V3();
      const cross = streams.filter(S => S.divert).flatMap(S => [S.divert.pts[1], S.divert.pts[2]]);
      (cross.length ? cross : pts).forEach(q => c.add(q)); c.multiplyScalar(1 / (cross.length || pts.length));
      const span = Math.max(...pts.map(q => Math.hypot(q.x - c.x, q.z - c.z)));
      const d = Math.max(60, span * (camera.aspect < 0.9 ? 3.2 : 2.7));
      flyQueue = []; fly = flyTo([c.x + d * 0.1, d * 0.9, c.z + d * 0.75], [c.x, 0, c.z + d * 0.04], 2.4); controls.autoRotate = false;
    }
    document.body.classList.add('toast-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => document.body.classList.remove('toast-on'), 9000);
  }
  if (!on) document.body.classList.remove('toast-on');
  renderStop();
  if (drawerOpen) setTimeout(() => drawerOpen && openDrawer(drawerOpen), 1800);
}
{
  const nav = $('#dots');
  STOPS.forEach((s, i) => { const b = document.createElement('button'); b.className = 'dot'; b.innerHTML = `<span>${String(i + 1)}</span>${esc(s.label)}`; b.onclick = () => go(i); nav.appendChild(b); });
  $('#prev').onclick = () => go(cur - 1); $('#next').onclick = () => go(cur + 1);
  $('#plan').onclick = () => setPlan(!plan);
  addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); if (e.key.toLowerCase() === 'p') setPlan(!plan); if (e.key === 'Escape') { closeDrawer(); closePlatform(); } });
  controls.addEventListener('start', () => { fly = null; flyQueue = []; controls.autoRotate = false; });
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  camera.aspect = w / h; camera.fov = w / h < 0.9 ? 58 : 40; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- label placement: hide or nudge labels that would overlap ----------
const tmp = new V3();
function placeLabels() {
  const W = innerWidth, H = innerHeight;
  const placed = [];
  const shown = [];
  for (const l of labels) {
    const show = l.zones.some(z => activeZones.includes(z)) && (!l.planOnly || planP > 0.6);
    tmp.copy(l.pos).project(camera);
    const on = show && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    l.el.classList.toggle('on', on);
    if (!on) continue;
    l.sx = (tmp.x * 0.5 + 0.5) * W; l.sy = (-tmp.y * 0.5 + 0.5) * H;
    if (l.prio == null) { l.el.style.transform = `translate(${l.sx}px, ${l.sy}px)`; l.el.classList.remove('hide'); continue; }
    shown.push(l);
  }
  shown.sort((a, b) => b.prio - a.prio);
  for (const l of shown) {
    if (!l.w) {
      // measure once where the element really sits relative to its anchor point
      l.el.style.transform = `translate(${l.sx}px, ${l.sy}px)`; l.el.classList.remove('hide');
      const box = (l.el.classList.contains('lbl-pill') ? l.el.firstElementChild : l.el).getBoundingClientRect();
      l.w = box.width || 120; l.h = box.height || 24; l.ox = box.left - l.sx; l.oy = box.top - l.sy;
    }
    let ok = false, dy = 0;
    for (const off of [0, -(l.h + 4), l.h + 4]) {
      const r = [l.sx + l.ox, l.sy + l.oy + off, l.sx + l.ox + l.w, l.sy + l.oy + off + l.h];
      if (!placed.some(p => r[0] < p[2] + 6 && r[2] > p[0] - 6 && r[1] < p[3] + 4 && r[3] > p[1] - 4)) { placed.push(r); ok = true; dy = off; break; }
    }
    l.el.classList.toggle('hide', !ok);
    l.el.style.transform = `translate(${l.sx}px, ${l.sy + dy}px)`;
  }
}

// ---------- loop ----------
const clock = new THREE.Clock();
let lastScreen = 0, lastAI = -1, frames = 0, slowT = 0;
camera.position.set(-60, 520, 620); controls.target.set(0, 30, -40);
// opening: sweep in to the client's tower, pause on it, then settle on the overview
const heroTop = bld.heroTop;
fly = MARINA ? flyTo([46, 20, CLIENT.z + CLIENT.L / 2 + 30], [0, 5, CLIENT.z], 4.4, { intro: true }) : flyTo([34, heroTop + 16, 46], [0, heroTop - 8, -14], 4.4, { intro: true });
flyQueue = [flyTo([0, 0, 0], [0, 0, 0], 2.8, { hold: 1.1, stopIndex: 0 })];
renderStop();
setTimeout(() => $('#intro').classList.add('done'), 3200);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05) * (window.__speed || 1), t = clock.elapsedTime;
  if (fly) {
    if (fly.hold > 0) { fly.hold -= dt; }
    else {
      if (fly.stopIndex != null && fly.t === 0) { const s = STOPS[fly.stopIndex]; Object.assign(fly, flyTo(s.pos, s.tgt, fly.dur)); fly.stopIndex = null; }
      fly.t += dt / fly.dur; const e = ease(Math.min(1, fly.t));
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      if (!fly.intro) camera.position.y += Math.sin(e * Math.PI) * fly.p0.distanceTo(fly.p1) * 0.08;
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (fly.t >= 1) { fly = flyQueue.shift() || null; if (!fly && (STOPS[cur].key === 'overview' || STOPS[cur].key === 'plan')) controls.autoRotate = true; }
    }
  }
  controls.update();
  if (camera.position.y < 1.2) camera.position.y = 1.2;
  if (planP !== planTarget) {
    planP = planTarget > planP ? Math.min(planTarget, planP + dt / 3.6) : Math.max(planTarget, planP - dt / 1.6);
    applyPlan(planP); updateCard(planP);
  }
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]; w.t += dt;
    if (w.t < 0) continue;
    w.m.visible = true;
    const k = w.t / 3.2, r = 4 + ease(Math.min(1, k)) * 230;
    w.m.scale.set(r, 1, r); w.m.material.opacity = Math.max(0, 1 - k);
    if (k >= 1) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); }
  }
  const aiState = planP > 0.8 ? 1 : 0; if (aiState !== lastAI) { drawAI(aiState); lastAI = aiState; }
  if (t - lastScreen > 1 / 20) { lastScreen = t; for (const b of BRANDS) drawScreen(b, t, planP); }
  drawStreams(t, planP);
  for (const n of graph.nodes) n.icon.position.copy(n.pos).addScaledVector(tmp2.copy(camera.position).sub(n.pos).normalize(), n.rad + 0.3);
  if (MARINA) for (const b of BRANDS) { const B = bld[b.id]; B.g.position.y = B.baseY + Math.sin(t * 0.9 + b.x) * 0.1; B.g.rotation.z = Math.sin(t * 0.7 + b.x * 0.3) * 0.006; B.g.rotation.x = Math.sin(t * 0.5 + b.x) * 0.003; }
  for (const k of kw) if (k.ring && k.ring.visible) { const s = 3.4 + (Math.sin(t * 3 + k.x) * 0.5 + 0.5) * 1.3; k.ring.scale.setScalar(s); k.ring.material.opacity = 0.55 + Math.sin(t * 3 + k.x) * 0.35; }
  for (const n of graph.nodes) n.dots.forEach(({ d, k }) => { const a = t * 0.6 + k * 2.1 + n.a; d.position.copy(n.pos).add(new V3(Math.cos(a) * (n.rad + 1.8), Math.sin(a * 0.7) * 0.8, Math.sin(a) * (n.rad + 1.8))); });
  placeLabels();
  if (useBloom) composer.render(); else renderer.render(scene, camera);
  // slow machine: after the opening, drop the glow pass and render at a lower resolution
  frames++;
  if (frames > 90 && frames < 400 && useBloom !== null) { slowT = slowT * 0.95 + dt * 0.05; if (frames === 399 && slowT > 1 / 28) { useBloom = false; pixelRatio = 1; renderer.setPixelRatio(1); resize(); } }
  requestAnimationFrame(frame);
}
updateCard(0);
requestAnimationFrame(frame);
window.__gap = { go, setPlan, snap() { planP = planTarget; applyPlan(planP); updateCard(planP); }, open(kind) { if (kind === 'brand') openDrawer(() => brandInfo(CLIENT)); if (kind === 'node') openDrawer(() => platformInfo(PLATFORMS[1])); if (kind === 'ai') openDrawer(aiInfo); } };
