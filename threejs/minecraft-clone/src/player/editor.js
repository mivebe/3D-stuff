import * as THREE from 'three';
import { blocks, blocksByName } from '../blocks';
import { blockFaceTextures } from '../world/constants';
import { playerBox } from './physics.js';

const REACH = 8; // blocks
const PALETTE = ['grass', 'dirt', 'stone', 'oak_log', 'coal', 'diamond'];
const HOTBAR_SCALE = 3; // integer upscale of the 16px-native GUI sprites

/**
 * Block editing: raycasts from the crosshair against the world's InstancedMesh,
 * breaks (left click) / places (right click) blocks via `World.applyEdit`, and
 * draws a wireframe highlight on the targeted block. The data + mesh bookkeeping
 * lives in World; this class is the input/aim glue.
 */
export default class Editor {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('../world/chunkManager').default} manager
   * @param {import('./player').default} player
   * @param {THREE.Scene} scene
   */
  constructor(camera, manager, player, scene) {
    this.camera = camera;
    this.manager = manager;
    this.player = player;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = REACH;
    this.palette = PALETTE.map((name) => blocksByName[name].id);
    this.selectedIndex = 2; // stone
    this.target = null; // { block: {x,y,z}, place: {x,y,z} }

    const box = new THREE.BoxGeometry(1.001, 1.001, 1.001);
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(box),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    this.highlight.visible = false;
    scene.add(this.highlight);

    this.hotbar = document.createElement('div');
    this.hotbar.id = 'hotbar';
    document.body.appendChild(this.hotbar);
    this._renderHotbar();

    this._center = new THREE.Vector2(0, 0);
    this._onMouseDown = (e) => this._handleMouseDown(e);
    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onContextMenu = (e) => e.preventDefault();
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('contextmenu', this._onContextMenu);
  }

  get selected() {
    return this.palette[this.selectedIndex];
  }

  /** Re-aims the crosshair raycast and updates the highlight. Call each frame. */
  update() {
    if (!this.player.isLocked) {
      this.highlight.visible = false;
      this.target = null;
      return;
    }

    // Raycast across every loaded chunk's opaque mesh, take the nearest block.
    this.raycaster.setFromCamera(this._center, this.camera);
    const hits = this.raycaster.intersectObject(this.manager, true);
    const hit = hits.find((h) => h.object.userData.chunk && h.instanceId != null);
    if (!hit) {
      this.highlight.visible = false;
      this.target = null;
      return;
    }

    const chunk = hit.object.userData.chunk;
    const cell = chunk.instanceToBlock[hit.instanceId];
    if (!cell) {
      this.highlight.visible = false;
      this.target = null;
      return;
    }
    // Local cell -> world coordinates.
    const bx = chunk.originX + cell.x;
    const by = cell.y;
    const bz = chunk.originZ + cell.z;
    const n = hit.face.normal; // axis-aligned (instances aren't rotated)
    this.target = {
      block: { x: bx, y: by, z: bz },
      place: { x: bx + Math.round(n.x), y: by + Math.round(n.y), z: bz + Math.round(n.z) },
    };
    this.highlight.position.set(bx + 0.5, by + 0.5, bz + 0.5);
    this.highlight.visible = true;
  }

  breakBlock() {
    const b = this.target.block;
    const block = this.manager.getBlockWorld(b.x, b.y, b.z);
    if (!block || block.id === blocks.air.id || block.id === blocks.bedrock.id) return;
    this.manager.applyEditWorld(b.x, b.y, b.z, blocks.air.id);
  }

  placeBlock() {
    const p = this.target.place;
    if (this.manager.isSolidWorld(p.x, p.y, p.z) || this._intersectsPlayer(p)) return;
    this.manager.applyEditWorld(p.x, p.y, p.z, this.selected);
  }

  // True if a unit cell overlaps the player's collision box (can't build into self).
  _intersectsPlayer(cell) {
    const { min, max } = playerBox(this.player.position);
    return (
      min.x < cell.x + 1 &&
      max.x > cell.x &&
      min.y < cell.y + 1 &&
      max.y > cell.y &&
      min.z < cell.z + 1 &&
      max.z > cell.z
    );
  }

  _handleMouseDown(e) {
    if (!this.player.isLocked || !this.target) return;
    if (e.button === 0) this.breakBlock();
    else if (e.button === 2) this.placeBlock();
  }

  _handleKeyDown(e) {
    const m = /^Digit([1-9])$/.exec(e.code);
    if (!m) return;
    const idx = Number(m[1]) - 1;
    if (idx < this.palette.length) {
      this.selectedIndex = idx;
      this._renderHotbar();
    }
  }

  // Renders a real-Minecraft-style hotbar using gui/widgets.png (182x22 bar +
  // 24x24 selector) at integer pixel scale. Each item is an isometric CSS cube
  // (top face + two shaded side faces), like the in-game block item render.
  _renderHotbar() {
    const S = HOTBAR_SCALE;
    const icons = this.palette
      .map((id, i) => {
        const faces = blockFaceTextures[id];
        const tex = (face) => `${import.meta.env.BASE_URL}textures/blocks/${faces[face]}`;
        const left = (3 + i * 20) * S; // 1px bar border + 2px slot padding
        return `<div class="hb-icon" style="left:${left}px;top:${3 * S}px;width:${16 * S}px;height:${16 * S}px">
          <div class="hb-cube">
            <div class="hb-face top" style="background-image:url('${tex('top')}')"></div>
            <div class="hb-face front" style="background-image:url('${tex('side')}')"></div>
            <div class="hb-face right" style="background-image:url('${tex('side')}')"></div>
          </div>
        </div>`;
      })
      .join('');
    const selLeft = (this.selectedIndex * 20 - 1) * S; // selector overhangs the slot by 1px
    const selector = `<div class="hb-selector" style="left:${selLeft}px;top:${-S}px;width:${
      24 * S
    }px;height:${24 * S}px"></div>`;
    this.hotbar.innerHTML = icons + selector;
  }

  dispose() {
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('contextmenu', this._onContextMenu);
  }
}
