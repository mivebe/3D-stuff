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
  getUVs,
  getVeinDirections,
} from './utils';
import { blockFaceTextures, sixDirections, vertexShader, buildFragmentShader } from './constants';
import { frames, meta } from './textureAtlas';
import { loadEdits, saveEdits, clearEdits, editKey, parseEditKey } from './persistence';
import {
  candidateTrunks,
  cellHasTree,
  trunkHeightFor,
  leafKept,
  CANOPY_RADIUS,
} from './treePlacement';

// GPU materials/textures are identical across every chunk, so build them once
// and share - avoids re-loading the atlas per chunk (startup hitch) and lets
// water meshes be cheaply rebuilt. Each chunk still owns its own geometry.
let _opaqueMaterial = null;
function getOpaqueMaterial() {
  if (_opaqueMaterial) return _opaqueMaterial;
  const texture = new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}textures/blocks/asd.png`
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  const atlasSize = meta.size;
  const tileSize = frames[0].sourceSize;
  const texturedBlockIds = Object.keys(blockFaceTextures);
  const faceUVs = [];
  texturedBlockIds.forEach((id) => {
    const f = blockFaceTextures[id];
    faceUVs.push(getUVs(f.top, atlasSize, tileSize));
    faceUVs.push(getUVs(f.bottom, atlasSize, tileSize));
    faceUVs.push(getUVs(f.side, atlasSize, tileSize));
  });
  _opaqueMaterial = new THREE.ShaderMaterial({
    uniforms: {
      atlas: { value: texture },
      faceUVs: { value: faceUVs.map((uv) => new THREE.Vector4(...uv)) },
    },
    vertexShader,
    fragmentShader: buildFragmentShader(texturedBlockIds.length),
  });
  return _opaqueMaterial;
}

let _waterMaterial = null;
function getWaterMaterial() {
  if (_waterMaterial) return _waterMaterial;
  const texture = new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}textures/blocks/water.png`
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  _waterMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    color: blocks.water.color, // tints the grayscale water texture blue
    transparent: true,
    opacity: 0.8,
    depthWrite: false, // don't block geometry seen through the surface
    side: THREE.DoubleSide, // visible from above and below
  });
  return _waterMaterial;
}

export default class World extends THREE.Group {
  /** 
    Represents a 3D world made up of blocks.
    @param {number} [size=DEF_WORLD_SIZE] - The number of blocks per side of the world.
    @param {number} [height=DEF_HEIGHT] - The height of the world in blocks.
    @param {THREE.Object3D} [container] - Optional container to add the world to.
   * */
  /**
   * @param {object} [opts] - Chunk wiring. `originX/originZ` place this volume in
   *   world space; `manager` enables cross-chunk neighbour lookups; `params` and
   *   `edits` are shared from the manager so all chunks agree.
   */
  constructor(size = DEF_WORLD_SIZE, height = DEF_HEIGHT, container, render = true, opts = {}) {
    super();

    this.size = size; // Blocks per side
    this.height = height; // Height of the world in blocks
    this.data = []; // 3D array to hold block data
    this.resourceFlags = [];
    this.rng = null;

    // World-space offset of this volume's (0,0) corner. 0 for a standalone
    // world; set per-chunk so noise/features sample continuous world coords.
    this.originX = opts.originX ?? 0;
    this.originZ = opts.originZ ?? 0;
    this.manager = opts.manager ?? null; // chunk manager, for border lookups

    // Mesh / incremental-edit state (populated by generateMeshes).
    this.instancedMesh = null;
    this.waterMesh = null;
    this.instanceToBlock = []; // instanceId -> { x, y, z } (reverse of data.instanceId)
    this.blockTypeAttr = null;
    this.blockTypeAttribute = null;
    this.texturedBlockIds = [];
    this._matrix = new THREE.Matrix4();

    // Shared from the manager when chunked, otherwise standalone defaults.
    this.params = opts.params ?? {
      seed: 0,
      terrain: { scale: 180, magnitude: 0.2, offset: 0.4 },
      trees: { density: 0.06, spacing: 5 },
      water: { enabled: true, seaLevel: Math.floor(height * 0.4) }, // 25 at height 64
      debug: { testStructures: true }, // player-size test rig (standalone only)
    };

    // Player edits: sparse world-coord -> block id diff, re-applied on the base.
    this.edits = opts.edits ?? loadEdits(this.params.seed);

    // Position the group at the origin so local coords render at world coords.
    this.position.set(this.originX, 0, this.originZ);

    // `render` is disabled in headless tests, where no WebGL/texture context exists.
    render ? this.init() : this.generateData();
    container && container.add(this);
  }

  init() {
    this.generateData();
    this.generateMeshes();
  }

  /**
   * Builds the block data model (terrain + resources). Pure logic, no rendering,
   * and fully deterministic for a given `params.seed`.
   */
  generateData() {
    this.rng = new RNG(this.params.seed);
    const simplex = new SimplexNoise(this.rng);

    this.initializeTerrainData();
    this.generateTerrain(simplex);
    this.generateResources();
    this.generateWater(); // before trees, so trunks just displace water (no holes)
    this.generateTrees();

    if (this.params.debug?.testStructures) this.addTestStructures();

    this.applyStoredEdits(); // player edits sit on top of the generated base
  }

  /** Re-applies the saved player edits (world-coord keys) that fall in this volume. */
  applyStoredEdits() {
    for (const [key, id] of Object.entries(this.edits)) {
      const [wx, wy, wz] = parseEditKey(key);
      const x = wx - this.originX;
      const z = wz - this.originZ;
      if (this.inBounds({ x, y: wy, z })) this.setBlockId({ x, y: wy, z }, id);
    }
  }

  /** Records a player edit (stored at WORLD coords) into the diff and persists it. */
  recordEdit({ x, y, z }, id) {
    this.edits[editKey(this.originX + x, y, this.originZ + z)] = id;
    saveEdits(this.params.seed, this.edits);
  }

  /** Frees this chunk's geometry when unloaded (materials/textures are shared). */
  dispose() {
    for (const mesh of [this.instancedMesh, this.waterMesh]) {
      if (!mesh) continue;
      this.remove(mesh);
      mesh.geometry?.dispose?.();
    }
    this.instancedMesh = null;
    this.waterMesh = null;
  }

  /** Forgets all saved edits for this seed (call regenerate() to rebuild). */
  clearSavedEdits() {
    this.edits = {};
    clearEdits(this.params.seed);
  }

  /**
   * Floods basins with water: for each column, fills the air from the surface up
   * to sea level. Per-column (rather than flooding every air cell) so it doesn't
   * fill the hollow space under the terrain crust - only visible water bodies.
   */
  generateWater() {
    const { enabled, seaLevel } = this.params.water;
    if (!enabled) return;

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        for (let y = this.surfaceHeight(x, z); y <= seaLevel; y++) {
          if (this.getBlock({ x, y, z }).id === blocks.air.id) {
            this.setBlockId({ x, y, z }, blocks.water.id);
          }
        }
      }
    }
  }

  /**
   * Scatters classic oak trees (straight trunk + spherical leaf crown) onto grass
   * surfaces. Placement is a pure function of world position + seed (see
   * `treePlacement`), so each chunk reproduces the same trees and renders the
   * parts that fall inside it - seamless across borders, no shared state.
   */
  generateTrees() {
    const { density, spacing } = this.params.trees;
    if (density <= 0) return;

    const seed = this.params.seed | 0;
    // Surface heights must match the terrain pass exactly, so seed the simplex
    // identically; forest clumping gets its own world-deterministic stream.
    const surfaceNoise = new SimplexNoise(new RNG(seed));
    const forest = new SimplexNoise(new RNG(seed ^ 0x9e3779b9));

    const wx0 = this.originX;
    const wz0 = this.originZ;
    const wx1 = this.originX + this.size - 1;
    const wz1 = this.originZ + this.size - 1;

    for (const t of candidateTrunks(wx0, wz0, wx1, wz1, seed, spacing)) {
      const forestiness = (forest.noise(t.x / 30, t.z / 30) + 1) / 2;
      if (!cellHasTree(t.gx, t.gz, seed, density, forestiness)) continue;

      const grassY = this.surfaceHeightAt(surfaceNoise, t.x, t.z);
      // Skip deep water so trunks/leaves don't grow fully submerged (shore ok).
      if (this.params.water.enabled && grassY < this.params.water.seaLevel - 1) continue;

      const trunkH = trunkHeightFor(t.gx, t.gz, seed);
      if (grassY + 1 + trunkH + 2 >= this.height) continue; // headroom

      this.placeTreeWorld(t.x, grassY + 1, t.z, trunkH, seed);
    }
  }

  // Builds a classic oak at WORLD column (wx, wz), trunk base at world-y baseY.
  // Only cells inside this volume are written, so a tree straddling a chunk
  // border gets its parts from each chunk; leaf trimming is keyed per world cell.
  placeTreeWorld(wx, baseY, wz, trunkH, seed) {
    const top = baseY + trunkH - 1;
    const overAirOrWater = (b) => b.id === blocks.air.id || b.id === blocks.water.id;
    for (let h = 0; h < trunkH; h++) {
      this.setWorldBlock(wx, baseY + h, wz, blocks.oak_log.id, overAirOrWater);
    }

    const overAir = (b) => b.id === blocks.air.id;
    const cy = top + 1;
    const R = CANOPY_RADIUS;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const dist = Math.hypot(dx, dy, dz);
          if (!leafKept(wx + dx, cy + dy, wz + dz, dist, seed)) continue;
          this.setWorldBlock(wx + dx, cy + dy, wz + dz, blocks.oak_leaves.id, overAir);
        }
      }
    }
  }

  // Sets the block at WORLD coords to `id` when it maps into this volume and
  // `predicate(currentBlock)` holds.
  setWorldBlock(wx, y, wz, id, predicate) {
    const x = wx - this.originX;
    const z = wz - this.originZ;
    if (!this.inBounds({ x, y, z })) return;
    const block = this.data[x][y][z];
    if (predicate(block)) block.id = id;
  }

  /**
   * Places a deterministic debug rig near spawn (world center) for gauging
   * player size and collision. Built on a flattened stone platform so its
   * geometry is exact regardless of terrain noise (the previous per-column
   * version misaligned with bumpy ground and let the player walk through the
   * "1-tall" gap). Feet rest at `F`; the player occupies cells F and F+1.
   *
   * Contents, relative to spawn at world center:
   *  - +x  (z = cz):     staircase of 1-block steps (climb test)
   *  - +x  (z = cz-2):   reference pillars 1 / 2 / 3 tall (the player is 2 tall)
   *  - -z  (z = cz-3):   LOW beam at F+1 -> 1-tall clearance -> BLOCKS you
   *  - +z  (z = cz+3):   HIGH beam at F+2 -> 2-tall clearance -> you pass under
   *
   * Toggle via `params.debug.testStructures`.
   */
  addTestStructures() {
    const cx = Math.floor(this.size / 2);
    const cz = Math.floor(this.size / 2);
    const STONE = blocks.stone.id;
    const LOG = blocks.oak_log.id;
    const AIR = blocks.air.id;

    const set = (x, y, z, id) => this.setBlockId({ x, y, z }, id);
    const fill = (x0, x1, y0, y1, z0, z1, id) => {
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) set(x, y, z, id);
        }
      }
    };

    // Flat platform: walkable floor slab at F-1, headroom cleared above F.
    const F = this.surfaceHeight(cx, cz);
    const R = 6;
    for (let x = cx - R; x <= cx + R; x++) {
      for (let z = cz - R; z <= cz + R; z++) {
        set(x, F - 1, z, STONE);
        for (let y = F; y < this.height; y++) set(x, y, z, AIR);
      }
    }

    // Staircase: each step one block taller (tops at F+1 .. F+4).
    for (let k = 1; k <= 4; k++) fill(cx + k, cx + k, F, F + k - 1, cz, cz, STONE);

    // Reference pillars 1, 2, 3 tall - the player should match the 2-tall one.
    for (let h = 1; h <= 3; h++) fill(cx + 1 + h, cx + 1 + h, F, F + h - 1, cz - 2, cz - 2, LOG);

    // Headroom beams spanning x = cx-2..cx+2, walked under by moving in z.
    fill(cx - 2, cx + 2, F + 1, F + 1, cz - 3, cz - 3, LOG); // 1-tall clearance: blocks
    fill(cx - 2, cx + 2, F + 2, F + 2, cz + 3, cz + 3, LOG); // 2-tall clearance: passes
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

  /**
   * Terrain surface (grass) height at WORLD coordinates - a pure function of the
   * noise, so it's continuous across chunk borders and computable for columns
   * outside this volume (e.g. a neighbouring chunk's tree trunk).
   */
  surfaceHeightAt(simplex, wx, wz) {
    const { scale, magnitude, offset } = this.params.terrain;
    const n1 = simplex.noise(wx / scale, wz / scale);
    const n2 = simplex.noise(wx / (scale * 0.5), wz / (scale * 0.7));
    const n3 = simplex.noise(wx / (scale * 0.15), wz / (scale * 0.35));
    const n4 = simplex.noise(wx / (scale * 0.2), wz / (scale * 0.1));
    const noise = 0.55 * n1 + 0.25 * n2 + 0.13 * n3 + 0.07 * n4;
    const height = Math.floor(this.height * (offset + magnitude * noise));
    return clamp(height, 1, this.height - 1);
  }

  generateTerrain(simplex) {
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const clampedHeight = this.surfaceHeightAt(simplex, this.originX + x, this.originZ + z);
        const dirtOffset = 3 + Math.floor(this.rng.random() * 2); // 3 or 4

        for (let y = 0; y < this.height; y++) {
          if (y === 0) {
            this.setBlockId({ x, y, z }, blocks.bedrock.id);
            continue;
          }

          if (y < clampedHeight - dirtOffset) {
            if (this.rng.random() < DEF_RESOURCE_PROBABILITY) {
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

  generateResources() {
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
      const resourceId = getRandomResource(possibleResources, this.rng);

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
          const setResource = this.rng.random() < blocksById[resourceId].resource.clusterDensity;

          if (isInBounds && block && canBePlaced && setResource) {
            this.setBlockId({ x: x + dir.x, y: y + dir.y, z: z + dir.z }, resourceId);
          }
        });
      } else if (blocksById[resourceId].resource.type === 'vein') {
        const directions = getVeinDirections(this.rng);

        const { min, max } = blocksById[resourceId].resource;
        const veinLength = Math.floor(this.rng.random() * (max - min)) + min;
        const newElement = { x, y, z };

        for (let i = 0; i < veinLength; i++) {
          const { nx, ny, nz } = getNextResourceDirection(directions, newElement, this.rng);
          if (
            this.inBounds({ x: nx, y: ny, z: nz }) &&
            this.getBlock({ x: nx, y: ny, z: nz }).id === blocks.air.id
          ) {
            this.setBlockId({ x: nx, y: ny, z: nz }, resourceId);
            newElement.x = nx;
            newElement.y = ny;
            newElement.z = nz;
          }
        }
      }
    }
  }

  generateMeshes() {
    const maxCount = this.size * this.size * this.height;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.texturedBlockIds = Object.keys(blockFaceTextures);
    const material = getOpaqueMaterial();

    this.blockTypeAttr = new Float32Array(maxCount);
    this.instanceToBlock = new Array(maxCount).fill(null);
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    instancedMesh.count = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          if (this.isRenderable({ x, y, z })) {
            const instanceId = instancedMesh.count;
            this._matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
            instancedMesh.setMatrixAt(instanceId, this._matrix);
            this.blockTypeAttr[instanceId] = this.blockTypeIndexFor(this.getBlock({ x, y, z }).id);
            this.instanceToBlock[instanceId] = { x, y, z };
            this.setBlockInstanceId({ x, y, z }, instanceId);
            instancedMesh.count++;
          }
        }
      }
    }

    this.blockTypeAttribute = new THREE.InstancedBufferAttribute(this.blockTypeAttr, 1);
    instancedMesh.geometry.setAttribute('blockType', this.blockTypeAttribute);
    this.instancedMesh = instancedMesh;
    this.add(instancedMesh);

    this.generateWaterMesh();
  }

  /**
   * Builds a translucent, textured water surface as a per-face BufferGeometry.
   * Only faces touching air are emitted - water/water and water/solid faces are
   * skipped - so there's a single clean surface layer (no stacked internal faces
   * banding the translucency). Rendered apart from the opaque terrain so alpha
   * blends and depth-sorts correctly.
   */
  generateWaterMesh() {
    // Unit-cube faces: outward normal + its 4 corner offsets.
    const FACES = [
      {
        n: [1, 0, 0],
        v: [
          [1, 0, 0],
          [1, 1, 0],
          [1, 1, 1],
          [1, 0, 1],
        ],
      },
      {
        n: [-1, 0, 0],
        v: [
          [0, 0, 1],
          [0, 1, 1],
          [0, 1, 0],
          [0, 0, 0],
        ],
      },
      {
        n: [0, 1, 0],
        v: [
          [0, 1, 1],
          [1, 1, 1],
          [1, 1, 0],
          [0, 1, 0],
        ],
      },
      {
        n: [0, -1, 0],
        v: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 0, 1],
          [0, 0, 1],
        ],
      },
      {
        n: [0, 0, 1],
        v: [
          [1, 0, 1],
          [1, 1, 1],
          [0, 1, 1],
          [0, 0, 1],
        ],
      },
      {
        n: [0, 0, -1],
        v: [
          [0, 0, 0],
          [0, 1, 0],
          [1, 1, 0],
          [1, 0, 0],
        ],
      },
    ];

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vi = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          if (this.getBlock({ x, y, z }).id !== blocks.water.id) continue;
          for (const f of FACES) {
            if (!this.isAirAt(x + f.n[0], y + f.n[1], z + f.n[2])) continue;
            for (const v of f.v) {
              positions.push(x + v[0], y + v[1], z + v[2]);
              normals.push(f.n[0], f.n[1], f.n[2]);
            }
            uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
            indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
            vi += 4;
          }
        }
      }
    }
    if (!positions.length) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const mesh = new THREE.Mesh(geometry, getWaterMaterial());
    mesh.renderOrder = 1; // draw after the opaque pass
    this.waterMesh = mesh;
    this.add(mesh);
  }

  /**
   * Rebuilds the water surface - called when a neighbouring chunk loads, so the
   * shared border faces re-cull (otherwise they z-fight / show a seam, since the
   * water mesh is monolithic and can't be patched per-cell like the opaque one).
   */
  rebuildWaterMesh() {
    if (this.waterMesh) {
      this.remove(this.waterMesh);
      this.waterMesh.geometry?.dispose?.();
      this.waterMesh = null;
    }
    this.generateWaterMesh();
  }

  /** Index of a block id within the shader's per-block faceUVs table. */
  blockTypeIndexFor(id) {
    return this.texturedBlockIds.indexOf(String(id));
  }

  // Whether a (local) cell is air - i.e. a water face there should render.
  // Out-of-volume cells resolve through the manager (or count as open/air).
  isAirAt(x, y, z) {
    if (y < 0 || y >= this.height) return true;
    if (x >= 0 && x < this.size && z >= 0 && z < this.size) {
      return this.data[x][y][z].id === blocks.air.id;
    }
    if (this.manager) {
      const b = this.manager.getBlockWorld(this.originX + x, y, this.originZ + z);
      return !b || b.id === blocks.air.id;
    }
    return true;
  }

  /**
   * Whether a block belongs in the opaque/cutout instanced mesh: a non-air,
   * non-liquid block that isn't fully obscured. Liquids (water) are drawn by a
   * separate translucent mesh, so they're excluded here.
   */
  isRenderable({ x, y, z }) {
    if (!this.inBounds({ x, y, z })) return false;
    const block = this.getBlock({ x, y, z });
    if (!block || block.id === blocks.air.id || blocksById[block.id]?.liquid) return false;
    return !this.isBlockObscured({ x, y, z });
  }

  /**
   * Data-layer edit: sets the block at `coords` to `id` and reports which cells
   * change renderable-state. Pure (no mesh), so it's unit-testable headless.
   * Only the edited cell and its 6 face-neighbors can change visibility.
   * @returns {{ added: Array<{x,y,z}>, removed: Array<{x,y,z}> }}
   */
  setBlock(coords, id) {
    const { x, y, z } = coords;
    const cells = [
      { x, y, z },
      ...sixDirections.map((d) => ({ x: x + d.x, y: y + d.y, z: z + d.z })),
    ];
    const before = cells.map((c) => this.isRenderable(c));
    this.setBlockId({ x, y, z }, id);
    const after = cells.map((c) => this.isRenderable(c));

    const added = [];
    const removed = [];
    cells.forEach((c, i) => {
      if (!before[i] && after[i]) added.push(c);
      else if (before[i] && !after[i]) removed.push(c);
    });
    return { added, removed };
  }

  /** Applies an edit to the data model + instanced mesh, and persists it. */
  applyEdit(coords, id) {
    const { added, removed } = this.setBlock(coords, id);
    removed.forEach((c) => this._removeInstance(c));
    added.forEach((c) => this._addInstance(c));
    this.recordEdit(coords, id);
    return { added, removed };
  }

  _addInstance({ x, y, z }) {
    const mesh = this.instancedMesh;
    const instanceId = mesh.count;
    this._matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
    mesh.setMatrixAt(instanceId, this._matrix);
    this.blockTypeAttr[instanceId] = this.blockTypeIndexFor(this.getBlock({ x, y, z }).id);
    this.instanceToBlock[instanceId] = { x, y, z };
    this.setBlockInstanceId({ x, y, z }, instanceId);
    mesh.count++;
    mesh.instanceMatrix.needsUpdate = true;
    this.blockTypeAttribute.needsUpdate = true;
  }

  // Removes an instance by swapping the last instance into its slot (keeping the
  // matrix/blockType arrays dense) and fixing up the swapped block's instanceId.
  _removeInstance({ x, y, z }) {
    const mesh = this.instancedMesh;
    const instanceId = this.getBlock({ x, y, z })?.instanceId;
    if (instanceId == null) return;

    const last = mesh.count - 1;
    if (instanceId !== last) {
      const lastCell = this.instanceToBlock[last];
      mesh.getMatrixAt(last, this._matrix);
      mesh.setMatrixAt(instanceId, this._matrix);
      this.blockTypeAttr[instanceId] = this.blockTypeAttr[last];
      this.instanceToBlock[instanceId] = lastCell;
      if (lastCell) this.setBlockInstanceId(lastCell, instanceId);
    }
    this.instanceToBlock[last] = null;
    mesh.count--;
    this.setBlockInstanceId({ x, y, z }, null);
    mesh.instanceMatrix.needsUpdate = true;
    this.blockTypeAttribute.needsUpdate = true;
  }

  regenerate() {
    this.clear();
    this.data = [];
    this.resourceFlags = [];

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
   * Whether the block cell at (x, y, z) collides with the player. Out-of-bounds
   * and air are non-solid. (Water/other non-solids will be added in Phase 4.)
   * @returns {boolean}
   */
  isSolid({ x, y, z }) {
    const block = this.getBlock({ x, y, z });
    return !!block && block.id !== blocks.air.id && !blocksById[block.id]?.liquid;
  }

  /**
   * Y coordinate at which a player's feet rest on the topmost solid block of a
   * column (i.e. one above the highest solid block). Returns 0 if the column is
   * empty.
   * @returns {number}
   */
  surfaceHeight(x, z) {
    for (let y = this.height - 1; y >= 0; y--) {
      if (this.isSolid({ x, y, z })) return y + 1;
    }
    return 0;
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

  // Opaque = solid and not see-through (leaves/water are transparent). Only
  // opaque neighbors hide a face. Local coords; cells outside this volume are
  // resolved through the chunk manager (or treated as open when standalone).
  isOpaqueAt(x, y, z) {
    if (y < 0 || y >= this.height) return false;
    if (x >= 0 && x < this.size && z >= 0 && z < this.size) {
      const block = this.data[x][y][z];
      return !!block && block.id !== blocks.air.id && !blocksById[block.id]?.transparent;
    }
    if (this.manager) return this.manager.isOpaqueWorld(this.originX + x, y, this.originZ + z);
    return false; // standalone: edge neighbours are open, so edge faces render
  }

  /** Convenience wrapper taking a coord object. */
  isOpaque({ x, y, z }) {
    return this.isOpaqueAt(x, y, z);
  }

  isBlockObscured({ x, y, z }) {
    for (const dir of sixDirections) {
      if (!this.isOpaqueAt(x + dir.x, y + dir.y, z + dir.z)) return false;
    }
    return true;
  }

  /**
   * Recomputes whether a cell should be in the mesh and adds/removes its instance
   * accordingly. Used to re-cull a chunk's border faces after a neighbour chunk
   * loads or a bordering block is edited.
   */
  refreshCell({ x, y, z }) {
    if (!this.instancedMesh) return;
    const block = this.inBounds({ x, y, z }) ? this.data[x][y][z] : null;
    const has = block && block.instanceId != null;
    const should = this.isRenderable({ x, y, z });
    if (should && !has) this._addInstance({ x, y, z });
    else if (!should && has) this._removeInstance({ x, y, z });
  }
}
