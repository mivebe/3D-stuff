import { useRef, useState, useEffect } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useSpring, a } from '@react-spring/web';
import * as THREE from 'three';

import chestOpenSound from '../../assets/sound/open-chest.mp3';

const openChest = new Audio(chestOpenSound);

const Model = (props) => {
	const group = useRef();
	const actions = useRef();

	const { nodes, materials, animations } = useLoader(GLTFLoader, '../../../coffre-minecraft.glb');
	const [mixer] = useState(() => new THREE.AnimationMixer());

	useFrame((state, delta) => mixer.update(delta));
	useEffect(() => {
		actions.current = {
			ArmatureAction: mixer.clipAction(animations[0], group.current),
		};

		return () => animations.forEach((clip) => mixer.uncacheClip(clip));
	}, [animations, mixer]);

	const handleAnimation = () => {
		props.setOpen(!props.open);
		openChest.volume = 0.3;
		openChest.play();
	};

	const chestOpen = useSpring({
		rotation: props.open ? [0, 0, 0] : [1.61, 0, 0],
		position: props.open ? [0, -1.5, 0] : [0, 0, 0],
	});

	return (
		<group onClick={handleAnimation} ref={group} {...props} dispose={null}>
			<a.group position={[0, -0.99, 0]} rotation={chestOpen.position}>
				<primitive object={nodes.Bone} />
				<a.primitive rotation={chestOpen.rotation} object={nodes.Bone001} />
				<skinnedMesh
					castShadow
					receiveShadow
					material={materials.Material}
					geometry={nodes.Cube.geometry}
					skeleton={nodes.Cube.skeleton}
				/>
			</a.group>
		</group>
	);
};

export default Model;
