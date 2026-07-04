import { Html } from '@react-three/drei';
import '../../styles/hint.css';

// call-to-action that hovers above the closed chest and points down at it.
// anchored in 3d so it tracks the chest as the camera orbits or zooms.
const ChestHint = () => (
	<Html position={[0, 1.6, 0]} center style={{ pointerEvents: 'none' }}>
		<div className="chest-hint">
			<span className="chest-hint__label">Click to open</span>
			<svg
				className="chest-hint__arrow"
				width="46"
				height="60"
				viewBox="0 0 46 60"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M31 6 C 14 20, 14 34, 23 50"
					stroke="#f8f8f8"
					strokeWidth="5"
					strokeLinecap="round"
				/>
				<path
					d="M12 37 L 23 51 L 34 36"
					stroke="#f8f8f8"
					strokeWidth="5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	</Html>
);

export default ChestHint;
