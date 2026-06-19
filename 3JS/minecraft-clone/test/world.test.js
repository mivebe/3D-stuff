import { describe, it, expect } from 'vitest';
import World from '../src/world/world.js';
import { blocks } from '../src/blocks.js';

// `render = false` builds only the block data model (no WebGL / textures),
// which is all this suite exercises.
const buildWorld = (size = 8, height = 16, seed = 0) => {
  const world = new World(size, height, undefined, false);
  if (seed !== 0) {
    world.params.seed = seed;
    world.data = [];
    world.resourceFlags = [];
    world.generateData();
  }
  return world;
};

describe('World data model', () => {
  it('allocates a size x height x size grid', () => {
    const w = buildWorld(8, 16);
    expect(w.data).toHaveLength(8);
    expect(w.data[0]).toHaveLength(16);
    expect(w.data[0][0]).toHaveLength(8);
  });

  it('reports bounds correctly', () => {
    const w = buildWorld(8, 16);
    expect(w.inBounds({ x: 0, y: 0, z: 0 })).toBe(true);
    expect(w.inBounds({ x: 7, y: 15, z: 7 })).toBe(true);
    expect(w.inBounds({ x: -1, y: 0, z: 0 })).toBe(false);
    expect(w.inBounds({ x: 8, y: 0, z: 0 })).toBe(false);
    expect(w.inBounds({ x: 0, y: 16, z: 0 })).toBe(false);
  });

  it('returns null for out-of-bounds blocks', () => {
    const w = buildWorld(8, 16);
    expect(w.getBlock({ x: -1, y: 0, z: 0 })).toBeNull();
    expect(w.getBlock({ x: 0, y: 0, z: 0 })).not.toBeNull();
  });

  it('lays a bedrock floor at y = 0', () => {
    const w = buildWorld(8, 16);
    for (let x = 0; x < w.size; x++) {
      for (let z = 0; z < w.size; z++) {
        expect(w.getBlock({ x, y: 0, z }).id).toBe(blocks.bedrock.id);
      }
    }
  });

  it('round-trips setBlockId / getBlock', () => {
    const w = buildWorld(8, 16);
    w.setBlockId({ x: 2, y: 5, z: 3 }, blocks.diamond.id);
    expect(w.getBlock({ x: 2, y: 5, z: 3 }).id).toBe(blocks.diamond.id);
  });
});

describe('World determinism', () => {
  it('produces identical terrain for the same seed', () => {
    const a = buildWorld(8, 16, 0);
    const b = buildWorld(8, 16, 0);
    expect(JSON.stringify(a.data)).toEqual(JSON.stringify(b.data));
  });

  it('produces different terrain for different seeds', () => {
    const a = buildWorld(8, 16, 0);
    const b = buildWorld(8, 16, 123);
    expect(JSON.stringify(a.data)).not.toEqual(JSON.stringify(b.data));
  });
});

describe('trees', () => {
  // Rig off so the debug rig's floating oak_log beams don't count as "trees".
  const treeWorld = (seed = 0) => {
    const w = new World(48, 40, undefined, false);
    w.params.debug.testStructures = false;
    w.params.seed = seed;
    w.data = [];
    w.resourceFlags = [];
    w.generateData();
    return w;
  };
  const countBlocks = (w, id) => {
    let n = 0;
    for (let x = 0; x < w.size; x++)
      for (let y = 0; y < w.height; y++)
        for (let z = 0; z < w.size; z++) if (w.getBlock({ x, y, z }).id === id) n++;
    return n;
  };

  it('grows seeded oak trees (logs + leaves), deterministically', () => {
    const a = treeWorld(0);
    const b = treeWorld(0);
    const logs = countBlocks(a, blocks.oak_log.id);
    const leaves = countBlocks(a, blocks.oak_leaves.id);
    expect(logs).toBeGreaterThan(0);
    expect(leaves).toBeGreaterThan(logs); // a crown has more leaves than trunk
    expect(countBlocks(b, blocks.oak_log.id)).toBe(logs);
    expect(countBlocks(b, blocks.oak_leaves.id)).toBe(leaves);
  });

  it('only grows trees on grass and never buries the trunk in terrain', () => {
    const w = treeWorld(0);
    for (let x = 0; x < w.size; x++)
      for (let y = 1; y < w.height; y++)
        for (let z = 0; z < w.size; z++) {
          if (w.getBlock({ x, y, z }).id !== blocks.oak_log.id) continue;
          const below = w.getBlock({ x, y: y - 1, z }).id;
          // a trunk block sits on grass, dirt or more log - never on air
          expect(below).not.toBe(blocks.air.id);
        }
  });
});

describe('chunk-ready generation (seamless)', () => {
  // Build a volume of `size` whose (0,0) corner is at world (ox, oz).
  const gen = (size, ox, oz) => {
    const w = new World(size, 40, undefined, false);
    w.originX = ox;
    w.originZ = oz;
    w.params.debug.testStructures = false;
    w.params.water.enabled = false;
    w.data = [];
    w.resourceFlags = [];
    w.edits = {};
    w.generateData();
    return w;
  };
  const treeCells = (w) => {
    const s = new Set();
    for (let x = 0; x < w.size; x++)
      for (let y = 0; y < w.height; y++)
        for (let z = 0; z < w.size; z++) {
          const id = w.getBlock({ x, y, z }).id;
          if (id === blocks.oak_log.id || id === blocks.oak_leaves.id) {
            s.add(`${w.originX + x},${y},${w.originZ + z}`);
          }
        }
    return s;
  };

  it('chunked trees exactly match a single monolithic world', () => {
    const mono = gen(32, 0, 0);
    const chunks = [gen(16, 0, 0), gen(16, 16, 0), gen(16, 0, 16), gen(16, 16, 16)];
    const monoSet = treeCells(mono);
    const chunkSet = new Set();
    for (const c of chunks) for (const k of treeCells(c)) chunkSet.add(k);
    expect(chunkSet).toEqual(monoSet);
    expect(monoSet.size).toBeGreaterThan(0); // there actually are trees to compare
  });
});

describe('water', () => {
  const waterWorld = (seaLevel) => {
    const w = new World(32, 40, undefined, false);
    w.params.debug.testStructures = false;
    w.params.water.seaLevel = seaLevel;
    w.data = [];
    w.resourceFlags = [];
    w.generateData();
    return w;
  };
  const countBlocks = (w, id) => {
    let n = 0;
    for (let x = 0; x < w.size; x++)
      for (let y = 0; y < w.height; y++)
        for (let z = 0; z < w.size; z++) if (w.getBlock({ x, y, z }).id === id) n++;
    return n;
  };

  it('floods basins up to sea level, deterministically', () => {
    const a = waterWorld(30);
    const b = waterWorld(30);
    const water = countBlocks(a, blocks.water.id);
    expect(water).toBeGreaterThan(0);
    expect(countBlocks(b, blocks.water.id)).toBe(water);
  });

  it('never places water above sea level', () => {
    const w = waterWorld(24);
    for (let x = 0; x < w.size; x++)
      for (let y = 25; y < w.height; y++)
        for (let z = 0; z < w.size; z++) {
          expect(w.getBlock({ x, y, z }).id).not.toBe(blocks.water.id);
        }
  });

  it('is non-solid (no collision) and non-occluding', () => {
    const w = new World(8, 8, undefined, false);
    for (let x = 0; x < 8; x++)
      for (let y = 0; y < 8; y++)
        for (let z = 0; z < 8; z++) w.setBlockId({ x, y, z }, blocks.air.id);

    w.setBlockId({ x: 3, y: 3, z: 3 }, blocks.water.id);
    expect(w.isSolid({ x: 3, y: 3, z: 3 })).toBe(false); // walk/fall through
    expect(w.isOpaque({ x: 3, y: 3, z: 3 })).toBe(false);

    // A stone block touching water keeps its face (water doesn't occlude), and
    // water is excluded from the opaque mesh.
    w.setBlockId({ x: 4, y: 3, z: 3 }, blocks.stone.id);
    expect(w.isBlockObscured({ x: 4, y: 3, z: 3 })).toBe(false);
    expect(w.isRenderable({ x: 3, y: 3, z: 3 })).toBe(false); // liquids excluded
  });
});

describe('transparency / face culling', () => {
  it('leaves do not occlude neighbor faces (treated as non-opaque)', () => {
    const w = new World(8, 8, undefined, false);
    for (let x = 0; x < 8; x++)
      for (let y = 0; y < 8; y++)
        for (let z = 0; z < 8; z++) w.setBlockId({ x, y, z }, blocks.air.id);

    // A lone stone block fully wrapped in leaves stays renderable (leaves are
    // transparent, so they don't hide its faces).
    w.setBlockId({ x: 3, y: 3, z: 3 }, blocks.stone.id);
    for (const d of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      w.setBlockId({ x: 3 + d[0], y: 3 + d[1], z: 3 + d[2] }, blocks.oak_leaves.id);
    }
    expect(w.isOpaque({ x: 4, y: 3, z: 3 })).toBe(false); // a leaf
    expect(w.isBlockObscured({ x: 3, y: 3, z: 3 })).toBe(false);
    expect(w.isRenderable({ x: 3, y: 3, z: 3 })).toBe(true);
  });
});

describe('debug test structures', () => {
  // Bigger world so the rig (offset cx±3) stays in bounds.
  const buildWithRig = (testStructures) => {
    const w = new World(16, 32, undefined, false);
    w.params.debug.testStructures = testStructures;
    w.data = [];
    w.resourceFlags = [];
    w.generateData();
    return w;
  };

  it('changes the world only when enabled, and stays deterministic', () => {
    const on1 = buildWithRig(true);
    const on2 = buildWithRig(true);
    const off = buildWithRig(false);
    expect(JSON.stringify(on1.data)).toEqual(JSON.stringify(on2.data)); // deterministic
    expect(JSON.stringify(on1.data)).not.toEqual(JSON.stringify(off.data));
  });

  it('builds a flat platform and exact-height rig structures', () => {
    const on = buildWithRig(true);
    const off = buildWithRig(false);
    const cx = 8;
    const cz = 8;
    const F = off.surfaceHeight(cx, cz); // walking floor level

    // Flat platform: solid slab at F-1, cleared headroom at F.
    expect(on.getBlock({ x: cx, y: F - 1, z: cz }).id).toBe(blocks.stone.id);
    expect(on.getBlock({ x: cx, y: F, z: cz }).id).toBe(blocks.air.id);

    // Staircase step k=2 (x = cx+2) tops out at F+1.
    expect(on.getBlock({ x: cx + 2, y: F + 1, z: cz }).id).toBe(blocks.stone.id);
    expect(on.getBlock({ x: cx + 2, y: F + 2, z: cz }).id).toBe(blocks.air.id);

    // Low beam (blocks) at F+1; high beam (passes) at F+2.
    expect(on.getBlock({ x: cx, y: F + 1, z: cz - 3 }).id).toBe(blocks.oak_log.id);
    expect(on.getBlock({ x: cx, y: F + 2, z: cz + 3 }).id).toBe(blocks.oak_log.id);
    // The high-beam approach keeps its first two cells clear (2-tall passage).
    expect(on.getBlock({ x: cx, y: F, z: cz + 3 }).id).toBe(blocks.air.id);
    expect(on.getBlock({ x: cx, y: F + 1, z: cz + 3 }).id).toBe(blocks.air.id);
  });
});
