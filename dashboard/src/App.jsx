import { useState } from "react";
import { Routes, Route, Link, useParams, Navigate } from "react-router-dom";
import { projects, getProject } from "./projects.js";

const base = import.meta.env.BASE_URL;
const categories = [
  "All",
  ...Array.from(new Set(projects.map((p) => p.category))),
];
const countFor = (c) =>
  c === "All"
    ? projects.length
    : projects.filter((p) => p.category === c).length;

function Home() {
  const [filter, setFilter] = useState("All");
  const shown =
    filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div style={styles.home}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>3D Dashboard</h1>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          A launcher for standalone three.js / react-three-fiber projects. Each
          runs as its own independent build, embedded here.
        </p>
      </header>

      <div style={styles.filters}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              ...styles.filterBtn,
              ...(filter === c ? styles.filterActive : null),
            }}
          >
            {c} <span style={styles.filterCount}>{countFor(c)}</span>
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {shown.map((p) => (
          <Link key={p.id} to={`/view/${p.id}`} style={styles.card}>
            <div style={styles.thumbWrap}>
              <img
                src={`${base}thumbnails/${p.id}.jpg`}
                alt={p.title}
                loading="lazy"
                style={styles.thumb}
              />
              <span style={styles.kind}>{p.category}</span>
            </div>
            <div style={styles.cardBody}>
              <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{p.title}</h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--muted)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {p.blurb}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function View() {
  const { id } = useParams();
  const project = getProject(id);
  if (!project) return <Navigate to="/" replace />;

  return (
    <div style={styles.stage}>
      <Link to="/" style={styles.back}>
        back
      </Link>
      <iframe
        title={project.title}
        src={`${base}projects/${project.id}/index.html`}
        style={styles.frame}
        allow="fullscreen; autoplay; xr-spatial-tracking"
      />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/view/:id" element={<View />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const styles = {
  home: { maxWidth: 1040, margin: "0 auto", padding: "64px 24px" },
  header: { marginBottom: 24 },
  filters: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  filterBtn: {
    background: "var(--panel)",
    border: "1px solid #26262f",
    color: "var(--text)",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
  filterActive: {
    background: "var(--accent)",
    color: "#06232b",
    borderColor: "var(--accent)",
  },
  filterCount: { opacity: 0.6, fontSize: 11, marginLeft: 2 },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  },
  card: {
    display: "block",
    background: "var(--panel)",
    border: "1px solid #26262f",
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbWrap: {
    position: "relative",
    aspectRatio: "16 / 10",
    background: "#0a0a0e",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  kind: {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 10,
    color: "var(--accent)",
    background: "rgba(6,12,16,0.7)",
    padding: "3px 8px",
    borderRadius: 999,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardBody: { padding: 16 },
  stage: { position: "absolute", inset: 0, overflow: "hidden" },
  back: {
    position: "absolute",
    bottom: 16,
    left: 16,
    zIndex: 10,
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.15)",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 14,
  },
  frame: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: 0,
  },
};
