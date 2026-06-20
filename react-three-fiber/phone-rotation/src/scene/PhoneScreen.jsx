import { Html } from '@react-three/drei'
import { screen } from '../data/product.js'
import './screen.css'

// maps the fixed-pixel screen UI onto the ~2.0 x 3.72 world-unit screen face.
// tuned so the 232px-wide panel spans the phone's width; adjust together.
const SCREEN_SCALE = 0.265

// phase: 0 off, 1 skeleton, 2+ content
export default function PhoneScreen({ phase }) {
  const state = phase < 1 ? 'off' : phase < 2 ? 'skeleton' : 'content'

  return (
    <Html
      transform
      scale={SCREEN_SCALE}
      pointerEvents="none"
      zIndexRange={[10, 0]}
    >
      <div className={`screen screen--${state}`}>
        {state === 'off' && <div className="screen__off" />}

        {state === 'skeleton' && (
          <div className="screen__skeleton">
            <div className="sk sk--status" />
            <div className="sk sk--hero" />
            <div className="sk-row">
              <div className="sk sk--avatar" />
              <div className="sk-lines">
                <div className="sk sk--line" />
                <div className="sk sk--line short" />
              </div>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div className="sk-row" key={i}>
                <div className="sk sk--thumb" />
                <div className="sk-lines">
                  <div className="sk sk--line" />
                  <div className="sk sk--line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {state === 'content' && (
          <div className="screen__content">
            <div className="screen__status">
              <span>{screen.time}</span>
              <span className="screen__dots">
                <i /> <i /> <i />
              </span>
            </div>
            <div className="screen__greeting">{screen.greeting}</div>
            <div className="screen__app">{screen.appName}</div>
            <ul className="screen__list">
              {screen.rows.map((row) => (
                <li className="screen__item" key={row.title}>
                  <span className="screen__thumb" />
                  <span className="screen__meta">
                    <span className="screen__title">{row.title}</span>
                    <span className="screen__sub">{row.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Html>
  )
}
