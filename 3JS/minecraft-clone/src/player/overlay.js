/**
 * Builds the click-to-play overlay shown whenever the pointer isn't locked.
 * @param {() => void} onPlay - called when the user clicks to start.
 * @returns {{ show: () => void, hide: () => void, el: HTMLElement }}
 */
export const createOverlay = (onPlay) => {
  const el = document.createElement('div');
  el.id = 'overlay';
  el.innerHTML = `
    <div class="overlay-panel">
      <h1>Click to play</h1>
      <p><b>WASD</b> move &middot; <b>Space</b> jump &middot; <b>F</b> toggle fly</p>
      <p>In fly: <b>Space / Shift</b> up &amp; down</p>
      <p><b>Mouse</b> look &middot; <b>Esc</b> release</p>
    </div>
  `;
  el.addEventListener('click', onPlay);
  document.body.appendChild(el);

  return {
    el,
    show: () => {
      el.style.display = 'flex';
    },
    hide: () => {
      el.style.display = 'none';
    },
  };
};
