// Pure, framework-free player physics so collision can be unit-tested with a
// mock world (no Three.js, no WebGL). The world is injected as
// `isSolid(x, y, z) => boolean` over integer block cells, where cell (x,y,z)
// occupies the unit box [x, x+1) on each axis.

/** Nominal (visual) player size, in blocks. See issues 02 + 06. */
export const PLAYER_SIZE = { x: 1.0, y: 2.0, z: 1.0 };
/**
 * Collision box - a hair smaller than the nominal size so the player has a
 * little clearance and is never a zero-tolerance fit in a 1-wide / 2-tall gap.
 * An exact 1x2x1 collider snags on exact-width passages (you could only enter a
 * 1-wide corridor from certain directions). Still > 1 tall, so a 1-tall gap
 * blocks; still < 2 tall, so a 2-tall gap admits.
 */
export const COLLISION_SIZE = { x: 0.9, y: 1.9, z: 0.9 };
/** Camera eye offset above the feet; must sit inside the box. */
export const EYE_HEIGHT = 1.7;

export const GRAVITY = 30; // blocks / s^2
export const JUMP_SPEED = 9; // blocks / s  (~1.35 block jump height)
export const TERMINAL_VELOCITY = 50; // blocks / s

const MAX_SUBSTEP = 0.4; // max displacement per collision substep (< 1 block)
const EPS = 1e-6;

/** Collision AABB for the player, with feet at `pos` (footprint centered on x/z). */
export const playerBox = (pos) => ({
  min: { x: pos.x - COLLISION_SIZE.x / 2, y: pos.y, z: pos.z - COLLISION_SIZE.z / 2 },
  max: { x: pos.x + COLLISION_SIZE.x / 2, y: pos.y + COLLISION_SIZE.y, z: pos.z + COLLISION_SIZE.z / 2 },
});

// Inclusive integer cell indices whose [c, c+1) span overlaps [lo, hi).
// Faces that merely touch (within EPS) don't count as overlap.
const cellRange = (lo, hi) => [Math.floor(lo + EPS), Math.ceil(hi - EPS) - 1];

/** True if the player box at `pos` overlaps any solid block. */
export const collides = (pos, isSolid) => {
  const { min, max } = playerBox(pos);
  const [x0, x1] = cellRange(min.x, max.x);
  const [y0, y1] = cellRange(min.y, max.y);
  const [z0, z1] = cellRange(min.z, max.z);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        if (isSolid(x, y, z)) return true;
      }
    }
  }
  return false;
};

// Resolves a single-axis overlap by the *minimal* push that frees the box, then
// zeroes that axis' velocity. Direction-agnostic: it works even when the axis
// velocity is ~0 (e.g. walking straight down a 1-wide corridor without
// strafing), which a velocity-sign-based resolver cannot handle - that gap left
// the player clipped into a wall and unable to advance. Substepping keeps
// penetration < 1 block, so the smaller of the two snaps is always the correct
// exit. Returns true if it resolved a hit.
const resolveAxis = (pos, vel, axis, isSolid) => {
  if (!collides(pos, isSolid)) return false;
  const box = playerBox(pos);
  const pushNeg = box.max[axis] - Math.floor(box.max[axis] + EPS); // snap max down (move -)
  const pushPos = Math.ceil(box.min[axis] - EPS) - box.min[axis]; // snap min up (move +)
  if (pushNeg <= pushPos) {
    pos[axis] -= pushNeg;
  } else {
    pos[axis] += pushPos;
  }
  vel[axis] = 0;
  return true;
};

/** Sets upward jump velocity, but only when standing on the ground. */
export const applyJump = (vel, onGround, jumpPressed) => {
  if (onGround && jumpPressed) vel.y = JUMP_SPEED;
  return vel;
};

/**
 * Advances the player one frame.
 * @param {{position:{x,y,z}, velocity:{x,y,z}}} state
 * @param {number} dt - seconds
 * @param {(x:number,y:number,z:number)=>boolean} isSolid
 * @param {{fly?: boolean}} [opts]
 * @returns {{position:{x,y,z}, velocity:{x,y,z}, onGround:boolean}}
 */
export const stepPhysics = (state, dt, isSolid, { fly = false } = {}) => {
  const position = { x: state.position.x, y: state.position.y, z: state.position.z };
  const velocity = { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z };

  if (fly) {
    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
    position.z += velocity.z * dt;
    return { position, velocity, onGround: false };
  }

  velocity.y = Math.max(velocity.y - GRAVITY * dt, -TERMINAL_VELOCITY);

  const maxDisp =
    Math.max(Math.abs(velocity.x), Math.abs(velocity.y), Math.abs(velocity.z)) * dt;
  const steps = Math.max(1, Math.ceil(maxDisp / MAX_SUBSTEP));
  const sdt = dt / steps;

  let onGround = false;
  for (let i = 0; i < steps; i++) {
    position.x += velocity.x * sdt;
    resolveAxis(position, velocity, 'x', isSolid);

    position.z += velocity.z * sdt;
    resolveAxis(position, velocity, 'z', isSolid);

    const movingDown = velocity.y < 0;
    position.y += velocity.y * sdt;
    if (resolveAxis(position, velocity, 'y', isSolid) && movingDown) onGround = true;
  }

  return { position, velocity, onGround };
};
