import { Color } from "three";

// one tone per window, at matched brightness so no window's node blooms hotter
// than the rest. every window resolves the same tone for the same peer.
export const TONES = [
  { name: "signal", hex: "#46d6ff" },
  { name: "violet", hex: "#a97bff" },
  { name: "rose", hex: "#ff6fb5" },
  { name: "amber", hex: "#ffc24b" },
  { name: "mint", hex: "#43e5a0" },
  { name: "ember", hex: "#ff7a5a" },
];

const colors = TONES.map((tone) => new Color(tone.hex));

export function toneColor(tone) {
  return colors[tone % colors.length];
}

export function toneHex(tone) {
  return TONES[tone % TONES.length].hex;
}
