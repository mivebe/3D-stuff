import Slot from "./Slot";

const gridStyle = (rows, cols) => ({
  display: "grid",
  gridTemplateRows: `repeat(${rows}, 40px)` ,
  gridTemplateColumns: `repeat(${cols}, 40px)` ,
  gap: 0,
  background: "#bcbcbc",
  border: "2px solid #888",
  boxShadow: "0 2px #888",
  marginBottom: 8,
});

function Grid({ items, rows, cols, onSlotMouseDown, onSlotMouseUp, onSlotMouseEnter, isDragging, dragItem, offset }) {
  return (
    <div style={gridStyle(rows, cols)}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <Slot
          key={i}
          item={items[i]}
          index={i + (offset || 0)}
          onMouseDown={onSlotMouseDown}
          onMouseUp={onSlotMouseUp}
          onMouseEnter={onSlotMouseEnter}
          isDragging={isDragging}
          dragItem={dragItem}
        />
      ))}
    </div>
  );
}

export default Grid;
