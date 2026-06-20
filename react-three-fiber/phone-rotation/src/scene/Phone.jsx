import { forwardRef, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SCREEN, tempColor } from './config.js'
import PhoneScreen from './PhoneScreen.jsx'

const base = import.meta.env.BASE_URL
const url = `${base}phone.gltf`
useGLTF.preload(url)

// small back-of-phone accents (camera ring / button) read better as dark metal
// than the model's default flat white
function dressFrame(material) {
  material.color.set('#2a2a2e')
  material.metalness = 1
  material.roughness = 0.4
  material.envMapIntensity = 1.1
}

const Phone = forwardRef(function Phone({ finish, phase }, ref) {
  const { scene } = useGLTF(url)

  // offset so the group's pivot is the model centroid; otherwise rotation
  // swings the visual center around and the parked position drifts
  const center = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const c = new THREE.Vector3()
    box.getCenter(c)
    return c
  }, [scene])

  // grab the named materials once so finish changes are cheap
  const materials = useMemo(() => {
    const found = {}
    scene.traverse((o) => {
      if (!o.isMesh) return
      const list = Array.isArray(o.material) ? o.material : [o.material]
      list.forEach((m) => {
        found[m.name] = m
      })
    })
    return found
  }, [scene])

  // one-time material setup: blacken the baked screen, dress the frame accents
  useEffect(() => {
    const screen = materials['screen']
    if (screen) {
      screen.map = null
      screen.color.set('#050506')
      screen.metalness = 0.5
      screen.roughness = 0.18
      screen.emissive = new THREE.Color('#000000')
      screen.needsUpdate = true
    }
    ;['Material.003', 'Material.004', 'Material.002'].forEach((name) => {
      if (materials[name]) dressFrame(materials[name])
    })
  }, [materials])

  // live finish: recolor the body material (Material.001)
  useEffect(() => {
    const body = materials['Material.001']
    if (!body || !finish) return
    body.color.copy(tempColor.set(finish.color))
    body.metalness = finish.metalness
    body.roughness = finish.roughness
    body.envMapIntensity = 1.25
    body.needsUpdate = true
  }, [materials, finish])

  return (
    <group ref={ref}>
      <group position={[-center.x, -center.y, -center.z]}>
        <primitive object={scene} />
        <group position={SCREEN.center} rotation={SCREEN.rotation}>
          <PhoneScreen phase={phase} />
        </group>
      </group>
    </group>
  )
})

export default Phone
