import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lights from './components/scene/Lights';
import Floor from './components/scene/Floor';
import Model from './components/scene/Chest';
import ChestHint from './components/scene/ChestHint';
import UserControls from './components/scene/Controls';
import Inventory from './components/ui/Inventory';

import './styles/App.css';

const App = () => {
	// single source of truth: lid animation and inventory visibility share it
	const [isOpen, setIsOpen] = useState(false);
	const toggle = () => setIsOpen((open) => !open);

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
					justifyContent: 'flex-end',
					paddingRight: 48,
					boxSizing: 'border-box',
					pointerEvents: 'none',
				}}
			>
				<Inventory isOpen={isOpen} />
			</div>
			<Canvas shadows camera={{ position: [-5, 4, 4], fov: 40 }}>
				<Suspense fallback={() => <Loader />}>
					<Model isOpen={isOpen} onToggle={toggle} />
					{!isOpen && <ChestHint />}
				</Suspense>
				<Lights />
				<Floor />
				<UserControls />
			</Canvas>
		</>
	);
};

export default App;
