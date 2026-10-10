/**
 * visuals.js — keeps a three.js object per construction object, plus the
 * transient bits (hover, pending selection, tool preview).
 *
 * Visual language, borrowed from drafting practice:
 *   solid  = what the player built
 *   dashed = given scaffolding and tool previews
 *   yellow = derived automatically by the engine
 *
 * Optimised for a live drag: geometry is only rebuilt when a radius actually
 * moves, materials are shared, and objects are pooled by construction id.
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PALETTE } from './config.js';
import { V } from './math3.js';

const easeOutBack = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const SIZES = { given: 30, free: 24, derived: 19 };
const BIRTH_MS = 340;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const CIRCLE_SEGMENTS = 108;

export function createVisuals(group) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.SphereGeometry(1, 32, 20);
  const wireGeo = new THREE.SphereGeometry(1, 20, 10);
  const quadGeo = new THREE.PlaneGeometry(1, 1);

  const mat = {
    given: new THREE.MeshStandardMaterial({ color: PALETTE.red, roughness: 0.5, metalness: 0.05 }),
    free: new THREE.MeshStandardMaterial({ color: PALETTE.blue, roughness: 0.5, metalness: 0.05 }),
    derived: new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.5, metalness: 0.05 }),
    segment: new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.65 }),
    circle: new THREE.MeshStandardMaterial({ color: PALETTE.blue, roughness: 0.45 }),
    circleDerived: new THREE.MeshStandardMaterial({ color: PALETTE.yellow, roughness: 0.45 }),
    sphere: new THREE.MeshStandardMaterial({
      color: PALETTE.blue, roughness: 0.3, metalness: 0.05,
      transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false
    }),
    sphereWire: new THREE.MeshBasicMaterial({ color: PALETTE.blue, wireframe: true, transparent: true, opacity: 0.13 }),
    pending: new THREE.MeshBasicMaterial({ color: PALETTE.red, wireframe: true, transparent: true, opacity: 0.9 }),
    hover: new THREE.MeshBasicMaterial({ color: PALETTE.red, wireframe: true, transparent: true, opacity: 0.85 }),
    cursor: new THREE.MeshBasicMaterial({ color: PALETTE.blue, wireframe: true, transparent: true, opacity: 0.5 }),
    dashInk: new THREE.LineDashedMaterial({
      color: PALETTE.ink, dashSize: 18, gapSize: 13, transparent: true, opacity: 0.62
    }),
    dashBlue: new THREE.LineDashedMaterial({
      color: PALETTE.blue, dashSize: 16, gapSize: 12, transparent: true, opacity: 0.72
    }),
    dashGhost: new THREE.LineDashedMaterial({
      color: PALETTE.ink, dashSize: 14, gapSize: 11, transparent: true, opacity: 0.5
    })
  };

  const entries = new Map(); // id -> entry
  const labels = new Map();

  const pendingMesh = new THREE.Mesh(box, mat.pending);
  const hoverMesh = new THREE.Mesh(box, mat.hover);
  const cursorMesh = new THREE.Mesh(quadGeo, mat.cursor);
  cursorMesh.rotation.x = -Math.PI / 2;
  const ghostSeg = new THREE.Line(new THREE.BufferGeometry(), mat.dashGhost);
  const ghostCir = new THREE.LineLoop(new THREE.BufferGeometry(), mat.dashGhost);
  for (const m of [pendingMesh, hoverMesh, cursorMesh, ghostSeg, ghostCir]) {
    m.visible = false;
    m.renderOrder = 5;
    group.add(m);
  }

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpDir = new THREE.Vector3();
  const q = new THREE.Quaternion();

  /** Points around a 3D circle — used for dashed rings and the flat preview. */
  function circlePoints(geom, segments = CIRCLE_SEGMENTS) {
    const n = new THREE.Vector3(geom.n.x, geom.n.y, geom.n.z).normalize();
    const seed = Math.abs(n.y) < 0.9 ? Y_AXIS : X_AXIS;
    const u = new THREE.Vector3().crossVectors(n, seed).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();
    const c = new THREE.Vector3(geom.c.x, geom.c.y, geom.c.z);
    const out = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      out.push(c.clone()
        .addScaledVector(u, Math.cos(t) * geom.r)
        .addScaledVector(v, Math.sin(t) * geom.r));
    }
    return out;
  }

  function setDashed(line, points) {
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    line.computeLineDistances();
  }

  function orientSegment(mesh, a, b, thickness) {
    tmpA.set(a.x, a.y, a.z);
    tmpB.set(b.x, b.y, b.z);
    tmpDir.subVectors(tmpB, tmpA);
    const len = tmpDir.length() || 1e-6;
    mesh.position.copy(tmpA).addScaledVector(tmpDir, 0.5);
    q.setFromUnitVectors(X_AXIS, tmpDir.normalize());
    mesh.quaternion.copy(q);
    mesh.scale.set(len, thickness, thickness);
  }

  function ensureLabel(o) {
    const el = document.createElement('div');
    el.className = 'pt-label';
    el.textContent = o.label || '';
    const l = new CSS2DObject(el);
    l.position.set(o.pos.x, o.pos.y + 42, o.pos.z);
    group.add(l);
    labels.set(o.id, { obj: l, el });
    return { obj: l, el };
  }

  function circleGeom(o) {
    if (o.derived) return { c: o.c, n: o.n, r: o.r };
    return {
      c: o.center.pos, n: { x: 0, y: 1, z: 0 },
      r: V.dist(o.center.pos, o.through.pos)
    };
  }

  function makeEntry(o) {
    const e = { obj: o, meshes: [], born: 0, geoR: -1, kind: o.type, dashed: !!o.given };
    if (o.type === 'point') {
      const m = new THREE.Mesh(box, mat[o.kind] || mat.free);
      m.castShadow = true;
      group.add(m);
      e.meshes.push(m);
      if (o.kind === 'given') {
        const { obj, el } = ensureLabel(o);
        e.labelObj = obj; e.labelEl = el;
      }
    } else if (o.type === 'segment') {
      if (o.given) {
        const m = new THREE.Line(new THREE.BufferGeometry(), mat.dashInk);
        group.add(m);
        e.meshes.push(m);
      } else {
        const m = new THREE.Mesh(box, mat.segment);
        m.castShadow = true;
        group.add(m);
        e.meshes.push(m);
      }
    } else if (o.type === 'sphere') {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(sphereGeo, mat.sphere), new THREE.Mesh(wireGeo, mat.sphereWire));
      group.add(g);
      e.meshes.push(...g.children, g);
      e.group = g;
    } else if (o.type === 'circle') {
      if (o.given) {
        const m = new THREE.LineLoop(new THREE.BufferGeometry(), mat.dashBlue);
        group.add(m);
        e.meshes.push(m);
      } else {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96),
          o.derived ? mat.circleDerived : mat.circle);
        m.castShadow = !o.derived;
        group.add(m);
        e.meshes.push(m);
      }
    }
    entries.set(o.id, e);
    return e;
  }

  function sync(model, now) {
    const live = new Set();
    for (const o of model.objects) {
      if (o.noRender) continue;
      live.add(o.id);
      let e = entries.get(o.id);
      if (!e || e.kind !== o.type || e.dashed !== !!o.given) {
        if (e) destroyEntry(e);
        e = makeEntry(o);
        e.born = now;
      }
      const age = Math.min(1, (now - e.born) / BIRTH_MS);
      const grow = age >= 1 ? 1 : Math.max(0.001, easeOutBack(age));
      const visible = o.valid !== false;

      if (o.type === 'point') {
        const m = e.meshes[0];
        m.visible = visible;
        if (!visible) continue;
        const s = (SIZES[o.kind] || SIZES.free) * grow;
        m.position.set(o.pos.x, o.pos.y, o.pos.z);
        m.scale.setScalar(s);
        if (e.labelObj) {
          e.labelObj.position.set(o.pos.x, o.pos.y + 42 + s * 0.4, o.pos.z);
          e.labelObj.visible = age > 0.35;
        }
      } else if (o.type === 'segment') {
        const ok = visible && o.a.valid !== false && o.b.valid !== false;
        const m = e.meshes[0];
        m.visible = ok;
        if (!ok) continue;
        if (e.dashed) {
          setDashed(m, [
            new THREE.Vector3(o.a.pos.x, o.a.pos.y, o.a.pos.z),
            new THREE.Vector3(o.b.pos.x, o.b.pos.y, o.b.pos.z)
          ]);
        } else {
          orientSegment(m, o.a.pos, o.b.pos, 7 * grow);
        }
      } else if (o.type === 'sphere') {
        const g = e.group;
        g.visible = visible;
        if (!visible) continue;
        const c = o.center.pos;
        const r = V.dist(c, o.through.pos);
        g.position.set(c.x, c.y, c.z);
        g.scale.setScalar(Math.max(0.001, r * grow));
      } else if (o.type === 'circle') {
        const m = e.meshes[0];
        m.visible = visible;
        if (!visible) continue;
        const geom = circleGeom(o);
        if (!(geom.r > 0.5)) { m.visible = false; continue; }
        if (Math.abs(geom.r - e.geoR) > 2) {
          if (e.dashed) {
            setDashed(m, circlePoints(geom));
          } else {
            m.geometry.dispose();
            const tube = Math.min(Math.max(geom.r * 0.014, 1.6), 4.5);
            m.geometry = new THREE.TorusGeometry(geom.r, tube, 6, 96);
          }
          e.geoR = geom.r;
        }
        if (!e.dashed) {
          m.position.set(geom.c.x, geom.c.y, geom.c.z);
          tmpDir.set(geom.n.x, geom.n.y, geom.n.z).normalize();
          q.setFromUnitVectors(Z_AXIS, tmpDir);
          m.quaternion.copy(q);
          m.scale.setScalar(grow);
        }
      }
    }

    for (const [id, e] of entries) {
      if (!live.has(id)) { destroyEntry(e); entries.delete(id); }
    }
  }

  function destroyEntry(e) {
    for (const m of e.meshes) {
      group.remove(m);
      if (m.geometry && m.geometry !== box && m.geometry !== sphereGeo &&
          m.geometry !== wireGeo && m.geometry !== quadGeo) m.geometry.dispose();
    }
    if (e.labelObj) {
      group.remove(e.labelObj);
      if (e.labelEl && e.labelEl.parentNode) e.labelEl.parentNode.removeChild(e.labelEl);
      labels.delete(e.obj.id);
    }
  }

  /* ---------------- transient markers ---------------- */
  return {
    sync,
    setHover(pos, size) {
      if (!pos) { hoverMesh.visible = false; return; }
      hoverMesh.visible = true;
      hoverMesh.position.set(pos.x, pos.y, pos.z);
      hoverMesh.scale.setScalar((size || 26) * 1.5);
    },
    setCursor(pos) {
      if (!pos) { cursorMesh.visible = false; return; }
      cursorMesh.visible = true;
      cursorMesh.position.set(pos.x, 0.6, pos.z);
      cursorMesh.scale.set(46, 46, 1);
    },
    setPending(list) {
      if (!list || !list.length) { pendingMesh.visible = false; return; }
      const p = list[0];
      pendingMesh.visible = true;
      pendingMesh.position.set(p.pos.x, p.pos.y, p.pos.z);
      pendingMesh.scale.setScalar(42);
    },
    /** Dashed preview; `kind: 'circle'` draws a ring flat on the table. */
    setPreview(preview) {
      if (!preview) {
        ghostSeg.visible = false; ghostCir.visible = false;
        return;
      }
      if (preview.kind === 'circle') {
        ghostSeg.visible = false;
        const r = V.dist(preview.from, preview.to);
        if (r < 0.5) { ghostCir.visible = false; return; }
        ghostCir.visible = true;
        setDashed(ghostCir, circlePoints(
          { c: preview.from, n: { x: 0, y: 1, z: 0 }, r }, 96));
      } else {
        ghostCir.visible = false;
        ghostSeg.visible = true;
        setDashed(ghostSeg, [
          new THREE.Vector3(preview.from.x, preview.from.y, preview.from.z),
          new THREE.Vector3(preview.to.x, preview.to.y, preview.to.z)
        ]);
      }
    },
    pulse(now) {
      pendingMesh.scale.setScalar(42 * (1 + Math.sin(now / 240) * 0.18));
    },
    dispose() {
      for (const [, e] of entries) destroyEntry(e);
      entries.clear();
      for (const m of [box, sphereGeo, wireGeo, quadGeo]) m.dispose();
      for (const k of Object.keys(mat)) mat[k].dispose();
    }
  };
}
