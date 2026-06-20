import * as THREE from 'three';
import { DEF_ASPECT, DEF_FOV, DEF_NEAR, DEF_FAR, DEF_HEIGHT } from './config';
import ChunkManager from './world/chunkManager';
import Lights from './lights';
import DevUI from './dev-ui/dev-ui';
import Player from './player/player';
import Editor from './player/editor';
import { createOverlay } from './player/overlay';
import { loadPlayerState, savePlayerState } from './world/persistence';

// gui sprite lives in public/; expose it base-relative so the css works whether
// served at root or under a subpath (dashboard iframe)
document.documentElement.style.setProperty(
  '--widgets-url',
  `url(${import.meta.env.BASE_URL}textures/gui/widgets.png)`,
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x87ceeb);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(DEF_FOV, DEF_ASPECT, DEF_NEAR, DEF_FAR);

const scene = new THREE.Scene();
const world = new ChunkManager(DEF_HEIGHT);
const lights = new Lights();
scene.add(world);
scene.add(lights);

// Restore the saved player position (or spawn at the origin), loading that area
// first so there's ground to stand on.
const saved = loadPlayerState(world.params.seed);
const spawnX = saved ? saved.x : 0.5;
const spawnZ = saved ? saved.z : 0.5;
world.update(spawnX, spawnZ);

const isSolid = (x, y, z) => world.isSolidWorld(x, y, z);
const player = new Player(camera, renderer.domElement, isSolid);
if (saved) {
  player.setPosition(saved.x, saved.y, saved.z);
  if (saved.q) camera.quaternion.set(...saved.q); // restore look direction
} else {
  player.setPosition(0.5, world.surfaceHeightWorld(0, 0), 0.5);
}

// Persist position + look direction periodically and before unload.
const savePlayer = () =>
  savePlayerState(world.params.seed, {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    q: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
  });
setInterval(savePlayer, 3000);
window.addEventListener('beforeunload', savePlayer);

const editor = new Editor(camera, world, player, scene);

// Crosshair for aiming block edits.
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
document.body.appendChild(crosshair);

// Click-to-play overlay; pointer lock drives play/pause.
const overlay = createOverlay(() => player.lock());
player.controls.addEventListener('lock', () => overlay.hide());
player.controls.addEventListener('unlock', () => overlay.show());

const devUI = new DevUI();
devUI.init(world, camera, renderer);
devUI.createPlayerUI(player);

const timer = new THREE.Timer();
function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const dt = timer.getDelta();
  player.update(dt);
  world.update(player.position.x, player.position.z); // stream chunks around player
  editor.update();
  renderer.render(scene, camera);
  devUI.stats.update();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
