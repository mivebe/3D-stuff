import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lights from './components/scene/Lights';
import Floor from './components/scene/Floor';
import Model from './components/scene/Chest';
import UserControls from './components/scene/Controls';
import Inventory from './components/ui/Inventory';

import './styles/App.css';

const App = () => {
	return (
		<>
			<div
				id="ui-root"
				style={{
					width: '100vw',
					height: '100vh',
					position: 'absolute',
					zIndex: 9999,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Inventory />
			</div>
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
