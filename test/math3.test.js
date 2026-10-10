import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  V, sphereSphere, spherePlane, planePlane, lineCircle,
  circleCircle, circleSphere, circlePlane, segmentCircle,
  segmentSphere, segmentSegment, distToLine
} from '../src/core/math3.js';

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
const hasPoint = (pts, p, tol = 1e-6) => pts.some(q => V.dist(q, p) < tol);

test('sphereSphere: equal spheres meet in a vertical circle', () => {
  const s1 = { c: { x: -5, y: 0, z: 0 }, r: 10 };
  const s2 = { c: { x: 5, y: 0, z: 0 }, r: 10 };
  const [c] = sphereSphere(s1, s2);
  assert.ok(c, 'expected one circle');
  assert.ok(near(c.c.x, 0) && near(c.c.y, 0) && near(c.c.z, 0));
  assert.ok(near(c.r, Math.sqrt(75)), `r=${c.r}`);
  assert.ok(near(Math.abs(c.n.x), 1));
});

test('sphereSphere: disjoint spheres give nothing', () => {
  assert.equal(sphereSphere({ c: { x: 0, y: 0, z: 0 }, r: 1 }, { c: { x: 5, y: 0, z: 0 }, r: 1 }).length, 0);
});

test('spherePlane: horizontal plane slices a sphere into a circle', () => {
  const s = { c: { x: 0, y: 3, z: 0 }, r: 5 };
  const [c] = spherePlane(s, { p: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 } });
  assert.ok(near(c.r, 4));
  assert.ok(near(c.c.y, 0));
});

test('planePlane: x=1 and y=2 intersect in a vertical line', () => {
  const line = planePlane(
    { p: { x: 1, y: 0, z: 0 }, n: { x: 1, y: 0, z: 0 } },
    { p: { x: 0, y: 2, z: 0 }, n: { x: 0, y: 1, z: 0 } }
  );
  assert.ok(line);
  assert.ok(near(Math.abs(line.d.z), 1));
  assert.ok(near(line.p.x, 1) && near(line.p.y, 2));
});

test('lineCircle: chord through a horizontal circle', () => {
  const circle = { c: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, r: 5 };
  const pts = lineCircle({ p: { x: -10, y: 0, z: 0 }, d: { x: 1, y: 0, z: 0 } }, circle);
  assert.equal(pts.length, 2);
  assert.ok(hasPoint(pts, { x: -5, y: 0, z: 0 }));
  assert.ok(hasPoint(pts, { x: 5, y: 0, z: 0 }));
});

test('circleCircle: two coplanar unit circles', () => {
  const a = { c: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, r: 5 };
  const b = { c: { x: 8, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, r: 5 };
  const pts = circleCircle(a, b);
  assert.equal(pts.length, 2);
  assert.ok(hasPoint(pts, { x: 4, y: 0, z: 3 }));
  assert.ok(hasPoint(pts, { x: 4, y: 0, z: -3 }));
});

test('circleCircle: skew circles (vertical vs horizontal)', () => {
  // Vertical circle radius sqrt(3) in the x=0 plane, centred at origin.
  const vert = { c: { x: 0, y: 0, z: 0 }, n: { x: 1, y: 0, z: 0 }, r: Math.sqrt(3) };
  // Horizontal circle radius sqrt(3) in the y=0 plane, centred at origin.
  const horiz = { c: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, r: Math.sqrt(3) };
  const pts = circleCircle(vert, horiz);
  assert.equal(pts.length, 2);
  assert.ok(hasPoint(pts, { x: 0, y: 0, z: Math.sqrt(3) }));
  assert.ok(hasPoint(pts, { x: 0, y: 0, z: -Math.sqrt(3) }));
});

test('circlePlane: vertical circle meets the ground plane in two points', () => {
  const vert = { c: { x: 0, y: 0, z: 0 }, n: { x: 1, y: 0, z: 0 }, r: 5 };
  const pts = circlePlane(vert, { p: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 } });
  assert.equal(pts.length, 2);
  assert.ok(hasPoint(pts, { x: 0, y: 0, z: 5 }));
  assert.ok(hasPoint(pts, { x: 0, y: 0, z: -5 }));
});

test('segmentCircle: only points inside the segment', () => {
  const circle = { c: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, r: 5 };
  const inside = segmentCircle({ a: { x: -2, y: 0, z: 0 }, b: { x: 8, y: 0, z: 0 } }, circle);
  assert.equal(inside.length, 1);
  assert.ok(hasPoint(inside, { x: 5, y: 0, z: 0 }));
  const outside = segmentCircle({ a: { x: 6, y: 0, z: 0 }, b: { x: 8, y: 0, z: 0 } }, circle);
  assert.equal(outside.length, 0);
});

test('segmentSphere and segmentSegment basics', () => {
  const pts = segmentSphere(
    { a: { x: -10, y: 0, z: 0 }, b: { x: 10, y: 0, z: 0 } },
    { c: { x: 0, y: 0, z: 0 }, r: 5 }
  );
  assert.equal(pts.length, 2);
  const cross = segmentSegment(
    { a: { x: -5, y: 0, z: 0 }, b: { x: 5, y: 0, z: 0 } },
    { a: { x: 0, y: 0, z: -5 }, b: { x: 0, y: 0, z: 5 } }
  );
  assert.equal(cross.length, 1);
  assert.ok(near(cross[0].x, 0) && near(cross[0].z, 0));
  // skew, non-touching
  const none = segmentSegment(
    { a: { x: 0, y: 0, z: 0 }, b: { x: 1, y: 0, z: 0 } },
    { a: { x: 0, y: 5, z: 0 }, b: { x: 1, y: 5, z: 0 } }
  );
  assert.equal(none.length, 0);
});

test('distToLine sanity', () => {
  assert.ok(near(distToLine({ x: 0, y: 3, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), 3));
});

/* The regular-tetrahedron construction the 3D level relies on. */
test('regular tetrahedron is reachable with spheres + circles', () => {
  const A = { x: -5, y: 0, z: 0 };
  const B = { x: 5, y: 0, z: 0 };
  const AB = V.dist(A, B); // 10
  const sA = { c: A, r: AB };
  const sB = { c: B, r: AB };

  // 1. two spheres -> radical circle (vertical)
  const [rad] = sphereSphere(sA, sB);
  assert.ok(rad);
  assert.ok(near(rad.r, AB * Math.sqrt(3) / 2));

  // 2. plane circle around A also radius AB, intersected with the radical circle
  const planeCircle = { c: A, n: { x: 0, y: 1, z: 0 }, r: AB };
  const apexes = circleCircle(planeCircle, rad);
  assert.equal(apexes.length, 2, 'in-plane equilateral apexes');
  const D = apexes[0];
  assert.ok(near(V.dist(D, A), AB) && near(V.dist(D, B), AB));

  // 3. sphere around D radius AB meets the radical circle -> tetrahedron apexes
  const sD = { c: D, r: AB };
  const tet = circleSphere(rad, sD);
  assert.ok(tet.length >= 1, 'tetrahedron apex found');
  const P = tet[0];
  assert.ok(near(V.dist(P, A), AB, 1e-3), 'PA');
  assert.ok(near(V.dist(P, B), AB, 1e-3), 'PB');
  assert.ok(near(V.dist(P, D), AB, 1e-3), 'PD');
  assert.ok(Math.abs(P.y) > 1, 'apex rises off the plane');
});
