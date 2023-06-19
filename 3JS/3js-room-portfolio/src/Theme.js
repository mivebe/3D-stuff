import { EventEmitter } from 'events';

export default class Theme extends EventEmitter {
  constructor(config) {
    super();

    this.theme = config.default;
    this.states = config.states;

    this._init();
    this._attachListeners();
  }

  _init() {
    this.main = document.body;
    this.toggleButton = document.querySelector('.toggle-button');
    this.indicator = document.querySelector('.toggle-circle');
    this.onIndicator = document.querySelector('sun-wrapper');
    this.offIndicator = document.querySelector('moon-wrapper');
  }

  _toggle() {
    this.indicator.classList.toggle('slide');
    this.theme = !this.theme;
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');

    this.emit('switch', this.theme);
  }

  _attachListeners() {
    this.toggleButton.addEventListener('click', () => this._toggle());
  }
}
