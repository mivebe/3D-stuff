import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lights from './components/Three/lights';
import Floor from './components/Three/floor';
import Model from './components/Three/chest';
import UserControls from './components/Three/controls';

import './assets/styles/App.scss';

const App = () => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Canvas shadows camera={{ position: [-5, 4, 4], fov: 40 }}>
				{/* <Suspense fallback={null}>
					<Model open={isOpen} setOpen={setIsOpen} />
				</Suspense> */}
				<Lights />
				<mesh castShadow>
					<boxGeometry args={[2, 2, 2]} />
					<meshPhongMaterial />
				</mesh>
				<Floor />
				<UserControls />
			</Canvas>
			{/* <Loader /> */}
		</>
	);
};

export default App;
