const slotStyle = {
	width: 40,
	height: 40,
	border: '2px solid #888',
	background: '#bcbcbc',
	boxSizing: 'border-box',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	margin: 1,
	position: 'relative',
};

const itemImgStyle = {
	width: 32,
	height: 32,
	pointerEvents: 'none',
	imageRendering: 'pixelated',
};

function Slot({ item, index, onMouseDown, onMouseUp, onMouseEnter, isDragging, dragItem }) {
	return (
		<div
			style={slotStyle}
			onMouseDown={(e) => onMouseDown(e, index)}
			onMouseUp={(e) => onMouseUp(e, index)}
			onMouseEnter={(e) => onMouseEnter(e, index)}
		>
			{item && (
				<img
					src={item.texture}
					alt={item.name}
					style={{
						...itemImgStyle,
						opacity: isDragging && dragItem && dragItem.from === index ? 0.3 : 1,
					}}
					draggable={false}
				/>
			)}
		</div>
	);
}

export default Slot;
