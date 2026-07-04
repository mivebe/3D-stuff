import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, Scroll, useScroll, useGLTF, Loader } from '@react-three/drei'
import * as THREE from 'three'
import { CHAIRS, CLOSING, BG_STOPS, PAGES, money } from './chairs'
import { Header, Picker, ProductPanel, ScrollHint, Toast, CartDrawer } from './ShopUI'

// base-relative so the gltf (and its relative .bin / texture URIs) resolve
// whether served at root or under a subpath (iframe)
const base = import.meta.env.BASE_URL
const url = (id) => `${base}chairs/${id}.gltf`

CHAIRS.forEach((c) => useGLTF.preload(url(c.id)))

function Chair({ id, index }) {
  const { scene } = useGLTF(url(id))
  const { viewport } = useThree()
  const spin = useRef()
  const dragging = useRef(false)
  const lastX = useRef(0)

  // strip the giant floor plane + environment so the chair floats on its own
  const model = useMemo(() => {
    const clone = scene.clone(true)
    const drop = []
    clone.traverse((o) => {
      if (/FLOOR|Environment/i.test(o.name)) drop.push(o)
    })
    drop.forEach((o) => o.parent?.remove(o))
    return clone
  }, [scene])

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    return { scale: (viewport.height * 0.6) / size.y, center }
  }, [model, viewport.height])

  useFrame((_, delta) => {
    if (spin.current && !dragging.current) spin.current.rotation.y += delta * 0.6
  })

  // drag-to-inspect on desktop only; on touch we leave the gesture to scroll nav
  const onDown = (e) => {
    if (e.pointerType !== 'mouse') return
    e.stopPropagation()
    dragging.current = true
    lastX.current = e.clientX
    e.target.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!dragging.current) return
    spin.current.rotation.y += (e.clientX - lastX.current) * 0.01
    lastX.current = e.clientX
  }
  const onUp = (e) => {
    dragging.current = false
    e.target.releasePointerCapture?.(e.pointerId)
  }

  // push the chair off-center to the right so it clears the left-side copy + panel;
  // proportional to viewport so it holds across widths
  const shiftX = viewport.width * 0.18

  return (
    <group position={[shiftX, -index * viewport.height, 0]}>
      <group
        ref={spin}
        scale={fit.scale}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <primitive object={model} position={[-fit.center.x, -fit.center.y, -fit.center.z]} />
      </group>
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <directionalLight position={[-10, 5, -5]} intensity={0.6} />
      <spotLight position={[0, 20, 10]} intensity={1.2} angle={0.5} penumbra={1} />
    </>
  )
}

// drive the page background from scroll position, blending between section colors
function Background({ targetRef }) {
  const scroll = useScroll()
  const colors = useMemo(() => BG_STOPS.map((c) => new THREE.Color(c)), [])
  const out = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    if (!targetRef.current) return
    const segment = scroll.offset * (colors.length - 1)
    const i = Math.min(Math.floor(segment), colors.length - 2)
    out.copy(colors[i]).lerp(colors[i + 1], segment - i)
    targetRef.current.style.background = `#${out.getHexString()}`
  })
  return null
}

// bridge from the r3f scroll world to react state: report the active page and
// hand the scroll element up so the fixed HTML overlays can scroll-to a section
function ScrollBridge({ onActive, elRef, onScrolled }) {
  const scroll = useScroll()
  const last = useRef(-1)
  useEffect(() => {
    elRef.current = scroll.el
  }, [scroll.el, elRef])
  useFrame(() => {
    const i = Math.round(scroll.offset * (PAGES - 1))
    if (i !== last.current) {
      last.current = i
      onActive(i)
    }
    if (scroll.offset > 0.015) onScrolled()
  })
  return null
}

export default function ChairShop() {
  const containerRef = useRef()
  const scrollElRef = useRef(null)

  const [active, setActive] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [cart, setCart] = useState([]) // { id, qty }
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [narrow, setNarrow] = useState(false)
  const toastTimer = useRef()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const goTo = useCallback((index) => {
    const el = scrollElRef.current
    if (!el) return
    el.scrollTo({ top: index * el.clientHeight, behavior: 'smooth' })
  }, [])

  const flashToast = useCallback((text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }, [])

  const addToCart = useCallback(
    (id) => {
      setCart((prev) => {
        const found = prev.find((it) => it.id === id)
        if (found) return prev.map((it) => (it.id === id ? { ...it, qty: it.qty + 1 } : it))
        return [...prev, { id, qty: 1 }]
      })
      flashToast(`Added ${CHAIRS.find((c) => c.id === id)?.name}`)
    },
    [flashToast],
  )

  const incItem = useCallback((id) => setCart((p) => p.map((it) => (it.id === id ? { ...it, qty: it.qty + 1 } : it))), [])
  const decItem = useCallback(
    (id) =>
      setCart((p) =>
        p.flatMap((it) => (it.id === id ? (it.qty > 1 ? [{ ...it, qty: it.qty - 1 }] : []) : [it])),
      ),
    [],
  )
  const removeItem = useCallback((id) => setCart((p) => p.filter((it) => it.id !== id)), [])

  // join cart lines with product data for display + totals
  const items = useMemo(
    () =>
      cart.map((it) => {
        const chair = CHAIRS.find((c) => c.id === it.id)
        return { ...it, name: chair.name, price: chair.price, swatch: chair.swatch }
      }),
    [cart],
  )
  const cartCount = items.reduce((n, it) => n + it.qty, 0)
  const cartTotal = items.reduce((n, it) => n + it.price * it.qty, 0)

  const checkout = useCallback(() => {
    flashToast(`Order placed - thank you! (${money(cartTotal)})`)
    setCart([])
    setCartOpen(false)
  }, [cartTotal, flashToast])

  const onClosing = active >= CHAIRS.length

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: CHAIRS[0].bg }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <Lights />
        <ScrollControls pages={PAGES} damping={0.25}>
          <Background targetRef={containerRef} />
          <ScrollBridge onActive={setActive} elRef={scrollElRef} onScrolled={() => setScrolled(true)} />

          <Scroll>
            {CHAIRS.map((c, i) => (
              <Suspense key={c.id} fallback={null}>
                <Chair id={c.id} index={i} />
              </Suspense>
            ))}
          </Scroll>

          {/* section copy scrolls with the page; renders immediately (not gated on the model) */}
          <Scroll html style={{ width: '100%' }}>
            {CHAIRS.map((c, i) => (
              <div key={c.id} style={{ ...sectionStyle, top: `${i * 100 + 16}vh` }}>
                {c.title.map((line, li) => (
                  <h1 key={li} style={titleStyle}>
                    {line}
                  </h1>
                ))}
              </div>
            ))}
            <div style={{ ...closingStyle, top: `${(PAGES - 1) * 100}vh` }}>
              <h1 style={{ ...titleStyle, fontSize: 'clamp(32px, 5vw, 72px)' }}>{CLOSING.heading}</h1>
              <p style={closingSub}>{CLOSING.sub}</p>
              <button style={closingBtn} onClick={() => setCartOpen(true)}>
                {cartCount > 0 ? `Review order (${cartCount})` : 'Start your order'}
              </button>
            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>

      <Header goTo={goTo} cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />
      <Picker active={active} goTo={goTo} narrow={narrow} />
      {!onClosing && <ProductPanel active={active} onAdd={addToCart} narrow={narrow} />}
      <ScrollHint visible={!scrolled} />
      <Toast text={toast} />
      <CartDrawer
        open={cartOpen}
        items={items}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onInc={incItem}
        onDec={decItem}
        onRemove={removeItem}
        onCheckout={checkout}
      />

      <Loader />
    </div>
  )
}

const sectionStyle = {
  position: 'absolute',
  left: '8vw',
  maxWidth: '42vw',
  color: '#fff',
  pointerEvents: 'none',
}
const titleStyle = {
  fontSize: 'clamp(28px, 4vw, 64px)',
  lineHeight: 1.05,
  margin: 0,
  fontWeight: 800,
  textShadow: '0 2px 12px rgba(0,0,0,0.25)',
}
const closingStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '0 8vw',
  height: '100vh',
  justifyContent: 'center',
  color: '#fff',
}
const closingSub = {
  fontSize: 'clamp(14px, 1.6vw, 18px)',
  maxWidth: 520,
  lineHeight: 1.5,
  opacity: 0.85,
  margin: '18px 0 26px',
}
const closingBtn = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  padding: '14px 30px',
  borderRadius: 34,
  border: 'none',
  background: '#fff',
  color: '#111',
  fontSize: 15,
  fontWeight: 800,
}
