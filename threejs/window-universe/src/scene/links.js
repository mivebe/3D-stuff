import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
} from "three";
import { clamp } from "../lib/motion.js";

// a beam between every pair of windows, with a pulse running along it.
//
// drawn as ribbons rather than lines: a one pixel line all but vanishes on a
// high density screen, and gl line width is a no-op on most drivers. every pair
// shares one geometry, so the whole web costs a single draw call.

const SEGMENTS = 26;
const SAMPLES = SEGMENTS + 1;
const VERTICES_PER_LINK = SAMPLES * 2;
const INDICES_PER_LINK = SEGMENTS * 6;
const WIDTH = 3.4;

// scratch for one curve, refilled per link per frame
const curve = new Float32Array(SAMPLES * 2);

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aT;
  attribute float aSide;
  attribute float aSeed;
  attribute float aFade;
  varying vec3 vColor;
  varying float vT;
  varying float vSide;
  varying float vSeed;
  varying float vFade;

  void main() {
    vColor = aColor;
    vT = aT;
    vSide = aSide;
    vSeed = aSeed;
    vFade = aFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor;
  varying float vT;
  varying float vSide;
  varying float vSeed;
  varying float vFade;

  void main() {
    float edge = pow(1.0 - abs(vSide), 1.6);
    float head = fract(vT - uTime * 0.18 + vSeed);
    float comet = pow(1.0 - head, 12.0);
    float trailing = pow(1.0 - fract(head + 0.5), 22.0) * 0.4;
    // the thread stays lit, the pulse rides over it
    float intensity = (0.22 + comet * 1.6 + trailing) * edge * vFade;
    gl_FragColor = vec4(vColor * intensity * 1.8, intensity);
  }
`;

export function createLinks(world) {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    blending: AdditiveBlending,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  });

  let mesh = null;
  let geometry = null;
  let signature = "";

  function rebuild(nodes) {
    if (mesh) {
      world.remove(mesh);
      geometry.dispose();
      mesh = null;
      geometry = null;
    }

    const pairs = (nodes.length * (nodes.length - 1)) / 2;
    if (pairs === 0) return;

    const count = pairs * VERTICES_PER_LINK;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const along = new Float32Array(count);
    const sides = new Float32Array(count);
    const seeds = new Float32Array(count);
    const fades = new Float32Array(count);
    // 32 bit indices so a wall of open windows cannot overflow the buffer
    const indices = new Uint32Array(pairs * INDICES_PER_LINK);

    let link = 0;
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const seed = (link * 0.37) % 1;
        const base = link * VERTICES_PER_LINK;

        for (let s = 0; s < SAMPLES; s++) {
          const t = s / SEGMENTS;
          for (let side = 0; side < 2; side++) {
            const vertex = base + s * 2 + side;
            const color = t < 0.5 ? nodes[a].color : nodes[b].color;
            colors[vertex * 3] = color.r;
            colors[vertex * 3 + 1] = color.g;
            colors[vertex * 3 + 2] = color.b;
            along[vertex] = t;
            sides[vertex] = side === 0 ? -1 : 1;
            seeds[vertex] = seed;
          }
        }

        for (let s = 0; s < SEGMENTS; s++) {
          const corner = base + s * 2;
          const slot = link * INDICES_PER_LINK + s * 6;
          indices[slot] = corner;
          indices[slot + 1] = corner + 1;
          indices[slot + 2] = corner + 2;
          indices[slot + 3] = corner + 1;
          indices[slot + 4] = corner + 3;
          indices[slot + 5] = corner + 2;
        }
        link++;
      }
    }

    geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
    geometry.setAttribute("aT", new BufferAttribute(along, 1));
    geometry.setAttribute("aSide", new BufferAttribute(sides, 1));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    geometry.setAttribute("aFade", new BufferAttribute(fades, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));

    mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    world.add(mesh);
  }

  function update(nodes, time, motion) {
    const next = nodes.map((node) => node.id).join("|");
    if (next !== signature) {
      signature = next;
      rebuild(nodes);
    }
    if (!mesh) return;

    material.uniforms.uTime.value = time * motion;

    const positions = geometry.attributes.position.array;
    const fades = geometry.attributes.aFade.array;

    let link = 0;
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const from = nodes[a];
        const to = nodes[b];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy) || 1;

        // bow the beam sideways, and let the bow breathe
        const sag =
          distance * 0.14 * Math.sin(time * 0.35 + link * 1.7) * motion;
        const midX = (from.x + to.x) / 2 - (dy / distance) * sag;
        const midY = (from.y + to.y) / 2 + (dx / distance) * sag;

        for (let s = 0; s < SAMPLES; s++) {
          const t = s / SEGMENTS;
          const inv = 1 - t;
          curve[s * 2] = inv * inv * from.x + 2 * inv * t * midX + t * t * to.x;
          curve[s * 2 + 1] =
            inv * inv * from.y + 2 * inv * t * midY + t * t * to.y;
        }

        const fade =
          clamp(1 - (distance - 500) / 3200, 0.25, 1) * from.fade * to.fade;
        const base = link * VERTICES_PER_LINK;

        for (let s = 0; s < SAMPLES; s++) {
          const previous = Math.max(0, s - 1);
          const next = Math.min(SEGMENTS, s + 1);
          const tangentX = curve[next * 2] - curve[previous * 2];
          const tangentY = curve[next * 2 + 1] - curve[previous * 2 + 1];
          const length = Math.hypot(tangentX, tangentY) || 1;
          const offsetX = (-tangentY / length) * WIDTH;
          const offsetY = (tangentX / length) * WIDTH;

          for (let side = 0; side < 2; side++) {
            const sign = side === 0 ? -1 : 1;
            const vertex = base + s * 2 + side;
            positions[vertex * 3] = curve[s * 2] + offsetX * sign;
            positions[vertex * 3 + 1] = -(curve[s * 2 + 1] + offsetY * sign);
            positions[vertex * 3 + 2] = 0;
            fades[vertex] = fade;
          }
        }
        link++;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aFade.needsUpdate = true;
  }

  return { update };
}
