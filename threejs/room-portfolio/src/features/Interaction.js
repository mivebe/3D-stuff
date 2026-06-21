import * as THREE from 'three';
import App from '../App.js';

const REACH = 3;

// crosshair raycast -> prompt -> E or click to trigger (plan Q10-A)
export default class Interaction {
  constructor() {
    this.experience = new App();
    this.camera = this.experience.camera.instance;
    this.room = this.experience.world.room;
    this.player = this.experience.player;

    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.prompt = document.querySelector('.prompt');
    this.target = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') this.trigger();
    });
    this.experience.canvas.addEventListener('mousedown', () => {
      if (this.player.locked && this.target) this.trigger();
    });
  }

  trigger() {
    if (!this.target) return;
    const it = this.target.userData.interactive;
    it && it.toggle();
  }

  update() {
    if (!this.player.locked) {
      this.setTarget(null);
      return;
    }
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.room.interactiveMeshes, false);
    const hit = hits.find((h) => h.distance <= REACH);
    this.setTarget(hit ? hit.object : null);
  }

  setTarget(object) {
    this.target = object;
    if (!this.prompt) return;
    if (object) {
      const it = object.userData.interactive;
      const label = typeof it.prompt === 'function' ? it.prompt() : it.prompt;
      this.prompt.textContent = `E   ${label}`;
      this.prompt.classList.remove('hidden');
    } else {
      this.prompt.classList.add('hidden');
    }
  }
}
