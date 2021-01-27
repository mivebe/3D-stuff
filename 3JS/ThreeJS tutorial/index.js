
const fov = 75;
const nearPlane = 0.1;
const farPlane = 1000

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, nearPlane, farPlane);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor("#e5e5e5");
renderer.setSize(width, height);

document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
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

const geometry2 = new THREE.BoxGeometry(1, 1, 1);
const material2 = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });
const mesh2 = new THREE.Mesh(geometry, material);
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

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intercsects = raycaster.intersectObjects(scene.children, true);
    for (let i = 0; i < intercsects.length; i++) {
        this.tl = new TimelineMax();
        this.tl.to(intercsects[i].object.scale, 1, { x: 2, ease: Expo.easeOut });
        this.tl.to(intercsects[i].object.scale, .5, { x: .5, ease: Expo.easeOut });
        this.tl.to(intercsects[i].object.position, .5, { x: 2, ease: Expo.easeOut });
        this.tl.to(intercsects[i].object.rotation, .5, { y: Math.PI * .5, ease: Expo.easeOut });
    }

}
render();

window.addEventListener("mousemove", onMouseMove)