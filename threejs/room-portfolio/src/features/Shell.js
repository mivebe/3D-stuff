import * as THREE from 'three';
import App from '../App.js';

// simple low-poly room envelope around the built-in furniture: the carpentry
// files have no walls/ceiling, so we build them procedurally from the floor bounds
const HEIGHT = 2.6;

export default class Shell {
  constructor() {
    this.experience = new App();
    this.scene = this.experience.scene;
    this.room = this.experience.world.room;
    this.build();
  }

  build() {
    const fb = this.room.floorBounds;
    const x0 = fb.min.x;
    const x1 = fb.max.x;
    const z0 = fb.min.z;
    const z1 = fb.max.z;
    const y0 = this.room.floorY;
    const lenX = x1 - x0;
    const lenZ = z1 - z0;

    const wallMat = new THREE.MeshStandardMaterial({
      color: '#c7b496', roughness: 0.95, side: THREE.DoubleSide,
    });
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#d9cdb7', roughness: 1.0 });

    this.group = new THREE.Group();

    // tv wall and the two end walls are solid planes
    this.wall(lenZ, x0, (z0 + z1) / 2, Math.PI / 2, wallMat);
    this.wall(lenX, (x0 + x1) / 2, z0, 0, wallMat);
    this.wall(lenX, (x0 + x1) / 2, z1, 0, wallMat);

    // opposite long wall carries a window opening
    this.windowWall(x1, z0, z1, y0, lenZ, wallMat);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(lenX, lenZ), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((x0 + x1) / 2, y0 + HEIGHT, (z0 + z1) / 2);
    ceiling.receiveShadow = true;
    this.group.add(ceiling);

    this.scene.add(this.group);
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

  resize() {}
  update() {}
}
