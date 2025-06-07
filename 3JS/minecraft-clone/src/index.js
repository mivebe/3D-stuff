import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const bps = 16; // Blocks per side
const worldSize = bps * 2; // Size of the world in blocks

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x87ceeb); // Sky blue background
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-worldSize, bps, -worldSize);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(bps, 0, bps);

const scene = new THREE.Scene();

function setupLights() {
  const light1 = new THREE.DirectionalLight(0xffffff, 1);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1);
  light2.position.set(1, 1, 1);
  scene.add(light2);

  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  ambient.position.set(-1, 1, -0.5);
  scene.add(ambient);
}

function setupWorld(size) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(x, 0, z);
      scene.add(cube);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}

setupLights();
setupWorld(worldSize);
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
