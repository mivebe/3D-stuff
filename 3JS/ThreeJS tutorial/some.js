import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

var camera, fakeCamera, controls, scene, renderer, labelRenderer;
var solarPlane, earth, moon;
var angle = 0;

function buildScene() {
    scene = new THREE.Scene();
    solarPlane = createSolarPlane();
    earth = createBody("Earth");
    moon = createBody("Moon");

    scene.add(solarPlane);
    solarPlane.add(earth);
    earth.add(moon);

    moon.add(camera);
}

init();
animate();

function init() {

    renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(13.670839104116506, 10.62941701834559, 0.3516419193657562);
    camera.lookAt(0, 0, 0);

    buildScene();

    fakeCamera = camera.clone();
    controls = new OrbitControls(fakeCamera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
}

function animate(time) {

    angle = (angle + .005) % (2 * Math.PI);
    rotateBody(earth, angle, 1);
    rotateBody(moon, angle, 2);

    camera.copy(fakeCamera);

    render();
    requestAnimationFrame(animate);

    function rotateBody(body, angle, radius) {
        body.rotation.x = angle;
        body.position.x = radius * Math.cos(angle);
        body.position.y = radius * Math.sin(angle);
        body.position.z = radius * Math.sin(angle);
    }
}

function render() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function createBody(name, parent) {
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    const body = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
    body.position.set(1, 1, 1);
    body.scale.set(.3, .3, .3);
    body.name = name;
    body.add(makeTextLabel(name));
    return body;
}

function createSolarPlane() {
    var solarPlane = new THREE.GridHelper(5, 10);
    solarPlane.add(makeTextLabel("solar plane"));
    return solarPlane;
}

function makeTextLabel(label) {
    var text = document.createElement('div');
    text.style.color = 'rgb(255, 255, 255)';
    text.textContent = label;
    return new CSS2DObject(text);
}