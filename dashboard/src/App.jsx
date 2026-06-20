import { Routes, Route, Link, useParams, Navigate } from 'react-router-dom'
import { projects, getProject } from './projects.js'

const base = import.meta.env.BASE_URL

function Home() {
  return (
    <div style={styles.home}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>3D Dashboard</h1>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>
          A launcher for standalone three.js / react-three-fiber projects. Each runs as its own
          independent build, embedded here.
        </p>
      </header>
      <div style={styles.grid}>
        {projects.map((p) => (
          <Link key={p.id} to={`/view/${p.id}`} style={styles.card}>
            <span style={styles.kind}>{p.category}</span>
            <h3 style={{ margin: '0 0 6px' }}>{p.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>{p.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function View() {
  const { id } = useParams()
  const project = getProject(id)
  if (!project) return <Navigate to="/" replace />

  return (
    <div style={styles.stage}>
      <Link to="/" style={styles.back}>
        back
      </Link>
      <iframe
        title={project.title}
        src={`${base}projects/${project.id}/index.html`}
        style={styles.frame}
        allow="fullscreen; autoplay; pointer-lock; xr-spatial-tracking"
        allowFullScreen
      />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/view/:id" element={<View />} />
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  },
  card: {
    position: 'relative',
    display: 'block',
    background: 'var(--panel)',
    border: '1px solid #26262f',
    borderRadius: 12,
    padding: 20,
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
    bottom: 16,
    left: 16,
    zIndex: 10,
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 14,
  },
  frame: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 },
}
