import { useSpring } from '@react-spring/web';
import { extend, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons';

const UserControls = () => {
	const Controls = extend(OrbitControls);
	const { gl, camera } = useThree();

	useSpring(() => ({
		from: {
			z: 30,
		},
		x: -5,
		y: 4,
		z: 4,

		onFrame: ({ x, y, z }) => {
			camera.position.x = x;
			camera.position.y = y;
			camera.position.z = z;
		},
	}));

	return (
		<Controls
			enableZoom={true}
			enablePan={false}
			target={[0, 0, 0]}
			args={[camera, gl.domElement]}
		/>
	);
};

export default UserControls;
