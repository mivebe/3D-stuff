import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'

// shared model loader. wraps drei's cached useGLTF and returns a fresh
// skeleton-aware clone so the same gltf can back multiple instances safely.
// reports a fit transform (scale + foot offset) normalizing the model to a
// target height with feet on the ground, and can strip baked root motion so
// code-driven locomotion does not fight the animation.
export function useModel(url, options = {}) {
  const { targetHeight = 1.8, inPlace = false } = options
  const gltf = useGLTF(url)

  const scene = useMemo(() => {
    const cloned = skeletonClone(gltf.scene)
    cloned.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false // skinned meshes can cull wrongly mid-animation
      }
    })
    return cloned
  }, [gltf.scene])

  const { fit, rootName } = useMemo(() => {
    scene.updateMatrixWorld(true)
    // skinned meshes render from bone transforms, not the bind-pose geometry
    // box (which here is rotated 90deg and scaled by a baked root node, so its
    // y-extent is actually the model's depth). measure from bone world
    // positions instead to get the true upright height.
    let skinned = null
    scene.traverse((o) => {
      if (!skinned && o.isSkinnedMesh) skinned = o
    })
    const bones = skinned?.skeleton?.bones
    const box = new THREE.Box3()
    const p = new THREE.Vector3()
    if (bones?.length) {
      for (const bone of bones) box.expandByPoint(bone.getWorldPosition(p))
    } else {
      box.setFromObject(scene)
    }
    const size = new THREE.Vector3()
    box.getSize(size)
    const scale = size.y > 1e-6 ? targetHeight / size.y : 1
    const root = bones?.find((b) => !b.parent || !b.parent.isBone)
    return { fit: { scale, footOffset: -box.min.y * scale }, rootName: root?.name }
  }, [scene, targetHeight])

  const animations = useMemo(() => {
    if (!inPlace) return gltf.animations
    // strip baked root motion so code-driven locomotion does not fight it.
    // the locomotion axis is whichever component of the root translation moves
    // monotonically (net displacement ~ full range); lock it to frame 0 and
    // leave oscillatory sway + vertical bob alone. axis-agnostic, so it works
    // regardless of any rotation baked into the model's root node.
    return gltf.animations.map((clip) => {
      const c = clip.clone()
      for (const track of c.tracks) {
        if (!track.name.endsWith('.position')) continue
        if (!rootName || !track.name.startsWith(rootName + '.')) continue
        const v = track.values
        const frames = v.length / 3
        for (let k = 0; k < 3; k++) {
          let min = Infinity
          let max = -Infinity
          for (let i = 0; i < frames; i++) {
            const value = v[i * 3 + k]
            if (value < min) min = value
            if (value > max) max = value
          }
          const range = max - min
          const net = Math.abs(v[(frames - 1) * 3 + k] - v[k])
          if (range > 1e-6 && net / range > 0.5) {
            const locked = v[k]
            for (let i = 0; i < frames; i++) v[i * 3 + k] = locked
          }
        }
      }
      return c
    })
  }, [gltf.animations, inPlace, rootName])

  return { scene, animations, fit }
}

export const preloadModel = useGLTF.preload
