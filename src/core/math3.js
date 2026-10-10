/**
 * math3.js — dependency-free 3D analytic geometry.
 *
 * Everything is plain `{x, y, z}` objects: no three.js coupling, so the whole
 * engine is unit-testable in plain node.
 *
 * Primitives
 *   plane   { p, n }            p = point on plane, n = unit normal
 *   circle  { c, n, r }         c = centre, n = unit normal of its plane, r = radius
 *   sphere  { c, r }
 *   line    { p, d }            d = unit direction
 *   segment { a, b }
 */

export const EPS = 1e-9;
const TOL = 1e-4; // absolute tolerance in world units (scene spans ~1000)

export const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }),
  len: a => Math.hypot(a.x, a.y, a.z),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  norm(a) {
    const l = Math.hypot(a.x, a.y, a.z);
    return l < EPS ? null : { x: a.x / l, y: a.y / l, z: a.z / l };
  },
  copy: a => ({ x: a.x, y: a.y, z: a.z }),
  lerp: (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  })
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Orthonormal basis (u, v) spanning the plane with normal `n`. */
export function planeBasis(n) {
  const nn = V.norm(n) || { x: 0, y: 1, z: 0 };
  const seed = Math.abs(nn.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const u = V.norm(V.cross(nn, seed)) || { x: 1, y: 0, z: 0 };
  const v = V.cross(nn, u);
  return { u, v };
}

export function planeFromNormalPoint(n, p) {
  return { n: V.norm(n), p: V.copy(p) };
}

/* ------------------------------------------------------------------ *
 *  Sphere ∩ Sphere  ->  circle
 * ------------------------------------------------------------------ */
export function sphereSphere(s1, s2) {
  const d = V.dist(s1.c, s2.c);
  if (d < EPS) return [];                       // concentric
  if (d > s1.r + s2.r + TOL) return [];         // too far apart
  if (d < Math.abs(s1.r - s2.r) - TOL) return []; // one inside the other
  const n = V.norm(V.sub(s2.c, s1.c));
  const a = (s1.r * s1.r - s2.r * s2.r + d * d) / (2 * d);
  const h2 = s1.r * s1.r - a * a;
  const c = V.add(s1.c, V.mul(n, a));
  return [{ c, n, r: Math.sqrt(Math.max(0, h2)) }];
}

/* ------------------------------------------------------------------ *
 *  Sphere ∩ Plane  ->  circle
 * ------------------------------------------------------------------ */
export function spherePlane(s, pl) {
  const n = V.norm(pl.n);
  const signed = V.dot(V.sub(s.c, pl.p), n);
  const ad = Math.abs(signed);
  if (ad > s.r + TOL) return [];
  if (ad > s.r - TOL) return []; // tangent -> degenerate point, ignore
  const c = V.sub(s.c, V.mul(n, signed));
  return [{ c, n, r: Math.sqrt(Math.max(0, s.r * s.r - signed * signed)) }];
}

/* ------------------------------------------------------------------ *
 *  Plane ∩ Plane  ->  line
 * ------------------------------------------------------------------ */
export function planePlane(p1, p2) {
  const n1 = V.norm(p1.n);
  const n2 = V.norm(p2.n);
  const dir = V.cross(n1, n2);
  const dl2 = V.dot(dir, dir);
  if (dl2 < 1e-14) return null; // parallel / coincident
  const d1 = V.dot(p1.p, n1);
  const d2 = V.dot(p2.p, n2);
  const t1 = V.cross(n2, dir);
  const t2 = V.cross(dir, n1);
  const p = V.mul(V.add(V.mul(t1, d1), V.mul(t2, d2)), 1 / dl2);
  return { p, d: V.norm(dir) };
}

/* ------------------------------------------------------------------ *
 *  Line ∩ Circle  ->  points
 * ------------------------------------------------------------------ */
export function lineCircle(line, circle) {
  const d = V.norm(line.d);
  if (!d) return [];
  const n = V.norm(circle.n);
  const dn = V.dot(d, n);
  const distPlane = V.dot(V.sub(circle.c, line.p), n);

  if (Math.abs(dn) < 1e-9) {
    // line parallel to the circle plane
    if (Math.abs(distPlane) > TOL) return [];
    return lineCircle2D(line.p, d, circle);
  }
  const t = distPlane / dn;
  const q = V.add(line.p, V.mul(d, t)); // foot on the circle plane
  const e = V.norm(V.sub(d, V.mul(n, dn)));
  if (!e) {
    // line perpendicular to the circle plane
    return Math.abs(V.dist(q, circle.c) - circle.r) < TOL ? [q] : [];
  }
  const f = V.sub(q, circle.c);
  const b = 2 * V.dot(f, e);
  const cc = V.dot(f, f) - circle.r * circle.r;
  const disc = b * b - 4 * cc;
  if (disc < -TOL) return [];
  const sq = Math.sqrt(Math.max(0, disc));
  const out = [V.add(q, V.mul(e, (-b - sq) / 2))];
  if (sq > 1e-7) out.push(V.add(q, V.mul(e, (-b + sq) / 2)));
  return out;
}

/** Circle ∩ Circle where both live in the same plane (2D reduction). */
function lineCircle2D(origin, dir, circle) {
  const { u, v } = planeBasis(circle.n);
  const o2 = { x: V.dot(V.sub(origin, circle.c), u), y: V.dot(V.sub(origin, circle.c), v) };
  const d2 = { x: V.dot(dir, u), y: V.dot(dir, v) };
  const A = d2.x * d2.x + d2.y * d2.y;
  if (A < EPS) return [];
  const B = 2 * (o2.x * d2.x + o2.y * d2.y);
  const C = o2.x * o2.x + o2.y * o2.y - circle.r * circle.r;
  const disc = B * B - 4 * A * C;
  if (disc < -TOL) return [];
  const sq = Math.sqrt(Math.max(0, disc));
  const ts = sq > 1e-7 ? [(-B - sq) / (2 * A), (-B + sq) / (2 * A)] : [-B / (2 * A)];
  return ts.map(t => V.add(origin, V.mul(dir, t)));
}

/* ------------------------------------------------------------------ *
 *  Circle ∩ Circle  ->  points  (general, non-coplanar supported)
 * ------------------------------------------------------------------ */
export function circleCircle(c1, c2) {
  const n1 = V.norm(c1.n);
  const n2 = V.norm(c2.n);
  const cr = V.cross(n1, n2);
  if (V.len(cr) < 1e-9) {
    const dd = V.dot(V.sub(c2.c, c1.c), n1);
    if (Math.abs(dd) > TOL) return []; // parallel but distinct planes
    return coplanarCircleCircle(c1, c2);
  }
  const line = planePlane({ p: c1.c, n: n1 }, { p: c2.c, n: n2 });
  if (!line) return [];
  return lineCircle(line, c1).filter(p => Math.abs(V.dist(p, c2.c) - c2.r) < 1e-3);
}

function coplanarCircleCircle(c1, c2) {
  const d = V.dist(c1.c, c2.c);
  if (d < 1e-7) return []; // concentric -> infinite or none
  const r1 = c1.r;
  const r2 = c2.r;
  if (d > r1 + r2 + TOL) return [];
  if (d < Math.abs(r1 - r2) - TOL) return [];
  const { u, v } = planeBasis(c1.n);
  const axis = V.norm(V.sub(c2.c, c1.c));
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mid = V.add(c1.c, V.mul(axis, a));
  const perp = V.cross(c1.n, axis); // unit (axis ⟂ n, both unit)
  const out = [V.add(mid, V.mul(perp, h))];
  if (h > 1e-7) out.push(V.sub(mid, V.mul(perp, h)));
  void u; void v;
  return out;
}

/* ------------------------------------------------------------------ *
 *  Circle ∩ Sphere  ->  points
 * ------------------------------------------------------------------ */
export function circleSphere(circle, sphere) {
  const circ = spherePlane(sphere, { p: circle.c, n: circle.n });
  if (!circ.length) return [];
  return circleCircle(circle, circ[0]);
}

/* ------------------------------------------------------------------ *
 *  Circle ∩ Plane  ->  points
 * ------------------------------------------------------------------ */
export function circlePlane(circle, plane) {
  const n1 = V.norm(circle.n);
  const n2 = V.norm(plane.n);
  const cr = V.cross(n1, n2);
  if (V.len(cr) < 1e-9) return []; // coplanar (infinite) or parallel (none)
  const line = planePlane({ p: circle.c, n: n1 }, plane);
  if (!line) return [];
  return lineCircle(line, circle);
}

/* ------------------------------------------------------------------ *
 *  Segment (3D) intersections
 * ------------------------------------------------------------------ */
export function segmentSphere(seg, sphere) {
  const d = V.sub(seg.b, seg.a);
  const f = V.sub(seg.a, sphere.c);
  const A = V.dot(d, d);
  if (A < EPS) return [];
  const B = 2 * V.dot(f, d);
  const C = V.dot(f, f) - sphere.r * sphere.r;
  const disc = B * B - 4 * A * C;
  if (disc < -TOL) return [];
  const sq = Math.sqrt(Math.max(0, disc));
  const ts = sq > 1e-7 ? [(-B - sq) / (2 * A), (-B + sq) / (2 * A)] : [-B / (2 * A)];
  return ts.filter(t => t >= -1e-9 && t <= 1 + 1e-9).map(t => V.lerp(seg.a, seg.b, clamp(t, 0, 1)));
}

export function segmentCircle(seg, circle) {
  const dir = V.norm(V.sub(seg.b, seg.a));
  if (!dir) return [];
  return lineCircle({ p: seg.a, d: dir }, circle).filter(p => {
    const t = V.dot(V.sub(p, seg.a), dir);
    return t >= -1e-6 && t <= V.dist(seg.a, seg.b) + 1e-6;
  });
}

export function segmentSegment(s1, s2) {
  const p1 = s1.a, q1 = s1.b, p2 = s2.a, q2 = s2.b;
  const d1 = V.sub(q1, p1), d2 = V.sub(q2, p2), r = V.sub(p1, p2);
  const a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r);
  let s, t;
  if (a <= EPS && e <= EPS) { s = 0; t = 0; }
  else if (a <= EPS) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = V.dot(d1, r);
    if (e <= EPS) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = V.dot(d1, d2);
      const den = a * e - b * b;
      s = den > 1e-12 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  const c1 = V.add(p1, V.mul(d1, s));
  const c2 = V.add(p2, V.mul(d2, t));
  if (V.dist(c1, c2) > TOL) return [];
  // Collinear overlap -> infinitely many points; report nothing.
  if (V.len(V.cross(d1, d2)) < 1e-9) return [];
  return [V.mul(V.add(c1, c2), 0.5)];
}

/* ------------------------------------------------------------------ *
 *  Point predicates
 * ------------------------------------------------------------------ */
export function distToLine(p, a, b) {
  const d = V.norm(V.sub(b, a));
  if (!d) return V.dist(p, a);
  const ap = V.sub(p, a);
  const proj = V.dot(ap, d);
  return V.len(V.sub(ap, V.mul(d, proj)));
}

export function projectOnLine(p, a, b) {
  const d = V.norm(V.sub(b, a));
  if (!d) return V.copy(a);
  return V.add(a, V.mul(d, V.dot(V.sub(p, a), d)));
}
