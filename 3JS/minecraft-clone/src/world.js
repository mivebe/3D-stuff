import * as THREE from 'three';
import { DEF_WORLD_SIZE, DEF_HEIGHT } from './config';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { clamp } from 'three/src/math/MathUtils.js';

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
    this.data = []; // 3D array to hold block data
    this.params = {
      terrain: {
        scale: 30,
        magnitude: 0.5,
        offset: 0.2,
      },
    };

    this.init();
    container && container.add(this);
  }

  init() {
    this.initializeTerrainData();
    this.applyNoise();
    this.generateMeshes();
  }

  initializeTerrainData() {
    for (let x = 0; x < this.size; x++) {
      const slice = [];
      for (let y = 0; y < this.height; y++) {
        const row = [];
        for (let z = 0; z < this.size; z++) {
          row.push({ id: 0, instanceId: null });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  applyNoise() {
    const { scale, magnitude, offset } = this.params.terrain;
    const simplex = new SimplexNoise();

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const value = simplex.noise(x / scale, z / scale);

        const scaledNoise = offset + magnitude * value;
        const height = Math.floor(this.height * scaledNoise);
        const clampedHeight = clamp(height, 1, this.height - 1);

        for (let y = 0; y < clampedHeight; y++) {
          this.setBlockId({ x, y, z }, 1); // Set block id to 1 for solid blocks
        }
      }
    }
  }

  generateMeshes() {
    const maxCount = this.size * this.size * this.height;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const matrix = new THREE.Matrix4();
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    instancedMesh.count = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          const blockId = this.getBlock({ x, y, z }).id || 0;
          const instanceId = instancedMesh.count;

          if (blockId) {
            matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
            instancedMesh.setMatrixAt(instanceId, matrix);
            instancedMesh.count++;
            this.setBlockInstanceId({ x, y, z }, instanceId);
          }
        }
      }
    }

    this.add(instancedMesh);
  }

  regenerate() {
    this.clear();
    this.data = [];

    this.init();
  }

  /**
   * Sets the block id for the block at (x, y, z)
   * @param {THREE.Vector3} coords
   */
  getBlock({ x, y, z }) {
    if (this.inBounds({ x, y, z })) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  /**
   * Sets the block id for the block at (x, y, z)
   * @param {THREE.Vector3} coords
   * @param {number} id
   */
  setBlockId({ x, y, z }, id) {
    if (this.inBounds({ x, y, z })) {
      this.data[x][y][z].id = id;
    }
  }

  /**
   * Sets the block instance id for the block at (x, y, z)
   * @param {THREE.Vector3} coords
   * @param {number} instanceId
   */
  setBlockInstanceId({ x, y, z }, instanceId) {
    if (this.inBounds({ x, y, z })) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  /**
   * Checks if the given coordinates are within the bounds of the world.
   * @param {THREE.Vector3} coords
   * @returns {boolean}
   */
  inBounds({ x, y, z }) {
    const inWidth = x >= 0 && x < this.size;
    const inHeight = y >= 0 && y < this.height;
    const inDepth = z >= 0 && z < this.size;

    if (inWidth && inHeight && inDepth) {
      return true;
    } else {
      return false;
    }
  }
}
