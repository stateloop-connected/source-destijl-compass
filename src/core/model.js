/**
 * model.js — the construction graph.
 *
 * Objects
 *   plane    singleton, the drafting table (y = 0). Never rendered, never an "op".
 *   point    { pos, kind:'given'|'free'|'derived', parents, index }
 *   segment  { a, b }
 *   circle   { center, through }               — compass on the table
 *   circle   { derived:true, parents, index, c, n, r }  — e.g. sphere ∩ sphere
 *   sphere   { center, through }               — 3D compass
 *
 * Derived objects are rebuilt from their parents in insertion order, which is
 * always a valid topological order because children are appended after parents.
 */

import {
  V, sphereSphere, spherePlane, circleCircle, circleSphere,
  circlePlane, segmentCircle, segmentSphere, segmentSegment
} from './math3.js';
import { PLANE_N, MAX_OBJECTS } from './config.js';

const PLANE = { type: 'plane', id: 0, p: { x: 0, y: 0, z: 0 }, n: PLANE_N, valid: true, noRender: true };

const seg = o => ({ a: o.a.pos, b: o.b.pos });

function geom(o) {
  if (o.type === 'circle') {
    if (o.derived) return { c: o.c, n: o.n, r: o.r };
    return { c: o.center.pos, n: PLANE_N, r: V.dist(o.center.pos, o.through.pos) };
  }
  if (o.type === 'sphere') return { c: o.center.pos, r: V.dist(o.center.pos, o.through.pos) };
  return null;
}

/** General intersection dispatcher. Returns { points, circles } in stable order. */
export function intersect(a, b) {
  const points = [];
  const circles = [];
  const ta = a.type, tb = b.type;

  if (ta === 'plane' || tb === 'plane') {
    const other = ta === 'plane' ? b : a;
    if (other.valid === false) return { points, circles };
    if (other.type === 'circle') points.push(...circlePlane(geom(other), PLANE));
    else if (other.type === 'sphere') circles.push(...spherePlane(geom(other), PLANE));
    return { points, circles };
  }

  const ok = o => o.valid !== false && (!o.a || o.a.valid !== false) && (!o.b || o.b.valid !== false);
  if (!ok(a) || !ok(b)) return { points, circles };

  if (ta === 'segment' && tb === 'segment') points.push(...segmentSegment(seg(a), seg(b)));
  else if (ta === 'segment' && tb === 'circle') points.push(...segmentCircle(seg(a), geom(b)));
  else if (ta === 'circle' && tb === 'segment') points.push(...segmentCircle(seg(b), geom(a)));
  else if (ta === 'segment' && tb === 'sphere') points.push(...segmentSphere(seg(a), geom(b)));
  else if (ta === 'sphere' && tb === 'segment') points.push(...segmentSphere(seg(b), geom(a)));
  else if (ta === 'circle' && tb === 'circle') points.push(...circleCircle(geom(a), geom(b)));
  else if (ta === 'circle' && tb === 'sphere') points.push(...circleSphere(geom(a), geom(b)));
  else if (ta === 'sphere' && tb === 'circle') points.push(...circleSphere(geom(b), geom(a)));
  else if (ta === 'sphere' && tb === 'sphere') circles.push(...sphereSphere(geom(a), geom(b)));

  return { points, circles };
}

export function createModel() {
  const M = {
    objects: [PLANE],
    nextId: 1,
    ops: 0,               // user construction operations (drives elegance stars)
    history: [],
    onDirty: null
  };

  // The construction plane takes part in intersections (sphere ∩ plane -> circle)
  // even though it is never rendered as an object of its own.
  const primitives = () =>
    M.objects.filter(o => o.type !== 'point' && o.valid !== false);

  /* ---------------- factories ---------------- */
  M.addPoint = (pos, kind, label) => {
    const p = {
      type: 'point', id: M.nextId++, pos: { ...pos },
      kind: kind || 'free', label, valid: true, born: 0
    };
    M.objects.push(p);
    return p;
  };

  M.addSegment = (a, b) => {
    const o = { type: 'segment', id: M.nextId++, a, b, valid: true, born: 0 };
    M.objects.push(o);
    return o;
  };

  M.addCircle = (center, through) => {
    const o = { type: 'circle', id: M.nextId++, center, through, valid: true, born: 0 };
    M.objects.push(o);
    return o;
  };

  M.addSphere = (center, through) => {
    const o = { type: 'sphere', id: M.nextId++, center, through, valid: true, born: 0 };
    M.objects.push(o);
    return o;
  };

  /* ---------------- derived rebuild ---------------- */
  M.rebuild = () => {
    for (const o of M.objects) {
      if (o.type === 'point' && o.kind === 'derived') {
        const [pa, pb] = o.parents;
        if (!pa || !pb) { o.valid = false; continue; }
        const { points } = intersect(pa, pb);
        const p = points[o.index];
        if (p) { o.pos = p; o.valid = true; } else o.valid = false;
      } else if (o.type === 'circle' && o.derived) {
        const [pa, pb] = o.parents;
        if (!pa || !pb) { o.valid = false; continue; }
        const { circles } = intersect(pa, pb);
        const c = circles[o.index];
        if (c) { o.c = c.c; o.n = c.n; o.r = c.r; o.valid = true; } else o.valid = false;
      }
    }
  };

  /* ---------------- auto intersection ---------------- */
  const pointKey = p =>
    `${Math.round(p.x / 1.5)}|${Math.round(p.y / 1.5)}|${Math.round(p.z / 1.5)}`;

  M.autoIntersect = () => {
    for (let iter = 0; iter < 8; iter++) {
      let added = false;
      const list = primitives();
      if (list.length > 40) break; // safety: pathological fan-out

      const seen = new Set();
      for (const o of M.objects) {
        if (o.type === 'point' && o.valid !== false) seen.add(pointKey(o.pos));
      }

      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const res = intersect(list[i], list[j]);
          for (let k = 0; k < res.points.length; k++) {
            const p = res.points[k];
            const key = pointKey(p);
            if (seen.has(key)) continue;
            seen.add(key);
            M.objects.push({
              type: 'point', id: M.nextId++, pos: p, kind: 'derived',
              parents: [list[i], list[j]], index: k, valid: true, born: 0
            });
            added = true;
          }
          for (let k = 0; k < res.circles.length; k++) {
            const c = res.circles[k];
            const dup = M.objects.some(o =>
              o.type === 'circle' && o.valid !== false && (() => {
                const g = geom(o);
                return g && V.dist(g.c, c.c) < 1 && Math.abs(g.r - c.r) < 1 &&
                  Math.abs(Math.abs(V.dot(g.n, c.n)) - 1) < 1e-3;
              })()
            );
            if (dup) continue;
            M.objects.push({
              type: 'circle', id: M.nextId++, derived: true,
              parents: [list[i], list[j]], index: k,
              c: c.c, n: c.n, r: c.r, valid: true, born: 0
            });
            added = true;
          }
          if (M.objects.length > MAX_OBJECTS) return;
        }
      }
      if (!added) break;
    }
  };

  M.recompute = () => {
    M.rebuild();
    M.autoIntersect();
    M.rebuild(); // derived circles may have moved; refresh dependents once more
  };

  /* ---------------- history ---------------- */
  const snap = () => M.objects.map(o => {
    if (o.noRender) return { t: 'pl' };
    if (o.type === 'point') {
      return {
        t: 'p', id: o.id, pos: { ...o.pos }, kind: o.kind, label: o.label,
        parents: o.parents ? o.parents.map(p => p.id) : null, index: o.index
      };
    }
    if (o.type === 'segment') return { t: 's', id: o.id, a: o.a.id, b: o.b.id };
    if (o.type === 'circle') {
      return {
        t: 'c', id: o.id,
        center: o.center ? o.center.id : null, through: o.through ? o.through.id : null,
        derived: !!o.derived, parents: o.parents ? o.parents.map(p => p.id) : null,
        index: o.index
      };
    }
    return { t: 'h', id: o.id, center: o.center.id, through: o.through.id };
  });

  const restore = data => {
    const map = new Map();
    const list = [];
    for (const d of data) {
      let o;
      if (d.t === 'pl') o = { ...PLANE };
      else if (d.t === 'p') o = { type: 'point', id: d.id, pos: { ...d.pos }, kind: d.kind, label: d.label, valid: true, born: 0 };
      else if (d.t === 's') o = { type: 'segment', id: d.id, valid: true, born: 0 };
      else if (d.t === 'c') o = { type: 'circle', id: d.id, derived: !!d.derived, valid: true, born: 0 };
      else o = { type: 'sphere', id: d.id, valid: true, born: 0 };
      map.set(d.id, o);
      list.push(o);
    }
    for (let i = 0; i < data.length; i++) {
      const d = data[i], o = list[i];
      if (d.t === 'p' && d.parents) o.parents = d.parents.map(id => map.get(id)).filter(Boolean);
      else if (d.t === 's') { o.a = map.get(d.a); o.b = map.get(d.b); }
      else if (d.t === 'c' && !d.derived) { o.center = map.get(d.center); o.through = map.get(d.through); }
      else if (d.t === 'c' && d.derived) { o.parents = d.parents.map(id => map.get(id)).filter(Boolean); o.index = d.index; }
      else if (d.t === 'h') { o.center = map.get(d.center); o.through = map.get(d.through); }
    }
    M.objects = list;
    M.nextId = list.reduce((m, o) => Math.max(m, o.id), 0) + 1;
  };

  M.pushHistory = () => {
    M.history.push({ data: snap(), ops: M.ops });
    if (M.history.length > 80) M.history.shift();
  };

  M.canUndo = () => M.history.length > 0;

  M.undo = () => {
    if (!M.history.length) return false;
    const h = M.history.pop();
    restore(h.data);
    M.ops = h.ops;
    M.rebuild();
    return true;
  };

  /* ---------------- queries ---------------- */
  M.points = () => M.objects.filter(o => o.type === 'point' && o.valid !== false);

  M.nearestPoint = (pos, radius) => {
    let best = null, bestD = radius;
    for (const o of M.objects) {
      if (o.type !== 'point' || o.valid === false) continue;
      const d = V.dist(o.pos, pos);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  };

  M.reset = () => {
    M.objects = [{ ...PLANE }];
    M.nextId = 1;
    M.ops = 0;
    M.history = [];
  };

  return M;
}

export { PLANE, geom };
