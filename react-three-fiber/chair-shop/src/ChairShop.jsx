import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, Scroll, useScroll, useGLTF, Loader } from '@react-three/drei'
import * as THREE from 'three'

// base-relative so the gltf (and its relative .bin / texture URIs) resolve
// whether served at root or under a subpath (iframe)
const base = import.meta.env.BASE_URL
const url = (id) => `${base}chairs/${id}.gltf`

const CHAIRS = [
  { id: 'armchairYellow', bg: '#f15946', title: ['Meet the new', 'shopping experience', 'for online chairs'] },
  { id: 'armchairGreen', bg: '#571ec1', title: ['And we even', 'got different colors'] },
  { id: 'armchairGray', bg: '#636567', title: ['And yes', 'we even got', 'monochrome'] },
]

CHAIRS.forEach((c) => useGLTF.preload(url(c.id)))

function Chair({ id, index }) {
  const { scene } = useGLTF(url(id))
  const { viewport } = useThree()
  const spin = useRef()

  // strip the giant floor plane + environment so the chair floats on its own
  const model = useMemo(() => {
    const clone = scene.clone(true)
    const drop = []
    clone.traverse((o) => {
      if (/FLOOR|Environment/i.test(o.name)) drop.push(o)
      if (o.isMesh) o.castShadow = true
    })
    drop.forEach((o) => o.parent?.remove(o))
    return clone
  }, [scene])

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    return { scale: (viewport.height * 0.6) / size.y, center }
  }, [model, viewport.height])

  useFrame(() => {
    if (spin.current) spin.current.rotation.y += 0.01
  })

  return (
    <group position={[0, -index * viewport.height, 0]}>
      <group ref={spin} scale={fit.scale}>
        <primitive object={model} position={[-fit.center.x, -fit.center.y, -fit.center.z]} />
      </group>
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <directionalLight position={[-10, 5, -5]} intensity={0.6} />
      <spotLight position={[0, 20, 10]} intensity={1.2} angle={0.5} penumbra={1} />
    </>
  )
}

// drive the page background from scroll position, blending between section colors
function Background({ targetRef }) {
  const scroll = useScroll()
  const colors = useMemo(() => CHAIRS.map((c) => new THREE.Color(c.bg)), [])
  const out = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    if (!targetRef.current) return
    const segment = scroll.offset * (colors.length - 1)
    const i = Math.min(Math.floor(segment), colors.length - 2)
    out.copy(colors[i]).lerp(colors[i + 1], segment - i)
    targetRef.current.style.background = `#${out.getHexString()}`
  })
  return null
}

export default function ChairShop() {
  const containerRef = useRef()

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: CHAIRS[0].bg, transition: 'background 0.1s' }}>
      <header style={headerStyle}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>CHAIR.</div>
        <nav style={{ display: 'flex', gap: 22, fontSize: 14, opacity: 0.9 }}>
          <span>discover</span>
          <span>products</span>
          <span>solutions</span>
          <span style={navButton}>order</span>
        </nav>
      </header>

      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <Lights />
        <Suspense fallback={null}>
          <ScrollControls pages={CHAIRS.length} damping={0.25}>
            <Background targetRef={containerRef} />
            <Scroll>
              {CHAIRS.map((c, i) => (
                <Chair key={c.id} id={c.id} index={i} />
              ))}
            </Scroll>
            <Scroll html style={{ width: '100%' }}>
              {CHAIRS.map((c, i) => (
                <div key={c.id} style={{ ...sectionStyle, top: `${i * 100 + 16}vh` }}>
                  {c.title.map((line, li) => (
                    <h1 key={li} style={titleStyle}>
                      {line}
                    </h1>
                  ))}
                </div>
              ))}
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>

      <Loader />
    </div>
  )
}

const headerStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 36px',
  color: '#fff',
  pointerEvents: 'none',
}
const navButton = {
  border: '1px solid rgba(255,255,255,0.7)',
  borderRadius: 20,
  padding: '4px 14px',
}
const sectionStyle = {
  position: 'absolute',
  left: '8vw',
  maxWidth: '42vw',
  color: '#fff',
}
const titleStyle = {
  fontSize: 'clamp(28px, 4vw, 64px)',
  lineHeight: 1.05,
  margin: 0,
  fontWeight: 800,
  textShadow: '0 2px 12px rgba(0,0,0,0.25)',
}
