import { CHAIRS, money } from './chairs'

// all of these sit above the canvas as fixed overlays. the wrappers are
// pointerEvents:none so wheel/touch/drag still reach the 3D everywhere except
// on the actual interactive controls (which opt back in with pointerEvents:auto)

export function Header({ goTo, cartCount, onOpenCart, compact }) {
  return (
    <header style={{ ...styles.header, ...(compact ? styles.headerCompact : null) }}>
      <button style={{ ...styles.logo, ...styles.click }} onClick={() => goTo(0)}>
        CHAIR.
      </button>
      <nav style={styles.nav}>
        <button style={{ ...styles.orderBtn, ...styles.click }} onClick={onOpenCart}>
          order
          {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
        </button>
      </nav>
    </header>
  )
}

// clickable colourway dots, one per chair, that scroll-select and mark the active one.
// desktop only: on mobile the swatches move into the product sheet
export function Picker({ active, goTo }) {
  const onClosing = active >= CHAIRS.length
  return (
    <div style={{ ...styles.picker, opacity: onClosing ? 0 : 1 }}>
      {CHAIRS.map((c, i) => (
        <button
          key={c.id}
          title={c.colorway}
          onClick={() => goTo(i)}
          style={{
            ...styles.swatch,
            ...styles.click,
            background: c.swatch,
            transform: i === active ? 'scale(1.35)' : 'scale(1)',
            borderColor: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </div>
  )
}

export function ProductPanel({ active, onAdd, onSelect, layout }) {
  const chair = CHAIRS[active]
  if (!chair) return null // hidden on the closing page
  const compact = layout !== 'desktop' // portrait + landscape share the compact card
  return (
    <div
      style={{
        ...styles.panel,
        ...(layout === 'portrait' ? styles.panelPortrait : null),
        ...(layout === 'landscape' ? styles.panelLandscape : null),
      }}
    >
      {compact && (
        <div style={styles.panelSwatches}>
          {CHAIRS.map((c, i) => (
            <button
              key={c.id}
              title={c.colorway}
              onClick={() => onSelect(i)}
              style={{
                ...styles.swatch,
                ...styles.click,
                background: c.swatch,
                transform: i === active ? 'scale(1.3)' : 'scale(1)',
                borderColor: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}
      <div style={styles.colorwayTag}>{chair.colorway}</div>
      <div style={styles.panelName}>{chair.name}</div>
      <div style={styles.panelPrice}>{money(chair.price)}</div>
      {/* landscape is height-starved, so drop the tagline to keep the card short */}
      {layout !== 'landscape' && <p style={styles.tagline}>{chair.tagline}</p>}
      {!compact && (
        <dl style={styles.specs}>
          {chair.specs.map(([k, v]) => (
            <div key={k} style={styles.specRow}>
              <dt style={styles.specKey}>{k}</dt>
              <dd style={styles.specVal}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <button
        style={{ ...styles.addBtn, ...styles.click, ...(layout === 'landscape' ? { marginTop: 12 } : null) }}
        onClick={() => onAdd(chair.id)}
      >
        Add to cart - {money(chair.price)}
      </button>
    </div>
  )
}

export function ScrollHint({ visible }) {
  return (
    <div style={{ ...styles.hint, opacity: visible ? 0.85 : 0 }}>
      <span>scroll to explore</span>
      <span style={styles.hintArrow}>v</span>
    </div>
  )
}

export function Toast({ text }) {
  return <div style={{ ...styles.toast, opacity: text ? 1 : 0 }}>{text}</div>
}

export function CartDrawer({ open, items, total, onClose, onInc, onDec, onRemove, onCheckout }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ ...styles.backdrop, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      <aside style={{ ...styles.drawer, transform: open ? 'translateX(0)' : 'translateX(105%)' }}>
        <div style={styles.drawerHead}>
          <span style={styles.drawerTitle}>Your cart</span>
          <button style={{ ...styles.closeBtn, ...styles.click }} onClick={onClose}>
            x
          </button>
        </div>

        {items.length === 0 ? (
          <p style={styles.empty}>Your cart is empty. Add a Ritchie to get started.</p>
        ) : (
          <div style={styles.itemList}>
            {items.map((it) => (
              <div key={it.id} style={styles.item}>
                <span style={{ ...styles.itemDot, background: it.swatch }} />
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{it.name}</div>
                  <div style={styles.itemPrice}>{money(it.price)}</div>
                </div>
                <div style={styles.qty}>
                  <button style={{ ...styles.qtyBtn, ...styles.click }} onClick={() => onDec(it.id)}>
                    -
                  </button>
                  <span style={styles.qtyNum}>{it.qty}</span>
                  <button style={{ ...styles.qtyBtn, ...styles.click }} onClick={() => onInc(it.id)}>
                    +
                  </button>
                </div>
                <button style={{ ...styles.removeBtn, ...styles.click }} onClick={() => onRemove(it.id)}>
                  remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={styles.drawerFoot}>
          <div style={styles.totalRow}>
            <span>Total</span>
            <span style={styles.totalVal}>{money(total)}</span>
          </div>
          <button
            style={{ ...styles.checkoutBtn, ...styles.click, opacity: items.length ? 1 : 0.4 }}
            disabled={items.length === 0}
            onClick={onCheckout}
          >
            Checkout
          </button>
        </div>
      </aside>
    </>
  )
}

const click = { pointerEvents: 'auto', cursor: 'pointer' }

const styles = {
  click,
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 36px',
    color: '#fff',
    pointerEvents: 'none',
  },
  headerCompact: {
    paddingTop: 12,
    paddingBottom: 12,
    // keep clear of a landscape phone's notch/rounded corners
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    paddingRight: 'max(16px, env(safe-area-inset-right))',
  },
  logo: {
    ...click,
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: 1,
    color: '#fff',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  nav: { display: 'flex', alignItems: 'center', gap: 22, fontSize: 14 },
  orderBtn: {
    ...click,
    position: 'relative',
    color: '#fff',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: '5px 16px',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 9,
    background: '#fff',
    color: '#111',
    fontSize: 11,
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    position: 'absolute',
    right: 40,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 25,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    pointerEvents: 'none',
    transition: 'opacity 0.3s',
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    padding: 0,
    transition: 'transform 0.2s, border-color 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  panel: {
    position: 'absolute',
    left: '8vw',
    bottom: '9vh',
    zIndex: 25,
    width: 320,
    maxWidth: '84vw',
    color: '#fff',
    pointerEvents: 'none',
  },
  // portrait: full-width bottom sheet
  panelPortrait: { left: 16, right: 16, bottom: 16, width: 'auto', maxWidth: 'none' },
  // landscape: compact card pinned bottom-left so it clears the chair on the right
  panelLandscape: {
    left: 'max(16px, env(safe-area-inset-left))',
    bottom: 12,
    width: 300,
    maxWidth: '44vw',
  },
  panelSwatches: { display: 'flex', gap: 14, marginBottom: 12 },
  colorwayTag: {
    display: 'inline-block',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
    marginBottom: 6,
  },
  panelName: { fontSize: 26, fontWeight: 800, lineHeight: 1.1 },
  panelPrice: { fontSize: 20, fontWeight: 700, marginTop: 2, opacity: 0.95 },
  tagline: { fontSize: 14, lineHeight: 1.45, opacity: 0.85, margin: '10px 0 14px' },
  specs: { margin: '0 0 16px', display: 'grid', gap: 6 },
  specRow: { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, borderBottom: '1px solid rgba(255,255,255,0.18)', paddingBottom: 5 },
  specKey: { opacity: 0.7, margin: 0 },
  specVal: { margin: 0, textAlign: 'right', fontWeight: 600 },
  addBtn: {
    ...click,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 30,
    border: 'none',
    background: '#fff',
    color: '#111',
    fontSize: 14,
    fontWeight: 800,
  },
  hint: {
    position: 'absolute',
    bottom: 22,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: '#fff',
    fontSize: 12,
    letterSpacing: 1,
    pointerEvents: 'none',
    transition: 'opacity 0.5s',
  },
  hintArrow: { fontSize: 14, fontWeight: 800, animation: 'chairBob 1.4s ease-in-out infinite' },
  toast: {
    position: 'absolute',
    top: 74,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 40,
    background: 'rgba(0,0,0,0.82)',
    color: '#fff',
    padding: '9px 18px',
    borderRadius: 30,
    fontSize: 13,
    fontWeight: 600,
    pointerEvents: 'none',
    transition: 'opacity 0.3s',
    maxWidth: '86vw',
    textAlign: 'center',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 45,
    background: 'rgba(0,0,0,0.45)',
    transition: 'opacity 0.3s',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    width: 'min(380px, 92vw)',
    background: '#15151b',
    color: '#fff',
    boxShadow: '-12px 0 40px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
    pointerEvents: 'auto',
  },
  drawerHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '22px 22px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  drawerTitle: { fontSize: 18, fontWeight: 800 },
  closeBtn: { ...click, background: 'none', border: 'none', color: '#fff', fontSize: 20, lineHeight: 1 },
  empty: { padding: '40px 22px', opacity: 0.6, fontSize: 14, lineHeight: 1.5 },
  itemList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  item: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', flexWrap: 'wrap' },
  itemDot: { width: 14, height: 14, borderRadius: '50%', flex: '0 0 auto' },
  itemInfo: { flex: 1, minWidth: 120 },
  itemName: { fontSize: 14, fontWeight: 700 },
  itemPrice: { fontSize: 12.5, opacity: 0.7 },
  qty: { display: 'flex', alignItems: 'center', gap: 8 },
  qtyBtn: {
    ...click,
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'none',
    color: '#fff',
    fontSize: 15,
    lineHeight: 1,
  },
  qtyNum: { minWidth: 16, textAlign: 'center', fontSize: 14, fontWeight: 700 },
  removeBtn: { ...click, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, textDecoration: 'underline' },
  drawerFoot: { padding: '16px 22px 22px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 14 },
  totalVal: { fontWeight: 800 },
  checkoutBtn: {
    ...click,
    width: '100%',
    padding: '13px 16px',
    borderRadius: 30,
    border: 'none',
    background: '#fff',
    color: '#111',
    fontSize: 14,
    fontWeight: 800,
  },
}
