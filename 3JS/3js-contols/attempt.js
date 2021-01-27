import Stats from './node_modules/three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from './node_modules/three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from "./node_modules/three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { MD2CharacterComplex } from './node_modules/three/examples/jsm/misc/MD2CharacterComplex.js';
import { Gyroscope } from './node_modules/three/examples/jsm/misc/Gyroscope.js';

let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;

let container, stats;
let camera, scene, renderer;
let model, skeleton, mixer;
let numAnimations;

const characters = [];
let nCharacters = 0;

let cameraControls;

const allActions = [];
const baseActions = {
    idle_strip: { weight: 1 },
    walk_strip: { weight: 0 },
    run: { weight: 0 }
};
const additiveActions = {
    sneak_pose: { weight: 0 },
    sad_pose: { weight: 0 },
    agree: { weight: 0 },
    headShake: { weight: 0 }
};

const controls = {

    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false

};

let currentAction;

const clock = new THREE.Clock();

init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    // CAMERA

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.set(0, 150, 1300);

    // SCENE

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 1000, 4000);

    scene.add(camera);

    // LIGHTS

    scene.add(new THREE.AmbientLight(0x222222));

    const light = new THREE.DirectionalLight(0xffffff, 2.25);
    light.position.set(200, 450, 500);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 512;

    light.shadow.camera.near = 100;
    light.shadow.camera.far = 1200;

    light.shadow.camera.left = - 1000;
    light.shadow.camera.right = 1000;
    light.shadow.camera.top = 350;
    light.shadow.camera.bottom = - 350;

    scene.add(light);
    scene.add(new THREE.CameraHelper(light.shadow.camera));


    //  GROUND

    const gt = new THREE.TextureLoader().load("./textures/grasslight-big.jpg");
    const gg = new THREE.PlaneBufferGeometry(16000, 16000);
    const gm = new THREE.MeshPhongMaterial({ color: 0xffffff, map: gt });

    const ground = new THREE.Mesh(gg, gm);
    ground.rotation.x = - Math.PI / 2;
    ground.material.map.repeat.set(64, 64);
    ground.material.map.wrapS = THREE.RepeatWrapping;
    ground.material.map.wrapT = THREE.RepeatWrapping;
    ground.material.map.encoding = THREE.sRGBEncoding;
    // note that because the ground does not cast a shadow, .castShadow is left false
    ground.receiveShadow = true;

    scene.add(ground);

    // RENDERER

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container.appendChild(renderer.domElement);

    //

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // STATS

    stats = new Stats();
    container.appendChild(stats.dom);

    // EVENTS

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // CONTROLS

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 50, 0);
    cameraControls.enableKeys = false;
    cameraControls.update();

    //HDRI

    new RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .setPath('./textures/')
        .load('kloppenheim_2k.hdr', function (texture) {

            const envMap = pmremGenerator.fromEquirectangular(texture).texture;

            scene.background = envMap;
            scene.environment = envMap;

            texture.dispose();
            pmremGenerator.dispose();

            render();
        });
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // CHARACTER

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./node_modules/three/examples/js/libs/draco/");
    loader.setDRACOLoader(dracoLoader);

    loader.load("./models/warrior.glb", function (gltf) {
        model = gltf.scene
        scene.add(model);
        model.scale.set(100, 100, 100);
        console.log(gltf);

        model.traverse(function (object) {
            if (object.isMesh) object.castShadow = true
        });

        // skeleton = new THREE.SkeletonHelper(model);
        // skeleton.visible = true;
        // scene.add(skeleton);

        const animations = gltf.animations;
        mixer = new THREE.AnimationMixer(model);

        numAnimations = animations.length;

        for (let i = 0; i !== numAnimations; i++) {

            let clip = animations[i];
            const name = clip.name;
            console.log(clip);

            if (baseActions[name]) {
                const action = mixer.clipAction(clip);
                activateAction(action);
                baseActions[name].action = action;
                allActions.push(action);
            } else if (additiveActions[name]) {
                THREE.AnimationUtils.makeClipAdditive(clip);

                if (clip.name.endsWith("_pose")) {
                    clip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);
                }
                const actions = mixer.clipAction(clip);
                activateAction(action);
                additiveActions[name].action = action;
                allActions.push(action);
            }
        }

        currentAction = allActions[0];

    },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + "% loaded");
        },
        function (error) {
            console.log(`GLTFLoader has Flatlined : ${error}`);
        }
    )
    // const configOgro = {

    //     baseUrl: "./models/",

    //     body: "ogro.md2",
    //     skins: ["grok.jpg", "ogrobase.png", "arboshak.png", "ctf_r.png", "ctf_b.png", "darkam.png", "freedom.png",
    //         "gib.png", "gordogh.png", "igdosh.png", "khorne.png", "nabogro.png",
    //         "sharokh.png"],
    //     weapons: [["weapon.md2", "weapon.jpg"]],
    //     animations: {
    //         move: "run",
    //         idle: "stand",
    //         jump: "jump",
    //         attack: "attack",
    //         crouchMove: "cwalk",
    //         crouchIdle: "cstand",
    //         crouchAttach: "crattack"
    //     },

    //     walkSpeed: 350,
    //     crouchSpeed: 175

    // };

    // const nRows = 1;
    // const nSkins = configOgro.skins.length;

    // nCharacters = nSkins * nRows;

    // for (let i = 0; i < nCharacters; i++) {

    //     const character = new MD2CharacterComplex();
    //     character.scale = 3;
    //     character.controls = controls;
    //     characters.push(character);

    // }

    // const baseCharacter = new MD2CharacterComplex();
    // baseCharacter.scale = 3;

    // baseCharacter.onLoadComplete = function () {

    //     let k = 0;

    //     for (let j = 0; j < nRows; j++) {

    //         for (let i = 0; i < nSkins; i++) {

    //             const cloneCharacter = characters[k];

    //             cloneCharacter.shareParts(baseCharacter);

    //             // cast and receive shadows
    //             cloneCharacter.enableShadows(true);

    //             cloneCharacter.setWeapon(0);
    //             cloneCharacter.setSkin(i);

    //             cloneCharacter.root.position.x = (i - nSkins / 2) * 150;
    //             cloneCharacter.root.position.z = j * 250;

    //             scene.add(cloneCharacter.root);

    //             k++;

    //         }

    //     }

    //     const gyro = new Gyroscope();
    //     gyro.add(camera);
    //     gyro.add(light, light.target);

    //     characters[Math.floor(nSkins / 2)].root.add(gyro);

    // };

    // baseCharacter.loadParts(configOgro);
}

function setWeight(action, weight) {

    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);

}

function activateAction(action) {

    const clip = action.getClip();
    const settings = baseActions[clip.name] || additiveActions[clip.name];
    setWeight(action, settings.weight);
    action.play();

}

// EVENT HANDLERS

function onWindowResize() {

    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

}

function onKeyDown(event) {

    switch (event.keyCode) {

        case 38: /*up*/
        case 87: /*W*/ 	controls.moveForward = true;
            model.position.z += 10;
            if (currentAction !== allActions[1]) {
                executeCrossFade(allActions[0], allActions[1], 1);
                currentAction = allActions[1];
            }

            break;

        case 40: /*down*/
        case 83: /*S*/ 	 controls.moveBackward = true; break;

        case 37: /*left*/
        case 65: /*A*/ controls.moveLeft = true; break;

        case 39: /*right*/
        case 68: /*D*/ controls.moveRight = true; break;

        case 67: /*C*/     controls.crouch = true; break;
        case 32: /*space*/ controls.jump = true; break;
        case 17: /*ctrl*/  controls.attack = true; break;

    }

}

function onKeyUp(event) {

    switch (event.keyCode) {

        case 38: /*up*/
        case 87: /*W*/ controls.moveForward = false;

            if (currentAction !== allActions[0]) {
                executeCrossFade(allActions[1], allActions[0], 1);
                currentAction = allActions[0];
            }
            break;

        case 40: /*down*/
        case 83: /*S*/ 	 controls.moveBackward = false; break;

        case 37: /*left*/
        case 65: /*A*/ 	 controls.moveLeft = false; break;

        case 39: /*right*/
        case 68: /*D*/ controls.moveRight = false; break;

        case 67: /*C*/     controls.crouch = false; break;
        case 32: /*space*/ controls.jump = false; break;
        case 17: /*ctrl*/  controls.attack = false; break;

    }

}

function executeCrossFade(startAction, endAction, duration) {

    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)

    if (endAction) {

        setWeight(endAction, 1);
        endAction.time = 0;

        if (startAction) {

            // Crossfade with warping

            startAction.crossFadeTo(endAction, duration, true);

        } else {

            // Fade in

            endAction.fadeIn(duration);

        }

    } else {

        // Fade out

        startAction.fadeOut(duration);

    }

}

//

function animate() {

    requestAnimationFrame(animate);

    // Get the time elapsed since the last frame, used for mixer update
    const mixerUpdateDelta = clock.getDelta();
    // Update the animation mixer, the stats panel, and render this frame
    if (mixer) {
        mixer.update(mixerUpdateDelta);
    }


    stats.update();

    render();
}

window.test = function () {
    console.log(allActions);
}

function render() {

    const delta = clock.getDelta();

    // for (let i = 0; i < nCharacters; i++) {

    //     characters[i].update(delta);

    // }

    renderer.render(scene, camera);

}
