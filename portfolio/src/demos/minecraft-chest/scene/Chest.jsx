import { useRef, useState } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { useGLTF } from '@react-three/drei'
import chestOpenSound from '../assets/sound/open-chest.mp3'

const openChest = new Audio(chestOpenSound)

export default function Chest() {
  const group = useRef()
  const [isOpen, setIsOpen] = useState(false)

  const { nodes, materials } = useGLTF('/models/coffre-minecraft.glb')

  const toggle = () => {
    setIsOpen((open) => !open)
    openChest.volume = 0.3
    openChest.currentTime = 0
    openChest.play().catch(() => {})
  }

  // lid bone rotates up to open; base group gives a small spin when open
  const { lidRotation, baseRotation } = useSpring({
    lidRotation: isOpen ? [0, 0, 0] : [1.61, 0, 0],
    baseRotation: isOpen ? [0, -1.5, 0] : [0, 0, 0],
    config: { tension: 200, friction: 18 },
  })

  return (
    <group ref={group} onClick={toggle} dispose={null}>
      <animated.group position={[0, -1, 0]} rotation={baseRotation}>
        <primitive object={nodes.Bone} />
        <animated.primitive object={nodes.Bone001} rotation={lidRotation} />
        <skinnedMesh
          castShadow
          material={materials.Material}
          geometry={nodes.Cube.geometry}
          skeleton={nodes.Cube.skeleton}
        />
      </animated.group>
    </group>
  )
}

useGLTF.preload('/models/coffre-minecraft.glb')
