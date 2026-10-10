/**
 * app.js — the game controller: routing, pointer interaction, HUD, camera
 * framing, scoring and achievements. Wires the DOM to the session/scene.
 */

import * as THREE from 'three';
import { createScene3D } from './core/scene3d.js';
import { createVisuals } from './core/visuals.js';
import { createSession } from './core/session.js';
import { LEVELS, isUnlocked } from './core/levels.js';
import { store } from './core/storage.js';
import { audio } from './core/audio.js';
import { setLang, getLang, t, pick, applyI18n } from './core/i18n.js';
import { V } from './core/math3.js';
import { LW, LH, SNAP_PX, PALETTE } from './core/config.js';

const TOOLS = ['point', 'segment', 'circle', 'sphere', 'move'];
const KEY_TOOL = { 1: 'point', 2: 'segment', 3: 'circle', 4: 'sphere', 5: 'move' };

const ACHIEVEMENTS = [
  { id: 'first', key: 'ach.first' },
  { id: 'three', key: 'ach.three' },
  { id: 'sphere', key: 'ach.sphere' },
  { id: 'perfect5', key: 'ach.perfect5' },
  { id: 'all', key: 'ach.all' },
  { id: 'sandbox', key: 'ach.sandbox' }
];

export function boot() {
  const app = document.getElementById('app');
  const sceneRoot = document.getElementById('scene');
  const canvas = () => S3.renderer.domElement;

  const S3 = createScene3D(sceneRoot);
  const visuals = createVisuals(S3.construction);
  const session = createSession();

  /* ---------------- ui state ---------------- */
  const UI = {
    view: 'home',
    tool: 'point',
    pending: [],
    hover: null,
    pointer: null,
    dragPt: null,
    hintOpen: false,
    camTween: null,
    solvedShown: false
  };

  const $ = id => document.getElementById(id);
  const views = { home: $('view-home'), help: $('view-help'), play: $('view-play') };

  const ray = new THREE.Raycaster();
  const planeMath = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const v3 = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();

  /* ================= i18n ================= */
  function refreshLang() {
    setLang(store.lang);
    document.documentElement.lang = store.lang === 'en' ? 'en' : 'zh-CN';
    applyI18n(document);
    $('btnLang').textContent = t('home.lang');
    $('btnSound').textContent = `${t('home.sound')}: ${store.sound ? t('home.on') : t('home.off')}`;
    $('btnSound').classList.toggle('on', store.sound);
    renderHome();
    if (UI.view === 'play') renderLevelTexts();
    renderHint();
  }

  /* ================= home ================= */
  function renderHome() {
    const grid = $('levelGrid');
    grid.innerHTML = '';
    const doneIdx = completedIndices();

    LEVELS.forEach((L, i) => {
      const stars = store.starsFor(L.id);
      const unlocked = isUnlocked(i, doneIdx);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-card' + (stars > 0 ? ' done' : '') + (unlocked ? '' : ' locked');
      b.disabled = !unlocked;
      b.style.animationDelay = `${i * 40}ms`;
      b.innerHTML =
        `<span class="lc-num">${String(i + 1).padStart(2, '0')}</span>` +
        `<span class="lc-title">${pick(L.title)}</span>` +
        `<span class="lc-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`;
      b.addEventListener('click', () => {
        if (!unlocked) { toast(t('toast.locked')); return; }
        audio.ui();
        location.hash = `#/play/${i + 1}`;
      });
      grid.appendChild(b);
    });

    const total = LEVELS.length;
    const done = doneIdx.length;
    $('progressLabel').textContent = `${t('home.progress')} ${done} / ${total}`;
    $('progressFill').style.width = `${total ? (done / total) * 100 : 0}%`;
    $('starLabel').textContent = `★ ${store.totalStars()} / ${total * 3}`;

    const achRow = $('achRow');
    achRow.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const got = store.achievements.includes(a.id);
      const el = document.createElement('span');
      el.className = 'ach' + (got ? ' got' : '');
      el.textContent = t(a.key);
      achRow.appendChild(el);
    }
  }

  /* ================= routing ================= */
  function parseHash() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || 'home', param: parts[1] };
  }

  function showView(name) {
    UI.view = name;
    app.dataset.view = name;
    for (const k of Object.keys(views)) views[k].classList.toggle('active', k === name);
    const playing = name === 'play';
    S3.tableGroup.visible = playing;
    S3.decor.visible = !playing;
    S3.controls.autoRotate = !playing;
  }

  function route() {
    const r = parseHash();
    if (r.name === 'help') {
      showView('help');
      return;
    }
    if (r.name === 'play') {
      showView('play');
      const idx = Math.min(Math.max((parseInt(r.param, 10) || 1) - 1, 0), LEVELS.length - 1);
      startLevel(idx);
      return;
    }
    if (r.name === 'free') {
      showView('play');
      startSandbox();
      return;
    }
    showView('home');
    renderHome();
    frameHome();
  }

  /* ================= level lifecycle ================= */
  function startLevel(idx) {
    if (!isUnlocked(idx, completedIndices())) {
      toast(t('toast.locked'));
      location.hash = '#/';
      return;
    }
    const given = session.load(idx);
    resetInteraction();
    UI.hintOpen = false;
    UI.solvedShown = false;
    hideOverlay();
    renderLevelTexts();
    renderHint();
    updateHud();
    frameGiven(Object.values(given));
    if (store.lang) { /* noop, keeps linters honest */ }
  }

  function startSandbox() {
    session.loadSandbox();
    resetInteraction();
    UI.hintOpen = false;
    UI.solvedShown = false;
    hideOverlay();
    renderLevelTexts();
    renderHint();
    updateHud();
    frameGiven([]);
    if (store.unlockAchievement('sandbox')) toast(t('toast.ach', { n: t('ach.sandbox') }));
  }

  function completedIndices() {
    const out = [];
    LEVELS.forEach((L, i) => { if (store.starsFor(L.id) > 0) out.push(i); });
    return out;
  }

  function renderLevelTexts() {
    const sandbox = session.sandbox;
    $('levelBadge').textContent = sandbox ? '∞' : `${session.levelIndex + 1} / ${LEVELS.length}`;
    $('levelTitle').textContent = sandbox ? t('play.sandbox') : pick(session.level.title);
    $('goalText').innerHTML = sandbox
      ? `<b>${t('play.sandbox')}</b> · ${t('home.sandbox.desc')}`
      : pick(session.level.goal);
  }

  function renderHint() {
    const el = $('hintText');
    if (session.sandbox) { el.innerHTML = ''; return; }
    const L = session.level;
    if (!L) { el.innerHTML = ''; return; }
    if (UI.hintOpen) {
      el.innerHTML = `<b>${t('play.hint')}</b> ${pick(L.hint)} ` +
        `<button class="hint-toggle" type="button">${t('play.hint.hide')}</button>`;
    } else {
      el.innerHTML = `<button class="hint-toggle" type="button">${t('play.hint.show')}</button>`;
    }
    const btn = el.querySelector('.hint-toggle');
    if (btn) btn.addEventListener('click', () => { UI.hintOpen = !UI.hintOpen; audio.ui(); renderHint(); });
  }

  /* ================= camera ================= */
  function tweenCamera(pos, target, dur = 720) {
    UI.camTween = {
      p0: S3.camera.position.clone(), p1: pos.clone(),
      t0: S3.controls.target.clone(), t1: target.clone(),
      start: performance.now(), dur
    };
  }

  function frameHome() {
    tweenCamera(new THREE.Vector3(0, 980, 2050), new THREE.Vector3(0, 190, 0), 900);
  }

  const PITCH = 1.12;            // ~64° above the table: readable, not disorienting
  const FIT = new THREE.PerspectiveCamera();
  const fitDir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH)).normalize();
  const fitPt = new THREE.Vector3();

  /**
   * Frame the drafting table (plus any given points and headroom for 3D
   * constructions) by binary-searching the distance at which everything still
   * projects inside the free area between the HUD bars.
   */
  function frameGiven(points) {
    const pts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      pts.push(new THREE.Vector3(sx * (LW / 2 + 30), 0, sz * (LH / 2 + 30)));
    }
    let maxY = 0;
    for (const p of points) {
      pts.push(new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z));
      maxY = Math.max(maxY, p.pos.y);
    }
    const headroom = Math.max(maxY, (session.level && session.level.headroom) || 150);
    pts.push(new THREE.Vector3(0, headroom, 0));
    pts.push(new THREE.Vector3(-LW * 0.22, headroom * 0.82, 0));
    pts.push(new THREE.Vector3(LW * 0.22, headroom * 0.82, 0));

    const target = new THREE.Vector3(0, Math.min(maxY * 0.55, 170), 0);
    FIT.fov = S3.camera.fov;
    FIT.aspect = S3.camera.aspect;
    FIT.near = 10; FIT.far = 9000;
    FIT.updateProjectionMatrix();

    const LIM_X = 0.93, LIM_Y = 0.86;
    let lo = 600, hi = 9000;
    for (let i = 0; i < 30; i++) {
      const d = (lo + hi) / 2;
      FIT.position.copy(target).addScaledVector(fitDir, d);
      FIT.lookAt(target);
      FIT.updateMatrixWorld(true);
      let worst = 0;
      for (const p of pts) {
        fitPt.copy(p).project(FIT);
        worst = Math.max(worst, Math.abs(fitPt.x) / LIM_X, Math.abs(fitPt.y) / LIM_Y);
      }
      if (worst > 1) lo = d; else hi = d;
    }
    const dist = Math.min(hi, 5200);
    tweenCamera(target.clone().addScaledVector(fitDir, dist), target, 760);
  }

  function updateCameraTween(now) {
    const tw = UI.camTween;
    if (!tw) return;
    const k = Math.min(1, (now - tw.start) / tw.dur);
    const e = 1 - Math.pow(1 - k, 3);
    S3.camera.position.lerpVectors(tw.p0, tw.p1, e);
    S3.controls.target.lerpVectors(tw.t0, tw.t1, e);
    if (k >= 1) UI.camTween = null;
  }

  /* ================= interaction helpers ================= */
  function resetInteraction() {
    UI.pending = [];
    UI.hover = null;
    UI.dragPt = null;
    UI.pointer = null;
    setTool('point');
    visuals.setPreview(null);
    visuals.setPending([]);
    visuals.setHover(null);
    visuals.setCursor(null);
    S3.controls.enabled = true;
  }

  function pointerWorld(e) {
    const rect = canvas().getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    ray.setFromCamera(ndc, S3.camera);
    if (!ray.ray.intersectPlane(planeMath, hitPoint)) return null;
    return { x: hitPoint.x, y: 0, z: hitPoint.z };
  }

  /** Screen-space point picking — works for points that float above the table. */
  function pickPoint(e) {
    const rect = canvas().getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    let best = null, bestD = SNAP_PX;
    for (const o of session.M.objects) {
      if (o.type !== 'point' || o.valid === false) continue;
      v3.set(o.pos.x, o.pos.y, o.pos.z).project(S3.camera);
      if (v3.z > 1) continue;
      const sx = (v3.x * 0.5 + 0.5) * rect.width;
      const sy = (-v3.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(sx - px, sy - py);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  /* ================= pointer events ================= */
  let down = null;

  function onDown(e) {
    if (e.button !== 0) return;
    audio.unlock();
    const world = pointerWorld(e);
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (UI.tool === 'move' && world) {
      const hit = pickPoint(e);
      if (hit && hit.kind === 'free') {
        session.M.pushHistory();
        UI.dragPt = hit;
        S3.controls.enabled = false;
        visuals.setHover({ x: hit.pos.x, y: hit.pos.y, z: hit.pos.z }, 30);
      }
    }
  }

  function onMove(e) {
    const world = pointerWorld(e);
    UI.pointer = world;

    if (UI.dragPt) {
      if (world) {
        UI.dragPt.pos.x = world.x;
        UI.dragPt.pos.z = world.z;
        session.M.recompute();
        updateHud();
      }
      return;
    }

    const hit = pickPoint(e);
    UI.hover = hit;
    visuals.setHover(hit ? hit.pos : null, hit ? (hit.kind === 'given' ? 30 : 24) : 0);
    visuals.setCursor(world && !hit && UI.tool !== 'move' ? world : null);

    if (UI.pending.length && world) {
      const from = UI.pending[0].pos;
      const to = hit ? hit.pos : world;
      visuals.setPreview(
        UI.tool === 'circle' || UI.tool === 'sphere'
          ? { kind: 'circle', from, to }
          : { kind: 'segment', from, to }
      );
    } else {
      visuals.setPreview(null);
    }
  }

  function onUp(e) {
    if (UI.dragPt) {
      UI.dragPt = null;
      S3.controls.enabled = true;
      afterChange();
      down = null;
      return;
    }
    const isClick = down &&
      Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 &&
      performance.now() - down.t < 600;
    down = null;
    if (!isClick || session.solved) return;
    handleClick(e);
  }

  function handleClick(e) {
    const hit = pickPoint(e);
    const world = pointerWorld(e);

    if (UI.tool === 'point') {
      if (!hit && world) {
        session.placePoint(world);
        audio.place();
        afterChange();
      }
      return;
    }

    if (UI.tool === 'move') return;

    if (!UI.pending.length) {
      if (hit) {
        UI.pending = [hit];
      } else if (world) {
        const p = session.placePoint(world);
        audio.place();
        UI.pending = [p];
      }
      visuals.setPending(UI.pending);
      afterChange();
      return;
    }

    const first = UI.pending[0];
    let second = hit;
    if (!second && world) {
      second = session.placePoint(world);
      audio.place();
    }
    if (!second || first === second) {
      UI.pending = [];
      visuals.setPending([]);
      visuals.setPreview(null);
      return;
    }
    session.connect(first, second, UI.tool);
    if (UI.tool === 'segment') audio.segment();
    else if (UI.tool === 'circle') audio.circle();
    else if (UI.tool === 'sphere') {
      audio.sphere();
      if (store.unlockAchievement('sphere')) toast(t('toast.ach', { n: t('ach.sphere') }));
    }
    UI.pending = [];
    visuals.setPending([]);
    visuals.setPreview(null);
    afterChange();
  }

  function afterChange() {
    session.M.rebuild();
    updateHud();
    if (!session.sandbox && session.check()) onSolved();
  }

  function setTool(name) {
    UI.tool = name;
    UI.pending = [];
    visuals.setPending([]);
    visuals.setPreview(null);
    for (const b of document.querySelectorAll('.tool')) {
      const on = b.dataset.tool === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ================= solve ================= */
  function onSolved() {
    const stars = session.stars();
    const improved = store.record(session.level.id, stars);
    audio.solve();
    for (let i = 0; i < stars; i++) audio.star(i);
    updateHud();
    grantAchievements(stars);
    setTimeout(() => showOverlay(stars), 380);
    void improved;
  }

  function grantAchievements(stars) {
    const grant = id => { if (store.unlockAchievement(id)) toast(t('toast.ach', { n: t(ACHIEVEMENTS.find(a => a.id === id).key) })); };
    grant('first');
    if (stars >= 3) grant('three');
    const perfect = LEVELS.filter(L => store.starsFor(L.id) === 3).length;
    if (perfect >= 5) grant('perfect5');
    const done = LEVELS.filter(L => store.starsFor(L.id) > 0).length;
    if (done >= LEVELS.length) grant('all');
  }

  function showOverlay(stars) {
    if (UI.solvedShown) return;
    UI.solvedShown = true;
    const L = session.level;
    $('solvedMsg').textContent = pick(L.done) + ' · ' +
      (session.M.ops <= L.par ? t('solved.perfect') : t('solved.par', { n: L.par }));
    const box = $('solvedStars');
    box.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('i');
      s.textContent = '★';
      if (i < stars) { s.className = 'on'; s.style.animationDelay = `${0.3 + i * 0.13}s`; }
      box.appendChild(s);
    }
    const next = $('btnNext');
    const last = session.levelIndex >= LEVELS.length - 1;
    next.textContent = last ? t('solved.finish') : t('solved.next');
    $('overlay').classList.add('show');
    setTimeout(() => next.focus(), 140);
  }

  function hideOverlay() {
    $('overlay').classList.remove('show');
    UI.solvedShown = false;
  }

  /* ================= hud ================= */
  function updateHud() {
    const ops = session.M.ops;
    const par = session.level ? session.level.par : null;
    $('statOps').textContent = par ? `${ops} / ${par}` : `${ops}`;
    const stars = session.sandbox ? 0 : session.stars();
    $('statStars').textContent = session.sandbox
      ? '∞'
      : '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('btnUndo').disabled = !session.M.canUndo() || session.solved;
  }

  function updateTime() {
    const el = $('statTime');
    if (!el || UI.view !== 'play') return;
    const s = session.elapsed();
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ================= toasts ================= */
  function toast(msg) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    audio.achievement();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2400);
  }

  /* ================= events ================= */
  function bind() {
    const c = canvas();
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', () => { UI.dragPt = null; S3.controls.enabled = true; });
    c.addEventListener('pointerleave', () => {
      UI.pointer = null; UI.hover = null;
      visuals.setHover(null); visuals.setCursor(null); visuals.setPreview(null);
    });
    c.addEventListener('contextmenu', e => e.preventDefault());

    $('toolbar').addEventListener('click', e => {
      const b = e.target.closest('.tool');
      if (!b) return;
      audio.ui();
      setTool(b.dataset.tool);
    });

    $('btnHome').addEventListener('click', () => { audio.ui(); location.hash = '#/'; });
    $('btnReset').addEventListener('click', () => {
      audio.erase();
      if (session.sandbox) startSandbox(); else startLevel(session.levelIndex);
    });
    $('btnUndo').addEventListener('click', () => {
      if (!session.undo()) { toast(t('toast.undo.empty')); return; }
      audio.erase();
      UI.pending = [];
      visuals.setPending([]);
      afterChange();
    });

    $('btnReplay').addEventListener('click', () => { hideOverlay(); startLevel(session.levelIndex); });
    $('btnNext').addEventListener('click', () => {
      hideOverlay();
      if (session.levelIndex >= LEVELS.length - 1) location.hash = '#/';
      else location.hash = `#/play/${session.levelIndex + 2}`;
    });

    $('btnHelp').addEventListener('click', () => { audio.ui(); location.hash = '#/help'; });
    $('btnHelpBack').addEventListener('click', () => { audio.ui(); location.hash = '#/'; });
    $('btnSandbox').addEventListener('click', () => { audio.ui(); location.hash = '#/free'; });
    $('btnClear').addEventListener('click', () => {
      store.reset();
      renderHome();
      toast(t('home.cleared'));
    });
    $('btnSound').addEventListener('click', () => {
      store.setSound(!store.sound);
      audio.setEnabled(store.sound);
      audio.ui();
      refreshLang();
    });
    $('btnLang').addEventListener('click', () => {
      store.setLang(store.lang === 'zh' ? 'en' : 'zh');
      audio.ui();
      refreshLang();
    });

    window.addEventListener('hashchange', route);

    window.addEventListener('keydown', e => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (UI.view !== 'play') {
        if (e.key === 'Escape' && UI.view === 'help') location.hash = '#/';
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (session.undo()) { audio.erase(); UI.pending = []; visuals.setPending([]); afterChange(); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (UI.pending.length) { UI.pending = []; visuals.setPending([]); visuals.setPreview(null); }
        else location.hash = '#/';
        return;
      }
      if (KEY_TOOL[e.key]) { setTool(KEY_TOOL[e.key]); return; }
      if (e.key.toLowerCase() === 'r') { audio.erase(); if (session.sandbox) startSandbox(); else startLevel(session.levelIndex); return; }
      if (e.key.toLowerCase() === 'h') { UI.hintOpen = !UI.hintOpen; renderHint(); return; }
      if (e.key.toLowerCase() === 'f') {
        frameGiven(Object.values(session.given || {}));
        return;
      }
      if (e.key.toLowerCase() === 'l') { store.setLang(store.lang === 'zh' ? 'en' : 'zh'); refreshLang(); }
    });

    let rzT = null;
    const onResize = () => { clearTimeout(rzT); rzT = setTimeout(() => S3.resize(), 80); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(() => S3.resize(), 180));
    if (window.ResizeObserver) {
      try { new ResizeObserver(onResize).observe(sceneRoot); } catch (_) { /* ignore */ }
    }
    window.addEventListener('pageshow', () => setTimeout(() => S3.resize(), 80));
  }

  /* ================= loop ================= */
  let last = 0;
  function loop(now) {
    updateCameraTween(now);
    visuals.sync(session.M, now);
    visuals.pulse(now);
    S3.render(now);
    if (now - last > 500) { last = now; updateTime(); }
    requestAnimationFrame(loop);
  }

  /* ================= go ================= */
  audio.setEnabled(store.sound);
  refreshLang();
  bind();
  S3.resize();
  route();
  requestAnimationFrame(loop);

  // expose a tiny hook for debugging in the console
  window.__destijl = { S3, session, visuals, UI, store, LEVELS, PALETTE, V, LW, LH };
}
