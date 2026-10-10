import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/core/session.js';
import { LEVELS } from '../src/core/levels.js';
import { V, distToLine } from '../src/core/math3.js';

const near = (a, b, t = 0.8) => Math.abs(a - b) < t;

/** All valid points in the model. */
const pts = s => s.M.objects.filter(o => o.type === 'point' && o.valid !== false);

/** First point matching pred, optionally excluding already-used refs. */
function find(s, pred, ...exclude) {
  return pts(s).find(p => !exclude.includes(p) && pred(p));
}

function count(s, pred) {
  return pts(s).filter(pred).length;
}

const onSegment = (p, a, b, tol = 0.8) => distToLine(p, a, b) < tol;

/* ------------------------------------------------------------------ */
test('01 equilateral — two circles', () => {
  const s = createSession();
  const g = s.load(0);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'circle');
  s.connect(g.B, g.A, 'circle');
  assert.equal(s.check(), false, 'apex alone must not solve it');
  const apex = find(s, p => p !== g.A && p !== g.B &&
    near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  s.connect(g.A, apex, 'segment');
  assert.equal(s.check(), false, 'one side is not enough');
  s.connect(g.B, apex, 'segment');
  assert.ok(s.check(), 'triangle drawn');
  assert.ok(s.M.ops <= LEVELS[0].par, `ops ${s.M.ops} <= par ${LEVELS[0].par}`);
  assert.equal(s.stars(), 3);
});

test('02 midpoint — perpendicular bisector meets AB', () => {
  const s = createSession();
  const g = s.load(1);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'circle');
  s.connect(g.B, g.A, 'circle');
  const apex = (a, b) => find(s, p => p !== g.A && p !== g.B &&
    near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB) && p !== a && p !== b);
  const G1 = apex(null, null);
  const G2 = apex(G1, null);
  s.connect(G1, G2, 'segment');
  assert.ok(s.check(), 'midpoint found');
  assert.ok(s.M.ops <= LEVELS[1].par, `ops ${s.M.ops} <= par ${LEVELS[1].par}`);
});

test('03 perpendicular bisector', () => {
  const s = createSession();
  const g = s.load(2);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'circle');
  s.connect(g.B, g.A, 'circle');
  const G1 = find(s, p => p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  const G2 = find(s, p => p !== G1 && p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  s.connect(G1, G2, 'segment');
  assert.ok(s.check());
  assert.ok(s.M.ops <= LEVELS[2].par, `ops ${s.M.ops} <= par ${LEVELS[2].par}`);
});

test('04 angle bisector', () => {
  const s = createSession();
  const g = s.load(3);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'circle');            // radius AB about A -> F on AC
  const F = find(s, p => p !== g.A && p !== g.B &&
    near(V.dist(p.pos, g.A.pos), AB) && onSegment(p.pos, g.A.pos, g.C.pos));
  assert.ok(F, 'F on arm AC at distance AB');
  s.connect(g.B, F, 'circle');
  s.connect(F, g.B, 'circle');
  assert.equal(s.check(), false, 'a bisector point alone must not solve it');
  const bf = V.dist(g.B.pos, F.pos);
  const G = find(s, p => p !== g.A && p !== g.B && p !== F &&
    near(V.dist(p.pos, g.B.pos), bf) && near(V.dist(p.pos, F.pos), bf));
  assert.ok(G, 'point on the bisector');
  s.connect(g.A, G, 'segment');
  assert.ok(s.check(), 'bisector drawn');
  assert.ok(s.M.ops <= LEVELS[3].par, `ops ${s.M.ops} <= par ${LEVELS[3].par}`);
});

test('05 perpendicular through a point', () => {
  const s = createSession();
  const g = s.load(4);
  const PA = V.dist(g.P.pos, g.A.pos);
  s.connect(g.P, g.A, 'circle');            // circle through A cuts AB again at F
  const F = find(s, p => p !== g.A && p !== g.B && near(V.dist(p.pos, g.P.pos), PA) && onSegment(p.pos, g.A.pos, g.B.pos));
  assert.ok(F, 'second cut F on AB (the first cut is A itself)');
  s.connect(g.A, F, 'circle');
  s.connect(F, g.A, 'circle');
  const AF = V.dist(g.A.pos, F.pos);
  const G1 = find(s, p => near(V.dist(p.pos, g.A.pos), AF) && near(V.dist(p.pos, F.pos), AF));
  const G2 = find(s, p => p !== G1 && near(V.dist(p.pos, g.A.pos), AF) && near(V.dist(p.pos, F.pos), AF));
  s.connect(G1, G2, 'segment');
  assert.ok(s.check(), 'perpendicular through P');
  assert.ok(s.M.ops <= LEVELS[4].par, `ops ${s.M.ops} <= par ${LEVELS[4].par}`);
});

test('06 circumcircle of a triangle', () => {
  const s = createSession();
  const g = s.load(5);
  const AB = V.dist(g.A.pos, g.B.pos);
  const BC = V.dist(g.B.pos, g.C.pos);
  // perpendicular bisector of AB
  s.connect(g.A, g.B, 'circle');
  s.connect(g.B, g.A, 'circle');
  const G1 = find(s, p => p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  const G2 = find(s, p => p !== G1 && p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  s.connect(G1, G2, 'segment');
  // perpendicular bisector of BC
  s.connect(g.B, g.C, 'circle');
  s.connect(g.C, g.B, 'circle');
  const H1 = find(s, p => p !== g.A && p !== g.B && p !== g.C && near(V.dist(p.pos, g.B.pos), BC) && near(V.dist(p.pos, g.C.pos), BC));
  const H2 = find(s, p => p !== H1 && p !== g.A && p !== g.B && p !== g.C && near(V.dist(p.pos, g.B.pos), BC) && near(V.dist(p.pos, g.C.pos), BC));
  s.connect(H1, H2, 'segment');
  // circumcentre = intersection of the two bisectors
  const O = find(s, p => p !== g.A && p !== g.B && p !== g.C &&
    near(V.dist(p.pos, g.A.pos), V.dist(p.pos, g.B.pos)) && near(V.dist(p.pos, g.B.pos), V.dist(p.pos, g.C.pos)));
  assert.ok(O, 'circumcentre O');
  s.connect(O, g.A, 'circle');
  assert.ok(s.check(), 'circumcircle found');
  assert.ok(s.M.ops <= LEVELS[5].par, `ops ${s.M.ops} <= par ${LEVELS[5].par}`);
});

test('07 square on diagonal AB', () => {
  const s = createSession();
  const g = s.load(6);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'circle');
  s.connect(g.B, g.A, 'circle');
  const G1 = find(s, p => p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  const G2 = find(s, p => p !== G1 && p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  s.connect(G1, G2, 'segment');             // perpendicular bisector -> M
  const M = find(s, p => p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB / 2) && near(V.dist(p.pos, g.B.pos), AB / 2));
  assert.ok(M, 'midpoint M');
  s.connect(M, g.A, 'circle');              // radius AB/2 -> the other two vertices
  assert.equal(s.check(), false, 'vertices alone must not solve it');
  const N1 = find(s, p => p !== g.A && p !== g.B && p !== M &&
    near(V.dist(p.pos, M.pos), AB / 2) && !onSegment(p.pos, g.A.pos, g.B.pos));
  const N2 = find(s, p => p !== N1 && p !== g.A && p !== g.B && p !== M &&
    near(V.dist(p.pos, M.pos), AB / 2) && !onSegment(p.pos, g.A.pos, g.B.pos));
  assert.ok(N1 && N2, 'the other two vertices');
  s.connect(g.A, N1, 'segment');
  s.connect(N1, g.B, 'segment');
  s.connect(g.B, N2, 'segment');
  s.connect(N2, g.A, 'segment');
  assert.ok(s.check(), 'square drawn');
  assert.ok(s.M.ops <= LEVELS[6].par, `ops ${s.M.ops} <= par ${LEVELS[6].par}`);
});

test('08 regular hexagon', () => {
  const s = createSession();
  const g = s.load(7);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'circle');
  s.connect(g.B, g.A, 'circle');
  const O = find(s, p => p !== g.A && p !== g.B && near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  assert.ok(O, 'hexagon centre');
  s.connect(O, g.A, 'circle');              // -> V2 and V5
  const V2 = find(s, p => p !== g.A && p !== g.B && p !== O && near(V.dist(p.pos, O.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  const V5 = find(s, p => p !== g.A && p !== g.B && p !== O && p !== V2 && near(V.dist(p.pos, O.pos), AB) && near(V.dist(p.pos, g.A.pos), AB));
  assert.ok(V2 && V5, 'V2 and V5');
  s.connect(V2, g.B, 'circle');             // radius AB -> V4
  s.connect(V5, g.A, 'circle');             // radius AB -> V3
  assert.equal(s.check(), false, 'vertices alone must not solve it');
  const V4 = find(s, p => p !== V2 && p !== g.A && p !== g.B && near(V.dist(p.pos, O.pos), AB) && near(V.dist(p.pos, V2.pos), AB));
  const V3 = find(s, p => p !== V5 && p !== g.A && p !== g.B && near(V.dist(p.pos, O.pos), AB) && near(V.dist(p.pos, V5.pos), AB));
  assert.ok(V3 && V4, 'V3 and V4');
  s.connect(g.B, V2, 'segment');
  s.connect(V2, V4, 'segment');
  s.connect(V4, V3, 'segment');
  s.connect(V3, V5, 'segment');
  s.connect(V5, g.A, 'segment');
  assert.ok(s.check(), 'hexagon drawn');
  assert.ok(s.M.ops <= LEVELS[7].par, `ops ${s.M.ops} <= par ${LEVELS[7].par}`);
});

test('09 golden section', () => {
  const s = createSession();
  const g = s.load(8);
  const CB = V.dist(g.C.pos, g.B.pos);
  s.connect(g.A, g.C, 'segment');
  s.connect(g.C, g.B, 'circle');            // -> D on AC
  const D = find(s, p => p !== g.C && p !== g.B && p !== g.A &&
    near(V.dist(p.pos, g.C.pos), CB) && onSegment(p.pos, g.A.pos, g.C.pos));
  assert.ok(D, 'D on AC');
  s.connect(g.A, D, 'circle');              // -> golden point P on AB
  assert.ok(s.check(), 'golden point found');
  assert.ok(s.M.ops <= LEVELS[8].par, `ops ${s.M.ops} <= par ${LEVELS[8].par}`);
});

test('10 tangent from an external point', () => {
  const s = createSession();
  const g = s.load(9);
  const r = V.dist(g.O.pos, g.R.pos);
  const OP = V.dist(g.O.pos, g.P.pos);
  s.connect(g.O, g.P, 'circle');
  s.connect(g.P, g.O, 'circle');
  const G1 = find(s, p => p !== g.O && p !== g.P && near(V.dist(p.pos, g.O.pos), OP) && near(V.dist(p.pos, g.P.pos), OP));
  const G2 = find(s, p => p !== G1 && p !== g.O && p !== g.P && near(V.dist(p.pos, g.O.pos), OP) && near(V.dist(p.pos, g.P.pos), OP));
  s.connect(G1, G2, 'segment');             // perpendicular bisector -> M on OP
  const M = find(s, p => p !== g.O && p !== g.P && near(V.dist(p.pos, g.O.pos), OP / 2) && near(V.dist(p.pos, g.P.pos), OP / 2));
  assert.ok(M, 'midpoint M of OP');
  s.connect(M, g.O, 'circle');              // circle on diameter OP -> tangent points
  const T = find(s, p => p !== g.O && p !== g.P && p !== M &&
    near(V.dist(p.pos, g.O.pos), r) && near(V.dist(p.pos, M.pos), OP / 2));
  assert.ok(T, 'tangent point');
  s.connect(g.P, T, 'segment');
  assert.ok(s.check(), 'tangent found');
  assert.ok(s.M.ops <= LEVELS[9].par, `ops ${s.M.ops} <= par ${LEVELS[9].par}`);
});

test('11 regular tetrahedron (3D, spheres)', () => {
  const s = createSession();
  const g = s.load(10);
  const AB = V.dist(g.A.pos, g.B.pos);
  s.connect(g.A, g.B, 'sphere');
  s.connect(g.B, g.A, 'sphere');            // radical circle + plane circle -> in-plane apexes
  const D = find(s, p => p !== g.A && p !== g.B &&
    near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB) && Math.abs(p.pos.y) < 1);
  assert.ok(D, 'in-plane equilateral apex');
  s.connect(D, g.A, 'sphere');              // -> the two 3D apexes
  const T = find(s, p => p !== g.A && p !== g.B && p !== D && Math.abs(p.pos.y) > 1 &&
    near(V.dist(p.pos, g.A.pos), AB) && near(V.dist(p.pos, g.B.pos), AB));
  assert.ok(T, 'apex rises off the plane');
  assert.equal(s.check(), false, 'vertices alone must not solve it');
  s.connect(g.A, g.B, 'segment');
  s.connect(g.A, D, 'segment');
  s.connect(g.B, D, 'segment');
  s.connect(g.A, T, 'segment');
  s.connect(g.B, T, 'segment');
  s.connect(D, T, 'segment');
  assert.ok(s.check(), 'regular tetrahedron drawn');
  assert.ok(s.M.ops <= LEVELS[10].par, `ops ${s.M.ops} <= par ${LEVELS[10].par}`);
});

test('every level declares par, bilingual text and a check', () => {
  for (const L of LEVELS) {
    assert.ok(typeof L.par === 'number' && L.par > 0, `${L.id} par`);
    assert.ok(L.title.zh && L.title.en, `${L.id} title`);
    assert.ok(L.goal.zh && L.goal.en, `${L.id} goal`);
    assert.ok(L.hint.zh && L.hint.en, `${L.id} hint`);
    assert.ok(L.done.zh && L.done.en, `${L.id} done`);
    assert.equal(typeof L.check, 'function', `${L.id} check`);
  }
});

test('an untouched level is never already solved', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const s = createSession();
    s.load(i);
    assert.equal(s.check(), false, `${LEVELS[i].id} must start unsolved`);
    assert.equal(s.M.ops, 0);
  }
});

test('undo restores geometry and step count', () => {
  const s = createSession();
  const g = s.load(0);
  s.connect(g.A, g.B, 'circle');
  const before = s.M.objects.length;
  s.connect(g.B, g.A, 'circle');
  assert.ok(s.M.objects.length > before);
  s.undo();
  assert.equal(s.M.ops, 1);
  assert.equal(s.M.objects.length, before);
  s.undo();
  assert.equal(s.M.ops, 0);
});
