import App from '../App.js';

// DOM overlay for info hotspots: releases pointer-lock to read, Esc re-locks
export default class Panel {
  constructor() {
    this.experience = new App();
    this.el = document.querySelector('.panel');
    this.titleEl = document.querySelector('.panel-title');
    this.bodyEl = document.querySelector('.panel-body');
    this.isOpen = false;

    const close = document.querySelector('.panel-close');
    close && close.addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isOpen) this.close();
    });
  }

  open(title, html) {
    if (this.titleEl) this.titleEl.textContent = title;
    if (this.bodyEl) this.bodyEl.innerHTML = html;
    this.el && this.el.classList.remove('hidden');
    this.isOpen = true;
    document.exitPointerLock();
  }

  close() {
    this.el && this.el.classList.add('hidden');
    this.isOpen = false;
    const player = this.experience.player;
    player && player.lock();
  }
}
