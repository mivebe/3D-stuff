export default function Lights() {
  return (
    <>
      <fogExp2 attach="fog" args={['lightgray', 0.03]} />
      <ambientLight intensity={0.4} />
      <directionalLight castShadow position={[-8, 16, -8]} intensity={1} shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 1, 50]} />
      </directionalLight>
      <pointLight position={[0, 50, 0]} intensity={2} />
    </>
  )
}
