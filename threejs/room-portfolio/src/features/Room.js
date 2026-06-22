import * as THREE from 'three';
import gsap from 'gsap';
import App from '../App.js';

const EYE_HEIGHT = 1.6;

// living-room <-> hallway join: the hallway ships the living-room door+frame, so
// we slot the hallway onto the living room's tv (x0) wall and reuse that door
// instead of modelling a new one. all coords below are living-room world space.
const DOOR_CENTER_Z = -0.45;     // doorway centre along the tv wall
const DOOR_HALF_WIDTH = 0.45;    // 0.9 wide opening, matches the hallway frame
const DOOR_HEIGHT = 2.0;         // matches the hallway frame height
const HALL_DOOR_LOCAL_Z = -0.85; // centre of the hallway's living-room opening in its own space
const WALL_THICKNESS = 0.2;      // solid wall between the two rooms; the door frame spans it

// bedroom <-> hallway join: dock the bedroom onto the hallway bay-east opening
// (Leaf_Bedroom) and reuse that leaf as the door. the bedroom's own +Z wall is the
// 0.2-unit solid wall between the rooms, butting the hallway frame. all bedroom geom
// below is in bedroom-local (gltf) space: the door sits on the +Z wall after yup export.
const BED_WALL_THICKNESS = 0.2;  // solid wall between hallway and bedroom (user spec)
const BED_HEIGHT = 2.6;          // bedroom ceiling height, matches the CAD
const BED_DOOR_LOCAL_X0 = 0.33;  // door opening along the +Z wall, in bedroom-local x
const BED_DOOR_LOCAL_X1 = 1.05;
const BED_DOOR_HEIGHT = 2.0;     // door opening height in bedroom-local y
const BED_PERIM_THICKNESS = 0.1; // cosmetic thickness of the other three walls

// kitchen <-> hallway join: dock the (textured) kitchen onto the hallway bay-north
// opening (Leaf_Kitchen), reuse that leaf as the door. the kitchen glb is cabinetry +
// appliances only (no floor/walls/door), so the envelope is fully procedural. rotated
// -90 (CCW from top) so the door lands on the kitchen-local -X wall beside the cooktop
// counter (the longer worktop), with the +Z cooktop wall facing the bedroom side.
const KIT_WALL_THICKNESS = 0.2;  // solid wall between hallway and kitchen
const KIT_HEIGHT = 2.6;          // kitchen ceiling height, matches the carpentry
const KIT_DOOR_WIDTH = 0.8;      // matches the hallway kitchen leaf
const KIT_DOOR_HEIGHT = 2.0;
const KIT_DOOR_LOCAL_Z = 0.73;   // door centre along the -X wall, just south of the oven/cooktop end
const KIT_PERIM_THICKNESS = 0.1; // cosmetic thickness of the three solid walls

export default class Room {
  constructor() {
    this.experience = new App();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // one combined scene: the living room with the hallway joined onto the tv wall
    this.needsShell = true;
    // everything is now box-collider based: the living room joins the hallway through
    // the tv-wall doorway, so it can't be a single floor bbox anymore. the Shell adds
    // the living-room wall colliders (with a gap at the door) and the hallway brings its
    // own walls, so the floor-bbox pen is dropped and you can walk the doorway.
    this.clampToFloor = false;

    // meshes the crosshair can hit, and boxes the player collides with
    this.interactiveMeshes = [];
    this.colliders = [];
    this.doors = [];

    this.setModel();
    this.setHallway();
    this.setBedroom();
    this.setKitchen();
    this.setTV();
    this.setDoors();
    this.setInfo();
    this.setColliders();
  }

  setModel() {
    this.model = this.resources.items.livingRoom.scene;
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.scene.add(this.model);
    this.model.updateMatrixWorld(true);

    const floor = this.model.getObjectByName('Floor');
    this.floorBounds = new THREE.Box3().setFromObject(floor);
    this.floorY = this.floorBounds.max.y;
  }

  // attach the hallway to the living room so its living-room door becomes ours.
  // the hallway is rotated 180 about Y and shifted so its living-room opening lands
  // exactly on the living room tv (x0) wall at DOOR_CENTER_Z; floors line up at floorY.
  setHallway() {
    const hall = this.resources.items.hallway;
    if (!hall) return;

    this.hallwayModel = hall.scene;
    this.hallwayModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.hallwayModel.rotation.y = Math.PI;
    // pull the hallway back by WALL_THICKNESS so there's a solid wall between the rooms:
    // living-room wall face stays at floorBounds.min.x, hallway wall face sits 0.2 behind it.
    // world z of the door centre becomes DOOR_CENTER_Z (z = -localZ + Tz, so Tz = centre + localZ)
    this.hallwayModel.position.set(
      this.floorBounds.min.x - WALL_THICKNESS,
      this.floorY,
      DOOR_CENTER_Z + HALL_DOOR_LOCAL_Z
    );
    this.scene.add(this.hallwayModel);
    this.hallwayModel.updateMatrixWorld(true);

    // the doorway hole the Shell must cut in the x0 wall (living-room world coords);
    // depth is the wall thickness the Shell lines with a reveal/frame
    this.doorGap = {
      zMin: DOOR_CENTER_Z - DOOR_HALF_WIDTH,
      zMax: DOOR_CENTER_Z + DOOR_HALF_WIDTH,
      top: this.floorY + DOOR_HEIGHT,
      depth: WALL_THICKNESS,
    };
  }

  // dock the bedroom onto the hallway's bay-east opening (Leaf_Bedroom), reusing that
  // leaf as the door. the model + its procedural envelope live in a group built in
  // bedroom-local space (door on the local +Z wall); one rotate+translate aligns that
  // door to the hallway opening with BED_WALL_THICKNESS of solid wall between the rooms.
  setBedroom() {
    const bed = this.resources.items.bedroom;
    if (!bed || !this.hallwayModel) return;

    this.bedroomModel = bed.scene;
    this.bedroomModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // local floor bounds (model still at identity, before docking)
    this.bedroomModel.updateMatrixWorld(true);
    const floor = this.bedroomModel.getObjectByName('Floor');
    const fb = new THREE.Box3().setFromObject(floor);
    const localFloorY = fb.max.y;
    const doorWallZ = fb.max.z;          // +Z wall carries the doorway
    const doorCenterX = (BED_DOOR_LOCAL_X0 + BED_DOOR_LOCAL_X1) / 2;

    this.bedroomGroup = new THREE.Group();
    this.bedroomGroup.add(this.bedroomModel);
    this.buildBedroomEnvelope(fb, localFloorY);

    // hallway opening to dock against (world space; the hallway is already positioned)
    const frame = this.hallwayModel.getObjectByName('Frame_Bedroom');
    const frameBox = new THREE.Box3().setFromObject(frame);
    const openCenterZ = (frameBox.min.z + frameBox.max.z) / 2; // door centre along the bay wall
    const bedWallX = frameBox.min.x - BED_WALL_THICKNESS;       // inner face of the bedroom door wall

    // R = rot.y(+PI/2) maps local (x,_,z) -> world (z,_,-x), so the +Z door wall faces
    // +X toward the hallway. translate so the door-opening centre lands on the hallway
    // opening centre, floors aligned: world = position + R*local.
    this.bedroomGroup.rotation.y = Math.PI / 2;
    this.bedroomGroup.position.set(
      bedWallX - doorWallZ,
      this.floorY - localFloorY,
      openCenterZ + doorCenterX
    );

    this.scene.add(this.bedroomGroup);
    this.bedroomGroup.updateMatrixWorld(true);

    // a soft ceiling fill so the windowless room reads (proper lighting is deferred)
    const lamp = new THREE.PointLight('#ffe9cf', 6, 7, 2);
    const c = fb.getCenter(new THREE.Vector3());
    lamp.position.copy(this.bedroomGroup.localToWorld(new THREE.Vector3(c.x, localFloorY + BED_HEIGHT - 0.2, c.z)));
    this.scene.add(lamp);
  }

  // boxy envelope around the bedroom carpentry, built in bedroom-local space and added
  // to the bedroom group: three solid perimeter walls + the +Z door wall (the 0.2 wall
  // split around the opening, with a thin dark reveal) + ceiling.
  buildBedroomEnvelope(fb, fy) {
    const bx0 = fb.min.x, bx1 = fb.max.x;
    const bz0 = fb.min.z, bz1 = fb.max.z;   // bz1 = door wall (+Z)
    const top = fy + BED_HEIGHT;
    const wt = BED_PERIM_THICKNESS;
    const dt = BED_WALL_THICKNESS;          // door wall doubles as the inter-room wall
    const gx0 = BED_DOOR_LOCAL_X0, gx1 = BED_DOOR_LOCAL_X1;
    const doorTop = fy + BED_DOOR_HEIGHT;

    const wallMat = new THREE.MeshStandardMaterial({ color: '#a8b0b1', roughness: 0.95 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#cdd1d0', roughness: 1.0 });
    // reuse the hallway's bedroom-frame material so the reveal matches the other doors
    const frameSrc = this.hallwayModel.getObjectByName('Frame_Bedroom');
    const frameMat = (frameSrc && frameSrc.material)
      || new THREE.MeshStandardMaterial({ color: '#0b0503', roughness: 0.85 });

    const box = (minX, minY, minZ, maxX, maxY, maxZ, mat, name) => {
      const g = new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
      const m = new THREE.Mesh(g, mat);
      m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      m.name = name;
      this.bedroomGroup.add(m);
    };

    // three solid perimeter walls (behind the built-in carpentry)
    box(bx0 - wt, fy, bz0 - wt, bx0, top, bz1, wallMat, 'BedWall_xMin');
    box(bx1, fy, bz0 - wt, bx1 + wt, top, bz1, wallMat, 'BedWall_xMax');
    box(bx0 - wt, fy, bz0 - wt, bx1 + wt, top, bz0, wallMat, 'BedWall_zMin');

    // door wall (+Z): the 0.2 inter-room wall, split around the opening + lintel above.
    // names avoid the substring "door" so they aren't dropped by the furniture-door filter.
    box(bx0, fy, bz1, gx0, top, bz1 + dt, wallMat, 'BedWall_openLeft');
    box(gx1, fy, bz1, bx1, top, bz1 + dt, wallMat, 'BedWall_openRight');
    box(gx0, doorTop, bz1, gx1, top, bz1 + dt, wallMat, 'BedWall_lintel');

    // thin dark reveal lining the opening, skipped as a collider via the Frame_ prefix
    const jt = 0.04;
    box(gx0, fy, bz1, gx0 + jt, doorTop, bz1 + dt, frameMat, 'Frame_BedDoor_jambL');
    box(gx1 - jt, fy, bz1, gx1, doorTop, bz1 + dt, frameMat, 'Frame_BedDoor_jambR');
    box(gx0, doorTop - jt, bz1, gx1, doorTop, bz1 + dt, frameMat, 'Frame_BedDoor_head');

    // ceiling
    box(bx0 - wt, top, bz0 - wt, bx1 + wt, top + 0.02, bz1 + dt, ceilMat, 'Ceiling');
  }

  // dock the textured kitchen onto the hallway's bay-north opening (Leaf_Kitchen). the
  // glb is cabinetry + appliances only, so the model + a fully procedural envelope (floor,
  // walls, ceiling, doorway) ride in a group rotated -90 (CCW from top): the door lands on
  // the kitchen-local -X wall beside the cooktop, the +Z cooktop wall faces the bedroom.
  setKitchen() {
    const kit = this.resources.items.kitchen;
    if (!kit || !this.hallwayModel) return;

    this.kitchenModel = kit.scene;
    this.kitchenModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // local bounds of the cabinetry (no Floor node; the glb ships no floor)
    this.kitchenModel.updateMatrixWorld(true);
    const kb = new THREE.Box3().setFromObject(this.kitchenModel);
    const fy = kb.min.y;          // floor level = cabinetry underside
    const doorWallX = kb.min.x;   // -X wall carries the doorway
    const dcz = KIT_DOOR_LOCAL_Z; // door centre along that wall

    this.kitchenGroup = new THREE.Group();
    this.kitchenGroup.add(this.kitchenModel);
    this.buildKitchenEnvelope(kb, fy);

    // hallway opening to dock against (world space; the hallway is already positioned)
    const frame = this.hallwayModel.getObjectByName('Frame_Kitchen');
    const frameBox = new THREE.Box3().setFromObject(frame);
    const openCenterX = (frameBox.min.x + frameBox.max.x) / 2;
    const kitWallZ = frameBox.max.z + KIT_WALL_THICKNESS; // inner face of the kitchen door wall

    // rotation.y=-PI/2 maps local (x,_,z) -> world (-z,_,x): the -X door wall faces -Z
    // (toward the hallway). align the door-opening centre to the hallway opening centre,
    // floors level: world = position + R*local, so position = target - R*doorPoint.
    this.kitchenGroup.rotation.y = -Math.PI / 2;
    this.kitchenGroup.position.set(
      openCenterX + dcz,
      this.floorY - fy,
      kitWallZ - doorWallX
    );
    this.scene.add(this.kitchenGroup);
    this.kitchenGroup.updateMatrixWorld(true);

    // a soft ceiling fill for the windowless room (proper lighting deferred)
    const lamp = new THREE.PointLight('#fff1e0', 6, 8, 2);
    const c = kb.getCenter(new THREE.Vector3());
    lamp.position.copy(this.kitchenGroup.localToWorld(new THREE.Vector3(c.x, fy + KIT_HEIGHT - 0.2, c.z)));
    this.scene.add(lamp);
  }

  // fully procedural envelope for the kitchen (floor, three solid walls, the -X door wall
  // as the 0.2 inter-room wall + reveal, ceiling), built in kitchen-local space.
  buildKitchenEnvelope(kb, fy) {
    const bx0 = kb.min.x, bx1 = kb.max.x;   // bx0 = door wall (-X)
    const bz0 = kb.min.z, bz1 = kb.max.z;
    const top = fy + KIT_HEIGHT;
    const wt = KIT_PERIM_THICKNESS;
    const dt = KIT_WALL_THICKNESS;
    const w2 = KIT_DOOR_WIDTH / 2;
    const gz0 = KIT_DOOR_LOCAL_Z - w2, gz1 = KIT_DOOR_LOCAL_Z + w2;
    const doorTop = fy + KIT_DOOR_HEIGHT;

    const wallMat = new THREE.MeshStandardMaterial({ color: '#cfcabf', roughness: 0.92 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#e6e2d8', roughness: 1.0 });
    const floorMat = new THREE.MeshStandardMaterial({ color: '#7d7a73', roughness: 0.7 });
    const frameSrc = this.hallwayModel.getObjectByName('Frame_Kitchen');
    const frameMat = (frameSrc && frameSrc.material)
      || new THREE.MeshStandardMaterial({ color: '#0b0503', roughness: 0.85 });

    const box = (minX, minY, minZ, maxX, maxY, maxZ, mat, name) => {
      const g = new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
      const m = new THREE.Mesh(g, mat);
      m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      m.name = name;
      this.kitchenGroup.add(m);
    };

    // procedural floor (the glb has none)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(bx1 - bx0, bz1 - bz0), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((bx0 + bx1) / 2, fy, (bz0 + bz1) / 2);
    floor.receiveShadow = true;
    floor.name = 'Floor';
    this.kitchenGroup.add(floor);

    // three solid walls: cooktop (+Z, faces the bedroom after rotation), appliances (+X),
    // moduleL upper-cabinet wall (-Z)
    box(bx0 - dt, fy, bz1, bx1 + wt, top, bz1 + wt, wallMat, 'KitWall_zMax');
    box(bx1, fy, bz0 - wt, bx1 + wt, top, bz1 + wt, wallMat, 'KitWall_xMax');
    box(bx0 - dt, fy, bz0 - wt, bx1 + wt, top, bz0, wallMat, 'KitWall_zMin');

    // door wall (-X): the 0.2 inter-room wall, split around the opening + lintel above.
    // names avoid the substring "door" so they aren't dropped by the furniture-door filter.
    box(bx0 - dt, fy, bz0, bx0, top, gz0, wallMat, 'KitWall_openA');
    box(bx0 - dt, fy, gz1, bx0, top, bz1, wallMat, 'KitWall_openB');
    box(bx0 - dt, doorTop, gz0, bx0, top, gz1, wallMat, 'KitWall_lintel');

    // thin dark reveal lining the opening, skipped as a collider via the Frame_ prefix
    const jt = 0.04;
    box(bx0 - dt, fy, gz0, bx0, doorTop, gz0 + jt, frameMat, 'Frame_KitDoor_jambA');
    box(bx0 - dt, fy, gz1 - jt, bx0, doorTop, gz1, frameMat, 'Frame_KitDoor_jambB');
    box(bx0 - dt, doorTop - jt, gz0, bx0, doorTop, gz1, frameMat, 'Frame_KitDoor_head');

    // ceiling
    box(bx0 - dt, top, bz0 - wt, bx1 + wt, top + 0.02, bz1 + wt, ceilMat, 'Ceiling');
  }

  setTV() {
    this.tv = this.model.getObjectByName('TV_Screen');
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

  setDoors() {
    // joystick glass door: vertical hinge in world space, swings 90 deg
    const joystick = this.model.getObjectByName('Door_Joystick');
    if (joystick) {
      this.registerDoor(joystick, new THREE.Vector3(0, 1, 0), -Math.PI / 2, 'cabinet', 'world');
    }
    // upper flap doors: hinge about each door's own local axis (matches how
    // they were modelled), opened on local Y by 90 deg
    for (let i = 1; i <= 9; i++) {
      const node = this.model.getObjectByName(`Door_Upper_${String(i).padStart(2, '0')}`);
      if (node) {
        this.registerDoor(node, new THREE.Vector3(0, 1, 0), Math.PI / 2, 'cabinet', 'local');
      }
    }

    if (this.hallwayModel) this.setHallwayDoors();
  }

  // all the joined hallway's interactive doors. the hallway group is rotated pi about
  // Y, but 'world' hinges pre-multiply in the group's own frame, so the same axes/signs
  // as the hallway-on-its-own work (the swing is relative to the rotated group).
  setHallwayDoors() {
    const m = this.hallwayModel;
    const Y = new THREE.Vector3(0, 1, 0);
    const X = new THREE.Vector3(1, 0, 0);
    // leaves: the living-room one swings into the hallway (clear of the tv/switch wall);
    // the rest open into their (yet unbuilt) rooms, same as on their own
    const leaves = [
      ['Leaf_LivingRoom', Y, -Math.PI / 2, 'Living Room Door'],
      ['Leaf_Bathroom', Y, Math.PI / 2, 'Bathroom Door'],
      ['Leaf_Exit', Y, -Math.PI / 2, 'Front Door'],
      ['Leaf_Bedroom', Y, -Math.PI / 2, 'Bedroom Door'],
      ['Leaf_Kitchen', Y, -Math.PI / 2, 'Kitchen Door'],
    ];
    // portemanteau: left/right swing about vertical, middle doors flip about horizontal
    // (upper flaps up to the ceiling, lower drops down)
    const porte = [
      ['Porte_door_lower_left', Y, -Math.PI / 2],
      ['Porte_door_lower_right', Y, Math.PI / 2],
      ['Porte_door_lower_mid', X, -Math.PI / 2],
      ['Porte_door_upper_left', Y, -Math.PI / 2],
      ['Porte_door_upper_right', Y, Math.PI / 2],
      ['Porte_door_upper_mid', X, Math.PI / 2],
    ];
    for (const [name, axis, angle, label] of leaves) {
      const node = m.getObjectByName(name);
      if (node) this.registerDoor(node, axis, angle, label, 'world');
    }
    for (const [name, axis, angle] of porte) {
      const node = m.getObjectByName(name);
      if (node) this.registerDoor(node, axis, angle, 'cabinet', 'world');
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

  setInfo() {
    // first info hotspot (placeholder content); opens a DOM panel
    const node = this.model.getObjectByName('pc_plate_1');
    if (!node) return;
    node.userData.interactive = {
      prompt: () => 'read',
      toggle: () => this.experience.panel.open(
        'About me',
        '<p>Placeholder. This is where an about-me / projects blurb will go, opened diegetically from inside the room.</p>'
      ),
    };
    this.interactiveMeshes.push(node);
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

  setColliders() {
    // only block things that overlap the player's vertical span, so you can
    // still walk under the upper cabinets
    const feet = this.floorY + 0.1;
    const head = this.floorY + 1.7;
    const models = [this.model, this.hallwayModel, this.bedroomGroup, this.kitchenGroup].filter(Boolean);
    for (const model of models) {
      model.traverse((child) => {
        if (!child.isMesh) return;
        if (child.name === 'Floor' || child.name === 'Ceiling') return;
        // frames are thin trim around an opening, but their bbox fills the whole hole,
        // which would seal the doorway - skip them (the surrounding Wall_* meshes collide)
        if (child.name.startsWith('Frame_')) return;
        // every hallway door leaf is walk-through, open or closed - you pass through the
        // doorway gaps in the surrounding Wall_* meshes
        if (child.name.startsWith('Leaf_')) return;
        // cabinet/furniture doors never collide (open panels jut into walkways)
        if (child.name.toLowerCase().includes('door')) return;
        const box = new THREE.Box3().setFromObject(child);
        if (box.max.y < feet || box.min.y > head) return;
        this.colliders.push(box);
      });
    }
  }

  update() {}
}
