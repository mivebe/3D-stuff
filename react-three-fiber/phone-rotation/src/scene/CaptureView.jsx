import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Phone from './Phone.jsx'
import Lighting from './Lighting.jsx'
import { SETTLE_QUAT } from './config.js'
import { finishes } from '../data/product.js'

// offline-only: renders the phone alone at a fixed pose so we can screenshot
// beauty stills for the Details section (see scripts/capture-shots.mjs)

const qAxis = (x, y, z, a) =>
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), a)

// the model is simple, so true macros read as flat slabs. instead each shot is
// a full 3/4 product angle in a different finish, which renders beautifully.
const SHOTS = {
  champagne: {
    quat: qAxis(1, 0, 0, 0.05).multiply(qAxis(0, 1, 0, -0.38)).multiply(SETTLE_QUAT),
    finish: 'champagne',
    phase: 5,
  },
  graphite: {
    quat: qAxis(1, 0, 0, 0.06).multiply(qAxis(0, 1, 0, 0.42)).multiply(SETTLE_QUAT),
    finish: 'graphite',
    phase: 5,
  },
  midnight: {
    quat: qAxis(1, 0, 0, 0.03).multiply(qAxis(0, 1, 0, 0.2)).multiply(SETTLE_QUAT),
    finish: 'midnight',
    phase: 5,
  },
}

export default function CaptureView({ shotId }) {
  const shot = SHOTS[shotId] || SHOTS.champagne
  const finish = finishes.find((f) => f.id === shot.finish) || finishes[0]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0b' }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 34 }} dpr={[1, 2]}>
        <Lighting />
        <Suspense fallback={null}>
          <group quaternion={shot.quat} scale={0.8}>
            <Phone finish={finish} phase={shot.phase} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  )
}
