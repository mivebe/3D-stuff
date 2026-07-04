import * as THREE from "three";
import App from "./App.js";

// first-person camera; the Player controller drives position and orientation
export default class Camera {
  constructor() {
    this.experience = new App();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;

    this.instance = new THREE.PerspectiveCamera(
      60,
      this.sizes.aspect,
      0.1,
      100,
    );
    this.instance.position.set(0, 1.6, 1.5);
    this.scene.add(this.instance);
  }

  resize() {
    this.instance.aspect = this.sizes.aspect;
    this.instance.updateProjectionMatrix();
  }

  update() {}
}
