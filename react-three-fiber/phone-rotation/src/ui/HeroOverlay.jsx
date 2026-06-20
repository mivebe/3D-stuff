import { brand, heroMessage, specs } from '../data/product.js'

function FinishSwitcher({ finishes, finish, onFinish }) {
  return (
    <div className="switcher" role="group" aria-label="Choose a finish">
      <span className="switcher__label">{finish.label}</span>
      <div className="switcher__dots">
        {finishes.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`swatch ${f.id === finish.id ? 'is-active' : ''}`}
            style={{ '--swatch': f.swatch }}
            aria-label={f.label}
            aria-pressed={f.id === finish.id}
            onClick={() => onFinish(f)}
          />
        ))}
      </div>
    </div>
  )
}

export default function HeroOverlay({ phase, finish, finishes, onFinish, mobile }) {
  const copyVisible = phase >= 3

  return (
    <header className={`hero ${mobile ? 'hero--mobile' : ''}`}>
      <nav className="nav">
        <div className="nav__brand">{brand.name}</div>
        <div className="nav__links">
          <span>Overview</span>
          <span>Finishes</span>
          <span>Specs</span>
        </div>
      </nav>

      <div className={`hero__copy ${copyVisible ? 'is-in' : ''}`}>
        <p className="eyeline">{heroMessage.eyeline}</p>
        <h1 className="hero__headline">
          {heroMessage.headline.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p className="hero__body">{heroMessage.body}</p>

        <dl className="specs">
          {specs.map((spec) => (
            <div className="specs__item" key={spec.label}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>

        <FinishSwitcher finishes={finishes} finish={finish} onFinish={onFinish} />
      </div>
    </header>
  )
}
