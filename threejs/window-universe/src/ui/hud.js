import { toneHex } from "../scene/palette.js";

// the readout is the point of the interface: it shows the numbers the scene is
// built from, and they move while you drag the window.

const COPY = {
  solo: {
    line: "The scene is bigger than this window.",
    note: "Open a second window and drag it across your desktop. Both windows draw the same field, each showing the part it covers.",
    action: "Open another window",
  },
  embedded: {
    line: "Open this in a window of its own.",
    note: "Inside the portfolio frame there is no window position to read. Standalone, it can place itself on your desktop and share the scene with a second window.",
    action: "Open in a new window",
  },
  touch: {
    line: "Two windows, one scene.",
    note: "This one reads where each browser window sits on the desktop, so it wants a desktop. The windows drifting here stand in for the real thing.",
    action: null,
  },
};

export function createHud({ onSpawn }) {
  const root = document.getElementById("hud");
  const solo = document.getElementById("solo");
  const soloLine = solo.querySelector(".solo__line");
  const soloNote = document.getElementById("solo-note");
  const soloSpawn = document.getElementById("solo-spawn");
  const soloBlocked = document.getElementById("solo-blocked");
  const spawn = document.getElementById("spawn");
  const count = document.getElementById("roster-count");
  const label = document.querySelector(".roster__label");
  const chips = document.getElementById("roster-chips");
  const readoutId = document.getElementById("readout-id");
  const readoutSize = document.getElementById("readout-size");
  const readoutScreen = document.getElementById("readout-screen");

  let mode = "solo";
  let lastReadout = "";

  for (const button of [spawn, soloSpawn]) {
    button.addEventListener("click", () => {
      soloBlocked.hidden = onSpawn() !== false;
    });
  }

  function setMode(next) {
    mode = next;
    const copy = COPY[next] ?? COPY.solo;
    if (next === "linked") {
      solo.hidden = true;
      spawn.hidden = false;
      return;
    }
    solo.hidden = false;
    spawn.hidden = true;
    soloLine.textContent = copy.line;
    soloNote.textContent = copy.note;
    soloSpawn.hidden = copy.action === null;
    if (copy.action) soloSpawn.textContent = copy.action;
  }

  function setRoster(peers, selfId) {
    const real = peers.filter((peer) => !peer.simulated);
    count.textContent = String(real.length);
    label.textContent = real.length === 1 ? "window" : "windows";

    chips.replaceChildren(
      ...peers.map((peer) => {
        const chip = document.createElement("li");
        chip.className = "chip";
        if (peer.id === selfId) chip.classList.add("chip--self");
        if (peer.simulated) chip.classList.add("chip--simulated");
        chip.style.setProperty("--chip", toneHex(peer.tone));
        chip.title = peer.simulated
          ? `${peer.id} (stand-in)`
          : peer.id === selfId
            ? `${peer.id} (this window)`
            : peer.id;
        return chip;
      }),
    );

    if (mode === "embedded" || mode === "touch") return;
    setMode(real.length > 1 ? "linked" : "solo");
  }

  function setReadout(id, rect, trustworthy) {
    const next = `${id}|${rect.w}|${rect.h}|${rect.x}|${rect.y}|${trustworthy}`;
    if (next === lastReadout) return;
    lastReadout = next;
    readoutId.textContent = id;
    readoutSize.textContent = `${rect.w} x ${rect.h}`;
    readoutScreen.textContent = trustworthy
      ? `x ${rect.x} y ${rect.y}`
      : "not readable in a frame";
  }

  function setAccent(tone) {
    document.documentElement.style.setProperty("--accent", toneHex(tone));
  }

  return {
    setMode,
    setRoster,
    setReadout,
    setAccent,
    ready: () => root.setAttribute("data-ready", "true"),
    markEmbedded: () => root.setAttribute("data-embedded", "true"),
  };
}
