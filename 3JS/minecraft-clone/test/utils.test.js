import { describe, it, expect } from 'vitest';
import {
  getUVs,
  getRandomResource,
  getVeinDirections,
  getClusterDirections,
  getNextResourceDirection,
} from '../src/world/utils.js';
import { frames, meta } from '../src/world/textureAtlas.js';
import { blocks } from '../src/blocks.js';

// Minimal RNG stub with a controllable, repeatable output.
const constRng = (value) => ({ random: () => value });
const seqRng = (values) => {
  let i = 0;
  return { random: () => values[i++ % values.length] };
};

describe('getUVs', () => {
  it('maps an atlas frame to normalized [u0, v0, u1, v1] coordinates', () => {
    const tileSize = frames[0].sourceSize; // 16x16
    const uvs = getUVs('bedrock.png', meta.size, tileSize); // frame at x:1 y:1
    const w = meta.size.w; // atlas width (grows as tiles are added)
    expect(uvs).toEqual([1 / w, 1 / 18, 17 / w, 17 / 18]);
  });

  it('falls back to a full-tile rect for an unknown frame', () => {
    expect(getUVs('does-not-exist.png', meta.size, { w: 16, h: 16 })).toEqual([0, 0, 1, 1]);
  });
});

describe('getRandomResource', () => {
  const coal = blocks.coal; // abundance 0.5
  const diamond = blocks.diamond; // abundance 0.1

  it('returns a block id from the candidate pool', () => {
    const id = getRandomResource([coal, diamond], constRng(0));
    expect(id).toBe(coal.id);
  });

  it('weights selection by abundance', () => {
    // total abundance 0.6; randomValue near the top of the range lands on diamond.
    const id = getRandomResource([coal, diamond], constRng(0.99));
    expect(id).toBe(diamond.id);
  });
});

describe('vein direction helpers', () => {
  it('getClusterDirections returns all 26 neighbors (excluding self)', () => {
    const dirs = getClusterDirections();
    expect(dirs).toHaveLength(26);
    expect(dirs).not.toContainEqual({ x: 0, y: 0, z: 0 });
  });

  it('getVeinDirections returns a 3x3 plane sharing one fixed axis', () => {
    const dirs = getVeinDirections(constRng(0)); // picks first general direction (-x)
    expect(dirs).toHaveLength(9);
    expect(dirs.every((d) => d.x === -1)).toBe(true);
  });

  it('getNextResourceDirection offsets from the current element', () => {
    const dirs = [{ x: 1, y: 0, z: 0 }];
    const next = getNextResourceDirection(dirs, { x: 2, y: 3, z: 4 }, seqRng([0]));
    expect(next).toEqual({ nx: 3, ny: 3, nz: 4 });
  });
});
