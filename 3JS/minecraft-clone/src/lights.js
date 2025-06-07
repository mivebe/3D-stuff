import * as THREE from 'three';

export class Lights extends THREE.Group {
  constructor() {
    super();

    this.init();
  }

  init() {
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(1, 1, 1);
    this.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(1, 1, 1);
    this.add(light2);

    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    ambient.position.set(-1, 1, -0.5);
    this.add(ambient);
  }
}
