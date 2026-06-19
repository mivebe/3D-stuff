import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useKeyboard } from '../../core/useKeyboard.js'

const EYE_HEIGHT = 1.7
const WALK_SPEED = 5
const SPRINT_SPEED = 9
const GRAVITY = 20
const JUMP_VELOCITY = 7
const PLAYER_RADIUS = 0.45
const WORLD_HALF = 45

// scatter obstacles, keeping the spawn area around the origin clear
function makeObstacles() {
  const items = []
  for (let i = 0; i < 60; i++) {
    const x = (Math.random() * 2 - 1) * WORLD_HALF
    const z = (Math.random() * 2 - 1) * WORLD_HALF
    if (Math.hypot(x, z) < 6) continue
    const size = 1 + Math.random() * 2.5
    const height = 1 + Math.random() * 4
    items.push({
      position: [x, height / 2, z],
      size: [size, height, size],
      radius: Math.hypot(size, size) / 2,
      color: new THREE.Color().setHSL(Math.random(), 0.5, 0.55).getStyle(),
    })
  }
  return items
}

function Player({ obstacles }) {
  const { camera } = useThree()
  const keys = useKeyboard()
  const velocityY = useRef(0)
  const onGround = useRef(true)
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const move = useRef(new THREE.Vector3())

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 0)
  }, [camera])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const input = keys.current

    // horizontal basis from where the camera looks, flattened to the ground
    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.crossVectors(forward.current, camera.up).normalize()

    move.current.set(0, 0, 0)
    if (input.forward) move.current.add(forward.current)
    if (input.backward) move.current.sub(forward.current)
    if (input.right) move.current.add(right.current)
    if (input.left) move.current.sub(right.current)

    if (move.current.lengthSq() > 0) {
      move.current.normalize()
      const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED
      camera.position.addScaledVector(move.current, speed * delta)
    }

    // jump + gravity
    if (input.jump && onGround.current) {
      velocityY.current = JUMP_VELOCITY
      onGround.current = false
    }
    velocityY.current -= GRAVITY * delta
    camera.position.y += velocityY.current * delta
    if (camera.position.y <= EYE_HEIGHT) {
      camera.position.y = EYE_HEIGHT
      velocityY.current = 0
      onGround.current = true
    }

    // push out of obstacles in the xz plane
    for (const o of obstacles) {
      const dx = camera.position.x - o.position[0]
      const dz = camera.position.z - o.position[2]
      const dist = Math.hypot(dx, dz)
      const minDist = o.radius + PLAYER_RADIUS
      if (dist > 0 && dist < minDist) {
        const push = (minDist - dist) / dist
        camera.position.x += dx * push
        camera.position.z += dz * push
      }
    }

    // keep inside the world bounds
    const limit = WORLD_HALF + 4
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit)
  })

  return null
}

function Scene({ onLockChange }) {
  const controls = useRef(null)
  const obstacles = useMemo(makeObstacles, [])

  useEffect(() => {
    const node = controls.current
    if (!node) return
    const lock = () => onLockChange(true)
    const unlock = () => onLockChange(false)
    node.addEventListener('lock', lock)
    node.addEventListener('unlock', unlock)
    return () => {
      node.removeEventListener('lock', lock)
      node.removeEventListener('unlock', unlock)
    }
  }, [onLockChange])

  return (
    <>
      <Sky sunPosition={[100, 40, 100]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_HALF * 2 + 20, WORLD_HALF * 2 + 20]} />
        <meshStandardMaterial color="#3a3f44" />
      </mesh>
      {obstacles.map((o, i) => (
        <mesh key={i} position={o.position} castShadow receiveShadow>
          <boxGeometry args={o.size} />
          <meshStandardMaterial color={o.color} />
        </mesh>
      ))}
      <Player obstacles={obstacles} />
      <PointerLockControls ref={controls} />
    </>
  )
}

export default function FpsControls() {
  const [locked, setLocked] = useState(false)

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#87ceeb' }}>
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 500 }}>
        <Scene onLockChange={setLocked} />
      </Canvas>

      <div style={crosshairStyle(locked)} />

      {!locked && (
        <div style={overlayStyle}>
          <div style={overlayCardStyle}>
            <h2 style={{ margin: '0 0 8px' }}>FPS Controls</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--muted)' }}>
              WASD to move, mouse to look, Shift to sprint, Space to jump.
            </p>
            <button style={buttonStyle} onClick={() => requestLock()}>
              Click to play
            </button>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Press Esc to release the cursor.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  // the canvas owns the controls; clicking the canvas locks the pointer.
  // drei's PointerLockControls also locks on canvas click, so the button
  // simply forwards a click into the canvas region.
  function requestLock() {
    const canvas = document.querySelector('canvas')
    canvas?.requestPointerLock?.()
  }
}

function crosshairStyle(visible) {
  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    borderRadius: '50%',
    background: '#fff',
    opacity: visible ? 0.8 : 0,
    pointerEvents: 'none',
  }
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)',
}

const overlayCardStyle = {
  background: 'var(--panel)',
  border: '1px solid #26262f',
  borderRadius: 12,
  padding: 28,
  textAlign: 'center',
  maxWidth: 360,
}

const buttonStyle = {
  background: 'var(--accent)',
  color: '#06232b',
  border: 0,
  borderRadius: 8,
  padding: '10px 20px',
  fontWeight: 600,
  cursor: 'pointer',
}
