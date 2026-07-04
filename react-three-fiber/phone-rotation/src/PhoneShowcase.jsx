import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import Experience from "./scene/Experience.jsx";
import CaptureView from "./scene/CaptureView.jsx";
import HeroOverlay from "./ui/HeroOverlay.jsx";
import Sections from "./ui/Sections.jsx";
import { finishes } from "./data/product.js";
import "./ui/ui.css";

export default function PhoneShowcase() {
  // offline still-capture mode for the Details section beauty shots
  const capture = new URLSearchParams(window.location.search).get("capture");
  if (capture) return <CaptureView shotId={capture} />;

  return <Showcase />;
}

function Showcase() {
  const [phase, setPhase] = useState(0);
  const [finish, setFinish] = useState(finishes[0]); // Midnight by default
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 820px)");
    const apply = () => setMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // only advance phases forward so re-renders never rewind the intro
  const advance = (next) => setPhase((p) => (next > p ? next : p));

  return (
    <div className="page">
      <div className="stage">
        <Canvas camera={{ position: [0, 0, 6], fov: 38 }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <Experience
              finish={finish}
              phase={phase}
              onPhase={advance}
              mobile={mobile}
            />
          </Suspense>
        </Canvas>
      </div>

      <HeroOverlay
        phase={phase}
        finish={finish}
        finishes={finishes}
        onFinish={setFinish}
        mobile={mobile}
      />

      <Sections finish={finish} finishes={finishes} onFinish={setFinish} />

      <Loader />
    </div>
  );
}
