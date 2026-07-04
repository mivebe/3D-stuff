import { Environment } from "@react-three/drei";

// env map gives the metallic finishes something to reflect; the warm rim
// light sells the champagne-gold without washing the dark scene
export default function Lighting() {
  return (
    <>
      <Environment preset="studio" environmentIntensity={0.6} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} color="#fff6e6" />
      <directionalLight
        position={[-5, 2, -3]}
        intensity={0.5}
        color="#7da2ff"
      />
      <pointLight
        position={[2, -1, 4]}
        intensity={18}
        color="#c9a96a"
        distance={14}
      />
    </>
  );
}
