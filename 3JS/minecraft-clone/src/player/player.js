import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createInputState, applyKey, desiredMovement } from './input.js';
import { EYE_HEIGHT, applyJump, stepPhysics } from './physics.js';

/**
 * First-person player. Owns the camera and pointer-lock look/move controls, and
 * a 1x2x1 collision box (issue 06) resolved against the world each frame.
 *
 * Position tracks the player's FEET (footprint centered on x/z); the camera sits
 * at feet + EYE_HEIGHT. Walk mode applies gravity + AABB collision; fly mode is
 * noclip. Toggle fly with `F` or the dev GUI.
 */
export default class Player {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement - element that receives the pointer lock
   * @param {(x:number, y:number, z:number) => boolean} isSolid - world collider
   */
  constructor(camera, domElement, isSolid = () => false) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.input = createInputState();
    this.isSolid = isSolid;

    this.position = { x: 0, y: 0, z: 0 }; // feet
    this.velocity = { x: 0, y: 0, z: 0 };
    this.onGround = false;
    this.speed = 8; // blocks per second (horizontal / fly)
    this.fly = false;

    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._onKeyDown = (e) => {
      if (e.code === 'KeyF' && !e.repeat) this.toggleFly();
      applyKey(this.input, e.code, true);
    };
    this._onKeyUp = (e) => applyKey(this.input, e.code, false);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  get isLocked() {
    return this.controls.isLocked;
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }

  toggleFly() {
    this.fly = !this.fly;
    this.velocity.y = 0; // drop any accumulated gravity / jump velocity
  }

  /** Sets the feet position and syncs the camera to eye level. */
  setPosition(x, y, z) {
    this.position = { x, y, z };
    this._syncCamera();
  }

  _syncCamera() {
    this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
  }

  /** Current camera yaw (rotation about Y) in radians. */
  yaw() {
    this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    return this._euler.y;
  }

  /**
   * Advances the player by `dt` seconds. No-op while the pointer isn't locked.
   * @param {number} dt - delta time in seconds
   */
  update(dt) {
    if (!this.isLocked) return;

    const dir = desiredMovement(this.input, this.yaw(), this.fly);
    this.velocity.x = dir.x * this.speed;
    this.velocity.z = dir.z * this.speed;

    if (this.fly) {
      this.velocity.y = dir.y * this.speed;
    } else {
      applyJump(this.velocity, this.onGround, this.input.up);
    }

    const next = stepPhysics(this, dt, this.isSolid, { fly: this.fly });
    this.position = next.position;
    this.velocity = next.velocity;
    this.onGround = next.onGround;
    this._syncCamera();
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.controls.dispose?.();
  }
}
