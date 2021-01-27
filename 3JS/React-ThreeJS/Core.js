import React from 'react'
import * as THREE from "three"
// import { Expo, TimelineMax, TweenLite } from "gsap"

const Core = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = width / height;
    const fov = 75;
    const nearPlane = 0.1;
    const farPlane = 1000

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, ratio, nearPlane, farPlane);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor("#e5e5e5");
    renderer.setSize(width, height);

    document.body.appendChild(renderer.domElement);

    window.addEventListener("resize", () => {
        renderer.setSize(width, height);
        camera.aspect = ratio;
        camera.updateProjectionMatrix();
    })

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -2, 0);
    scene.add(mesh);

    const geometry2 = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material2 = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
    const mesh2 = new THREE.Mesh(geometry2, material2);
    mesh2.position.set(0, 2, 0);
    scene.add(mesh2);

    const light = new THREE.PointLight(0xFFFFFF, 1, 500);
    light.position.set(10, 0, 25);
    scene.add(light);

    const render = () => {
        requestAnimationFrame(render);
        renderer.render(scene, camera);
    }

    const onMouseMove = (e) => {
        e.preventDefault();

        mouse.x = (e.clientX / width) * 2 - 1;
        mouse.y = -(e.clientY / height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intercsects = raycaster.intersectObjects(scene.children, true);
        for (let i = 0; i < intercsects.length; i++) {
            console.log(intercsects[i].object.scale = { x: 2, y: 3, z: 1 });
            // intercsects[i].object.scale
            // intercsects[i].object.position
            // intercsects[i].object.rotation
        }

    }
    render();

    window.addEventListener("mousemove", onMouseMove)
    return (
        <div>

        </div>
    )
}

export default Core
