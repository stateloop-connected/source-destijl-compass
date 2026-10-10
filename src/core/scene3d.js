/**
 * scene3d.js — renderer, scene, lights, the drafting table and the De Stijl
 * backdrop. Pure presentation; it knows nothing about the game rules.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PALETTE, LW, LH } from './config.js';

const TAU = Math.PI * 2;

/** Small deterministic PRNG so the backdrop composition is stable. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The drafting paper: warm off-white, real grain, a three-scale grid
 * (10 / 50 / 100 units) and a soft vignette, so it reads as a sheet on a desk
 * rather than a flat white rectangle.
 */
function paperTexture() {
  const c = document.createElement('canvas');
  c.width = LW; c.height = LH;
  const g = c.getContext('2d');
  g.fillStyle = '#f6f2e9';
  g.fillRect(0, 0, c.width, c.height);

  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 13;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.94));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.8));
  }
  g.putImageData(img, 0, 0);

  // graph paper: a fine 10-unit mesh, a 50-unit medium line and a 100-unit
  // major line, plus the two coordinate axes through the origin of the table.
  const grid = (step, color, width) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    for (let x = 0; x <= LW; x += step) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, LH); }
    for (let y = 0; y <= LH; y += step) { g.moveTo(0, y + 0.5); g.lineTo(LW, y + 0.5); }
    g.stroke();
  };
  grid(10, 'rgba(26,26,26,0.07)', 1);
  grid(50, 'rgba(26,26,26,0.15)', 1);
  grid(100, 'rgba(26,26,26,0.27)', 1.5);

  // axes
  const ax = LW / 2, ay = LH / 2;
  g.strokeStyle = 'rgba(26,26,26,0.5)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(ax + 0.5, 0); g.lineTo(ax + 0.5, LH);
  g.moveTo(0, ay + 0.5); g.lineTo(LW, ay + 0.5);
  g.stroke();
  // ticks every 50 units
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= LW; x += 50) { g.moveTo(x + 0.5, ay - 7); g.lineTo(x + 0.5, ay + 7); }
  for (let y = 0; y <= LH; y += 50) { g.moveTo(ax - 7, y + 0.5); g.lineTo(ax + 7, y + 0.5); }
  g.stroke();

  const vg = g.createRadialGradient(LW / 2, LH / 2, Math.min(LW, LH) * 0.2,
    LW / 2, LH / 2, Math.hypot(LW, LH) * 0.56);
  vg.addColorStop(0, 'rgba(120,104,74,0)');
  vg.addColorStop(1, 'rgba(120,104,74,0.13)');
  g.fillStyle = vg;
  g.fillRect(0, 0, LW, LH);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function createScene3D(root) {
  const scene = new THREE.Scene();
  const SURROUND = '#dcd4c4';
  scene.background = new THREE.Color(SURROUND);
  scene.fog = new THREE.Fog(SURROUND, 2500, 6600);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  root.appendChild(labelRenderer.domElement);

  const camera = new THREE.PerspectiveCamera(32, 1, 10, 9000);
  camera.position.set(0, 1500, 2400);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 500;
  controls.maxDistance = 5200;
  // Full freedom: orbit all the way around and over the table. Press F to
  // return to the level's framing if you lose your bearings.
  controls.minPolarAngle = 0.02;
  controls.maxPolarAngle = Math.PI - 0.02;
  controls.rotateSpeed = 0.9;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;
  controls.autoRotateSpeed = 0.35;

  /* ---------------- lights ----------------
     three.js interprets light intensity in physical units, so a diffuse surface
     reaches its albedo at roughly π; the values below are tuned so the paper
     table reads as paper, not grey. */
  scene.add(new THREE.HemisphereLight(0xfffdf8, 0xcfc7b6, 1.5));
  const key = new THREE.DirectionalLight(0xfffdf8, 1.6);
  key.position.set(560, 1150, 620);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 200;
  key.shadow.camera.far = 3200;
  const S = 900;
  Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S });
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 1.4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-700, 500, -500);
  scene.add(fill);

  /* ---------------- the drafting table ---------------- */
  const tableGroup = new THREE.Group();
  scene.add(tableGroup);

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(LW, LH),
    new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.95, metalness: 0 })
  );
  paper.rotation.x = -Math.PI / 2;
  paper.receiveShadow = true;
  tableGroup.add(paper);

  const frameMat = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.6 });
  const frameT = 14, frameH = 12;
  const frame = new THREE.Group();
  const mk = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), frameMat);
    m.position.set(x, frameH / 2 - 1, z);
    m.castShadow = true; m.receiveShadow = true;
    frame.add(m);
  };
  mk(LW + frameT * 2, frameT, 0, -LH / 2 - frameT / 2);
  mk(LW + frameT * 2, frameT, 0, LH / 2 + frameT / 2);
  mk(frameT, LH + frameT * 2, -LW / 2 - frameT / 2, 0);
  mk(frameT, LH + frameT * 2, LW / 2 + frameT / 2, 0);
  tableGroup.add(frame);

  /* ---------------- De Stijl backdrop ---------------- */
  const backdrop = new THREE.Group();
  scene.add(backdrop);

  const palette = [PALETTE.red, PALETTE.blue, PALETTE.yellow, PALETTE.ink, PALETTE.paper];
  const weights = [0.26, 0.26, 0.22, 0.2, 0.06];
  const rnd = mulberry32(20240611);

  const pick = () => {
    let r = rnd(), acc = 0;
    for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (r <= acc) return palette[i]; }
    return palette[0];
  };

  const slabs = [];
  for (let i = 0; i < 30; i++) {
    const w = 300 + rnd() * 520;
    const d = 260 + rnd() * 470;
    const col = pick();
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.94, metalness: 0 });
    const h = 26 + rnd() * 60;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    // A ring biased towards the far side so the composition frames the table
    // instead of hiding behind the camera.
    const ang = Math.PI * (0.18 + rnd() * 1.64) + Math.PI; // mostly -z half
    const rad = 2050 + rnd() * 1500;
    m.position.set(Math.cos(ang) * rad, -560 - rnd() * 1100, Math.sin(ang) * rad);
    m.rotation.y = (rnd() - 0.5) * 0.8;
    m.userData.spin = (rnd() - 0.5) * 0.02;
    m.userData.baseY = m.position.y;
    m.userData.phase = rnd() * TAU;
    backdrop.add(m);
    slabs.push(m);
  }

  /* Framed Mondrian plates leaning in the distance. */
  const texLoader = new THREE.TextureLoader();
  const plates = [
    { file: 'mondrian-red-blue-yellow.jpg', pos: [-1720, -120, -1620], rot: 0.62, size: 640 },
    { file: 'mondrian-composition-1929.jpg', pos: [1680, -90, -1780], rot: -0.6, size: 620 },
    { file: 'mondrian-no-iv-1914.jpg', pos: [-120, -300, -2350], rot: 0.08, size: 760 }
  ];
  const base = import.meta.env.BASE_URL || './';
  for (const p of plates) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.9, metalness: 0, side: THREE.DoubleSide
    });
    texLoader.load(`${base}textures/${p.file}`, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    });
    const h = p.size * 1.08;
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(p.size + 40, h + 40, 22),
      new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.65 })
    );
    border.position.set(...p.pos);
    border.rotation.set(-0.22, p.rot, 0.02);
    backdrop.add(border);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.size, h), mat);
    m.position.copy(border.position).add(new THREE.Vector3(0, 0, 14));
    m.rotation.copy(border.rotation);
    backdrop.add(m);
  }

  /* ---------------- home-screen decoration ---------------- */
  const decor = new THREE.Group();
  scene.add(decor);
  const solids = [];
  const addSolid = (geo, color, pos, scale) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color, roughness: 0.72, metalness: 0.02, flatShading: true
    }));
    m.position.set(...pos);
    m.scale.setScalar(scale);
    m.castShadow = true;
    m.userData.spin = new THREE.Vector3(rnd() * 0.3 - 0.15, rnd() * 0.4 - 0.2, rnd() * 0.2 - 0.1);
    decor.add(m);
    solids.push(m);
    return m;
  };
  addSolid(new THREE.BoxGeometry(150, 150, 150), PALETTE.red, [-330, 150, 0], 1);
  addSolid(new THREE.TorusGeometry(95, 15, 12, 48), PALETTE.blue, [330, 140, -60], 1);
  addSolid(new THREE.TetrahedronGeometry(120), PALETTE.yellow, [0, 300, 90], 1);
  addSolid(new THREE.OctahedronGeometry(80), PALETTE.ink, [120, 60, 300], 1);
  addSolid(new THREE.CylinderGeometry(70, 70, 150, 6), PALETTE.blue, [-180, 90, -320], 1);
  decor.visible = false;

  /* ---------------- the construction objects live here ---------------- */
  const construction = new THREE.Group();
  scene.add(construction);

  /* ---------------- sizing ---------------- */
  function resize() {
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(now) {
    const t = now / 1000;
    for (const s of slabs) {
      s.position.y = s.userData.baseY + Math.sin(t * 0.35 + s.userData.phase) * 22;
      s.rotation.y += s.userData.spin * 0.002;
    }
    for (const s of solids) {
      s.rotation.x += s.userData.spin.x * 0.004;
      s.rotation.y += s.userData.spin.y * 0.004;
      s.rotation.z += s.userData.spin.z * 0.004;
      s.position.y += Math.sin(t * 0.8 + s.position.x) * 0.22;
    }
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  return {
    THREE, scene, camera, controls, renderer, labelRenderer,
    tableGroup, backdrop, decor, construction, resize, render,
    paperTexture
  };
}
