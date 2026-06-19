import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import World from '../src/world/world.js';
import { blocks } from '../src/blocks.js';
import { blockFaceTextures } from '../src/world/constants.js';
import { editKey } from '../src/world/persistence.js';

// Headless world with an all-air data model plus a hand-placed stone cube,
// so renderable-state changes are easy to reason about (no terrain noise).
const wipe = (w) => {
  for (let x = 0; x < w.size; x++)
    for (let y = 0; y < w.height; y++)
      for (let z = 0; z < w.size; z++) w.setBlockId({ x, y, z }, blocks.air.id);
};
const cube = (w, lo, hi, id) => {
  for (let x = lo; x <= hi; x++)
    for (let y = lo; y <= hi; y++)
      for (let z = lo; z <= hi; z++) w.setBlockId({ x, y, z }, id);
};
const make = () => {
  const w = new World(8, 8, undefined, false);
  wipe(w);
  cube(w, 2, 4, blocks.stone.id); // solid 3x3x3 at 2..4
  return w;
};

describe('renderability', () => {
  it('hides fully-enclosed blocks and shows exposed ones', () => {
    const w = make();
    expect(w.isRenderable({ x: 3, y: 3, z: 3 })).toBe(false); // interior
    expect(w.isRenderable({ x: 3, y: 4, z: 3 })).toBe(true); // top face exposed
    expect(w.isRenderable({ x: 3, y: 5, z: 3 })).toBe(false); // air
  });
});

describe('setBlock edit diff', () => {
  it('breaking a surface block exposes the block beneath', () => {
    const w = make();
    const { added, removed } = w.setBlock({ x: 3, y: 4, z: 3 }, blocks.air.id);
    expect(w.getBlock({ x: 3, y: 4, z: 3 }).id).toBe(blocks.air.id);
    expect(removed).toContainEqual({ x: 3, y: 4, z: 3 });
    expect(added).toContainEqual({ x: 3, y: 3, z: 3 }); // newly exposed
  });

  it('placing a block can obscure the neighbor it covers', () => {
    const w = make();
    // (3,4,3) is currently exposed only on top; capping it fully encloses it.
    const { added, removed } = w.setBlock({ x: 3, y: 5, z: 3 }, blocks.stone.id);
    expect(added).toContainEqual({ x: 3, y: 5, z: 3 });
    expect(removed).toContainEqual({ x: 3, y: 4, z: 3 });
  });

  it('placing into open air adds only that block', () => {
    const w = make();
    const { added, removed } = w.setBlock({ x: 0, y: 5, z: 0 }, blocks.stone.id);
    expect(added).toContainEqual({ x: 0, y: 5, z: 0 });
    expect(removed).toEqual([]);
  });

  it('breaking an isolated block removes only that block', () => {
    const w = make();
    w.setBlockId({ x: 0, y: 5, z: 0 }, blocks.stone.id);
    const { added, removed } = w.setBlock({ x: 0, y: 5, z: 0 }, blocks.air.id);
    expect(removed).toContainEqual({ x: 0, y: 5, z: 0 });
    expect(added).toEqual([]);
  });
});

describe('stored edits (persistence)', () => {
  it('re-applies the saved edit diff after regeneration', () => {
    const w = new World(8, 16, undefined, false);
    // Simulate a saved diff: place diamond, and break whatever is at (1,1,1).
    w.edits = {
      [editKey(2, 5, 3)]: blocks.diamond.id,
      [editKey(1, 1, 1)]: blocks.air.id,
    };
    w.applyStoredEdits();
    expect(w.getBlock({ x: 2, y: 5, z: 3 }).id).toBe(blocks.diamond.id);
    expect(w.getBlock({ x: 1, y: 1, z: 1 }).id).toBe(blocks.air.id);
  });

  it('records edits into the diff on applyEdit', () => {
    const w = new World(8, 16, undefined, false);
    w.recordEdit({ x: 4, y: 6, z: 2 }, blocks.stone.id);
    expect(w.edits[editKey(4, 6, 2)]).toBe(blocks.stone.id);
  });

  it('clearSavedEdits empties the diff', () => {
    const w = new World(8, 16, undefined, false);
    w.recordEdit({ x: 0, y: 0, z: 0 }, blocks.stone.id);
    w.clearSavedEdits();
    expect(w.edits).toEqual({});
  });
});

describe('instanced mesh bookkeeping (swap-last)', () => {
  // A real InstancedMesh works headless (matrix ops are CPU-side, no WebGL).
  const setupMesh = (w) => {
    const maxCount = w.size * w.size * w.height;
    w.texturedBlockIds = Object.keys(blockFaceTextures);
    w.blockTypeAttr = new Float32Array(maxCount);
    w.instanceToBlock = new Array(maxCount).fill(null);
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      maxCount
    );
    mesh.count = 0;
    w.blockTypeAttribute = new THREE.InstancedBufferAttribute(w.blockTypeAttr, 1);
    mesh.geometry.setAttribute('blockType', w.blockTypeAttribute);
    w.instancedMesh = mesh;
    for (let x = 0; x < w.size; x++)
      for (let y = 0; y < w.height; y++)
        for (let z = 0; z < w.size; z++)
          if (w.isRenderable({ x, y, z })) w._addInstance({ x, y, z });
  };

  // Invariant: instanceToBlock and data.instanceId are consistent bijections,
  // count equals the number of renderable blocks, and every slot is valid.
  const expectConsistent = (w) => {
    const mesh = w.instancedMesh;
    let renderable = 0;
    for (let x = 0; x < w.size; x++)
      for (let y = 0; y < w.height; y++)
        for (let z = 0; z < w.size; z++) {
          if (w.isRenderable({ x, y, z })) {
            renderable++;
            const id = w.getBlock({ x, y, z }).instanceId;
            expect(id).toBeGreaterThanOrEqual(0);
            expect(id).toBeLessThan(mesh.count);
          }
        }
    expect(mesh.count).toBe(renderable);
    for (let i = 0; i < mesh.count; i++) {
      const c = w.instanceToBlock[i];
      expect(c).toBeTruthy();
      expect(w.isRenderable(c)).toBe(true);
      expect(w.getBlock(c).instanceId).toBe(i);
    }
  };

  it('stays consistent across a sequence of breaks and places', () => {
    const w = make();
    setupMesh(w);
    expectConsistent(w);

    w.applyEdit({ x: 3, y: 4, z: 3 }, blocks.air.id); // break top -> exposes (3,3,3)
    expectConsistent(w);

    w.applyEdit({ x: 5, y: 3, z: 3 }, blocks.oak_log.id); // place onto a side face
    expectConsistent(w);

    w.applyEdit({ x: 2, y: 2, z: 2 }, blocks.air.id); // break a corner
    expectConsistent(w);

    w.applyEdit({ x: 3, y: 5, z: 3 }, blocks.stone.id); // place above the hole
    expectConsistent(w);
  });
});
