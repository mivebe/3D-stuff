import * as THREE from 'three';
import gsap from 'gsap';
import App from '../App.js';

const EYE_HEIGHT = 1.6;

export default class Room {
  constructor() {
    this.experience = new App();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    // meshes the crosshair can hit, and boxes the player collides with
    this.interactiveMeshes = [];
    this.colliders = [];
    this.doors = [];

    this.setModel();
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
    this.model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name === 'Floor') return;
      if (child.name.startsWith('Door_')) return;
      const box = new THREE.Box3().setFromObject(child);
      if (box.max.y < feet || box.min.y > head) return;
      this.colliders.push(box);
    });
  }

  update() {}
}
