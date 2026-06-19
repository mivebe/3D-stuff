import { describe, it, expect } from 'vitest';
import { hashInts, rand2, rand3 } from '../src/world/hash.js';
import {
  CHUNK_SIZE,
  chunkCoord,
  localCoord,
  chunkKey,
  parseChunkKey,
  chunksInRadius,
  diffChunkSets,
} from '../src/world/chunkUtils.js';
import {
  trunkInCell,
  cellHasTree,
  trunkHeightFor,
  candidateTrunks,
  leafKept,
  CANOPY_RADIUS,
} from '../src/world/treePlacement.js';
import ChunkManager from '../src/world/chunkManager.js';

describe('hash', () => {
  it('is deterministic and order-sensitive', () => {
    expect(hashInts(1, 2, 3)).toBe(hashInts(1, 2, 3));
    expect(hashInts(1, 2, 3)).not.toBe(hashInts(3, 2, 1));
  });

  it('handles negative coordinates', () => {
    expect(rand2(-5, -9, 0)).toBe(rand2(-5, -9, 0));
    expect(rand2(-5, -9, 0)).not.toBe(rand2(5, 9, 0));
  });

  it('produces well-distributed values in [0, 1)', () => {
    let sum = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const v = rand3(i % 53, (i * 7) % 31, i, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });
});

describe('chunk coordinates', () => {
  it('maps world to chunk and local, including negatives', () => {
    expect(chunkCoord(0)).toBe(0);
    expect(chunkCoord(15)).toBe(0);
    expect(chunkCoord(16)).toBe(1);
    expect(chunkCoord(-1)).toBe(-1);
    expect(chunkCoord(-16)).toBe(-1);
    expect(chunkCoord(-17)).toBe(-2);

    expect(localCoord(0)).toBe(0);
    expect(localCoord(16)).toBe(0);
    expect(localCoord(-1)).toBe(CHUNK_SIZE - 1);
    expect(localCoord(-16)).toBe(0);
  });

  it('reconstructs world coords from chunk + local', () => {
    for (const w of [-33, -16, -1, 0, 1, 15, 16, 47]) {
      expect(chunkCoord(w) * CHUNK_SIZE + localCoord(w)).toBe(w);
    }
  });

  it('round-trips chunk keys', () => {
    expect(parseChunkKey(chunkKey(-2, 3))).toEqual([-2, 3]);
  });
});

describe('chunk streaming sets', () => {
  it('selects chunks within a circular radius', () => {
    const r1 = chunksInRadius(0, 0, 1);
    expect(r1).toContainEqual({ cx: 0, cz: 0 });
    expect(r1).toContainEqual({ cx: 1, cz: 0 });
    expect(r1).not.toContainEqual({ cx: 1, cz: 1 }); // outside circle of r=1
  });

  it('diffs loaded vs desired into load/unload lists', () => {
    const { toLoad, toUnload } = diffChunkSets(['0,0', '1,0'], ['1,0', '2,0']);
    expect(toLoad).toEqual(['2,0']);
    expect(toUnload).toEqual(['0,0']);
  });
});

describe('deterministic tree placement', () => {
  const seed = 42;
  const spacing = 5;

  it('places one trunk per grid cell, inside the cell', () => {
    const t = trunkInCell(3, -2, seed, spacing);
    expect(trunkInCell(3, -2, seed, spacing)).toEqual(t); // deterministic
    expect(t.x).toBeGreaterThanOrEqual(3 * spacing);
    expect(t.x).toBeLessThan(3 * spacing + spacing);
    expect(t.z).toBeGreaterThanOrEqual(-2 * spacing);
    expect(t.z).toBeLessThan(-2 * spacing + spacing);
  });

  it('gates trees by density * forestiness', () => {
    expect(cellHasTree(1, 1, seed, 0, 1)).toBe(false); // density 0 -> never
    expect(cellHasTree(1, 1, seed, 1, 1)).toBe(true); // rand < 1 -> always
  });

  it('gives trunk heights in 4..6', () => {
    for (let g = 0; g < 50; g++) {
      const h = trunkHeightFor(g, g * 2, seed);
      expect(h).toBeGreaterThanOrEqual(4);
      expect(h).toBeLessThanOrEqual(6);
    }
  });

  it('finds the same trunks regardless of which region (chunk) asks', () => {
    // A trunk near a border must be reported by both adjacent regions, so its
    // canopy renders seamlessly. Compare the trunk computed from two windows.
    const a = candidateTrunks(0, 0, 15, 15, seed, spacing);
    const b = candidateTrunks(16, 0, 31, 15, seed, spacing);
    const overlapGrid = a.find((t) => b.some((u) => u.gx === t.gx && u.gz === t.gz));
    if (overlapGrid) {
      const inB = b.find((u) => u.gx === overlapGrid.gx && u.gz === overlapGrid.gz);
      expect(inB).toEqual(overlapGrid); // identical trunk position from both windows
    }
    // The expansion must reach grid cells whose trunk canopy crosses the border.
    expect(candidateTrunks(0, 0, 15, 15, seed, spacing).length).toBeGreaterThan(0);
  });

  it('leafKept is deterministic per absolute cell', () => {
    const d = CANOPY_RADIUS; // on the fuzzy shell
    expect(leafKept(10, 20, 30, d, seed)).toBe(leafKept(10, 20, 30, d, seed));
    expect(leafKept(0, 0, 0, CANOPY_RADIUS + 1, seed)).toBe(false); // outside radius
  });
});

describe('chunk manager routing', () => {
  // A stand-in for a loaded chunk that records the local coords it's asked about.
  const mockChunk = (originX, originZ) => ({
    originX,
    originZ,
    calls: [],
    isOpaqueAt(x, y, z) {
      this.calls.push(['opaque', x, y, z]);
      return true;
    },
    getBlock({ x, y, z }) {
      return { id: 99, x, y, z };
    },
    isSolid() {
      return true;
    },
    surfaceHeight() {
      return 5;
    },
    refreshCell(c) {
      this.calls.push(['refresh', c]);
    },
    applyEdit(c, id) {
      this.calls.push(['edit', c, id]);
    },
  });

  it('routes world coords to the owning chunk (incl. negatives)', () => {
    const m = new ChunkManager(64, 2);
    const c0 = mockChunk(0, 0);
    const cNeg = mockChunk(-16, 0);
    m.chunks.set('0,0', c0);
    m.chunks.set('-1,0', cNeg);

    expect(m.isOpaqueWorld(3, 5, 7)).toBe(true);
    expect(c0.calls).toContainEqual(['opaque', 3, 5, 7]);

    m.isOpaqueWorld(-1, 2, 0); // world -1 -> chunk -1, local 15
    expect(cNeg.calls).toContainEqual(['opaque', 15, 2, 0]);

    expect(m.isOpaqueWorld(9999, 0, 0)).toBe(false); // unloaded -> not opaque
  });

  it('routes an edit to the owning chunk and refreshes only bordering chunks', () => {
    const m = new ChunkManager(64, 2);
    const c0 = mockChunk(0, 0);
    const cEast = mockChunk(16, 0);
    m.chunks.set('0,0', c0);
    m.chunks.set('1,0', cEast);

    // Edit on the +x border of chunk (0,0).
    m.applyEditWorld(15, 5, 5, 0);
    expect(c0.calls).toContainEqual(['edit', { x: 15, y: 5, z: 5 }, 0]);
    // The +x neighbour (world 16,5,5 -> chunk 1,0 local 0,5,5) gets re-culled.
    expect(cEast.calls).toContainEqual(['refresh', { x: 0, y: 5, z: 5 }]);
    // ...and only that one border neighbour (one refresh call total).
    expect(cEast.calls.filter((c) => c[0] === 'refresh')).toHaveLength(1);
  });
});
