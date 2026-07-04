import * as THREE from "three";

// tuning constants for the 3D phone, kept in one place so the look is easy to
// dial in against screenshots. the model lies flat in its own space: thin axis
// is +Y, so the screen is the +Y face (center ~x 0.94, z 0, ~3.72 x 2.0).

export const HALF_PI = Math.PI / 2;

// screen face in the phone's local space
export const SCREEN = {
  center: [0.942, 0.205, 0], // just above the +Y top face
  // orient the html: +Z (facing) -> phone +Y (out to camera), +Y (up) -> phone
  // +X (the portrait length), so the screen UI stands upright on the glass
  rotation: [-HALF_PI, 0, -HALF_PI],
  // model length runs along local X (becomes vertical once the phone stands up)
  aspect: 2.0 / 3.716, // width / height -> portrait panel
};

// orientation derived from the screen-normal mapping, not guessed euler angles.
// local axes: screen normal = +Y, phone length = +X, phone width = +Z.
// settled hero wants: +Y -> camera (+Z world), +X -> up (+Y), +Z -> right (+X).
const settleMatrix = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 1, 0), // local X -> world Y (portrait, standing up)
  new THREE.Vector3(0, 0, 1), // local Y -> world Z (screen faces camera)
  new THREE.Vector3(1, 0, 0), // local Z -> world X (width horizontal)
);
export const SETTLE_QUAT = new THREE.Quaternion().setFromRotationMatrix(
  settleMatrix,
);

// start from a livelier 3/4 tilt, then square up to settle
const tilt = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-0.18, 0.8, 0.05),
);
export const START_QUAT = tilt.clone().multiply(SETTLE_QUAT);

export const POSE = {
  // desktop hero: phone parked on the right so copy can fill the left
  settlePosition: [1.45, 0, 0],
  startPosition: [0, 0, 0],
  startScale: 1.12,
  settleScale: 0.92,
};

// mobile hero: the canvas fills the opening screen (see .stage in ui.css); the
// phone is large and nudged down so the AURUM title clears it at the top, and
// the copy flows in below the fold.
export const POSE_MOBILE = {
  settlePosition: [0, -0.28, 0],
  settleScale: 0.94,
};

// constrained orbit so the phone tilts to show depth but stays readable.
// target is world origin, the point the camera already looks at, so turning
// orbit on never yanks the parked phone to center.
export const ORBIT = {
  target: [0, 0, 0],
  minAzimuth: -0.45,
  maxAzimuth: 0.45,
  minPolar: HALF_PI - 0.4,
  maxPolar: HALF_PI + 0.4,
  rotateSpeed: 0.35,
};

export const tempColor = new THREE.Color();
