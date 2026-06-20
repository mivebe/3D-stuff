import { describe, it, expect } from 'vitest';
import {
  PLAYER_SIZE,
  COLLISION_SIZE,
  EYE_HEIGHT,
  JUMP_SPEED,
  playerBox,
  collides,
  applyJump,
  stepPhysics,
} from '../src/player/physics.js';

// Runs `state` through stepPhysics for `frames` ticks at 60fps.
const simulate = (state, isSolid, frames, opts) => {
  let s = state;
  let onGround = false;
  for (let i = 0; i < frames; i++) {
    const r = stepPhysics(s, 1 / 60, isSolid, opts);
    s = { position: r.position, velocity: r.velocity };
    onGround = r.onGround;
  }
  return { ...s, onGround };
};

describe('player box', () => {
  it('is nominally 1 x 2 x 1 with a slightly smaller collision box', () => {
    expect(PLAYER_SIZE).toEqual({ x: 1, y: 2, z: 1 });
    const { min, max } = playerBox({ x: 5, y: 10, z: 5 });
    expect(max.x - min.x).toBeCloseTo(COLLISION_SIZE.x);
    expect(max.y - min.y).toBeCloseTo(COLLISION_SIZE.y);
    expect(max.z - min.z).toBeCloseTo(COLLISION_SIZE.z);
    expect(min.y).toBe(10); // feet sit at the position
  });

  it('keeps a hair of clearance but still enforces height', () => {
    expect(COLLISION_SIZE.x).toBeLessThan(1); // clearance in a 1-wide gap
    expect(COLLISION_SIZE.y).toBeGreaterThan(1); // still blocked by a 1-tall gap
    expect(COLLISION_SIZE.y).toBeLessThan(2); // still admitted by a 2-tall gap
    expect(EYE_HEIGHT).toBeLessThan(COLLISION_SIZE.y);
  });
});

describe('gravity & ground', () => {
  it('falls and comes to rest on the surface', () => {
    const isSolid = (x, y, z) => y <= 4; // cells 0..4 solid; surface top at y=5
    const end = simulate(
      { position: { x: 0.5, y: 20, z: 0.5 }, velocity: { x: 0, y: 0, z: 0 } },
      isSolid,
      600
    );
    expect(end.position.y).toBeCloseTo(5, 3);
    expect(end.velocity.y).toBe(0);
    expect(end.onGround).toBe(true);
  });
});

describe('horizontal collision', () => {
  it('stops at a wall but keeps sliding along the free axis', () => {
    const isSolid = (x) => x >= 3; // wall to the +x side
    const end = simulate(
      { position: { x: 2, y: 0, z: 0 }, velocity: { x: 5, y: 0, z: 5 } },
      isSolid,
      60
    );
    // box max.x rests flush against x=3 (pos = 3 - COLLISION_SIZE.x/2)
    expect(end.position.x).toBeCloseTo(3 - COLLISION_SIZE.x / 2, 2);
    expect(end.position.x).toBeLessThan(3);
    expect(end.velocity.x).toBe(0);
    expect(end.position.z).toBeGreaterThan(2); // free to move along z
  });

  it('does not tunnel through a 1-cell wall at high speed', () => {
    const isSolid = (x) => x === 3; // thin wall
    const r = stepPhysics(
      { position: { x: 2, y: 0, z: 0 }, velocity: { x: 100, y: 0, z: 0 } },
      0.1, // would be a 10-block jump in one frame without substepping
      isSolid
    );
    expect(r.position.x).toBeCloseTo(3 - COLLISION_SIZE.x / 2, 2);
    expect(r.position.x).toBeLessThan(3);
    expect(r.velocity.x).toBe(0);
  });
});

describe('jumping', () => {
  it('only jumps when grounded (no double jump)', () => {
    expect(applyJump({ x: 0, y: 0, z: 0 }, true, true).y).toBe(JUMP_SPEED);
    expect(applyJump({ x: 0, y: 0, z: 0 }, false, true).y).toBe(0); // airborne
    expect(applyJump({ x: 0, y: 5, z: 0 }, true, false).y).toBe(5); // not pressed
  });
});

describe('2-tall headroom (issue 06)', () => {
  it('cannot fit in a 1-tall gap', () => {
    const isSolid = (x, y) => y === 0 || y === 2; // gap is the single cell y=1
    expect(collides({ x: 0.5, y: 1, z: 0.5 }, isSolid)).toBe(true);
  });

  it('fits in a 2-tall gap', () => {
    const isSolid = (x, y) => y === 0 || y === 3; // gap is cells y=1,2
    expect(collides({ x: 0.5, y: 1, z: 0.5 }, isSolid)).toBe(false);
  });

  // Swept-movement versions - these mirror the in-game experience (walking
  // toward a gap), unlike the static collides() checks above.
  const driveX = (isSolid, frames = 180) => {
    let s = { position: { x: 2, y: 1, z: 0.5 }, velocity: { x: 0, y: 0, z: 0 } };
    for (let i = 0; i < frames; i++) {
      s.velocity.x = 8; // hold forward
      const r = stepPhysics(s, 1 / 60, isSolid);
      s = { position: r.position, velocity: r.velocity };
    }
    return s.position;
  };

  it('is blocked walking into a 1-tall gap', () => {
    // floor y<=0 (feet rest at y=1); wall at x=5 solid for y>=2; gap only at (5,1)
    const isSolid = (x, y) => y <= 0 || (x === 5 && y >= 2);
    expect(driveX(isSolid).x).toBeLessThan(5);
  });

  it('walks through a 2-tall gap', () => {
    const isSolid = (x, y) => y <= 0 || (x === 5 && y >= 3); // gap at y=1,2
    expect(driveX(isSolid).x).toBeGreaterThan(5);
  });
});

describe('1-wide corridor traversal (regression)', () => {
  // Walls at x=0 and x=2 leave an exactly 1-wide gap at x=1. A 1-wide player
  // must be able to walk down it moving in +z only (no strafing), regardless of
  // which off-center x they enter at - the bug let them in from one side only.
  const isSolid = (x, y) => y <= 0 || x === 0 || x === 2;
  const walkZ = (startX) => {
    let s = { position: { x: startX, y: 1, z: 0.5 }, velocity: { x: 0, y: 0, z: 0 } };
    for (let i = 0; i < 120; i++) {
      s.velocity.z = 6; // forward only, never strafe
      const r = stepPhysics(s, 1 / 60, isSolid);
      s = { position: r.position, velocity: r.velocity };
    }
    return s.position;
  };

  for (const startX of [1.5, 1.3, 1.7]) {
    it(`enters and traverses from x=${startX}`, () => {
      const p = walkZ(startX);
      expect(p.z).toBeGreaterThan(5); // advanced down the corridor
      expect(p.x).toBeGreaterThan(1.4); // settled within the gap...
      expect(p.x).toBeLessThan(1.6); // ...with clearance on both sides
    });
  }
});

describe('fly mode', () => {
  it('ignores collision and integrates velocity directly', () => {
    const r = stepPhysics(
      { position: { x: 0, y: 0, z: 0 }, velocity: { x: 1, y: 2, z: 3 } },
      1,
      () => true,
      { fly: true }
    );
    expect(r.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(r.onGround).toBe(false);
  });
});
