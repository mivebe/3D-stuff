import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const GEOMETRIES = ["torusKnot", "torus", "cylinder", "sphere", "box"];

// draw the text repeated across a wide canvas so it tiles around the geometry
function makeTextTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 170px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const label = (text || "KINETIC").toUpperCase() + "   /   ";
  const width = ctx.measureText(label).width;
  for (let x = 0; x < canvas.width + width; x += width) {
    ctx.fillText(label, x, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uRipple;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    // integer cycles across the 0..1 uv wrap so the wave stays seamless at the
    // geometry seam (torus / sphere) instead of diverging at the join
    const float CYCLES = 4.0;
    float ripple = sin(uv.x * 6.2831853 * CYCLES + uTime * 2.0) * uRipple;
    vec3 displaced = position + normal * ripple;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uScroll;
  uniform float uRepeat;
  uniform vec3 uColor;
  uniform vec3 uBg;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec2 uv = vec2(vUv.x * uRepeat + uScroll, vUv.y);
    float glyph = texture2D(uTexture, uv).r;
    vec3 color = mix(uBg, uColor, glyph);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.5);
    color += fresnel * 0.35;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function Geometry({ kind }) {
  switch (kind) {
    case "torus":
      return <torusGeometry args={[1, 0.42, 48, 256]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.9, 0.9, 2.6, 96, 1, true]} />;
    case "sphere":
      return <sphereGeometry args={[1.3, 96, 96]} />;
    case "box":
      return <boxGeometry args={[1.7, 1.7, 1.7, 64, 64, 64]} />;
    case "torusKnot":
    default:
      return <torusKnotGeometry args={[1, 0.32, 256, 32]} />;
  }
}

function KineticMesh({
  text,
  geometry,
  scrollSpeed,
  spin,
  repeat,
  ripple,
  color,
}) {
  const meshRef = useRef();
  const materialRef = useRef();
  const texture = useMemo(() => makeTextTexture(text), [text]);
  useEffect(() => () => texture.dispose(), [texture]);

  // write live values into the material's own uniforms each frame; reassigning
  // uniform.value on the memoized object never reached the GPU (different holder)
  const live = useRef({});
  live.current = { scrollSpeed, spin, repeat, ripple, color, texture };

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uRepeat: { value: repeat },
      uRipple: { value: ripple },
      uColor: { value: new THREE.Color(color) },
      uBg: { value: new THREE.Color("#0e0e12") },
    }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const material = materialRef.current;
    if (material) {
      const u = material.uniforms;
      const v = live.current;
      u.uTime.value += dt;
      u.uScroll.value += v.scrollSpeed * dt; // accumulate offset, not time*speed
      u.uRepeat.value = v.repeat;
      u.uRipple.value = v.ripple;
      u.uColor.value.set(v.color);
      if (u.uTexture.value !== v.texture) u.uTexture.value = v.texture;
    }
    if (meshRef.current) meshRef.current.rotation.y += live.current.spin * dt;
  });

  return (
    <mesh ref={meshRef}>
      <Geometry kind={geometry} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

export default function KineticType() {
  const [text, setText] = useState("KINETIC");
  const [geometry, setGeometry] = useState("torusKnot");
  const [scrollSpeed, setScrollSpeed] = useState(0.25);
  const [spin, setSpin] = useState(0.12);
  const [repeat, setRepeat] = useState(3);
  const [ripple, setRipple] = useState(0.015);
  const [color, setColor] = useState("#6ee7ff");

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0e0e12" }}>
      <Canvas camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 4.5] }}>
        <KineticMesh
          text={text}
          geometry={geometry}
          scrollSpeed={scrollSpeed}
          spin={spin}
          repeat={repeat}
          ripple={ripple}
          color={color}
        />
        <OrbitControls enablePan={false} minDistance={2.5} maxDistance={9} />
      </Canvas>

      <div style={panelStyle}>
        <Section label="Text">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="type something"
            maxLength={24}
            style={inputStyle}
          />
        </Section>

        <Section label="Text color">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={colorStyle}
            />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{color}</span>
          </div>
        </Section>

        <Section label="Shape">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GEOMETRIES.map((g) => (
              <button
                key={g}
                onClick={() => setGeometry(g)}
                style={{ ...segButton, ...(geometry === g ? segActive : null) }}
              >
                {g}
              </button>
            ))}
          </div>
        </Section>

        <Slider
          label={`Scroll ${scrollSpeed.toFixed(2)}`}
          min={-1}
          max={1}
          step={0.01}
          value={scrollSpeed}
          onChange={setScrollSpeed}
        />
        <Slider
          label={`Spin ${spin.toFixed(2)}`}
          min={-1}
          max={1}
          step={0.01}
          value={spin}
          onChange={setSpin}
        />
        <Slider
          label={`Density ${repeat}`}
          min={1}
          max={8}
          step={1}
          value={repeat}
          onChange={setRepeat}
        />
        <Slider
          label={`Ripple ${ripple.toFixed(3)}`}
          min={0}
          max={0.06}
          step={0.001}
          value={ripple}
          onChange={setRipple}
        />
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={sectionStyle}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }) {
  return (
    <Section label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </Section>
  );
}

const panelStyle = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 240,
  maxHeight: "calc(100% - 32px)",
  overflowY: "auto",
  background: "rgba(22,22,29,0.92)",
  border: "1px solid #26262f",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const sectionStyle = { display: "flex", flexDirection: "column", gap: 8 };
const labelStyle = {
  fontSize: 12,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 1,
};
const inputStyle = {
  background: "#0e0e12",
  border: "1px solid #26262f",
  borderRadius: 8,
  color: "var(--text)",
  padding: "8px 10px",
  fontSize: 14,
  width: "100%",
};
const colorStyle = {
  width: 44,
  height: 30,
  background: "none",
  border: "1px solid #26262f",
  borderRadius: 6,
  cursor: "pointer",
};
const segButton = {
  background: "#16161d",
  border: "1px solid #26262f",
  color: "var(--text)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};
const segActive = {
  background: "var(--accent)",
  color: "#06232b",
  borderColor: "var(--accent)",
};
