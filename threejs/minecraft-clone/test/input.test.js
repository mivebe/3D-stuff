import { describe, it, expect } from 'vitest';
import {
  KEY_ACTIONS,
  createInputState,
  applyKey,
  desiredMovement,
} from '../src/player/input.js';

describe('input state', () => {
  it('starts with every action false', () => {
    expect(createInputState()).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    });
  });

  it('maps keys to actions on press and release', () => {
    const s = createInputState();
    applyKey(s, 'KeyW', true);
    expect(s.forward).toBe(true);
    applyKey(s, 'KeyW', false);
    expect(s.forward).toBe(false);
  });

  it('treats arrow keys and WASD identically', () => {
    expect(KEY_ACTIONS.ArrowUp).toBe(KEY_ACTIONS.KeyW);
    expect(KEY_ACTIONS.ShiftLeft).toBe('down');
  });

  it('ignores unmapped keys', () => {
    const s = createInputState();
    applyKey(s, 'KeyQ', true);
    expect(s).toEqual(createInputState());
  });
});

describe('desiredMovement', () => {
  const press = (...actions) => {
    const s = createInputState();
    for (const a of actions) s[a] = true;
    return s;
  };
  const near = (got, x, y, z) => {
    expect(got.x).toBeCloseTo(x);
    expect(got.y).toBeCloseTo(y);
    expect(got.z).toBeCloseTo(z);
  };

  it('faces -Z forward and +X right at yaw 0', () => {
    near(desiredMovement(press('forward'), 0), 0, 0, -1);
    near(desiredMovement(press('backward'), 0), 0, 0, 1);
    near(desiredMovement(press('right'), 0), 1, 0, 0);
    near(desiredMovement(press('left'), 0), -1, 0, 0);
  });

  it('normalizes diagonal movement to unit length', () => {
    const d = desiredMovement(press('forward', 'right'), 0);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
    near(d, Math.SQRT1_2, 0, -Math.SQRT1_2);
  });

  it('rotates movement with yaw', () => {
    // Yawed 90deg, "forward" points along -X.
    near(desiredMovement(press('forward'), Math.PI / 2), -1, 0, 0);
  });

  it('returns zero when no movement keys are held', () => {
    near(desiredMovement(createInputState(), 0), 0, 0, 0);
  });

  it('applies vertical fly input only in fly mode', () => {
    expect(desiredMovement(press('up'), 0, true).y).toBe(1);
    expect(desiredMovement(press('down'), 0, true).y).toBe(-1);
    expect(desiredMovement(press('up'), 0, false).y).toBe(0);
  });
});
