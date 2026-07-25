import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { damp } from "../lib/motion.js";

// dust filling the desktop between the windows. each speck is placed in a unit
// square that the shader stretches over whatever area the windows occupy, then
// pulled into orbit by the nodes near it, taking on their colour. it is what
// makes the gap between two windows read as one continuous space.

// specks are spread over whatever area the windows occupy, so the count has to
// follow that area or a wide desktop ends up looking empty
const COUNT = 9000;
const AREA_PER_SPECK = 620;
const MIN_DRAWN = 1800;
const MAX_NODES = 8;

const vertexShader = /* glsl */ `
  #define MAX_NODES ${MAX_NODES}

  attribute vec3 aSeed;
  attribute float aSize;

  uniform float uTime;
  uniform vec2 uMin;
  uniform vec2 uMax;
  uniform vec3 uNode[MAX_NODES];
  uniform vec3 uTint[MAX_NODES];
  uniform int uNodeCount;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 span = uMax - uMin;
    float phase = aSeed.z * 6.2831853;
    vec2 point = uMin + aSeed.xy * span;
    point += vec2(
      sin(uTime * 0.13 + phase * 1.7),
      cos(uTime * 0.11 + phase * 2.3)
    ) * 30.0;

    vec3 tint = vec3(0.0);
    vec2 pull = vec2(0.0);
    float weight = 0.0;

    for (int i = 0; i < MAX_NODES; i++) {
      if (i >= uNodeCount) break;
      vec2 delta = uNode[i].xy - point;
      float radius = uNode[i].z;
      float distance = length(delta) + 0.001;
      vec2 direction = delta / distance;
      float reach = radius * 3.4;
      float falloff = 1.0 / (1.0 + (distance * distance) / (reach * reach));
      // mostly sideways, so specks circle a window instead of falling into it
      vec2 orbit = vec2(-direction.y, direction.x);
      pull += (direction * 0.3 + orbit * 0.7) * falloff * radius * 1.15;
      tint += uTint[i] * falloff;
      weight += falloff;
    }

    point += pull;
    vColor = weight > 0.001 ? tint / weight : vec3(0.30, 0.40, 0.66);
    vAlpha = clamp(0.16 + weight * 0.8, 0.0, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(point.x, -point.y, 0.0, 1.0);
    gl_PointSize = aSize * uPixelRatio * (0.75 + weight * 0.8);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;
    float falloff = pow(1.0 - d, 2.0);
    gl_FragColor = vec4(vColor * falloff * 1.5 * vAlpha, falloff * vAlpha);
  }
`;

export function createDust(world) {
  const seeds = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const positions = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
    sizes[i] = 1.3 + Math.pow(Math.random(), 3) * 3.6;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  geometry.boundingSphere = null;

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uMin: { value: new Vector2() },
      uMax: { value: new Vector2(1, 1) },
      uNode: {
        value: Array.from({ length: MAX_NODES }, () => new Vector3()),
      },
      uTint: {
        value: Array.from({ length: MAX_NODES }, () => new Vector3()),
      },
      uNodeCount: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    },
    transparent: true,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 0;
  world.add(points);

  const bounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let settled = false;

  function update(nodes, view, time, dt, motion, snap) {
    const uniforms = material.uniforms;
    uniforms.uTime.value = time * motion;
    uniforms.uPixelRatio.value = Math.min(devicePixelRatio, 2);

    const shown = nodes.slice(0, MAX_NODES);
    uniforms.uNodeCount.value = shown.length;
    shown.forEach((node, i) => {
      uniforms.uNode.value[i].set(node.x, node.y, node.radius);
      uniforms.uTint.value[i].set(node.color.r, node.color.g, node.color.b);
    });

    // stretch over everything the windows cover, plus a margin so specks keep
    // drifting in from off screen
    const pad = 260;
    let minX = view.x - pad;
    let minY = view.y - pad;
    let maxX = view.x + view.w + pad;
    let maxY = view.y + view.h + pad;
    for (const node of nodes) {
      const reach = node.radius * 4 + pad;
      minX = Math.min(minX, node.x - reach);
      minY = Math.min(minY, node.y - reach);
      maxX = Math.max(maxX, node.x + reach);
      maxY = Math.max(maxY, node.y + reach);
    }

    // a window coming back from the background has nothing to ease from
    const rate = settled && !snap ? 3 : 1000;
    settled = true;
    bounds.minX = damp(bounds.minX, minX, rate, dt);
    bounds.minY = damp(bounds.minY, minY, rate, dt);
    bounds.maxX = damp(bounds.maxX, maxX, rate, dt);
    bounds.maxY = damp(bounds.maxY, maxY, rate, dt);

    uniforms.uMin.value.set(bounds.minX, bounds.minY);
    uniforms.uMax.value.set(bounds.maxX, bounds.maxY);

    // hold the density steady as that area grows
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    const drawn = Math.min(
      COUNT,
      Math.max(MIN_DRAWN, Math.round(area / AREA_PER_SPECK)),
    );
    geometry.setDrawRange(0, drawn);
  }

  return { update };
}
