import { EventEmitter } from 'events';
import App from '../App.js';

import Environment from './Environment.js';
import Room from './Room.js';

export default class World extends EventEmitter {
  constructor() {
    super();

    this.experience = new App();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;

    this.resources.on('ready', () => {
      this.environment = new Environment();
      this.room = new Room();
      this.emit('worldready');
    });
  }

  resize() {}

  update() {
    this.room && this.room.update();
  }
}
