import GUI from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { blocks, resourcesList } from '../blocks';

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
    const worldFolder = this.addFolder('World');
    worldFolder
      .add(world, 'size', 16, 128, 1)
      .name('World Size')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, 'Regenerating world...'));
    worldFolder
      .add(world, 'height', 16, 64, 1)
      .name('World Height')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, 'Regenerating world...'));

    const noiseFolder = this.addFolder('Noise');
    noiseFolder
      .add(world.params.terrain, 'scale', 10, 100)
      .name('Scale')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    noiseFolder
      .add(world.params.terrain, 'magnitude', 0, 1)
      .name('Magnitude')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    noiseFolder
      .add(world.params.terrain, 'offset', 0, 1)
      .name('Offset')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));

    const resourcesFolder = this.addFolder('Resources');
    resourcesList.forEach((resource) => {
      const singleResourcFolder = resourcesFolder.addFolder(resource.name);
      singleResourcFolder
        .add(blocks[resource.name].resource, 'abundance', 0.01, 0.99, 0.01)
        .name('Abundance')
        .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
      singleResourcFolder
        .add(blocks[resource.name].resource.clusterSize, 'cx', 10, 100, 1)
        .name('Cluster Size X')
        .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
      singleResourcFolder
        .add(blocks[resource.name].resource.clusterSize, 'cy', 10, 100, 1)
        .name('Cluster Size Y')
        .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
      singleResourcFolder
        .add(blocks[resource.name].resource.clusterSize, 'cz', 10, 100, 1)
        .name('Cluster Size Z')
        .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    });
  }

  createCameradUI(camera) {
    console.log(camera);
  }

  createRendereUI(renderer) {
    console.log(renderer);
  }

  debounceUpdate(timeoutName, object, message, delay = 500) {
    if (this[timeoutName]) clearTimeout(this[timeoutName]);

    this[timeoutName] = setTimeout(() => {
      if (message) console.log(message);

      object.regenerate?.();
      clearTimeout(this[timeoutName]);
      this[timeoutName] = null;
    }, delay);
  }
}
