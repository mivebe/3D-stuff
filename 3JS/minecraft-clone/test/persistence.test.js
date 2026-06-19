import { describe, it, expect } from 'vitest';
import {
  loadEdits,
  saveEdits,
  clearEdits,
  editKey,
  parseEditKey,
  loadPlayerState,
  savePlayerState,
} from '../src/world/persistence.js';

const mockStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
};

describe('edit keys', () => {
  it('round-trips world coordinates', () => {
    expect(editKey(1, 2, 3)).toBe('1,2,3');
    expect(parseEditKey('1,2,3')).toEqual([1, 2, 3]);
  });
});

describe('edit persistence', () => {
  it('returns {} when nothing is stored', () => {
    expect(loadEdits(0, mockStorage())).toEqual({});
  });

  it('saves and loads an edit diff per seed', () => {
    const s = mockStorage();
    const edits = { '1,2,3': 5, '4,5,6': 0 };
    saveEdits(7, edits, s);
    expect(loadEdits(7, s)).toEqual(edits);
    expect(loadEdits(8, s)).toEqual({}); // different seed, separate diff
  });

  it('clears a stored diff', () => {
    const s = mockStorage();
    saveEdits(0, { '0,0,0': 3 }, s);
    clearEdits(0, s);
    expect(loadEdits(0, s)).toEqual({});
  });

  it('tolerates corrupt storage', () => {
    const s = mockStorage();
    s.setItem('mc-edits:0', '{not json');
    expect(loadEdits(0, s)).toEqual({});
  });
});

describe('player state persistence', () => {
  it('round-trips position + orientation, separate from edits', () => {
    const s = mockStorage();
    expect(loadPlayerState(0, s)).toBeNull();
    const state = { x: 1.5, y: 40, z: -3.5, q: [0, 0.7, 0, 0.7] };
    savePlayerState(0, state, s);
    expect(loadPlayerState(0, s)).toEqual(state);
    expect(loadEdits(0, s)).toEqual({}); // distinct storage key from edits
  });
});
