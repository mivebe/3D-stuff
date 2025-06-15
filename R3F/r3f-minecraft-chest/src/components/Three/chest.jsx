import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import chestOpenSound from '../../assets/sound/open-chest.mp3';

const openChest = new Audio(chestOpenSound);

const Model = () => {
	const group = useRef();
	const [isOpen, setIsOpen] = useState(false);

	const { nodes, materials, animations } = useGLTF('../../../models/coffre-minecraft.glb');
	const { actions } = useAnimations(animations, group);

	const [mixer] = useState(() => new THREE.AnimationMixer());

	useFrame((_, delta) => mixer.update(delta));
	useEffect(() => {
		actions.current = {
			ArmatureAction: mixer.clipAction(animations[0], group.current),
		};

		return () => animations.forEach((clip) => mixer.uncacheClip(clip));
	}, [animations, mixer, actions]);

	const handleAnimation = () => {
		setIsOpen(!isOpen);
		openChest.volume = 0.3;
		openChest.play();
	};

	const { lidRotation, baseRotation } = useSpring({
		from: {
			lidRotation: isOpen ? [1.61, 0, 0] : [0, 0, 0],
			baseRotation: isOpen ? [0, 0, 0] : [0, -1.5, 0],
		},
		to: {
			lidRotation: isOpen ? [0, 0, 0] : [1.61, 0, 0],
			baseRotation: isOpen ? [0, -1.5, 0] : [0, 0, 0],
		},
	});

	return (
		<>
			<group onClick={handleAnimation} ref={group} isOpen={isOpen} dispose={null}>
				<animated.group position={[0, -1, 0]} rotation={baseRotation}>
					<primitive object={nodes.Bone} />
					<animated.primitive object={nodes.Bone001} rotation={lidRotation} />
					<skinnedMesh
						castShadow
						material={materials.Material}
						geometry={nodes.Cube.geometry}
						skeleton={nodes.Cube.skeleton}
					/>
				</animated.group>
			</group>
		</>
	);
};

useGLTF.preload('../../../models/coffre-minecraft.glb');

export default Model;
