import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  DEF_ASPECT,
  DEF_FOV,
  DEF_NEAR,
  DEF_FAR,
  DEF_WORLD_SIZE,
  DEF_HEIGHT,
  DEF_BPS,
} from './config';
import World from './world/world';
import Lights from './lights';
import DevUI from './dev-ui/dev-ui';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x87ceeb);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(DEF_FOV, DEF_ASPECT, DEF_NEAR, DEF_FAR);
camera.position.set(-DEF_BPS / 2, DEF_HEIGHT * 2, -DEF_BPS / 2);
camera.lookAt(DEF_WORLD_SIZE / 2, 0, DEF_HEIGHT);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(DEF_WORLD_SIZE / 2, 0, DEF_WORLD_SIZE / 2);

const scene = new THREE.Scene();
const world = new World(DEF_WORLD_SIZE);
const lights = new Lights();
scene.add(world);
scene.add(lights);

const devUI = new DevUI();
devUI.init(world, camera, renderer);

function animate() {
  requestAnimationFrame(animate);

  // controls.update();
  renderer.render(scene, camera);
  devUI.stats.update();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
