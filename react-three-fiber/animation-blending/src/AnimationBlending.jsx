import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";
import { useModel, preloadModel } from "./core/useModel.js";
import xbotUrl from "./assets/Xbot.glb?url";

const MODEL_URL = xbotUrl;
preloadModel(MODEL_URL);

const BASE_STATES = ["idle", "walk", "run"];
const ADDITIVE = [
  { name: "agree", label: "Agree" },
  { name: "headShake", label: "Head shake" },
  { name: "sad_pose", label: "Sad" },
  { name: "sneak_pose", label: "Sneak" },
];

function Model({ base, weights, speed }) {
  const group = useRef();
  const { scene, animations, fit } = useModel(MODEL_URL, { targetHeight: 1.8 });

  // convert pose clips to additive so they layer over locomotion. drop position
  // tracks first so poses overlay only rotations, else the root's translation
  // delta snaps the figure on every loop
  const clips = useMemo(() => {
    const additiveNames = new Set(ADDITIVE.map((a) => a.name));
    return animations.map((clip) => {
      if (!additiveNames.has(clip.name)) return clip;
      const additive = clip.clone();
      additive.tracks = additive.tracks.filter(
        (t) => !t.name.endsWith(".position"),
      );
      THREE.AnimationUtils.makeClipAdditive(additive);
      return additive;
    });
  }, [animations]);

  const { actions, mixer } = useAnimations(clips, group);
  const currentBase = useRef("idle");

  // start every action; base states blend via weight, additive start at 0
  useEffect(() => {
    if (!actions) return;
    for (const name of BASE_STATES) {
      const action = actions[name];
      if (action)
        action
          .reset()
          .setEffectiveWeight(name === "idle" ? 1 : 0)
          .play();
    }
    for (const { name } of ADDITIVE) {
      const action = actions[name];
      if (!action) continue;
      action.reset().setEffectiveWeight(0).play();
      // *_pose clips are 2-frame static poses; looping them flickers between
      // neutral and the pose. freeze on the pose frame so weight just scales it
      if (name.endsWith("_pose")) {
        action.time = action.getClip().duration;
        action.paused = true;
      }
    }
    currentBase.current = "idle";
    return () => Object.values(actions).forEach((a) => a?.stop());
  }, [actions]);

  // crossfade between locomotion states
  useEffect(() => {
    if (!actions || base === currentBase.current) return;
    actions[currentBase.current]?.fadeOut(0.4);
    actions[base]?.reset().setEffectiveWeight(1).fadeIn(0.4).play();
    currentBase.current = base;
  }, [base, actions]);

  // live additive weights
  useEffect(() => {
    if (!actions) return;
    for (const { name } of ADDITIVE)
      actions[name]?.setEffectiveWeight(weights[name] ?? 0);
  }, [weights, actions]);

  useEffect(() => {
    if (mixer) mixer.timeScale = speed;
  }, [speed, mixer]);

  return (
    <group ref={group}>
      <group scale={fit.scale} position={[0, fit.footOffset, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function Scene({ base, weights, speed }) {
  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Grid
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.5}
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#6ee7ff"
        cellColor="#3a3f44"
        fadeDistance={22}
        infiniteGrid
      />
      <Suspense fallback={null}>
        <Model base={base} weights={weights} speed={speed} />
      </Suspense>
      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={1.8}
        maxDistance={8}
        maxPolarAngle={Math.PI * 0.5}
      />
    </>
  );
}

export default function AnimationBlending() {
  const [base, setBase] = useState("idle");
  const [weights, setWeights] = useState({
    agree: 0,
    headShake: 0,
    sad_pose: 0,
    sneak_pose: 0,
  });
  const [speed, setSpeed] = useState(1);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0e0e12" }}>
      <Canvas
        shadows
        camera={{ fov: 50, near: 0.1, far: 100, position: [0, 1.4, 3.6] }}
      >
        <Scene base={base} weights={weights} speed={speed} />
      </Canvas>

      <div style={panelStyle}>
        <div style={sectionStyle}>
          <div style={labelStyle}>Locomotion</div>
          <div style={{ display: "flex", gap: 6 }}>
            {BASE_STATES.map((s) => (
              <button
                key={s}
                onClick={() => setBase(s)}
                style={{ ...segButton, ...(base === s ? segActive : null) }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Additive poses</div>
          {ADDITIVE.map(({ name, label }) => (
            <label key={name} style={sliderRow}>
              <span style={{ width: 84 }}>{label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={weights[name]}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    [name]: parseFloat(e.target.value),
                  }))
                }
                style={{ flex: 1 }}
              />
            </label>
          ))}
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Speed {speed.toFixed(2)}x</div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 240,
  background: "rgba(22,22,29,0.92)",
  border: "1px solid #26262f",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};
const sectionStyle = { display: "flex", flexDirection: "column", gap: 8 };
const labelStyle = {
  fontSize: 12,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 1,
};
const sliderRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
};
const segButton = {
  flex: 1,
  background: "#16161d",
  border: "1px solid #26262f",
  color: "var(--text)",
  borderRadius: 8,
  padding: "6px 0",
  fontSize: 13,
  cursor: "pointer",
  textTransform: "capitalize",
};
const segActive = {
  background: "var(--accent)",
  color: "#06232b",
  borderColor: "var(--accent)",
};
