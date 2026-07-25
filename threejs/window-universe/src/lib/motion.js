/** frame rate independent approach to a target: the same feel at 60 and 144hz */
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function easeOutBack(t) {
  const c = 1.7;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}
