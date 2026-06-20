// Deterministic position hashing. Unlike a sequential RNG, these are pure
// functions of their integer inputs, so a chunk can reproduce the same value for
// a world cell regardless of generation order - essential for seamless,
// order-independent chunk generation.

// MurmurHash3-style 32-bit finalizer for good avalanche/distribution.
const mix32 = (h) => {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};

/** Hashes a list of (possibly negative) 32-bit ints to a uint32. */
export const hashInts = (...ints) => {
  let h = 0x811c9dc5;
  for (const v of ints) {
    h = Math.imul(h ^ (v | 0), 0x01000193);
    h = mix32(h);
  }
  return mix32(h);
};

/** Deterministic pseudo-random in [0, 1) for a 2D cell + seed. */
export const rand2 = (x, z, seed = 0) => hashInts(seed, x, z) / 4294967296;

/** Deterministic pseudo-random in [0, 1) for a 3D cell + seed. */
export const rand3 = (x, y, z, seed = 0) => hashInts(seed, x, y, z) / 4294967296;
