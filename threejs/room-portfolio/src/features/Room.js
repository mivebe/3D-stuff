import * as THREE from 'three';
import gsap from 'gsap';
import App from '../App.js';

const EYE_HEIGHT = 1.6;

// rooms come from apartment-assembled.blend, one world-baked glb per collection, so
// they load at identity and reassemble. this file just adds them, wires interaction
// onto the named objects, and builds colliders off the real geometry.

// load + collider order; Walls first so the shell is in before furniture
const ROOMS = ['walls', 'livingRoom', 'hallway', 'kitchen', 'bedroom', 'bathroom', 'balcony'];

// blend has multiple floor meshes (per room), all skipped as colliders
const FLOOR_NAMES = new Set(['Floor', 'floor', 'Floor.001']);

export default class Room {
  constructor() {
    this.experience = new App();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // collision is fully box-collider based off the real walls/furniture now
    this.clampToFloor = false;

    // meshes the crosshair can hit, boxes the player collides with, hinged door nodes
    this.interactiveMeshes = [];
    this.colliders = [];
    this.doors = [];
    this.models = {};

    this.setModels();
    this.setSpawn();
    this.setLivingRoomDoors();
    this.setHallwayDoors();
    this.setTV();
    this.setInfo();
    this.setColliders();
  }

  setModels() {
    for (const name of ROOMS) {
      const res = this.resources.items[name];
      if (!res) continue;
      const scene = res.scene;
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene.add(scene);
      scene.updateMatrixWorld(true);
      this.models[name] = scene;
    }
    this.livingRoom = this.models.livingRoom;
  }

  // floor height + a sane spawn from the living-room floor (all in world space).
  // stand a few metres off the tv wall, looking back at the tv, so the opening view
  // frames the room instead of burying the camera in the wall unit.
  setSpawn() {
    const floor = this.livingRoom && this.livingRoom.getObjectByName('Floor');
    this.floorBounds = new THREE.Box3().setFromObject(floor || this.livingRoom);
    this.floorY = this.floorBounds.max.y;

    const center = this.floorBounds.getCenter(new THREE.Vector3());
    let pos = center.clone();
    let yaw = Math.PI / 2;

    const tv = this.livingRoom && this.livingRoom.getObjectByName('TV_Screen');
    if (tv) {
      const t = new THREE.Vector3();
      tv.getWorldPosition(t);
      const toCenter = new THREE.Vector3(center.x - t.x, 0, center.z - t.z);
      if (toCenter.lengthSq() > 1e-4) toCenter.normalize();
      pos = new THREE.Vector3(t.x, this.floorY, t.z).add(toCenter.multiplyScalar(2.6));
    }

    // keep the spawn inside the room with a small margin
    const m = 0.4;
    pos.x = Math.max(this.floorBounds.min.x + m, Math.min(this.floorBounds.max.x - m, pos.x));
    pos.z = Math.max(this.floorBounds.min.z + m, Math.min(this.floorBounds.max.z - m, pos.z));
    pos.y = this.floorY + EYE_HEIGHT;

    // yaw so the -Z camera forward points at the tv (forward = (-sin, 0, -cos))
    if (tv) {
      const t = new THREE.Vector3();
      tv.getWorldPosition(t);
      yaw = Math.atan2(pos.x - t.x, pos.z - t.z);
    }

    this.spawn = pos;
    this.spawnYaw = yaw;
  }

  // living-room cabinetry doors. the living room glb is at identity, so its modelled
  // orientation is world space: the joystick glass door swings about a fixed vertical axis,
  // the upper flaps hinge about their own local axis (how they were modelled)
  setLivingRoomDoors() {
    if (!this.livingRoom) return;
    const Y = new THREE.Vector3(0, 1, 0);

    const joystick = this.livingRoom.getObjectByName('Door_Joystick');
    if (joystick) this.registerDoor(joystick, Y, -Math.PI / 2, 'cabinet', 'world');

    for (let i = 1; i <= 9; i++) {
      const node = this.livingRoom.getObjectByName(`Door_Upper_${String(i).padStart(2, '0')}`);
      if (node) this.registerDoor(node, Y, Math.PI / 2, 'cabinet', 'local');
    }
  }

  // hallway leaves (one per room) + the portemanteau cabinet doors. the hallway glb is at
  // identity too, so the leaves keep their modelled swing direction.
  setHallwayDoors() {
    const hall = this.models.hallway;
    if (!hall) return;
    const Y = new THREE.Vector3(0, 1, 0);
    const X = new THREE.Vector3(1, 0, 0);

    const leaves = [
      ['Leaf_LivingRoom', Y, -Math.PI / 2, 'Living Room Door'],
      ['Leaf_Bathroom', Y, Math.PI / 2, 'Bathroom Door'],
      ['Leaf_Exit', Y, -Math.PI / 2, 'Front Door'],
      ['Leaf_Bedroom', Y, -Math.PI / 2, 'Bedroom Door'],
      ['Leaf_Kitchen', Y, -Math.PI / 2, 'Kitchen Door'],
    ];
    // left/right swing about vertical, middle flaps flip about horizontal
    const porte = [
      ['Porte_door_lower_left', Y, -Math.PI / 2],
      ['Porte_door_lower_right', Y, Math.PI / 2],
      ['Porte_door_lower_mid', X, -Math.PI / 2],
      ['Porte_door_upper_left', Y, -Math.PI / 2],
      ['Porte_door_upper_right', Y, Math.PI / 2],
      ['Porte_door_upper_mid', X, Math.PI / 2],
    ];

    for (const [name, axis, angle, label] of leaves) {
      const node = hall.getObjectByName(name);
      if (node) this.registerDoor(node, axis, angle, label, 'world');
    }
    for (const [name, axis, angle] of porte) {
      const node = hall.getObjectByName(name);
      if (node) this.registerDoor(node, axis, angle, 'cabinet', 'world');
    }
  }

  setTV() {
    this.tv = this.livingRoom && this.livingRoom.getObjectByName('TV_Screen');
    if (!this.tv) return;

    this.tvOn = false;
    this.tvBaseColor = this.tv.material.color.clone();

    this.video = this.resources.items.tvScreen;
    this.video.flipY = false; // gltf uvs expect unflipped

    // a light that switches on with the screen (dynamic-lighting demo)
    this.tvLight = new THREE.PointLight('#9fc4ff', 0, 5, 2);
    const p = new THREE.Vector3();
    this.tv.getWorldPosition(p);
    this.tvLight.position.copy(p);
    this.scene.add(this.tvLight);

    this.tv.userData.interactive = {
      prompt: () => (this.tvOn ? 'turn off TV' : 'turn on TV'),
      toggle: () => this.toggleTV(),
    };
    this.interactiveMeshes.push(this.tv);
  }

  toggleTV() {
    this.tvOn = !this.tvOn;
    const m = this.tv.material;
    if (this.tvOn) {
      m.map = this.video;
      m.emissiveMap = this.video;
      m.emissive = new THREE.Color('#ffffff');
      m.emissiveIntensity = 1;
      m.color = new THREE.Color('#ffffff');
      this.tvLight.intensity = 5;
    } else {
      m.map = null;
      m.emissiveMap = null;
      m.emissive = new THREE.Color('#000000');
      m.emissiveIntensity = 0;
      m.color = this.tvBaseColor.clone();
      this.tvLight.intensity = 0;
    }
    m.needsUpdate = true;
  }

  // info hotspots (placeholder content); open a diegetic DOM panel
  setInfo() {
    if (!this.livingRoom) return;
    for (const name of ['pc_plate_1', 'pc_plate_2']) {
      const node = this.livingRoom.getObjectByName(name);
      if (!node) continue;
      node.userData.interactive = {
        prompt: () => 'read',
        toggle: () => this.experience.panel.open(
          'About me',
          '<p>Placeholder. This is where an about-me / projects blurb will go, opened diegetically from inside the room.</p>'
        ),
      };
      this.interactiveMeshes.push(node);
    }
  }

  // space 'world' rotates about a fixed axis (pre-multiply); 'local' about the
  // node's own axis (post-multiply) so it tracks the mesh orientation
  registerDoor(node, axis, angle, label, space) {
    const closed = node.quaternion.clone();
    const delta = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const open = space === 'local'
      ? closed.clone().multiply(delta)
      : delta.clone().multiply(closed);
    node.userData.door = { closed, open, isOpen: false, t: 0 };
    node.userData.interactive = {
      prompt: () => (node.userData.door.isOpen ? `close ${label}` : `open ${label}`),
      toggle: () => this.toggleDoor(node),
    };
    this.interactiveMeshes.push(node);
    this.doors.push(node);
  }

  toggleDoor(node) {
    const d = node.userData.door;
    d.isOpen = !d.isOpen;
    gsap.to(d, {
      t: d.isOpen ? 1 : 0,
      duration: 0.6,
      ease: 'power2.inOut',
      onUpdate: () => node.quaternion.copy(d.closed).slerp(d.open, d.t),
    });
  }

  // one AABB per mesh overlapping the player's vertical span, so you walk under upper
  // cabinets. floors/ceilings, frames and door leaves are skipped so nothing seals a
  // walkway; shell walls split their AABB around each doorway hole, else it's one box.
  setColliders() {
    const feet = this.floorY + 0.1;
    const head = this.floorY + 1.7;
    const openings = this.collectDoorOpenings();
    for (const name of ROOMS) {
      const model = this.models[name];
      if (!model) continue;
      const isWalls = name === 'walls';
      model.traverse((child) => {
        if (!child.isMesh) return;
        const n = child.name;
        if (FLOOR_NAMES.has(n) || n === 'Ceiling') return;
        // frames are thin trim around an opening; their bbox fills the whole hole
        if (n.startsWith('Frame_')) return;
        // door leaves are walk-through, open or closed
        if (n.startsWith('Leaf_')) return;
        // cabinet/furniture doors never collide (open panels jut into walkways)
        if (n.toLowerCase().includes('door')) return;
        const box = new THREE.Box3().setFromObject(child);
        if (box.max.y < feet || box.min.y > head) return;
        if (isWalls) this.pushWallColliders(box, openings, head);
        else this.colliders.push(box);
      });
    }
  }

  // world-space AABB of each hallway door leaf = where a hole is cut in the shell
  collectDoorOpenings() {
    const hall = this.models.hallway;
    const out = [];
    if (!hall) return out;
    for (const room of ['LivingRoom', 'Bathroom', 'Exit', 'Bedroom', 'Kitchen']) {
      const leaf = hall.getObjectByName('Leaf_' + room);
      if (leaf) out.push(new THREE.Box3().setFromObject(leaf));
    }
    return out;
  }

  // split a wall AABB along its long horizontal axis, dropping the slice over any door
  // opening that pierces it, so the doorway is walkable. the lintel above the opening sits
  // above head height, so no collider is needed there.
  pushWallColliders(box, openings, head) {
    const axis = (box.max.x - box.min.x) >= (box.max.z - box.min.z) ? 'x' : 'z';
    const thin = axis === 'x' ? 'z' : 'x';
    const cuts = [];
    for (const o of openings) {
      if (o.max[thin] < box.min[thin] - 0.05 || o.min[thin] > box.max[thin] + 0.05) continue;
      if (o.max[axis] <= box.min[axis] || o.min[axis] >= box.max[axis]) continue;
      if (o.min.y > head) continue;
      cuts.push([Math.max(box.min[axis], o.min[axis]), Math.min(box.max[axis], o.max[axis])]);
    }
    if (!cuts.length) { this.colliders.push(box); return; }
    cuts.sort((a, b) => a[0] - b[0]);
    const emit = (a0, a1) => {
      if (a1 - a0 < 0.02) return;
      const mn = box.min.clone();
      const mx = box.max.clone();
      mn[axis] = a0;
      mx[axis] = a1;
      this.colliders.push(new THREE.Box3(mn, mx));
    };
    let cursor = box.min[axis];
    for (const [c0, c1] of cuts) {
      emit(cursor, c0);
      cursor = Math.max(cursor, c1);
    }
    emit(cursor, box.max[axis]);
  }

  update() {}
}
