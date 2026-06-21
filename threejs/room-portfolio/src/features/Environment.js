import * as THREE from 'three';
import App from '../App.js';

// naive realtime lighting (plan Q4-A): ambient + a sun, dynamic toggles layer on top
export default class Environment {
  constructor() {
    this.experience = new App();
    this.scene = this.experience.scene;
    this.setLights();
  }

  setLights() {
    this.ambient = new THREE.AmbientLight('#ffffff', 1.6);
    this.scene.add(this.ambient);

    // warm ceiling / cool floor fill so the dark wood reads without flattening
    this.hemi = new THREE.HemisphereLight('#fff1de', '#3a2c22', 1.0);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#ffe9d2', 2.0);
    this.sun.position.set(3, 6, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 30;
    this.sun.shadow.camera.left = -8;
    this.sun.shadow.camera.right = 8;
    this.sun.shadow.camera.top = 8;
    this.sun.shadow.camera.bottom = -8;
    this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun);
  }

  resize() {}
  update() {}
}
