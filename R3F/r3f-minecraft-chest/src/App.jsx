import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lights from './components/scene/Lights';
import Floor from './components/scene/Floor';
import Model from './components/scene/Chest';
import UserControls from './components/scene/Controls';

import './styles/App.css';

const App = () => {
	return (
		<>
			<Canvas shadows camera={{ position: [-5, 4, 4], fov: 40 }}>
				<Suspense fallback={() => <Loader />}>
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
