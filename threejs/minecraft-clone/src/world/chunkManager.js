import * as THREE from 'three';
import World from './world';
import { DEF_HEIGHT } from '../config';
import { sixDirections } from './constants';
import { loadEdits, clearEdits } from './persistence';
import {
  CHUNK_SIZE,
  chunkCoord,
  localCoord,
  chunkKey,
  parseChunkKey,
  chunksInRadius,
  diffChunkSets,
} from './chunkUtils';

/**
 * Streams CHUNK_SIZE-wide `World` chunks around the player. Each chunk generates
 * from shared params/seed by world coords (so terrain + trees are seamless), and
 * queries this manager for neighbour blocks at its borders to cull shared faces.
 */
export default class ChunkManager extends THREE.Group {
  constructor(height = DEF_HEIGHT, radius = 3) {
    super();
    this.height = height;
    this.radius = radius;
    this.chunks = new Map(); // chunkKey -> World

    this.params = {
      seed: 0,
      terrain: { scale: 180, magnitude: 0.2, offset: 0.4 },
      trees: { density: 0.06, spacing: 5 },
      water: { enabled: true, seaLevel: Math.floor(height * 0.4) }, // 25 at height 64
      debug: { testStructures: false }, // no per-chunk debug rig
    };
    this.edits = loadEdits(this.params.seed); // shared world-coord edit diff
  }

  chunk(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz)) ?? null;
  }

  /** Loads (generates + meshes) a chunk and re-culls its neighbours' borders. */
  loadChunk(cx, cz) {
    const chunk = new World(CHUNK_SIZE, this.height, undefined, true, {
      originX: cx * CHUNK_SIZE,
      originZ: cz * CHUNK_SIZE,
      manager: this,
      params: this.params,
      edits: this.edits,
    });
    if (chunk.instancedMesh) chunk.instancedMesh.userData.chunk = chunk;
    this.chunks.set(chunkKey(cx, cz), chunk);
    this.add(chunk);
    this._refreshNeighbourBorders(cx, cz);
    // Existing neighbours rebuild their water so the shared border faces re-cull.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      this.chunk(cx + dx, cz + dz)?.rebuildWaterMesh();
    }
    return chunk;
  }

  unloadChunk(key) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    this.remove(chunk);
    chunk.dispose();
    this.chunks.delete(key);
  }

  ensureChunk(cx, cz) {
    return this.chunk(cx, cz) ?? this.loadChunk(cx, cz);
  }

  /** Streams chunks within `radius` of the player; unloads the rest. */
  update(playerX, playerZ) {
    const pcx = chunkCoord(playerX);
    const pcz = chunkCoord(playerZ);
    const desired = chunksInRadius(pcx, pcz, this.radius).map((c) => chunkKey(c.cx, c.cz));
    const { toLoad, toUnload } = diffChunkSets(this.chunks.keys(), desired);

    for (const key of toUnload) this.unloadChunk(key);

    // Nearest-first so the area around the player fills in first.
    toLoad.sort((a, b) => this._chunkDist(a, pcx, pcz) - this._chunkDist(b, pcx, pcz));
    for (const key of toLoad) {
      const [cx, cz] = parseChunkKey(key);
      this.loadChunk(cx, cz);
    }
  }

  _chunkDist(key, pcx, pcz) {
    const [cx, cz] = parseChunkKey(key);
    return (cx - pcx) ** 2 + (cz - pcz) ** 2;
  }

  // ---- world-coordinate queries used by chunks (border culling) & the player ----

  isOpaqueWorld(wx, y, wz) {
    const chunk = this.chunk(chunkCoord(wx), chunkCoord(wz));
    return chunk ? chunk.isOpaqueAt(localCoord(wx), y, localCoord(wz)) : false;
  }

  getBlockWorld(wx, y, wz) {
    const chunk = this.chunk(chunkCoord(wx), chunkCoord(wz));
    return chunk ? chunk.getBlock({ x: localCoord(wx), y, z: localCoord(wz) }) : null;
  }

  isSolidWorld(wx, y, wz) {
    const chunk = this.chunk(chunkCoord(wx), chunkCoord(wz));
    return chunk ? chunk.isSolid({ x: localCoord(wx), y, z: localCoord(wz) }) : false;
  }

  /** Surface (feet) height at a world column, loading the chunk if needed. */
  surfaceHeightWorld(wx, wz) {
    const chunk = this.ensureChunk(chunkCoord(wx), chunkCoord(wz));
    return chunk.surfaceHeight(localCoord(wx), localCoord(wz));
  }

  // ---- editing ----

  /** Routes a block edit to the owning chunk and re-culls bordering chunks. */
  applyEditWorld(wx, wy, wz, id) {
    const chunk = this.chunk(chunkCoord(wx), chunkCoord(wz));
    if (!chunk) return;
    chunk.applyEdit({ x: localCoord(wx), y: wy, z: localCoord(wz) }, id);
    for (const d of sixDirections) {
      const nx = wx + d.x;
      const ny = wy + d.y;
      const nz = wz + d.z;
      if (chunkCoord(nx) === chunkCoord(wx) && chunkCoord(nz) === chunkCoord(wz)) continue;
      const nb = this.chunk(chunkCoord(nx), chunkCoord(nz));
      if (nb) nb.refreshCell({ x: localCoord(nx), y: ny, z: localCoord(nz) });
    }
  }

  clearSavedEdits() {
    this.edits = {};
    clearEdits(this.params.seed);
  }

  /** Drops all chunks; `update()` rebuilds them (e.g. after a param change). */
  regenerate() {
    for (const key of [...this.chunks.keys()]) this.unloadChunk(key);
  }

  // After a chunk loads, neighbours that had treated it as empty must re-cull the
  // faces along their shared border.
  _refreshNeighbourBorders(cx, cz) {
    const all = Array.from({ length: CHUNK_SIZE }, (_, i) => i);
    const refreshPlane = (nb, xs, zs) => {
      for (const x of xs) {
        for (let y = 0; y < this.height; y++) {
          for (const z of zs) nb.refreshCell({ x, y, z });
        }
      }
    };
    const east = this.chunk(cx + 1, cz);
    if (east) refreshPlane(east, [0], all);
    const west = this.chunk(cx - 1, cz);
    if (west) refreshPlane(west, [CHUNK_SIZE - 1], all);
    const north = this.chunk(cx, cz + 1);
    if (north) refreshPlane(north, all, [0]);
    const south = this.chunk(cx, cz - 1);
    if (south) refreshPlane(south, all, [CHUNK_SIZE - 1]);
  }
}
