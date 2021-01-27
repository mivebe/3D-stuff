import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from 'react-three-fiber'
import { useGLTF, useAnimations, PerspectiveCamera } from 'drei'


export default function Model(props) {
  const group = useRef()
  const { nodes, materials, animations } = useGLTF('/warrior.glb')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    actions.walk_strip.play()
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.03, 0.03]}>
        <primitive object={nodes.Hips} />
        <skinnedMesh
          material={materials.MariaMat}
          geometry={nodes.Maria_J_J_Ong.geometry}
          skeleton={nodes.Maria_J_J_Ong.skeleton}
        />
        <skinnedMesh
          material={materials['MariaMat.001']}
          geometry={nodes.Maria_sword.geometry}
          skeleton={nodes.Maria_sword.skeleton}
        />
      </group>
      <group position={[0, 15, -30]} rotation={[1.89, 0.02, -3.11]}>
        <PerspectiveCamera makeDefault={true} far={1000} near={0.1} fov={22.9} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
      <mesh material={nodes.Plane.material} geometry={nodes.Plane.geometry} scale={[13.18, 13.18, 13.18]} />
      <mesh material={materials['Material.002']} geometry={nodes.Sphere.geometry} position={[-0.04, 4.01, 11.58]} />
      <mesh material={materials['Material.001']} geometry={nodes.Cube.geometry} position={[7.99, 4.33, 9.01]} />
    </group>
  )
}

useGLTF.preload('/warrior.glb')
