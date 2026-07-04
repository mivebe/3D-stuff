import { Html } from '@react-three/drei'
import { screen, finishes } from '../data/product.js'
import './screen.css'

const SCREEN_SCALE = 0.34
// icons cycle through the three phone finishes so the home screen stays on-brand
const HOME_APPS = Array.from({ length: 20 }, (_, i) => {
  const finish = finishes[i % finishes.length]
  return [finish.swatch, finish.color]
})

const iconStyle = ([top, bottom]) => ({
  background: `linear-gradient(145deg, ${top}, ${bottom})`,
})

// phase: 0 home screen, 1 app opening into skeleton, 2+ content
export default function PhoneScreen({ phase }) {
  const launched = phase >= 1
  const state = phase < 2 ? 'skeleton' : 'content'

  return (
    <Html
      transform
      scale={SCREEN_SCALE}
      pointerEvents="none"
      zIndexRange={[10, 0]}
    >
      <div className={`screen ${launched ? 'screen--launched' : ''}`}>
        {/* home screen behind the app, only visible before it opens */}
        <div className="home">
          <div className="home__status">
            <span>{screen.time}</span>
            <span className="home__signal">
              <i /> <i /> <i />
            </span>
          </div>
          <div className="home__grid">
            {HOME_APPS.slice(0, 16).map((grad, i) => (
              <div className="home__app" key={i}>
                <span className="home__icon" style={iconStyle(grad)} />
                <span className="home__name" />
              </div>
            ))}
          </div>
          <div className="home__dock">
            {HOME_APPS.slice(16).map((grad, i) => (
              <span className="home__icon" key={i} style={iconStyle(grad)} />
            ))}
          </div>
        </div>

        {launched && (
          <div className="app">
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
        )}
      </div>
    </Html>
  )
}
