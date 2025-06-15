import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lights from './components/Three/lights';
import Floor from './components/Three/floor';
import Model from './components/Three/chest';
import UserControls from './components/Three/controls';

import './styles/App.css';

const App = () => {
	return (
		<>
			<Canvas shadows camera={{ position: [-5, 4, 4], fov: 40 }}>
				<Suspense fallback={Loader}>
					<Model />
				</Suspense>
				<Lights />
				<Floor />
				<UserControls />
			</Canvas>
		</>
	);
};

export default App;
