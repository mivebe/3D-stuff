import { useEffect, useRef } from 'react'

// shared keyboard input. maps physical keys to named actions and exposes
// a ref so render loops can read state without re-rendering.
const DEFAULT_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
}

export function useKeyboard(map = DEFAULT_MAP) {
  const state = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  })

  useEffect(() => {
    const set = (code, value) => {
      const action = map[code]
      if (action) state.current[action] = value
    }
    const down = (e) => set(e.code, true)
    const up = (e) => set(e.code, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [map])

  return state
}
