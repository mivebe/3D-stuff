import "./style.css";
import { PeerNetwork } from "./lib/peer-network.js";
import { damp } from "./lib/motion.js";
import { isEmbedded, openCompanion, readViewport } from "./lib/viewport.js";
import { createDust } from "./scene/dust.js";
import { createLinks } from "./scene/links.js";
import { createNodes } from "./scene/nodes.js";
import { createStage } from "./scene/stage.js";
import { TONES } from "./scene/palette.js";
import { createHud } from "./ui/hud.js";

const embedded = isEmbedded();
const touch = matchMedia("(pointer: coarse)").matches;
const forcedStandIns = new URLSearchParams(location.search).has("demo");
// nothing to track inside a frame, and a phone has one window by definition
const useStandIns = embedded || touch || forcedStandIns;
const motion = matchMedia("(prefers-reduced-motion: reduce)").matches
  ? 0.12
  : 1;

const stage = createStage(document.getElementById("stage"));
const nodes = createNodes(stage.world);
const links = createLinks(stage.world);
const dust = createDust(stage.world);

const hud = createHud({
  onSpawn: () => {
    if (!embedded) return openCompanion();
    window.open(location.href, "_blank", "noopener");
    return true;
  },
});

const network = new PeerNetwork({
  onRoster: (peers) => hud.setRoster([...peers, ...standIns], network.id),
});

const standIns = [];

network.join(readViewport());
hud.setAccent(network.self.tone);
if (embedded) hud.markEmbedded();
if (embedded || touch) hud.setMode(embedded ? "embedded" : "touch");
if (useStandIns) standIns.push(...createStandIns(network.self.tone));
hud.setRoster([...network.roster(), ...standIns], network.id);

let lastFrame = performance.now();
let lastWidth = 0;
let lastHeight = 0;
let lastRatio = 0;
let settleUntil = performance.now() + 600;
let started = false;

function createStandIns(selfTone, count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-${i + 1}`,
    tone: (selfTone + 2 + i * 2) % TONES.length,
    simulated: true,
    // always sort after the real windows
    joinedAt: Number.MAX_SAFE_INTEGER - count + i,
    phase: i * 2.4,
    rect: { x: 0, y: 0, w: 0, h: 0 },
  }));
}

function driftStandIns(view, time) {
  for (const peer of standIns) {
    const w = Math.round(view.w * 0.5);
    const h = Math.round(view.h * 0.5);
    const t = time * 0.22 * motion + peer.phase;
    const x = view.x + view.w * (0.5 + Math.sin(t) * 0.32) - w / 2;
    const y = view.y + view.h * (0.5 + Math.cos(t * 0.83) * 0.28) - h / 2;
    peer.rect = { x: Math.round(x), y: Math.round(y), w, h };
  }
}

function frame(now) {
  const elapsed = (now - lastFrame) / 1000;
  const dt = Math.min(elapsed, 0.05);
  lastFrame = now;

  const view = readViewport();
  network.update(view);
  const time = network.now();

  if (
    view.w !== lastWidth ||
    view.h !== lastHeight ||
    devicePixelRatio !== lastRatio
  ) {
    lastWidth = view.w;
    lastHeight = view.h;
    lastRatio = devicePixelRatio;
    stage.resize(view.w, view.h);
  }

  // hold the camera still against the desktop while the window slides under it,
  // then let it catch up. a long gap means the tab was asleep, so skip the ease.
  const snap = now < settleUntil || elapsed > 0.4;
  stage.world.position.x = snap
    ? -view.x
    : damp(stage.world.position.x, -view.x, 9, dt);
  stage.world.position.y = snap
    ? view.y
    : damp(stage.world.position.y, view.y, 9, dt);

  if (standIns.length) driftStandIns(view, time);

  const peers = [...network.roster(), ...standIns];
  const live = nodes.update(peers, time, dt, motion);
  links.update(live, time, motion);
  dust.update(live, view, time, dt, motion, snap);

  stage.render();
  hud.setReadout(network.id, view, !embedded);

  if (!started) {
    started = true;
    hud.ready();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
