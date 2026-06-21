import * as THREE from 'three';

import Sizes from './utils/Sizes.js';
import Time from './utils/Time.js';
import Resources from './utils/Resources.js';
import assets from './utils/assets.js';

import Camera from './Camera.js';
import Renderer from './Renderer.js';

import World from './features/World.js';
import Player from './features/Player.js';
import Panel from './features/Panel.js';
import Interaction from './features/Interaction.js';

export default class App {
  static instance;

  constructor(canvas) {
    if (App.instance) return App.instance;

    App.instance = this;
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.time = new Time();
    this.sizes = new Sizes();
    this.camera = new Camera();
    this.renderer = new Renderer();
    this.resources = new Resources(assets);
    this.world = new World();

    this.world.on('worldready', () => this.onWorldReady());

    this.sizes.on('resize', () => this.resize());
    this.time.on('update', () => this.update());
  }

  onWorldReady() {
    this.player = new Player();
    this.panel = new Panel();
    this.interaction = new Interaction();

    const loading = document.querySelector('.loading');
    const start = document.querySelector('.start');
    loading && loading.classList.add('hidden');
    start && start.classList.remove('hidden');
    start && start.addEventListener('click', () => {
      start.classList.add('hidden');
      this.player.lock();
    });
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  update() {
    this.camera.update();
    this.player && this.player.update();
    this.interaction && this.interaction.update();
    this.world.update();
    this.renderer.update();
  }
}
