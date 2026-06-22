import * as THREE from 'three';
import App from '../App.js';

const WALK = 2.6;
const SPRINT = 4.2;
const RADIUS = 0.22;
const LOOK = 0.0022;
const EYE_HEIGHT = 1.6;

// first-person pointer-lock controller with capsule-vs-box collision
export default class Player {
  constructor() {
    this.experience = new App();
    this.camera = this.experience.camera.instance;
    this.canvas = this.experience.canvas;
    this.time = this.experience.time;
    this.room = this.experience.world.room;

    this.yaw = this.room.spawnYaw !== undefined ? this.room.spawnYaw : Math.PI / 2; // face the tv wall
    this.pitch = 0;
    this.keys = {};
    this.locked = false;

    this.position = this.room.spawn
      ? this.room.spawn.clone()
      : new THREE.Vector3(0, this.room.floorY + EYE_HEIGHT, 1.4);

    this.bindEvents();
    this.applyRotation();
    this.camera.position.copy(this.position);
  }

  bindEvents() {
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      const hint = document.querySelector('.hint');
      hint && hint.classList.toggle('hidden', !this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * LOOK;
      this.pitch -= e.movementY * LOOK;
      const lim = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    });
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  lock() {
    this.canvas.requestPointerLock();
  }

  update() {
    const dt = Math.min(this.time.delta, 50) / 1000;
    this.applyRotation();

    if (this.locked) {
      let f = 0;
      let r = 0;
      if (this.keys['KeyW']) f += 1;
      if (this.keys['KeyS']) f -= 1;
      if (this.keys['KeyD']) r += 1;
      if (this.keys['KeyA']) r -= 1;

      if (f || r) {
        const q = this.camera.quaternion;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
        right.y = 0;
        right.normalize();

        const speed = (this.keys['ShiftLeft'] ? SPRINT : WALK) * dt;
        const move = forward.multiplyScalar(f).add(right.multiplyScalar(r));
        if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

        this.position.x += move.x;
        this.position.z += move.z;
        this.collide();
      }
    }

    this.position.y = this.room.floorY + EYE_HEIGHT;
    this.camera.position.copy(this.position);
  }

  applyRotation() {
    this.camera.quaternion.setFromEuler(
      new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
    );
  }

  collide() {
    const r = RADIUS;
    if (this.room.clampToFloor) {
      const fb = this.room.floorBounds;
      this.position.x = Math.max(fb.min.x + r, Math.min(fb.max.x - r, this.position.x));
      this.position.z = Math.max(fb.min.z + r, Math.min(fb.max.z - r, this.position.z));
    }

    for (const box of this.room.colliders) {
      const minX = box.min.x - r;
      const maxX = box.max.x + r;
      const minZ = box.min.z - r;
      const maxZ = box.max.z + r;
      if (
        this.position.x > minX && this.position.x < maxX &&
        this.position.z > minZ && this.position.z < maxZ
      ) {
        // push out along the shallowest penetration axis
        const dLeft = this.position.x - minX;
        const dRight = maxX - this.position.x;
        const dNear = this.position.z - minZ;
        const dFar = maxZ - this.position.z;
        const m = Math.min(dLeft, dRight, dNear, dFar);
        if (m === dLeft) this.position.x = minX;
        else if (m === dRight) this.position.x = maxX;
        else if (m === dNear) this.position.z = minZ;
        else this.position.z = maxZ;
      }
    }
  }
}
