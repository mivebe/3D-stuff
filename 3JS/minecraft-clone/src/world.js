import * as THREE from 'three';
import { DEF_BPS } from './config';

export class World extends THREE.Group {
  constructor(blocksPerSide = DEF_BPS) {
    super();

    this.bps = blocksPerSide; // Blocks per side
    this.size = blocksPerSide * 2; // Size of the world in blocks

    this.init();
  }

  init() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, 0, z);
        this.add(cube);
      }
    }
  }
}
