import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { DEF_ASPECT, DEF_FOV, DEF_NEAR, DEF_FAR, DEF_WORLD_SIZE } from './config';
import { World } from './world';
import { Lights } from './lights';

const stats = new Stats();
document.body.appendChild(stats.dom);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x87ceeb); // Sky blue background
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(DEF_FOV, DEF_ASPECT, DEF_NEAR, DEF_FAR);
camera.position.set(-DEF_WORLD_SIZE, DEF_WORLD_SIZE, -DEF_WORLD_SIZE);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(DEF_WORLD_SIZE, 0, DEF_WORLD_SIZE);

const scene = new THREE.Scene();
const world = new World(DEF_WORLD_SIZE);
const lights = new Lights();
scene.add(world);
scene.add(lights);

function animate() {
  requestAnimationFrame(animate);

  // controls.update();
  renderer.render(scene, camera);
  stats.update();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
