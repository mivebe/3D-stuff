import * as THREE from 'three';
import { DEF_WORLD_SIZE, DEF_HEIGHT } from './config';

export default class World extends THREE.Group {
  /** 
    Represents a 3D world made up of blocks.
    @param {number} [size=DEF_WORLD_SIZE] - The number of blocks per side of the world.
    @param {number} [height=DEF_HEIGHT] - The height of the world in blocks.
    @param {THREE.Object3D} [container] - Optional container to add the world to.
   * */
  constructor(size = DEF_WORLD_SIZE, height = DEF_HEIGHT, container) {
    super();

    this.size = size; // Blocks per side
    this.height = height; // Height of the world in blocks

    this.init();
    container && container.add(this);
  }

  init() {
    const maxCount = this.size * this.size * this.height;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const matrix = new THREE.Matrix4();
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    instancedMesh.count = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
          instancedMesh.setMatrixAt(instancedMesh.count++, matrix);
        }
      }
    }

    this.add(instancedMesh);
  }
}
