const Floor = () => {
	return (
		<>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
				<planeGeometry attach="geometry" args={[100, 100]} />
				<meshStandardMaterial attach="material" color={'darkgray'} />
			</mesh>
		</>
	);
};

export default Floor;
