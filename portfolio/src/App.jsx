import { Routes, Route, Link, useParams, Navigate } from 'react-router-dom'
import { demos, getDemo } from './core/registry.js'
import VanillaHost from './core/VanillaHost.jsx'

function Home() {
  return (
    <div style={styles.home}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>3D Portfolio</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>
          Interactive three.js / react-three-fiber experiments.
        </p>
      </header>
      <div style={styles.grid}>
        {demos.map((d) => (
          <Link key={d.id} to={`/demo/${d.id}`} style={styles.card}>
            <h3 style={{ margin: '0 0 6px' }}>{d.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>{d.blurb}</p>
            <span style={styles.kind}>{d.kind}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function DemoView() {
  const { id } = useParams()
  const demo = getDemo(id)
  if (!demo) return <Navigate to="/" replace />

  const Component = demo.component
  return (
    <div style={styles.stage}>
      <Link to="/" style={styles.back}>
        back
      </Link>
      {demo.kind === 'vanilla' ? (
        <VanillaHost mount={demo.mount} />
      ) : (
        <Component />
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo/:id" element={<DemoView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const styles = {
  home: { maxWidth: 1000, margin: '0 auto', padding: '64px 24px' },
  header: { marginBottom: 32 },
  grid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  },
  card: {
    position: 'relative',
    display: 'block',
    background: 'var(--panel)',
    border: '1px solid #26262f',
    borderRadius: 12,
    padding: 20,
    transition: 'border-color 0.15s',
  },
  kind: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 11,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stage: { position: 'absolute', inset: 0, overflow: 'hidden' },
  back: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    background: 'rgba(0,0,0,0.5)',
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 14,
  },
}
