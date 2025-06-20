import * as THREE from 'three';
import config from './config.js';

import Sizes from './utils/Sizes.js';
import Time from './utils/Time.js';
import Resources from './utils/Resources.js';
import assets from './utils/assets.js';

import Camera from './Camera.js';
import Theme from './Theme.js';
import Renderer from './Renderer.js';
import Preloader from './Preloader.js';

import World from './features/World.js';
import Controls from './features/Controls.js';

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
    this.theme = new Theme(config.theme);
    this.world = new World();
    this.preloader = new Preloader();

    this.preloader.on('enablecontrols', () => this.controls = new Controls());

    this.sizes.on('resize', () => this.resize());
    this.time.on('update', () => this.update());
  }

  resize() {
    this.camera.resize();
    this.world.resize();
    this.renderer.resize();
  }

  update() {
    this.preloader.update();
    this.camera.update();
    this.world.update();
    this.renderer.update();

    this.controls && this.controls.update();
  }
}