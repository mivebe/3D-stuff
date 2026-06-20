import React, { useState, useRef } from 'react'
import Grid from './Grid.jsx'

import apple from '../assets/items/apple.svg'
import diamond from '../assets/items/diamond.svg'
import bone from '../assets/items/bone.svg'
import beef from '../assets/items/beef.svg'

const itemTextures = { apple, diamond, bone, beef }

const chestRows = 3
const chestCols = 9
const invRows = 3
const invCols = 9
const hotbarRows = 1
const hotbarCols = 9

const empty = (n) => Array.from({ length: n }, () => null)

const initialChest = empty(27)
initialChest[0] = { name: 'Apple', texture: itemTextures.apple }
initialChest[10] = { name: 'Diamond', texture: itemTextures.diamond }

const initialInv = empty(27)
initialInv[2] = { name: 'Bone', texture: itemTextures.bone }

const initialHotbar = empty(9)
initialHotbar[3] = { name: 'Beef', texture: itemTextures.beef }

const windowStyle = {
  background: '#e0e0e0',
  border: '4px solid #888',
  width: 400,
  padding: 16,
  boxShadow: '4px 8px 0 #222',
  fontFamily: 'monospace',
  color: '#444',
  userSelect: 'none',
  pointerEvents: 'auto',
}
const labelStyle = {
  fontSize: 18,
  margin: '8px 0 4px 2px',
  fontWeight: 'bold',
  textShadow: '1px 1px 0 #fff',
}
const dividerStyle = { height: 8 }

function Inventory() {
  const [chest, setChest] = useState(initialChest)
  const [inv, setInv] = useState(initialInv)
  const [hotbar, setHotbar] = useState(initialHotbar)
  const [dragItem, setDragItem] = useState(null) // { item, from, type }
  const [isDragging, setIsDragging] = useState(false)
  const dragFromType = useRef(null)

  const getSlot = (type, idx) => {
    if (type === 'chest') return chest[idx]
    if (type === 'inv') return inv[idx]
    if (type === 'hotbar') return hotbar[idx]
  }
  const setSlot = (type, idx, value) => {
    if (type === 'chest') setChest((arr) => arr.map((v, i) => (i === idx ? value : v)))
    if (type === 'inv') setInv((arr) => arr.map((v, i) => (i === idx ? value : v)))
    if (type === 'hotbar') setHotbar((arr) => arr.map((v, i) => (i === idx ? value : v)))
  }

  // map a global slot index to its grid type and local index
  const slotTypeAndIdx = (idx) => {
    if (idx < chest.length) return { type: 'chest', idx }
    if (idx < chest.length + inv.length) return { type: 'inv', idx: idx - chest.length }
    return { type: 'hotbar', idx: idx - chest.length - inv.length }
  }

  const handleSlotMouseDown = (e, idx) => {
    const { type, idx: localIdx } = slotTypeAndIdx(idx)
    const item = getSlot(type, localIdx)
    if (!item) return
    setDragItem({ item, from: idx, type })
    setIsDragging(true)
    dragFromType.current = type
    e.preventDefault()
  }
  const handleSlotMouseUp = (e, idx) => {
    if (!isDragging || !dragItem) return
    const { type: toType, idx: toIdx } = slotTypeAndIdx(idx)
    const { type: fromType, from: fromIdx } = dragItem
    if (fromIdx === idx) {
      setIsDragging(false)
      setDragItem(null)
      return
    }
    const fromLocalIdx = slotTypeAndIdx(fromIdx).idx
    const fromItem = getSlot(fromType, fromLocalIdx)
    const toItem = getSlot(toType, toIdx)
    setSlot(fromType, fromLocalIdx, toItem)
    setSlot(toType, toIdx, fromItem)
    setIsDragging(false)
    setDragItem(null)
  }
  const handleSlotMouseEnter = () => {
    // reserved: highlight slot on drag over
  }

  // releasing the mouse anywhere cancels an in-progress drag
  React.useEffect(() => {
    const handleUp = () => {
      setIsDragging(false)
      setDragItem(null)
    }
    if (isDragging) {
      window.addEventListener('mouseup', handleUp)
      return () => window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging])

  return (
    <div style={windowStyle}>
      <div style={labelStyle}>Chest</div>
      <Grid
        items={chest}
        rows={chestRows}
        cols={chestCols}
        onSlotMouseDown={handleSlotMouseDown}
        onSlotMouseUp={handleSlotMouseUp}
        onSlotMouseEnter={handleSlotMouseEnter}
        isDragging={isDragging}
        dragItem={dragItem}
        offset={0}
      />
      <div style={labelStyle}>Inventory</div>
      <Grid
        items={inv}
        rows={invRows}
        cols={invCols}
        onSlotMouseDown={handleSlotMouseDown}
        onSlotMouseUp={handleSlotMouseUp}
        onSlotMouseEnter={handleSlotMouseEnter}
        isDragging={isDragging}
        dragItem={dragItem}
        offset={chest.length}
      />
      <div style={dividerStyle} />
      <Grid
        items={hotbar}
        rows={hotbarRows}
        cols={hotbarCols}
        onSlotMouseDown={handleSlotMouseDown}
        onSlotMouseUp={handleSlotMouseUp}
        onSlotMouseEnter={handleSlotMouseEnter}
        isDragging={isDragging}
        dragItem={dragItem}
        offset={chest.length + inv.length}
      />
      {isDragging && dragItem && <DragPreview item={dragItem.item} />}
    </div>
  )
}

// drag preview follows the cursor
function DragPreview({ item }) {
  const [pos, setPos] = React.useState({ x: 0, y: 0 })
  React.useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <img
      src={item.texture}
      alt={item.name}
      style={{
        position: 'fixed',
        left: pos.x - 16,
        top: pos.y - 16,
        width: 32,
        height: 32,
        pointerEvents: 'none',
        opacity: 0.8,
        zIndex: 9999,
        imageRendering: 'pixelated',
      }}
    />
  )
}

export default Inventory
