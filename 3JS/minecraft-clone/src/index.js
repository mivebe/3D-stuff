import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DEF_ASPECT, DEF_BPS, DEF_FOV, DEF_NEAR, DEF_FAR, DEF_WORLD_SIZE } from './config';
import { World } from './world';
import { Lights } from './lights';

const { innerWidth, innerHeight, devicePixelRatio, addEventListener } = window;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.setClearColor(0x87ceeb); // Sky blue background
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(DEF_FOV, DEF_ASPECT, DEF_NEAR, DEF_FAR);
camera.position.set(-DEF_WORLD_SIZE, DEF_BPS, -DEF_WORLD_SIZE);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(DEF_BPS, 0, DEF_BPS);

const scene = new THREE.Scene();
const world = new World(DEF_BPS);
const lights = new Lights();
scene.add(world);
scene.add(lights);

function animate() {
  requestAnimationFrame(animate);

  // controls.update();
  renderer.render(scene, camera);
}

animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
