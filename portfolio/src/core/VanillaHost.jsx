import { useEffect, useRef } from 'react'

// hosts a vanilla three.js demo inside react. the demo's mount(container)
// returns a dispose fn that runs on unmount or route change.
export default function VanillaHost({ mount }) {
  const ref = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const dispose = mount(container)
    return () => {
      if (typeof dispose === 'function') dispose()
    }
  }, [mount])

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
}
