import GUI from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export default class DevUI extends GUI {
  constructor() {
    super();

    this.worldDeboundce = null;
  }

  /**
   * Initializes the DevUI with the given world, camera, and renderer.
   * @param {import('../world')} world - The world object to control.
   * @param {THREE.PerspectiveCamera} camera - The camera object for the scene.
   * @param {THREE.WebGLRenderer} renderer - The renderer for the scene.
   */
  init(world, camera, renderer) {
    this.createStatsUI();
    this.createWorldUI(world);
    this.createCameradUI(camera);
    this.createRendereUI(renderer);
  }

  createStatsUI() {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  createWorldUI(world) {
    this.add(world, 'size', 16, 128, 1)
      .name('World Size')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, 'Regenerating world...'));
    this.add(world, 'height', 16, 64, 1)
      .name('World Height')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, 'Regenerating world...'));
  }

  createCameradUI(camera) {
    console.log(camera);
  }

  createRendereUI(renderer) {
    console.log(renderer);
  }

  debounceUpdate(timeoutName, object, message) {
    if (this[timeoutName]) clearTimeout(this[timeoutName]);

    this[timeoutName] = setTimeout(() => {
      if (message) console.log(message);

      object.regenerate?.();
      clearTimeout(this[timeoutName]);
      this[timeoutName] = null;
    }, 500);
  }
}
