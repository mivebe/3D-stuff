import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Sky, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { useKeyboard } from '../../core/useKeyboard.js'
import { useModel, preloadModel } from '../../core/useModel.js'

const MODEL_URL = '/models/warrior.glb'
preloadModel(MODEL_URL)

const UP = new THREE.Vector3(0, 1, 0)
const WALK_SPEED = 1.8
const RUN_SPEED = 4.6

// movement + dance on F, sprint on shift
const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyF: 'dance',
}

function Character({ groupRef }) {
  const { scene, animations, fit } = useModel(MODEL_URL, { targetHeight: 1.8, inPlace: true })
  const { actions } = useAnimations(animations, groupRef)
  const keys = useKeyboard(KEY_MAP)
  const { camera } = useThree()
  const current = useRef('idle')
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const dir = useRef(new THREE.Vector3())
  const targetQuat = useRef(new THREE.Quaternion())

  useEffect(() => {
    actions?.idle?.reset().play()
    return () => Object.values(actions || {}).forEach((a) => a.stop())
  }, [actions])

  const fadeTo = (name) => {
    if (current.current === name || !actions?.[name]) return
    actions[current.current]?.fadeOut(0.2)
    actions[name].reset().setEffectiveWeight(1).fadeIn(0.2).play()
    current.current = name
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const g = groupRef.current
    if (!g) return
    const input = keys.current

    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.crossVectors(forward.current, camera.up).normalize()

    dir.current.set(0, 0, 0)
    if (input.forward) dir.current.add(forward.current)
    if (input.backward) dir.current.sub(forward.current)
    if (input.right) dir.current.add(right.current)
    if (input.left) dir.current.sub(right.current)

    if (dir.current.lengthSq() > 0) {
      dir.current.normalize()
      const running = input.sprint
      g.position.addScaledVector(dir.current, (running ? RUN_SPEED : WALK_SPEED) * delta)
      const angle = Math.atan2(dir.current.x, dir.current.z)
      targetQuat.current.setFromAxisAngle(UP, angle)
      g.quaternion.slerp(targetQuat.current, 1 - Math.pow(0.0001, delta))
      fadeTo(running ? 'run' : 'walk')
    } else if (input.dance) {
      fadeTo('dance')
    } else {
      fadeTo('idle')
    }
  })

  // scale the wrapper group, not the model root, so the gltf's own
  // (cm->m) root scale is preserved instead of overwritten
  return (
    <group ref={groupRef}>
      <group scale={fit.scale} position={[0, fit.footOffset, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

function FollowRig({ targetRef }) {
  const { camera } = useThree()
  const controls = useRef(null)
  const prev = useRef(new THREE.Vector3())
  const started = useRef(false)

  useFrame(() => {
    const t = targetRef.current
    if (!t) return
    const pos = t.position
    if (!started.current) {
      prev.current.copy(pos)
      camera.position.set(pos.x, pos.y + 2.2, pos.z + 4.5)
      started.current = true
    }
    // rigidly track the character so orbiting stays centered while it moves
    camera.position.x += pos.x - prev.current.x
    camera.position.z += pos.z - prev.current.z
    prev.current.copy(pos)
    if (controls.current) {
      controls.current.target.set(pos.x, pos.y + 1.2, pos.z)
      controls.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={2.5}
      maxDistance={9}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}

function Scene() {
  const characterRef = useRef()
  return (
    <>
      <Sky sunPosition={[50, 30, 20]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <Grid
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.6}
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#6ee7ff"
        cellColor="#3a3f44"
        fadeDistance={40}
        infiniteGrid
        position={[0, 0.01, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#202028" />
      </mesh>
      <Suspense fallback={null}>
        <Character groupRef={characterRef} />
      </Suspense>
      <FollowRig targetRef={characterRef} />
    </>
  )
}

export default function CharacterController() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#87ceeb' }}>
      <Canvas shadows camera={{ fov: 55, near: 0.1, far: 500, position: [0, 2.2, 4.5] }}>
        <Scene />
      </Canvas>
      <div style={hintStyle}>WASD move &middot; mouse orbit &middot; Shift run &middot; F dance</div>
    </div>
  )
}

const hintStyle = {
  position: 'absolute',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.5)',
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 13,
  color: '#e6e6ee',
  pointerEvents: 'none',
}
