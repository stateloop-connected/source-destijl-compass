/** Shared constants and the De Stijl palette. */

export const LW = 1000; // construction table extent along u (world X)
export const LH = 700;  // construction table extent along v (world Z)

export const TOL = 6;          // level-check tolerance, world units
export const SNAP_PX = 26;     // pointer snap radius in screen pixels
export const MAX_HISTORY = 80;
export const MAX_OBJECTS = 520; // hard cap on the construction graph

export const STORAGE_KEY = 'destijl3d.save.v1';

/** World-space normal of the construction table. */
export const PLANE_N = { x: 0, y: 1, z: 0 };

export const PALETTE = {
  paper: '#f7f4ef',
  ink: '#1a1a1a',
  red: '#d32029',
  blue: '#1e4c9a',
  yellow: '#f4c430',
  grey: '#8d8a84'
};

/** Plane coords (u,v) -> world position on the table. */
export function toWorld(u, v, h = 0) {
  return { x: u - LW / 2, y: h, z: v - LH / 2 };
}

/** World position -> plane coords (u,v). */
export function toPlane(p) {
  return { u: p.x + LW / 2, v: p.z + LH / 2 };
}
