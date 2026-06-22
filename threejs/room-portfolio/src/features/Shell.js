import * as THREE from 'three';
import gsap from 'gsap';
import App from '../App.js';

// simple low-poly room envelope around the built-in furniture: the carpentry
// files have no walls/ceiling, so we build them procedurally from the floor bounds
const HEIGHT = 2.6;

// cool blue-grey wall paint (from the real room reference photo)
const WALL_COLOR = '#a8b0b1';
const CEIL_COLOR = '#cdd1d0';

// under-wall led accent (red strip glow at the floor line)
const LED_COLOR = '#ff1d1d';
const LED_HEIGHT = 0.045;
const LED_INTENSITY = 2.2;

export default class Shell {
  constructor() {
    this.experience = new App();
    this.scene = this.experience.scene;
    this.room = this.experience.world.room;
    this.ledOn = true;
    // doorway cut in the tv wall where the hallway joins (set by Room when joined)
    this.gap = this.room.doorGap;
    this.build();
  }

  build() {
    const fb = this.room.floorBounds;
    this.x0 = fb.min.x;
    this.x1 = fb.max.x;
    this.z0 = fb.min.z;
    this.z1 = fb.max.z;
    this.y0 = this.room.floorY;
    const lenX = this.x1 - this.x0;
    const lenZ = this.z1 - this.z0;

    const wallMat = new THREE.MeshStandardMaterial({
      color: WALL_COLOR, roughness: 0.95, side: THREE.DoubleSide,
    });
    const ceilMat = new THREE.MeshStandardMaterial({ color: CEIL_COLOR, roughness: 1.0 });

    this.group = new THREE.Group();

    // tv wall carries the doorway to the hallway; the two end walls are solid planes
    if (this.gap) this.doorWall(this.x0, this.z0, this.z1, this.y0, this.gap, wallMat);
    else this.wall(lenZ, this.x0, (this.z0 + this.z1) / 2, Math.PI / 2, wallMat);
    this.wall(lenX, (this.x0 + this.x1) / 2, this.z0, 0, wallMat);
    this.wall(lenX, (this.x0 + this.x1) / 2, this.z1, 0, wallMat);

    // opposite long wall carries a window opening
    this.windowWall(this.x1, this.z0, this.z1, this.y0, lenZ, wallMat);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(lenX, lenZ), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((this.x0 + this.x1) / 2, this.y0 + HEIGHT, (this.z0 + this.z1) / 2);
    ceiling.receiveShadow = true;
    this.group.add(ceiling);

    this.scene.add(this.group);

    if (this.gap) this.buildDoorFrame(this.gap);
    this.addWallColliders();
    this.buildLedStrip();
    this.buildSwitch();
  }

  // line the doorway through the wall thickness: a reveal (the two jambs + head running
  // the full 0.2 depth back to the hallway's modelled frame) plus casing trim on the
  // living-room face. visual only - collision is handled by the split wall colliders.
  buildDoorFrame(gap) {
    const depth = gap.depth || 0.2;
    const xIn = this.x0;          // living-room wall face
    const xBack = this.x0 - depth; // hallway wall face
    const top = gap.top;
    // reuse the hallway's own frame material so this reveal matches the other doors exactly
    // (the glb color is linear-space, so reusing the instance avoids any conversion mismatch)
    const frameSrc = this.room.hallwayModel && this.room.hallwayModel.getObjectByName('Frame_LivingRoom');
    const frameMat = frameSrc
      ? frameSrc.material
      : new THREE.MeshStandardMaterial({ color: '#0b0503', roughness: 0.85 });

    const box = (minX, minY, minZ, maxX, maxY, maxZ, mat) => {
      const g = new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
      const m = new THREE.Mesh(g, mat);
      m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
    };

    const jt = 0.04; // reveal lining thickness
    // reveal lining through the wall depth (sits just outside the opening so it never
    // narrows the walkable gap)
    box(xBack, this.y0, gap.zMin - jt, xIn, top, gap.zMin, frameMat);       // jamb -z
    box(xBack, this.y0, gap.zMax, xIn, top, gap.zMax + jt, frameMat);       // jamb +z
    box(xBack, top, gap.zMin - jt, xIn, top + jt, gap.zMax + jt, frameMat); // head

    const ct = 0.03; // casing depth into the room
    const fw = 0.05; // casing face width
    box(xIn, this.y0, gap.zMin - fw, xIn + ct, top + fw, gap.zMin, frameMat);       // casing -z
    box(xIn, this.y0, gap.zMax, xIn + ct, top + fw, gap.zMax + fw, frameMat);       // casing +z
    box(xIn, top, gap.zMin - fw, xIn + ct, top + fw, gap.zMax + fw, frameMat);      // casing head
  }

  // tv wall with a door-shaped notch at the floor; outline runs around the opening
  // (cleaner than a Shape hole that shares the bottom edge). doublesided, so facing
  // is irrelevant. u maps to world +z from z0, v to world y from y0.
  doorWall(x, z0, z1, y0, gap, mat) {
    const lenZ = z1 - z0;
    const uMin = gap.zMin - z0;
    const uMax = gap.zMax - z0;
    const doorH = gap.top - y0;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(uMin, 0);
    shape.lineTo(uMin, doorH);
    shape.lineTo(uMax, doorH);
    shape.lineTo(uMax, 0);
    shape.lineTo(lenZ, 0);
    shape.lineTo(lenZ, HEIGHT);
    shape.lineTo(0, HEIGHT);
    shape.lineTo(0, 0);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    mesh.position.set(x, y0, z0);
    mesh.rotation.y = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // thin boxes behind each procedural wall so the player is penned in (the clampToFloor
  // pen is gone now that the room opens into the hallway). the tv wall splits at the door.
  addWallColliders() {
    const t = 0.12;
    const y0 = this.y0;
    const y1 = this.y0 + HEIGHT;
    const box = (minX, minZ, maxX, maxZ) => this.room.colliders.push(
      new THREE.Box3(new THREE.Vector3(minX, y0, minZ), new THREE.Vector3(maxX, y1, maxZ))
    );
    box(this.x0, this.z0 - t, this.x1, this.z0);   // end wall z0
    box(this.x0, this.z1, this.x1, this.z1 + t);   // end wall z1
    box(this.x1, this.z0, this.x1 + t, this.z1);   // window wall
    if (this.gap) {
      box(this.x0 - t, this.z0, this.x0, this.gap.zMin);
      box(this.x0 - t, this.gap.zMax, this.x0, this.z1);
    } else {
      box(this.x0 - t, this.z0, this.x0, this.z1);
    }
  }

  wall(width, cx, cz, rotY, mat) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, HEIGHT), mat);
    mesh.position.set(cx, this.room.floorY + HEIGHT / 2, cz);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  windowWall(x, z0, z1, y0, width, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, HEIGHT);
    shape.lineTo(0, HEIGHT);
    shape.lineTo(0, 0);

    const winW = 1.8;
    const winH = 1.3;
    const sill = 0.95;
    const center = width / 2;
    const hole = new THREE.Path();
    hole.moveTo(center - winW / 2, sill);
    hole.lineTo(center + winW / 2, sill);
    hole.lineTo(center + winW / 2, sill + winH);
    hole.lineTo(center - winW / 2, sill + winH);
    hole.lineTo(center - winW / 2, sill);
    shape.holes.push(hole);

    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    // shape u maps to world +z (from z0), shape v to world y (from y0)
    mesh.position.set(x, y0, z0);
    mesh.rotation.y = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    // emissive sky panel just outside, so the opening reads as daylight
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(winW + 0.2, winH + 0.2),
      new THREE.MeshBasicMaterial({ color: '#bcd6ff' })
    );
    sky.position.set(x + 0.08, y0 + sill + winH / 2, (z0 + z1) / 2);
    sky.rotation.y = -Math.PI / 2;
    this.group.add(sky);

    // daylight pooling in from the window
    const day = new THREE.PointLight('#cfe0ff', 4, 7, 2);
    day.position.set(x - 0.4, y0 + sill + winH / 2, (z0 + z1) / 2);
    this.group.add(day);
  }

  // emissive red line at the wall/floor junction on all four walls, plus a few
  // point lights so the glow actually spills onto the floor
  buildLedStrip() {
    this.led = new THREE.Group();
    this.ledMat = new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: LED_COLOR,
      emissiveIntensity: LED_INTENSITY,
      roughness: 0.5,
    });
    const y = this.y0 + LED_HEIGHT / 2 + 0.005;
    const cx = (this.x0 + this.x1) / 2;
    const cz = (this.z0 + this.z1) / 2;
    const inset = 0.012;
    const lenX = this.x1 - this.x0;
    const lenZ = this.z1 - this.z0;

    // tv wall: skip the doorway gap so the strip stops at each jamb
    if (this.gap) {
      const aLen = this.gap.zMin - this.z0;
      const bLen = this.z1 - this.gap.zMax;
      if (aLen > 0.02) this.ledSegment(aLen, this.x0 + inset, (this.z0 + this.gap.zMin) / 2, Math.PI / 2);
      if (bLen > 0.02) this.ledSegment(bLen, this.x0 + inset, (this.gap.zMax + this.z1) / 2, Math.PI / 2);
    } else {
      this.ledSegment(lenZ, this.x0 + inset, cz, Math.PI / 2);
    }
    this.ledSegment(lenZ, this.x1 - inset, cz, -Math.PI / 2);  // window wall (-x facing)
    this.ledSegment(lenX, cx, this.z0 + inset, 0);             // end wall (+z facing)
    this.ledSegment(lenX, cx, this.z1 - inset, Math.PI);       // end wall (-z facing)

    // sparse floor spill: keeps the red bounce without a light per led
    this.ledLights = [];
    const glowY = this.y0 + 0.12;
    const spots = [
      [this.x0 + lenX * 0.25, this.z0 + 0.2],
      [this.x0 + lenX * 0.75, this.z0 + 0.2],
      [this.x0 + lenX * 0.25, this.z1 - 0.2],
      [this.x0 + lenX * 0.75, this.z1 - 0.2],
    ];
    for (const [lx, lz] of spots) {
      const light = new THREE.PointLight(LED_COLOR, 1.4, 2.6, 2);
      light.position.set(lx, glowY, lz);
      this.led.add(light);
      this.ledLights.push(light);
    }

    this.scene.add(this.led);
  }

  ledSegment(width, cx, cz, rotY) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, LED_HEIGHT), this.ledMat);
    mesh.position.set(cx, this.y0 + LED_HEIGHT / 2 + 0.005, cz);
    mesh.rotation.y = rotY;
    this.led.add(mesh);
  }

  // glass touch switch (black panel + glowing ring buttons), interactive: the
  // first ring controls the led strip and flips red<->blue with its state
  buildSwitch() {
    // on the tv wall, in the gap between the doorway and the tv cabinet
    const px = this.x0 + 0.006;
    const py = this.y0 + 1.3;
    const pz = this.gap ? this.gap.zMax + 0.16 : this.z0 + 0.55;

    const panelW = 0.17;
    const panelH = 0.085;
    const buttons = 4;

    const group = new THREE.Group();
    group.position.set(px, py, pz);
    group.rotation.y = Math.PI / 2; // faces +x, into the room

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, panelH, 0.012),
      new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.15, metalness: 0.2 })
    );
    group.add(panel);

    const ringGeo = new THREE.TorusGeometry(0.012, 0.0028, 12, 24);
    this.switchRings = [];
    const step = panelW / buttons;
    const start = -panelW / 2 + step / 2;
    for (let i = 0; i < buttons; i++) {
      // ring 0 mirrors the led state (blue = on), the rest are decorative
      const color = i === 0 && !this.ledOn ? LED_COLOR : '#1d6bff';
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: 2.5 })
      );
      ring.position.set(start + i * step, 0, 0.008);
      group.add(ring);
      this.switchRings.push(ring);
    }

    this.scene.add(group);
    this.switch = group;

    // the panel is the hit target for the crosshair
    panel.userData.interactive = {
      prompt: () => (this.ledOn ? 'turn off led strip' : 'turn on led strip'),
      toggle: () => this.toggleLed(),
    };
    this.room.interactiveMeshes.push(panel);
  }

  toggleLed() {
    this.ledOn = !this.ledOn;
    const target = this.ledOn ? LED_INTENSITY : 0;
    gsap.to(this.ledMat, { emissiveIntensity: target, duration: 0.35 });
    for (const light of this.ledLights) {
      gsap.to(light, { intensity: this.ledOn ? 1.4 : 0, duration: 0.35 });
    }
    // first ring mirrors state: blue when active, red when off (matches photo)
    const ring = this.switchRings[0];
    ring.material.emissive = new THREE.Color(this.ledOn ? '#1d6bff' : LED_COLOR);
    ring.material.needsUpdate = true;
  }

  resize() {}
  update() {}
}
