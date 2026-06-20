// Deterministic, order-independent tree placement for chunked generation.
//
// Here, placement is a pure function of world position + seed: the world is
// divided into a grid of `spacing`-sized cells, each holding at most one trunk at
// a hashed offset (blue-noise-ish). Any chunk can compute the same trunks and
// render whichever leaves/logs fall inside it, so crowns are seamless across
// chunk borders with no cross-chunk coordination.

import { rand2, rand3 } from './hash';

export const CANOPY_RADIUS = 2;

/** World position of the candidate trunk within grid cell (gx, gz). */
export const trunkInCell = (gx, gz, seed, spacing) => ({
  x: gx * spacing + Math.floor(rand2(gx, gz, seed ^ 0x1111) * spacing),
  z: gz * spacing + Math.floor(rand2(gx, gz, seed ^ 0x2222) * spacing),
});

/** Whether grid cell (gx, gz) actually grows a tree, given local forest density. */
export const cellHasTree = (gx, gz, seed, density, forestiness) =>
  rand2(gx, gz, seed ^ 0x3333) < density * forestiness;

/** Trunk height (4..6) for grid cell (gx, gz). */
export const trunkHeightFor = (gx, gz, seed) => 4 + Math.floor(rand2(gx, gz, seed ^ 0x4444) * 3);

/** Candidate trunk grid cells whose canopy could overlap [x0,x1] x [z0,z1]. */
export const candidateTrunks = (x0, z0, x1, z1, seed, spacing) => {
  const gx0 = Math.floor((x0 - CANOPY_RADIUS) / spacing);
  const gx1 = Math.floor((x1 + CANOPY_RADIUS) / spacing);
  const gz0 = Math.floor((z0 - CANOPY_RADIUS) / spacing);
  const gz1 = Math.floor((z1 + CANOPY_RADIUS) / spacing);
  const out = [];
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gz = gz0; gz <= gz1; gz++) {
      out.push({ gx, gz, ...trunkInCell(gx, gz, seed, spacing) });
    }
  }
  return out;
};

/**
 * Whether a leaf occupies the world cell (lx, ly, lz), at distance `dist` from
 * the crown centre. Keyed on the absolute cell so neighbouring chunks agree on
 * the (randomly trimmed) crown edge.
 */
export const leafKept = (lx, ly, lz, dist, seed) => {
  if (dist > CANOPY_RADIUS + 0.5) return false;
  if (dist > CANOPY_RADIUS - 0.5 && rand3(lx, ly, lz, seed ^ 0x5555) < 0.4) return false;
  return true;
};
