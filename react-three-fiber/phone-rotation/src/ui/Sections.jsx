import { brand, closing } from "../data/product.js";
import { useInView } from "./useInView.js";

const base = import.meta.env.BASE_URL;

// captured from the 3D scene (see scripts/capture-shots) so the stills match
// the live model, finish and lighting
const shots = [
  {
    id: "graphite",
    caption: "Grade-5 titanium, bead-blasted to a soft sheen.",
  },
  { id: "champagne", caption: "A finish that catches the warmth of the room." },
  {
    id: "midnight",
    caption: 'A 6.9" crystal display that disappears into glass.',
  },
];

function Reveal({ className = "", children }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`reveal ${inView ? "is-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

function Finishes({ finishes, finish, onFinish }) {
  return (
    <section className="section section--finishes">
      <Reveal className="section__head">
        <p className="eyeline">Finishes</p>
        <h2 className="section__title">Three ways to wear it.</h2>
      </Reveal>
      <div className="finishGrid">
        {finishes.map((f) => (
          <Reveal key={f.id}>
            <button
              type="button"
              className={`finishCard ${f.id === finish.id ? "is-active" : ""}`}
              onClick={() => onFinish(f)}
            >
              <span
                className="finishCard__chip"
                style={{ background: f.swatch }}
              />
              <span className="finishCard__name">{f.label}</span>
              <span className="finishCard__hint">
                {f.id === finish.id ? "On the phone now" : "See it live"}
              </span>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Details() {
  return (
    <section className="section section--details">
      <Reveal className="section__head">
        <p className="eyeline">In detail</p>
        <h2 className="section__title">Considered from every angle.</h2>
      </Reveal>
      <div className="shots">
        {shots.map((shot) => (
          <Reveal key={shot.id} className="shot">
            <div
              className="shot__img"
              style={{ backgroundImage: `url(${base}shots/${shot.id}.jpg)` }}
            />
            <p className="shot__caption">{shot.caption}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="section section--closing">
      <Reveal>
        <p className="eyeline">{brand.product}</p>
        <h2 className="closing__title">{closing.headline}</h2>
        <p className="closing__sub">{closing.sub}</p>
      </Reveal>
    </section>
  );
}

export default function Sections({ finish, finishes, onFinish }) {
  return (
    <main className="sections">
      <Finishes finishes={finishes} finish={finish} onFinish={onFinish} />
      <Details />
      <Closing />
    </main>
  );
}
