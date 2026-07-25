import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
} from "three";
import { toneColor } from "./palette.js";
import { clamp, damp, easeOutBack } from "../lib/motion.js";

// one node per open window, sitting at the middle of that window's slice of the
// desktop. shape and rhythm come from shared time, so a node drawn in two
// windows at once is the same node, not two lookalikes.

const BIRTH = 0.55;
const DEATH = 0.3;
const RING_POINTS = 130;

const coreGeometry = new IcosahedronGeometry(1, 3);
const haloGeometry = new PlaneGeometry(1, 1);
const shellGeometry = new EdgesGeometry(new BoxGeometry(1, 1, 1));
const ringGeometry = buildRing();

function buildRing() {
  const positions = new Float32Array(RING_POINTS * 3);
  const sizes = new Float32Array(RING_POINTS);
  for (let i = 0; i < RING_POINTS; i++) {
    const angle = (i / RING_POINTS) * Math.PI * 2;
    const wobble = 0.94 + Math.random() * 0.12;
    positions[i * 3] = Math.cos(angle) * wobble;
    positions[i * 3 + 1] = Math.sin(angle) * wobble;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
    sizes[i] = 1 + Math.random() * 1.6;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  return geometry;
}

const coreVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vViewPosition;
  varying float vRipple;

  void main() {
    vec3 n = normalize(normal);
    float ripple =
      sin(position.x * 2.7 + uTime * 1.1 + uSeed) *
      cos(position.y * 3.1 - uTime * 0.9 + uSeed * 1.7) *
      sin(position.z * 2.3 + uTime * 0.7);
    vRipple = ripple;
    vec3 displaced = position + n * ripple * 0.09;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const coreFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  varying vec3 vViewPosition;
  varying float vRipple;

  void main() {
    // normal from the surface derivative, so each facet lights on its own and
    // the ripple keeps re-cutting them
    vec3 facet = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
    float facing = abs(facet.z);
    float rim = pow(1.0 - facing, 2.2);
    float sheen = smoothstep(0.5, 1.0, vRipple) * 0.22;
    // dim in the middle, hot at the edge: a shell rather than a ball of light
    vec3 color = uColor * (0.04 + 0.16 * facing) + uColor * rim * 1.45 + uColor * sheen;
    gl_FragColor = vec4(color * uFade, 1.0);
  }
`;

const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(max(0.0, 1.0 - d), 4.5);
    gl_FragColor = vec4(uColor * glow * 0.42 * uFade, glow * uFade);
  }
`;

const haloVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringVertex = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;
    gl_FragColor = vec4(uColor * (1.0 - d) * uFade, (1.0 - d) * uFade);
  }
`;

class Node {
  constructor(peer, time) {
    this.id = peer.id;
    this.color = toneColor(peer.tone);
    this.simulated = Boolean(peer.simulated);
    this.bornAt = time;
    this.dyingAt = null;
    this.fade = 0;
    this.radius = radiusFor(peer.rect);
    this.x = peer.rect.x + peer.rect.w / 2;
    this.y = peer.rect.y + peer.rect.h / 2;

    const seed =
      [...peer.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 100;

    this.core = new Mesh(
      coreGeometry,
      new ShaderMaterial({
        vertexShader: coreVertex,
        fragmentShader: coreFragment,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: seed },
          uColor: { value: this.color },
          uFade: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.core.renderOrder = 3;

    this.halo = new Mesh(
      haloGeometry,
      new ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: { uColor: { value: this.color }, uFade: { value: 0 } },
        transparent: true,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.halo.renderOrder = 2;

    this.shell = new LineSegments(
      shellGeometry,
      new LineBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.shell.renderOrder = 4;

    this.ring = new Points(
      ringGeometry,
      new ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uColor: { value: this.color },
          uFade: { value: 0 },
          uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
        },
        transparent: true,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.ring.renderOrder = 5;

    this.group = new Group();
    this.group.add(this.halo, this.core, this.shell, this.ring);
  }

  update(peer, time, dt, motion) {
    if (peer) {
      this.radius = damp(this.radius, radiusFor(peer.rect), 6, dt);
      this.x = damp(this.x, peer.rect.x + peer.rect.w / 2, 7, dt);
      this.y = damp(this.y, peer.rect.y + peer.rect.h / 2, 7, dt);
    }

    const age = time - this.bornAt;
    const entering = clamp(age / BIRTH, 0, 1);
    const leaving =
      this.dyingAt === null ? 0 : clamp((time - this.dyingAt) / DEATH, 0, 1);
    this.fade = (1 - leaving) * clamp(entering * 1.6, 0, 1);
    const pop = easeOutBack(entering) * (1 - leaving);

    const beat = 1 + Math.sin(time * 1.4 + this.radius) * 0.03 * motion;
    const scale = this.radius * pop;

    this.group.position.set(this.x, -this.y, 0);
    this.core.scale.setScalar(scale * beat);
    this.halo.scale.setScalar(scale * 4.2);
    this.shell.scale.setScalar(scale * 1.9);
    this.ring.scale.setScalar(
      scale * (2.15 + Math.sin(time * 0.8) * 0.08 * motion),
    );

    // the original demo's spinning wireframe cube, kept as the outer shell
    this.shell.rotation.x = time * 0.5 * motion;
    this.shell.rotation.y = time * 0.3 * motion;
    this.ring.rotation.z = -time * 0.22 * motion;

    this.core.material.uniforms.uTime.value = time * motion;
    this.core.material.uniforms.uFade.value = this.fade;
    this.halo.material.uniforms.uFade.value =
      this.fade * (this.simulated ? 0.7 : 1);
    this.ring.material.uniforms.uFade.value = this.fade;
    this.shell.material.opacity = this.fade * 0.5;

    return leaving < 1;
  }

  dispose() {
    for (const object of [this.core, this.halo, this.shell, this.ring]) {
      object.material.dispose();
    }
  }
}

function radiusFor(rect) {
  return clamp(Math.min(rect.w, rect.h) * 0.15, 34, 190);
}

export function createNodes(world) {
  const nodes = new Map();

  function update(peers, time, dt, motion) {
    for (const peer of peers) {
      let node = nodes.get(peer.id);
      if (!node) {
        node = new Node(peer, time);
        nodes.set(peer.id, node);
        world.add(node.group);
      }
      node.dyingAt = null;
      node.peer = peer;
    }

    const live = new Set(peers.map((peer) => peer.id));
    const snapshot = [];

    for (const [id, node] of nodes) {
      const peer = live.has(id) ? node.peer : null;
      if (!peer && node.dyingAt === null) node.dyingAt = time;

      const alive = node.update(peer, time, dt, motion);
      if (!alive) {
        world.remove(node.group);
        node.dispose();
        nodes.delete(id);
        continue;
      }
      snapshot.push(node);
    }

    return snapshot;
  }

  return { update };
}
