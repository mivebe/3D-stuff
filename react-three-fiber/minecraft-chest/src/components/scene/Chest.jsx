import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring } from '@react-spring/three';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import openSound from '../../assets/sound/open-chest.mp3';
import closeSound from '../../assets/sound/close-chest.mp3';

// base-relative so it resolves whether served at root or under a subpath (iframe)
const MODEL_URL = `${import.meta.env.BASE_URL}models/coffre-minecraft.glb`;

const openChest = new Audio(openSound);
const closeChest = new Audio(closeSound);

// lid bone (Bone.001) rest transform, straight from the glb
const BONE_HEAD = new THREE.Vector3(0, 1.7300409, -0.9812346);
const Q_REST = new THREE.Quaternion(0.7214207, 0, 0, 0.6924971);
const S_REST = new THREE.Vector3(1, 1, 0.9998087);
const REST_MATRIX = new THREE.Matrix4().compose(BONE_HEAD, Q_REST, S_REST);

// true hinge line: the lid's back-bottom edge, which meets the body's top-back edge.
// the bone head sits ~0.3 above this, so spinning the bone about its own head lifts the
// lid off the body. rotate about the hinge instead and the back edge stays pinned.
const HINGE = new THREE.Vector3(0, 1.435, -1.01);
const OPEN_ANGLE = Math.PI / 2;

// scratch reused every frame
const _rot = new THREE.Matrix4();
const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _toHinge = new THREE.Matrix4().makeTranslation(HINGE.x, HINGE.y, HINGE.z);
const _fromHinge = new THREE.Matrix4().makeTranslation(-HINGE.x, -HINGE.y, -HINGE.z);

// pose the lid bone so the whole lid rotates rigidly about the hinge by `theta`.
// bone local = T(hinge) * Rx(-theta) * T(-hinge) * restMatrix
function applyLidPose(bone, theta) {
	_rot.makeRotationX(-theta);
	_mat.copy(_toHinge).multiply(_rot).multiply(_fromHinge).multiply(REST_MATRIX);
	_mat.decompose(_pos, _quat, _scl);
	bone.position.copy(_pos);
	bone.quaternion.copy(_quat);
	bone.scale.copy(_scl);
}

const Model = ({ isOpen, onToggle }) => {
	const { nodes, materials } = useGLTF(MODEL_URL);

	// one animated angle drives the hinge; applied to the bone each frame
	const [spring, api] = useSpring(() => ({
		theta: 0,
		config: { tension: 180, friction: 18 },
	}));

	useEffect(() => {
		api.start({ theta: isOpen ? OPEN_ANGLE : 0 });
	}, [isOpen, api]);

	useFrame(() => applyLidPose(nodes.Bone001, spring.theta.get()));

	// skip the mount pass so no sound fires on first render
	const mounted = useRef(false);
	useEffect(() => {
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		const sound = isOpen ? openChest : closeChest;
		sound.currentTime = 0;
		sound.volume = 0.3;
		sound.play();
	}, [isOpen]);

	return (
		<group onClick={onToggle} dispose={null}>
			<group position={[0, -1, 0]}>
				<primitive object={nodes.Bone} />
				<primitive object={nodes.Bone001} />
				<skinnedMesh
					castShadow
					material={materials.Material}
					geometry={nodes.Cube.geometry}
					skeleton={nodes.Cube.skeleton}
				/>
			</group>
		</group>
	);
};

useGLTF.preload(MODEL_URL);

export default Model;
