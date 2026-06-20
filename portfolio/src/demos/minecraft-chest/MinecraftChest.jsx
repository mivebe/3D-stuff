import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Lights from './scene/Lights.jsx'
import Floor from './scene/Floor.jsx'
import Chest from './scene/Chest.jsx'
import Controls from './scene/Controls.jsx'
import Inventory from './ui/Inventory.jsx'

export default function MinecraftChest() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas shadows camera={{ position: [-5, 4, 4], fov: 40 }}>
        <Suspense fallback={null}>
          <Chest />
        </Suspense>
        <Lights />
        <Floor />
        <Controls />
      </Canvas>
      {/* overlay lets clicks pass through to the canvas except over the window */}
      <div style={overlayStyle}>
        <Inventory />
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: 48,
  pointerEvents: 'none',
}
