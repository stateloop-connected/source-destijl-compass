/**
 * session.js — ties a model to a level: givens, user operations, scoring.
 * DOM-free, so the whole play loop is simulatable in node.
 */

import { createModel } from './model.js';
import { LEVELS } from './levels.js';
import { toWorld } from './config.js';

export function createSession() {
  const M = createModel();

  const S = {
    M,
    levelIndex: 0,
    level: null,
    given: {},
    sandbox: false,
    solved: false,
    startTime: 0
  };

  const ctx = {
    M,
    given(u, v, label) {
      return M.addPoint(toWorld(u, v, 0), 'given', label);
    },
    givenCircle(center, through) {
      const c = M.addCircle(center, through);
      c.given = true;
      return c;
    },
    givenSegment(a, b) {
      const s = M.addSegment(a, b);
      s.given = true;
      return s;
    }
  };

  S.load = (index) => {
    S.levelIndex = index;
    S.level = LEVELS[index];
    S.sandbox = false;
    S.solved = false;
    S.startTime = Date.now();
    M.reset();
    S.given = S.level.setup(ctx);
    M.recompute();
    return S.given;
  };

  S.loadSandbox = () => {
    S.sandbox = true;
    S.level = null;
    S.solved = false;
    S.startTime = Date.now();
    M.reset();
    S.given = {};
    return S.given;
  };

  /* ---------------- user operations ---------------- */
  S.placePoint = (world) => {
    M.pushHistory();
    const p = M.addPoint(world, 'free');
    M.ops++;
    M.recompute();
    return p;
  };

  S.connect = (a, b, kind) => {
    if (!a || !b || a === b) return null;
    M.pushHistory();
    const o = kind === 'circle' ? M.addCircle(a, b)
      : kind === 'sphere' ? M.addSphere(a, b)
      : M.addSegment(a, b);
    M.ops++;
    M.recompute();
    return o;
  };

  S.undo = () => {
    const ok = M.undo();
    if (ok) M.recompute();
    return ok;
  };

  S.check = () => {
    if (!S.level || S.solved) return S.solved;
    if (S.level.check({ M, ...S, ...S.given })) S.solved = true;
    return S.solved;
  };

  /** Stars from the elegance rule: 3 at par, 2 within par + 2, else 1. */
  S.stars = () => {
    if (!S.level) return 0;
    const par = S.level.par;
    if (M.ops <= par) return 3;
    if (M.ops <= par + 2) return 2;
    return 1;
  };

  S.elapsed = () => Math.max(0, Math.round((Date.now() - S.startTime) / 1000));

  return S;
}
