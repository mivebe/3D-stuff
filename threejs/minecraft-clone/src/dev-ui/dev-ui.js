import GUI from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { blocks, resourcesList } from '../blocks';
import { DEF_HEIGHT } from '../config';

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
    // `world` is the ChunkManager: chunks are a fixed CHUNK_SIZE, so there's no
    // world-size control; height + params changes regenerate all loaded chunks.
    const worldFolder = this.addFolder('World');
    worldFolder
      .add(world, 'height', DEF_HEIGHT / 2, DEF_HEIGHT * 2, 1)
      .name('World Height')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, 'Regenerating world...'));
    worldFolder
      .add(
        {
          clearEdits: () => {
            world.clearSavedEdits();
            world.regenerate();
          },
        },
        'clearEdits'
      )
      .name('Clear Saved Edits');

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

    const waterFolder = this.addFolder('Water');
    waterFolder
      .add(world.params.water, 'enabled')
      .name('Enabled')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    waterFolder
      .add(world.params.water, 'seaLevel', 0, DEF_HEIGHT * 2, 1)
      .name('Sea Level')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    waterFolder.close();

    const treesFolder = this.addFolder('Trees');
    treesFolder
      .add(world.params.trees, 'density', 0, 0.3, 0.01)
      .name('Density')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    treesFolder
      .add(world.params.trees, 'spacing', 1, 12, 1)
      .name('Spacing')
      .onChange(() => this.debounceUpdate('worldDeboundce', world, '', 0));
    treesFolder.close();

    const resourcesFolder = this.addFolder('Resources');
    const onResourceChange = () => this.debounceUpdate('worldDeboundce', world, '', 0);
    resourcesList.forEach(({ name, resource }) => {
      const folder = resourcesFolder.addFolder(name);
      folder.add(resource, 'abundance', 0.01, 1, 0.01).name('Abundance').onChange(onResourceChange);

      if (resource.type === 'cluster') {
        folder
          .add(resource, 'clusterDensity', 0, 1, 0.01)
          .name('Cluster Density')
          .onChange(onResourceChange);
      } else if (resource.type === 'vein') {
        folder.add(resource, 'min', 1, 10, 1).name('Vein Min').onChange(onResourceChange);
        folder.add(resource, 'max', 1, 10, 1).name('Vein Max').onChange(onResourceChange);
      }
    });
    resourcesFolder.close();
  }

  /**
   * Adds player movement controls.
   * @param {import('../player/player').default} player
   */
  createPlayerUI(player) {
    const folder = this.addFolder('Player');
    folder.add(player, 'speed', 1, 100, 1).name('Move Speed');
    folder.add(player, 'fly').name('Fly Mode (F)').listen();
  }

  createCameradUI(camera) {
    // console.log(camera);
  }

  createRendereUI(renderer) {
    // console.log(renderer);
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
