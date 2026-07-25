import { keysWithPrefix, read, remove, write } from "./storage.js";

// every window of this origin joins one roster.
//
// two transports, on purpose:
//   broadcastchannel carries live movement, so a drag shows up in the other
//   windows in the same frame it happens.
//   localStorage holds one key per window as a durable snapshot, so a window
//   opened later sees the roster immediately instead of waiting for a beat.
// each window only ever writes its own key, which is what keeps two windows
// from clobbering each other the way a single shared array does.

const CHANNEL_NAME = "window-universe";
const PEER_PREFIX = "wu:peer:";
const EPOCH_KEY = "wu:epoch";

const BEAT_MS = 500;
// a window that is force quit never says goodbye, so peers expire instead
const STALE_MS = 2200;
// without broadcastchannel, storage writes are the only transport and have to
// carry movement too
const FALLBACK_WRITE_MS = 60;

const TONE_COUNT = 6;

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID().slice(0, 4);
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
}

function sameRect(a, b) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export class PeerNetwork {
  #id = newId();
  #self = null;
  #rect = null;
  #peers = new Map();
  #channel = null;
  #timer = 0;
  #lastWrite = 0;
  #epoch = 0;
  #onRoster = null;

  constructor({ onRoster } = {}) {
    this.#onRoster = onRoster ?? null;
  }

  get id() {
    return this.#id;
  }

  get self() {
    return this.#self;
  }

  /** every live window, this one included, in a stable order all windows agree on */
  roster() {
    const all = [this.#self, ...this.#peers.values()].filter(Boolean);
    return all.sort(
      (a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1),
    );
  }

  /** seconds since the first window of this session opened, identical everywhere */
  now() {
    return (Date.now() - this.#epoch) / 1000;
  }

  join(rect) {
    this.#rect = rect;
    // back button restores from the bfcache, where we left the roster on the way out
    window.addEventListener("pageshow", this.#onPageShow);

    const known = this.#loadSnapshot();
    // nobody else is up, so restart the clock and keep shader time small
    this.#epoch = known.length ? this.#readEpoch() : this.#resetEpoch();

    for (const peer of known) this.#peers.set(peer.id, peer);

    this.#self = {
      id: this.#id,
      rect,
      tone: this.#freeTone(),
      joinedAt: Date.now(),
      seenAt: Date.now(),
    };

    if ("BroadcastChannel" in window) {
      this.#channel = new BroadcastChannel(CHANNEL_NAME);
      this.#channel.onmessage = (event) => this.#receive(event.data);
    }

    window.addEventListener("storage", this.#onStorage);
    window.addEventListener("pagehide", this.#onPageHide);

    this.#store();
    this.#send({ kind: "join", peer: this.#self });
    this.#timer = window.setInterval(() => this.#beat(), BEAT_MS);
    this.#announce();
  }

  /** called every frame with this window's current rect; only real moves go out */
  update(rect) {
    if (!this.#self) return;
    if (sameRect(this.#self.rect, rect)) return;

    this.#self.rect = rect;
    this.#rect = rect;
    this.#self.seenAt = Date.now();
    this.#send({ kind: "move", peer: this.#self });

    // no channel means storage is the wire, so write more often while dragging
    if (!this.#channel && Date.now() - this.#lastWrite > FALLBACK_WRITE_MS) {
      this.#store();
    }
  }

  leave() {
    if (!this.#self) return;
    window.clearInterval(this.#timer);
    window.removeEventListener("storage", this.#onStorage);
    window.removeEventListener("pagehide", this.#onPageHide);
    remove(PEER_PREFIX + this.#id);
    this.#send({ kind: "leave", id: this.#id });
    this.#channel?.close();
    this.#channel = null;
    this.#self = null;
  }

  #onPageHide = () => this.leave();

  #onPageShow = (event) => {
    if (event.persisted && !this.#self) {
      window.removeEventListener("pageshow", this.#onPageShow);
      this.join(this.#rect);
    }
  };

  #onStorage = (event) => {
    if (!event.key || !event.key.startsWith(PEER_PREFIX)) return;
    const id = event.key.slice(PEER_PREFIX.length);
    if (id === this.#id) return;

    if (event.newValue === null) {
      if (this.#peers.delete(id)) this.#announce();
      return;
    }
    try {
      this.#absorb(JSON.parse(event.newValue));
    } catch {
      /* a half written record fixes itself on the next beat */
    }
  };

  #receive(message) {
    if (!message || !this.#self) return;

    if (message.kind === "leave") {
      if (message.id !== this.#id && this.#peers.delete(message.id)) {
        this.#announce();
      }
      return;
    }

    const peer = message.peer;
    if (!peer || peer.id === this.#id) return;

    this.#absorb(peer);

    // answer a newcomer directly so it does not have to wait for our next beat
    if (message.kind === "join")
      this.#send({ kind: "state", peer: this.#self });
  }

  #absorb(peer) {
    if (!peer?.id || peer.id === this.#id) return;
    const known = this.#peers.get(peer.id);
    const rosterChanged = !known || known.tone !== peer.tone;

    this.#peers.set(peer.id, { ...peer, seenAt: Date.now() });

    if (rosterChanged) {
      this.#resolveToneClash();
      this.#announce();
    }
  }

  #beat() {
    if (!this.#self) return;
    this.#self.seenAt = Date.now();
    this.#store();
    this.#send({ kind: "state", peer: this.#self });

    let dropped = false;
    const cutoff = Date.now() - STALE_MS;
    for (const [id, peer] of this.#peers) {
      if (peer.seenAt > cutoff) continue;
      this.#peers.delete(id);
      remove(PEER_PREFIX + id);
      dropped = true;
    }
    if (dropped) this.#announce();
  }

  #send(message) {
    this.#channel?.postMessage(message);
  }

  #store() {
    this.#lastWrite = Date.now();
    write(PEER_PREFIX + this.#id, JSON.stringify(this.#self));
  }

  #loadSnapshot() {
    const cutoff = Date.now() - STALE_MS;
    const live = [];
    for (const key of keysWithPrefix(PEER_PREFIX)) {
      let peer = null;
      try {
        peer = JSON.parse(read(key) ?? "null");
      } catch {
        peer = null;
      }
      if (peer?.id && peer.seenAt > cutoff && peer.id !== this.#id)
        live.push(peer);
      else remove(key);
    }
    return live;
  }

  #freeTone() {
    const taken = new Set([...this.#peers.values()].map((peer) => peer.tone));
    for (let tone = 0; tone < TONE_COUNT; tone++) {
      if (!taken.has(tone)) return tone;
    }
    return this.#peers.size % TONE_COUNT;
  }

  // two windows opening at once can grab the same tone; the later id yields
  #resolveToneClash() {
    if (!this.#self) return;
    const clash = [...this.#peers.values()].some(
      (peer) => peer.tone === this.#self.tone && peer.id < this.#self.id,
    );
    if (!clash) return;
    this.#self.tone = this.#freeTone();
    this.#store();
    this.#send({ kind: "state", peer: this.#self });
  }

  #announce() {
    this.#onRoster?.(this.roster());
  }

  #readEpoch() {
    const stored = Number(read(EPOCH_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : this.#resetEpoch();
  }

  #resetEpoch() {
    const now = Date.now();
    write(EPOCH_KEY, String(now));
    return now;
  }
}
