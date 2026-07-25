// localStorage throws in some privacy modes and when a quota is hit, and a demo
// that crashes on a storage exception is a worse demo. fall back to memory.
const memory = new Map();

let backing = null;
try {
  const probe = "wu:probe";
  window.localStorage.setItem(probe, "1");
  window.localStorage.removeItem(probe);
  backing = window.localStorage;
} catch {
  backing = null;
}

export const isPersistent = backing !== null;

export function read(key) {
  try {
    return backing ? backing.getItem(key) : (memory.get(key) ?? null);
  } catch {
    return null;
  }
}

export function write(key, value) {
  try {
    if (backing) backing.setItem(key, value);
    else memory.set(key, value);
  } catch {
    memory.set(key, value);
  }
}

export function remove(key) {
  try {
    if (backing) backing.removeItem(key);
  } catch {
    /* nothing to undo */
  }
  memory.delete(key);
}

export function keysWithPrefix(prefix) {
  const found = [];
  try {
    if (backing) {
      for (let i = 0; i < backing.length; i++) {
        const key = backing.key(i);
        if (key && key.startsWith(prefix)) found.push(key);
      }
      return found;
    }
  } catch {
    /* fall through to memory */
  }
  for (const key of memory.keys()) if (key.startsWith(prefix)) found.push(key);
  return found;
}
