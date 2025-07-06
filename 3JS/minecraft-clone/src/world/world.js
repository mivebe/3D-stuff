import * as THREE from 'three';
import { DEF_WORLD_SIZE, DEF_HEIGHT, DEF_RESOURCE_PROBABILITY } from '../config';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { clamp } from 'three/src/math/MathUtils.js';
import { RNG } from '../../rng';
import { blocks, blocksById, resourcesList } from '../blocks';
import {
  getClusterDirections,
  getNextResourceDirection,
  getRandomResource,
  getVeinDirections,
} from './utils';
import { sixDirections } from './constants';

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
    this.resourceFlags = [];
    this.params = {
      seed: 0,
      terrain: {
        scale: 180,
        magnitude: 0.2,
        offset: 0.4,
      },
    };

    this.init();
    container && container.add(this);
  }

  init() {
    const rng = new RNG(this.params.seed);

    this.initializeTerrainData();
    this.generateTerrain(rng);
    this.generateResources(rng);
    this.generateMeshes();
  }

  initializeTerrainData() {
    for (let x = 0; x < this.size; x++) {
      const slice = [];
      for (let y = 0; y < this.height; y++) {
        const row = [];
        for (let z = 0; z < this.size; z++) {
          row.push({ id: blocks.air.id, instanceId: null });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  generateTerrain(rng) {
    const { scale, magnitude, offset } = this.params.terrain;
    const simplex = new SimplexNoise(rng);

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const n1 = simplex.noise(x / scale, z / scale);
        const n2 = simplex.noise(x / (scale * 0.5), z / (scale * 0.7));
        const n3 = simplex.noise(x / (scale * 0.15), z / (scale * 0.35));
        const n4 = simplex.noise(x / (scale * 0.2), z / (scale * 0.1));

        const noise = 0.55 * n1 + 0.25 * n2 + 0.13 * n3 + 0.07 * n4;

        const scaledNoise = offset + magnitude * noise;
        const height = Math.floor(this.height * scaledNoise);
        const clampedHeight = clamp(height, 1, this.height - 1);
        const dirtOffset = 3 + Math.floor(Math.random() * 2); // 3 or 4

        for (let y = 0; y < this.height; y++) {
          if (y === 0) {
            this.setBlockId({ x, y, z }, blocks.bedrock.id);
            continue;
          }

          if (y < clampedHeight - dirtOffset) {
            if (Math.random() < DEF_RESOURCE_PROBABILITY) {
              this.resourceFlags.push({ x, y, z, depth: clampedHeight - dirtOffset - y });
              this.setBlockId({ x, y, z }, blocks.resourceFlag.id);
            } else {
              this.setBlockId({ x, y, z }, blocks.air.id);
            }
          } else if (y < clampedHeight) {
            this.setBlockId({ x, y, z }, blocks.dirt.id);
          } else if (y === clampedHeight) {
            this.setBlockId({ x, y, z }, blocks.grass.id);
          } else {
            this.setBlockId({ x, y, z }, blocks.air.id);
          }
        }
      }
    }
  }

  generateResources(rng) {
    const simplex = new SimplexNoise(rng);

    for (let i = 0; i < this.resourceFlags.length; i++) {
      const { x, y, z, depth } = this.resourceFlags[i];
      const possibleResources = resourcesList.filter(
        (res) =>
          (!res.resource.constraints.minDepth || res.resource.constraints.minDepth <= depth) &&
          (!res.resource.constraints.minHeight || res.resource.constraints.minHeight <= y)
      );

      if (!possibleResources.length) {
        console.log('No resources possible', y, depth);
        this.setBlockId({ x, y, z }, blocks.stone.id);
        continue;
      }
      const resourceId = getRandomResource(possibleResources);

      this.setBlockId({ x, y, z }, resourceId);

      if (blocksById[resourceId].resource.type === 'cluster') {
        const directions = getClusterDirections();

        directions.forEach((dir) => {
          const isInBounds = this.inBounds({ x: x + dir.x, y: y + dir.y, z: z + dir.z });
          const block = this.getBlock({ x: x + dir.x, y: y + dir.y, z: z + dir.z });
          const canBePlaced =
            block &&
            !resourcesList.map((res) => res.id).includes(block.id) &&
            block.id !== blocks.bedrock.id;
          const setResource = Math.random() < blocksById[resourceId].resource.clusterDensity;

          if (isInBounds && block && canBePlaced && setResource) {
            this.setBlockId({ x: x + dir.x, y: y + dir.y, z: z + dir.z }, resourceId);
          }
        });
      } else if (blocksById[resourceId].resource.type === 'vein') {
        const directions = getVeinDirections();

        const { min, max } = blocksById[resourceId].resource;
        const veinLength = Math.floor(Math.random() * (max - min)) + min;
        const newElement = { x, y, z };

        for (let i = 0; i < veinLength; i++) {
          const { nx, ny, nz } = getNextResourceDirection(directions, newElement);
          if (
            this.inBounds({ x: nx, y: ny, z: nz }) &&
            this.getBlock({ x: nx, y: ny, z: nz }).id === blocks.air.id
          ) {
            this.setBlockId({ x: nx, y: ny, z: nz }, resourceId);
            newElement.x = nx;
            newElement.y = ny;
            newElement.z = nz;
          } else {
            console.log('ASDASD"');
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
            instancedMesh.setColorAt(instanceId, new THREE.Color(blocksById[blockId].color));
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
    for (const dir of sixDirections) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      if (!this.inBounds({ x: nx, y: ny, z: nz })) return false;
      const neighbor = this.getBlock({ x: nx, y: ny, z: nz });
      if (!neighbor || neighbor.id === blocks.air.id) return false;
    }
    return true;
  }
}
