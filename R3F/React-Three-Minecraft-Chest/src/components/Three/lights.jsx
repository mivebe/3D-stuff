import { useHelper } from '@react-three/drei';
import { useRef } from 'react';
import { DirectionalLightHelper, PointLightHelper } from 'three';

const Lights = () => {
	const dirLightRef = useRef();
	const pointLightRef = useRef();

	useHelper(dirLightRef, DirectionalLightHelper, 5, 'hotpink');
	useHelper(pointLightRef, PointLightHelper, 5, 'green');

	return (
		<>
			{/* <fog attach="fog" args={["#fff", 0, 22]} /> */}
			<ambientLight intensity={0.4} />
			<directionalLight
				ref={dirLightRef}
				castShadow
				position={[-8, 16, -8]}
				intensity={1}
				shadow-mapSize={[1024, 1024]}
			>
				<orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 1, 50]} />
			</directionalLight>
			{/* <pointLight ref={pointLightRef} position={[0, 50, 0]} intensity={2} /> */}
		</>
	);
};

export default Lights;
