import { describe, it, expect } from 'vitest';
import { RNG } from '../rng.js';

const draw = (rng, n) => Array.from({ length: n }, () => rng.random());

describe('RNG', () => {
  it('produces values in [0, 1)', () => {
    const values = draw(new RNG(1), 1000);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(draw(new RNG(42), 50)).toEqual(draw(new RNG(42), 50));
  });

  it('produces different sequences for different seeds (mask bug regression)', () => {
    // Before the constructor field-order fix, `this.mask` was undefined when
    // m_w/m_z were initialized, so every seed collapsed to the same sequence.
    expect(draw(new RNG(1), 20)).not.toEqual(draw(new RNG(2), 20));
  });
});
