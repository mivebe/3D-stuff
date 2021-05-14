import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import gsap from 'gsap'

// Debug
// const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

//GSAP
let tl = gsap.timeline()

//GLTF
const gltfLoader = new GLTFLoader()
gltfLoader.load('phone.gltf', (gltf) => {
    gltf.scene.scale.set(1, 1, 1)
    gltf.scene.position.set(0, -0.5, 0)
    gltf.scene.rotation.set(3, 3.1, 4.73)
    scene.add(gltf.scene)

    // gui.add(gltf.scene.rotation, 'x').min(0).max(10)
    // gui.add(gltf.scene.rotation, 'y').min(0).max(10)
    // gui.add(gltf.scene.rotation, 'z').min(0).max(10)
    // gui.add(gltf.scene.position, 'x').min(0).max(10)
    // gui.add(gltf.scene.position, 'y').min(0).max(10)
    // gui.add(gltf.scene.position, 'z').min(0).max(10)

    tl.to(gltf.scene.rotation, { y: 1.6, x: 3.1, duration: 2 })
    tl.to(gltf.scene.scale, { x: 0.65, y: 0.65, z: 0.65, duration: 2 }, "-=2")
    tl.to(gltf.scene.position, { x: 1.2, duration: 2 })
})

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
const pointLight = new THREE.PointLight(0xffffff, 0.1)
pointLight.position.x = 2
pointLight.position.y = 3
pointLight.position.z = 4
scene.add(pointLight)
scene.add(ambientLight)

/**
 * Sizes
 */
const sizes = {
    // width: (window.innerWidth) / 2,
    // height: (window.innerHeight) / 2
    width: document.querySelector(".phone-container").offsetWidth,
    height: document.querySelector(".phone-container").offsetHeight,
}

window.addEventListener('resize', () => {

    // Update sizes
    sizes.width = document.querySelector(".phone-container").offsetWidth;
    sizes.height = document.querySelector(".phone-container").offsetHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))



/**
 * Animate
 */

const clock = new THREE.Clock()

const tick = () => {

    const elapsedTime = clock.getElapsedTime()

    // Update objects


    // Update Orbital Controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()