// Pure, framework-free input handling so movement logic can be unit-tested
// without a browser, a camera, or Three.js.

/** Maps `KeyboardEvent.code` values to abstract movement actions. */
export const KEY_ACTIONS = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'up',
  ShiftLeft: 'down',
  ShiftRight: 'down',
};

/** A fresh, all-false movement state. */
export const createInputState = () => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
});

/**
 * Records a key press/release into `state`. Unknown keys are ignored.
 * Mutates and returns `state`.
 * @param {ReturnType<typeof createInputState>} state
 * @param {string} code - KeyboardEvent.code
 * @param {boolean} pressed
 */
export const applyKey = (state, code, pressed) => {
  const action = KEY_ACTIONS[code];
  if (action) state[action] = pressed;
  return state;
};

/**
 * Converts movement intent into a world-space direction vector for a given
 * camera yaw (rotation about Y, in radians). Horizontal component is normalized
 * so diagonal movement isn't faster. Vertical (fly) component is independent.
 *
 * Convention: yaw 0 looks down -Z, so "forward" is -Z and "right" is +X.
 * @returns {{x: number, y: number, z: number}}
 */
export const desiredMovement = (input, yaw, fly = true) => {
  const f = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const s = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  let x = f * -Math.sin(yaw) + s * Math.cos(yaw);
  let z = f * -Math.cos(yaw) + s * -Math.sin(yaw);

  const len = Math.hypot(x, z);
  if (len > 0) {
    x /= len;
    z /= len;
  }

  const y = fly ? (input.up ? 1 : 0) - (input.down ? 1 : 0) : 0;

  return { x, y, z };
};
