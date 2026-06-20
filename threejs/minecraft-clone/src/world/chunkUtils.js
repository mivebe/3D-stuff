// Chunk addressing + streaming-set selection. Pure helpers, no Three.js.

export const CHUNK_SIZE = 16;

/** World coordinate -> chunk index (floor division, correct for negatives). */
export const chunkCoord = (world) => Math.floor(world / CHUNK_SIZE);

/** World coordinate -> local index within its chunk, always in [0, CHUNK_SIZE). */
export const localCoord = (world) => ((world % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

export const chunkKey = (cx, cz) => `${cx},${cz}`;
export const parseChunkKey = (key) => key.split(',').map(Number);

/** Chunk coords within a (circular) radius of a center chunk. */
export const chunksInRadius = (cx, cz, radius) => {
  const out = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (dx * dx + dz * dz <= radius * radius) out.push({ cx: cx + dx, cz: cz + dz });
    }
  }
  return out;
};

/**
 * Given the currently-loaded chunk keys and the set that should be loaded,
 * returns which to load and which to unload.
 * @param {Iterable<string>} loaded
 * @param {Iterable<string>} desired
 */
export const diffChunkSets = (loaded, desired) => {
  const loadedSet = new Set(loaded);
  const desiredSet = new Set(desired);
  const toLoad = [...desiredSet].filter((k) => !loadedSet.has(k));
  const toUnload = [...loadedSet].filter((k) => !desiredSet.has(k));
  return { toLoad, toUnload };
};
