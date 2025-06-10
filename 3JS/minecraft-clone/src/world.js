import * as THREE from 'three';
import { DEF_WORLD_SIZE, DEF_HEIGHT } from './config';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { clamp } from 'three/src/math/MathUtils.js';
import { RNG } from '../rng';
import { blocks, blocksList } from './blocks';

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
      seed: 0,
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
    const rng = new RNG(this.params.seed);

    this.initializeTerrainData();
    this.generateResources(rng);
    // this.generateTerrain(rng);
    this.generateMeshes();
  }

  initializeTerrainData() {
    for (let x = 0; x < this.size; x++) {
      const slice = [];
      for (let y = 0; y < this.height; y++) {
        const row = [];
        for (let z = 0; z < this.size; z++) {
          row.push({ id: blocks.empty.id, instanceId: null });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  generateResources(rng) {
    const simplex = new SimplexNoise(rng);
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          const { id, resource } = blocks.stone;
          const {
            clusterSize: { cx, cy, cz },
            abundance,
          } = resource;
          const noiseValue = simplex.noise3d(x / cx, y / cy, z / cz);

          if (noiseValue > 1 - abundance) {
            this.setBlockId({ x, y, z }, id);
          }
        }
      }
    }
  }

  generateTerrain(rng) {
    const { scale, magnitude, offset } = this.params.terrain;
    const simplex = new SimplexNoise(rng);

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const value = simplex.noise(x / scale, z / scale);

        const scaledNoise = offset + magnitude * value;
        const height = Math.floor(this.height * scaledNoise);
        const clampedHeight = clamp(height, 1, this.height - 1);

        for (let y = 0; y < this.height; y++) {
          if (y < clampedHeight) {
            this.setBlockId({ x, y, z }, blocks.dirt.id);
          } else if (y === clampedHeight) {
            this.setBlockId({ x, y, z }, blocks.grass.id);
          } else {
            this.setBlockId({ x, y, z }, blocks.empty.id);
          }
        }
      }
    }
  }

  generateMeshes() {
    const maxCount = this.size * this.size * this.height;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial();
    const matrix = new THREE.Matrix4();
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    instancedMesh.count = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          const blockId = this.getBlock({ x, y, z }).id || 0;
          const instanceId = instancedMesh.count;

          if (blockId && !this.isBlockObscured({ x, y, z })) {
            matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
            instancedMesh.setMatrixAt(instanceId, matrix);
            instancedMesh.setColorAt(instanceId, new THREE.Color(blocksList[blockId].color));
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

  isBlockObscured({ x, y, z }) {
    const directions = [
      { x: -1, y: 0, z: 0 }, // left
      { x: 1, y: 0, z: 0 }, // right
      { x: 0, y: 0, z: -1 }, // backward
      { x: 0, y: 0, z: 1 }, // forward
      { x: 0, y: 1, z: 0 }, // up
      { x: 0, y: -1, z: 0 }, // down
    ];

    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      if (!this.inBounds({ x: nx, y: ny, z: nz })) return false;
      const neighbor = this.getBlock({ x: nx, y: ny, z: nz });
      if (!neighbor || neighbor.id === blocks.empty.id) return false;
    }
    return true;
  }
}
