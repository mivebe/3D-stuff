// Edit persistence: player block edits are stored as a sparse diff (world-coord
// key -> block id) in localStorage, keyed by world seed. The base terrain is
// always reproducible from the seed, so only the deltas need saving. This format
// is chunk-agnostic - the same diff applies per-chunk once the world is chunked.

const STORAGE_PREFIX = 'mc-edits';
const storageKey = (seed) => `${STORAGE_PREFIX}:${seed}`;

/** `${x},${y},${z}` key for a world cell. */
export const editKey = (x, y, z) => `${x},${y},${z}`;
export const parseEditKey = (key) => key.split(',').map(Number);

// Storage defaults to the browser's localStorage but is injectable for tests.
const defaultStorage = () => (typeof localStorage !== 'undefined' ? localStorage : undefined);

/** Loads the saved edit diff for a seed. Returns {} when absent or unreadable. */
export const loadEdits = (seed, storage = defaultStorage()) => {
  try {
    const raw = storage?.getItem(storageKey(seed));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/** Persists the edit diff for a seed. */
export const saveEdits = (seed, edits, storage = defaultStorage()) => {
  try {
    storage?.setItem(storageKey(seed), JSON.stringify(edits));
  } catch {
    /* quota / unavailable - ignore */
  }
};

/** Removes the saved edit diff for a seed. */
export const clearEdits = (seed, storage = defaultStorage()) => {
  try {
    storage?.removeItem(storageKey(seed));
  } catch {
    /* ignore */
  }
};

// --- player state (spawn position + look direction) ---

const PLAYER_PREFIX = 'mc-player';
const playerKey = (seed) => `${PLAYER_PREFIX}:${seed}`;

/** Loads the saved player state for a seed, or null. */
export const loadPlayerState = (seed, storage = defaultStorage()) => {
  try {
    const raw = storage?.getItem(playerKey(seed));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Persists the player state (`{ x, y, z, q: [x,y,z,w] }`) for a seed. */
export const savePlayerState = (seed, state, storage = defaultStorage()) => {
  try {
    storage?.setItem(playerKey(seed), JSON.stringify(state));
  } catch {
    /* ignore */
  }
};
