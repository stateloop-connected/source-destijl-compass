/**
 * levels.js — level definitions.
 *
 * Pure data + predicates: no DOM, no three.js, so levels are simulatable and
 * testable in node (see test/levels.test.js).
 *
 * check(ctx) must accept ANY valid construction that satisfies the geometric
 * relation, not one particular method.
 */

import { V, distToLine } from './math3.js';
import { toWorld, TOL } from './config.js';

const PHI = (1 + Math.sqrt(5)) / 2;

const unit = (a, b) => V.norm(V.sub(b, a));
const crossLen = (a, b) => V.len(V.cross(a, b));

function validPoints(ctx) {
  return ctx.M.objects.filter(o => o.type === 'point' && o.valid !== false);
}
function validSegments(ctx) {
  return ctx.M.objects.filter(o =>
    o.type === 'segment' && o.valid !== false && o.a.valid !== false && o.b.valid !== false
  );
}

/* ------------------------------------------------------------------ *
 *  Checks
 * ------------------------------------------------------------------ */
/** Is there a segment with exactly these two endpoints? */
function segBetween(ctx, p, q) {
  return ctx.M.objects.some(o =>
    o.type === 'segment' && o.valid !== false &&
    ((o.a === p && o.b === q) || (o.a === q && o.b === p)));
}

/** Four points form a square: four equal sides and two equal diagonals = side·√2. */
function isSquare(p1, p2, p3, p4) {
  const pts = [p1, p2, p3, p4];
  const ds = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) ds.push(V.dist(pts[i], pts[j]));
  ds.sort((a, b) => a - b);
  const side = ds[0], diag = ds[4];
  for (let i = 0; i < 4; i++) if (Math.abs(ds[i] - side) > TOL) return false;
  for (let i = 4; i < 6; i++) if (Math.abs(ds[i] - diag) > TOL) return false;
  return Math.abs(diag - side * Math.SQRT2) < TOL;
}

/** Order four point-objects into a cycle of the square they form, or null. */
function squareCycle(pts) {
  const P = pts.map(p => p.pos);
  if (!isSquare(P[0], P[1], P[2], P[3])) return null;
  let side = Infinity;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) side = Math.min(side, V.dist(P[i], P[j]));
  const adj = (i, j) => Math.abs(V.dist(P[i], P[j]) - side) < TOL;
  const idx = [0, 1, 2, 3];
  for (let s0 = 0; s0 < 4; s0++) {
    const nb = idx.filter(k => k !== s0 && adj(s0, k));
    if (nb.length !== 2) continue;
    const third = idx.find(k => k !== s0 && k !== nb[0] && adj(nb[0], k));
    if (third === undefined) continue;
    const fourth = idx.find(k => k !== s0 && k !== nb[0] && k !== third);
    if (fourth === undefined || !adj(third, fourth) || !adj(fourth, s0)) continue;
    return [pts[s0], pts[nb[0]], pts[third], pts[fourth]];
  }
  return null;
}

/**
 * A closed polygon counts only when the outline is actually drawn: every
 * consecutive pair must be joined by a segment the player made.
 */
function outlineDrawn(ctx, cycle) {
  for (let i = 0; i < cycle.length; i++) {
    if (!segBetween(ctx, cycle[i], cycle[(i + 1) % cycle.length])) return false;
  }
  return true;
}

function checkEquilateral(ctx) {
  const A = ctx.A, B = ctx.B;
  const AB = V.dist(A.pos, B.pos);
  return validPoints(ctx).some(o => {
    if (o === A || o === B) return false;
    if (Math.abs(V.dist(o.pos, A.pos) - AB) > TOL) return false;
    if (Math.abs(V.dist(o.pos, B.pos) - AB) > TOL) return false;
    // the triangle must be drawn, not merely have its apex located
    return segBetween(ctx, A, o) && segBetween(ctx, B, o) && segBetween(ctx, A, B);
  });
}

function checkMidpoint(ctx) {
  const A = ctx.A, B = ctx.B;
  const AB = V.dist(A.pos, B.pos);
  return validPoints(ctx).some(o =>
    o !== A && o !== B &&
    Math.abs(V.dist(o.pos, A.pos) - AB / 2) < TOL &&
    Math.abs(V.dist(o.pos, B.pos) - AB / 2) < TOL
  );
}

function checkPerpBisector(ctx) {
  const A = ctx.A.pos, B = ctx.B.pos;
  return validSegments(ctx).some(s => {
    if (V.dist(s.a.pos, s.b.pos) < 60) return false;
    const eq = p => Math.abs(V.dist(p, A) - V.dist(p, B)) < TOL;
    if (!eq(s.a.pos) || !eq(s.b.pos)) return false;
    return Math.abs(V.dot(unit(s.a.pos, s.b.pos), unit(A, B))) < 0.05;
  });
}

function checkAngleBisector(ctx) {
  const A = ctx.A.pos, B = ctx.B.pos, C = ctx.C.pos;
  const uAB = unit(A, B), uAC = unit(A, C);
  if (!uAB || !uAC) return false;
  const bis = V.norm(V.add(uAB, uAC));
  if (!bis) return false;
  // the bisector must be drawn as a segment lying on the bisector line
  return validSegments(ctx).some(s => {
    if (V.dist(s.a.pos, s.b.pos) < 60) return false;
    const u = unit(s.a.pos, s.b.pos);
    if (!u) return false;
    if (crossLen(u, bis) > 0.03) return false;
    return distToLine(A, s.a.pos, s.b.pos) < TOL;
  });
}

function checkPerpendicular(ctx) {
  const A = ctx.A.pos, B = ctx.B.pos, P = ctx.P.pos;
  const uAB = unit(A, B);
  if (!uAB) return false;
  return validSegments(ctx).some(s => {
    const u = unit(s.a.pos, s.b.pos);
    if (!u) return false;
    if (Math.abs(V.dot(u, uAB)) > 0.03) return false;
    return distToLine(P, s.a.pos, s.b.pos) < TOL;
  });
}

function checkCircumcircle(ctx) {
  const A = ctx.A.pos, B = ctx.B.pos, C = ctx.C.pos;
  return ctx.M.objects.some(o => {
    if (o.type !== 'circle' || o.valid === false) return false;
    const g = o.derived ? { c: o.c, r: o.r }
      : { c: o.center.pos, r: V.dist(o.center.pos, o.through.pos) };
    if (!g || !(g.r > 1)) return false;
    return Math.abs(V.dist(g.c, A) - g.r) < TOL &&
           Math.abs(V.dist(g.c, B) - g.r) < TOL &&
           Math.abs(V.dist(g.c, C) - g.r) < TOL;
  });
}

function checkSquare(ctx) {
  const A = ctx.A, B = ctx.B;
  const rest = validPoints(ctx).filter(o => o !== A && o !== B);
  for (let i = 0; i < rest.length; i++) {
    for (let j = i + 1; j < rest.length; j++) {
      const cycle = squareCycle([A, B, rest[i], rest[j]]);
      if (cycle && outlineDrawn(ctx, cycle)) return true;
    }
  }
  return false;
}

function checkHexagon(ctx) {
  const A = ctx.A, B = ctx.B;
  const AB = V.dist(A.pos, B.pos);
  const all = validPoints(ctx);
  for (const O of all) {
    if (Math.abs(V.dist(O.pos, A.pos) - AB) > TOL) continue;
    if (Math.abs(V.dist(O.pos, B.pos) - AB) > TOL) continue;
    const ring = all.filter(p => Math.abs(V.dist(p.pos, O.pos) - AB) < TOL);
    if (ring.length < 6) continue;
    const byAngle = ring.map(p => ({
      p, a: Math.atan2(p.pos.z - O.pos.z, p.pos.x - O.pos.x)
    })).sort((u, v) => u.a - v.a);
    const n = byAngle.length;
    for (let i = 0; i < n; i++) {
      const six = [];
      let ok = true;
      for (let k = 0; k < 6; k++) six.push(byAngle[(i + k) % n]);
      for (let k = 0; k < 6; k++) {
        let d = byAngle[(i + k + 1) % n].a - byAngle[(i + k) % n].a;
        while (d <= 0) d += Math.PI * 2;
        if (Math.abs(d - Math.PI / 3) > 0.07) { ok = false; break; }
      }
      if (!ok) continue;
      const pts = six.map(e => e.p);
      if (outlineDrawn(ctx, pts)) return true;
    }
  }
  return false;
}

function checkGolden(ctx) {
  const A = ctx.A.pos, B = ctx.B.pos;
  const AB = V.dist(A, B);
  return validPoints(ctx).some(o =>
    o !== ctx.A && o !== ctx.B &&
    distToLine(o.pos, A, B) < TOL &&
    Math.abs(V.dist(o.pos, A) - AB / PHI) < TOL
  );
}

function checkTangent(ctx) {
  const O = ctx.O.pos, P = ctx.P.pos;
  const r = V.dist(O, ctx.R.pos);
  return validSegments(ctx).some(s => {
    if (V.dist(s.a.pos, s.b.pos) < 40) return false;
    if (distToLine(P, s.a.pos, s.b.pos) > TOL) return false;
    return Math.abs(distToLine(O, s.a.pos, s.b.pos) - r) < TOL;
  });
}

function checkTetrahedron(ctx) {
  const A = ctx.A, B = ctx.B;
  const AB = V.dist(A.pos, B.pos);
  const rest = validPoints(ctx).filter(o => o !== A && o !== B);
  for (let i = 0; i < rest.length; i++) {
    const P = rest[i];
    if (Math.abs(V.dist(P.pos, A.pos) - AB) > TOL || Math.abs(V.dist(P.pos, B.pos) - AB) > TOL) continue;
    for (let j = i + 1; j < rest.length; j++) {
      const Q = rest[j];
      if (Math.abs(V.dist(Q.pos, A.pos) - AB) > TOL || Math.abs(V.dist(Q.pos, B.pos) - AB) > TOL) continue;
      if (Math.abs(V.dist(Q.pos, P.pos) - AB) > TOL) continue;
      // all six edges of the solid must be drawn
      return segBetween(ctx, A, B) && segBetween(ctx, A, P) && segBetween(ctx, A, Q) &&
             segBetween(ctx, B, P) && segBetween(ctx, B, Q) && segBetween(ctx, P, Q);
    }
  }
  return false;
}

/* ------------------------------------------------------------------ *
 *  Levels
 * ------------------------------------------------------------------ */
export const LEVELS = [
  {
    id: 'equilateral',
    title: { zh: '等边三角形', en: 'Equilateral Triangle' },
    goal: { zh: '以线段 <b>AB</b> 为边，构造一个等边三角形', en: 'Construct an equilateral triangle on segment <b>AB</b>' },
    hint: { zh: "分别以 A、B 为圆心、AB 为半径作两个圆，交点即第三个顶点；再用线段把三条边连起来。", en: "Circles centred A and B with radius AB meet at the third vertex — then draw the two missing sides with the segment tool." },
    done: { zh: '三边完全相等——等边三角形', en: 'Three equal sides — an equilateral triangle' },
    par: 4,
    setup(ctx) {
      const A = ctx.given(250, 400, 'A');
      const B = ctx.given(750, 400, 'B');
      ctx.givenSegment(A, B);
      return { A, B };
    },
    check: checkEquilateral
  },
  {
    id: 'midpoint',
    title: { zh: '线段中点', en: 'Midpoint' },
    goal: { zh: '构造线段 <b>AB</b> 的中点', en: 'Construct the midpoint of segment <b>AB</b>' },
    hint: { zh: '先作出 AB 的垂直平分线，它与 AB 的交点即为中点。', en: 'Build the perpendicular bisector of AB; where it crosses AB is the midpoint.' },
    done: { zh: '垂直平分线与线段的交点，正是完美中点', en: 'The perpendicular bisector cuts AB exactly in half' },
    par: 3,
    setup(ctx) {
      const A = ctx.given(250, 400, 'A');
      const B = ctx.given(750, 400, 'B');
      ctx.givenSegment(A, B);
      return { A, B };
    },
    check: checkMidpoint
  },
  {
    id: 'perpbisector',
    title: { zh: '垂直平分线', en: 'Perpendicular Bisector' },
    goal: { zh: '构造线段 <b>AB</b> 的垂直平分线', en: 'Construct the perpendicular bisector of <b>AB</b>' },
    hint: { zh: '以 A、B 为圆心作等半径圆，两交点连线即为垂直平分线。', en: 'Equal circles about A and B meet at two points — join them.' },
    done: { zh: '线上每一点到 A、B 的距离都相等', en: 'Every point on it is equidistant from A and B' },
    par: 3,
    setup(ctx) {
      const A = ctx.given(250, 400, 'A');
      const B = ctx.given(750, 400, 'B');
      ctx.givenSegment(A, B);
      return { A, B };
    },
    check: checkPerpBisector
  },
  {
    id: 'anglebisector',
    title: { zh: '角平分线', en: 'Angle Bisector' },
    goal: { zh: '构造 ∠<b>BAC</b> 的平分线', en: 'Construct the bisector of ∠<b>BAC</b>' },
    hint: { zh: "在两边上截取等长线段，再以两个截点为圆心作等半径圆，得到角平分线上的一点；最后从 A 出发沿该点画出平分线。", en: "Mark equal lengths on both arms, draw equal circles about those marks to find a point on the bisector, then draw the bisector from A through it." },
    done: { zh: '平分线上的点到角两边距离相等', en: 'Points on it are equidistant from both arms' },
    par: 4,
    setup(ctx) {
      const A = ctx.given(220, 540, 'A');
      const B = ctx.given(700, 200, 'B');
      const C = ctx.given(820, 540, 'C');
      ctx.givenSegment(A, B);
      ctx.givenSegment(A, C);
      return { A, B, C };
    },
    check: checkAngleBisector
  },
  {
    id: 'perpendicular',
    title: { zh: '过点作垂线', en: 'Perpendicular Through a Point' },
    goal: { zh: '过点 <b>P</b> 作线段 <b>AB</b> 所在直线的垂线', en: 'Drop a perpendicular from <b>P</b> to the line <b>AB</b>' },
    hint: { zh: '以 P 为圆心画弧交 AB 于两点，再以这两点为圆心作等半径圆。', en: 'Arc about P cutting AB at two points, then equal circles about those.' },
    done: { zh: '垂线段最短——点到直线的距离', en: 'The perpendicular is the shortest path to the line' },
    par: 4,
    setup(ctx) {
      const A = ctx.given(220, 300, 'A');
      const B = ctx.given(780, 480, 'B');
      const P = ctx.given(500, 170, 'P');
      ctx.givenSegment(A, B);
      return { A, B, P };
    },
    check: checkPerpendicular
  },
  {
    id: 'circumcircle',
    title: { zh: '外接圆', en: 'Circumcircle' },
    goal: { zh: '构造三角形 <b>ABC</b> 的外接圆', en: 'Construct the circumcircle of triangle <b>ABC</b>' },
    hint: { zh: '外接圆的圆心（外心）是两条边的垂直平分线的交点——先作 AB 与 BC 的垂直平分线。', en: 'The circumcentre is the meeting point of two perpendicular bisectors — build those of AB and BC.' },
    done: { zh: '一个圆同时穿过三个顶点——外接圆', en: 'One circle through all three vertices — the circumcircle' },
    par: 7,
    setup(ctx) {
      const A = ctx.given(300, 560, 'A');
      const B = ctx.given(760, 540, 'B');
      const C = ctx.given(520, 220, 'C');
      ctx.givenSegment(A, B);
      ctx.givenSegment(B, C);
      ctx.givenSegment(C, A);
      return { A, B, C };
    },
    check: checkCircumcircle
  },
  {
    id: 'square',
    title: { zh: '正方形', en: 'Square' },
    goal: { zh: '以线段 <b>AB</b> 为对角线，构造一个正方形', en: 'Construct a square with <b>AB</b> as a diagonal' },
    hint: { zh: "AB 的垂直平分线与 AB 交于中点 M；以 M 为圆心、MA 为半径作圆，与垂直平分线的两个交点就是另外两个顶点，再用线段围出正方形。", en: "The perpendicular bisector meets AB at M; the circle about M through A cuts it at the other two vertices — then join all four sides." },
    done: { zh: '四边相等、四角皆为直角——正方形', en: 'Four equal sides, four right angles — a square' },
    par: 8,
    setup(ctx) {
      const A = ctx.given(280, 350, 'A');
      const B = ctx.given(680, 350, 'B');
      ctx.givenSegment(A, B);
      return { A, B };
    },
    check: checkSquare
  },
  {
    id: 'hexagon',
    title: { zh: '正六边形', en: 'Regular Hexagon' },
    goal: { zh: '以线段 <b>AB</b> 为边，构造一个正六边形', en: 'Construct a regular hexagon on side <b>AB</b>' },
    hint: { zh: "正六边形的边长等于外接圆半径：先求中心 O，再以 O 为圆心、AB 为半径作圆，配合等边三角形求出六个顶点，最后连成六边形。", en: "A hexagon’s side equals its circumradius: find the centre O, draw the circle about O through A, place all six vertices with equilateral triangles, then join the outline." },
    done: { zh: '六个等边三角形拼成完美的蜂巢', en: 'Six equilateral triangles tile into a perfect honeycomb' },
    par: 10,
    setup(ctx) {
      const A = ctx.given(400, 400, 'A');
      const B = ctx.given(600, 400, 'B');
      ctx.givenSegment(A, B);
      return { A, B };
    },
    check: checkHexagon
  },
  {
    id: 'golden',
    title: { zh: '黄金分割', en: 'Golden Section' },
    goal: { zh: '在 <b>AB</b> 上构造黄金分割点（AP : AB = 1 : φ）', en: 'Mark the golden section of <b>AB</b> (AP : AB = 1 : φ)' },
    hint: { zh: 'C 满足 BC⊥AB 且 BC = AB/2。连 AC，以 C 为圆心、CB 为半径画弧交 AC 于 D，再以 A 为圆心、AD 为半径画弧交 AB 于 P。', en: 'C has BC⊥AB and BC = AB/2. Draw AC, arc about C through B cutting AC at D, then arc about A through D cutting AB at P.' },
    done: { zh: 'AP : AB = 1 : φ —— 黄金比例诞生', en: 'AP : AB = 1 : φ — the golden ratio' },
    par: 3,
    setup(ctx) {
      const A = ctx.given(300, 430, 'A');
      const B = ctx.given(700, 430, 'B');
      const C = ctx.given(700, 230, 'C');
      ctx.givenSegment(A, B);
      ctx.givenSegment(B, C);
      return { A, B, C };
    },
    check: checkGolden
  },
  {
    id: 'tangent',
    title: { zh: '圆的切线', en: 'Tangent to a Circle' },
    goal: { zh: '过圆外点 <b>P</b> 作圆 O 的切线', en: 'Draw a tangent from external point <b>P</b> to circle O' },
    hint: { zh: '以 OP 为直径作圆（先求 OP 中点 M），它与圆 O 的交点即为切点。', en: 'Draw the circle on diameter OP (find midpoint M first); where it meets circle O are the tangent points.' },
    done: { zh: '切线与半径在切点处垂直', en: 'The tangent is perpendicular to the radius at the touch point' },
    par: 5,
    setup(ctx) {
      const O = ctx.given(520, 400, 'O');
      const R = ctx.given(660, 400, 'R');
      const P = ctx.given(520, 130, 'P');
      ctx.givenCircle(O, R);
      ctx.givenSegment(O, P);
      return { O, R, P };
    },
    check: checkTangent
  },
  {
    id: 'tetrahedron',
    title: { zh: '正四面体', en: 'Regular Tetrahedron' },
    goal: { zh: '以 <b>AB</b> 为棱，构造一个正四面体（需要用到球工具）', en: 'Build a regular tetrahedron with edge <b>AB</b> (the sphere tool is required)' },
    hint: { zh: "球 A 与球 B（半径均为 AB）相交得到竖直圆，再与平面圆相交得到平面顶点；以该顶点为心作球，与竖直圆相交即得立体顶点。最后用线段把六条棱全部连起来。", en: "Spheres about A and B (radius AB) meet in a vertical circle; intersect it with the plane circle for a flat apex, then a sphere about that apex gives the 3D apex. Finally draw all six edges." },
    done: { zh: '四个正三角形围成一个立体——正四面体', en: 'Four equilateral faces close into a solid — the tetrahedron' },
    par: 9,
    headroom: 470,
    setup(ctx) {
      return { A: ctx.given(350, 420, 'A'), B: ctx.given(650, 420, 'B') };
    },
    check: checkTetrahedron
  }
];

/** Level indices unlocked for a given completed set. */
export function isUnlocked(idx, completed) {
  if (idx === 0) return true;
  return completed.includes(idx - 1);
}

export { PHI };
