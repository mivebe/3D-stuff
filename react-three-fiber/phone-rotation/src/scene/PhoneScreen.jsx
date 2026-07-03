import { Html } from '@react-three/drei'
import { screen } from '../data/product.js'
import './screen.css'

const SCREEN_SCALE = 0.34
const HOME_APPS = [
  ['#e6c079', '#8a6a2f'],
  ['#6ea8ff', '#2f5aa8'],
  ['#5fd39b', '#2f7d55'],
  ['#f0849e', '#8a3350'],
  ['#c58cf0', '#5f2f8a'],
  ['#f0a25f', '#8a4f2f'],
  ['#5fd3d3', '#2f7d7d'],
  ['#aeb4c0', '#5a606c'],
  ['#8a90f0', '#3a3f8a'],
  ['#f0d15f', '#8a742f'],
  ['#7de07d', '#2f8a3f'],
  ['#f07d7d', '#8a2f2f'],
  ['#5fb0f0', '#2f5f8a'],
  ['#d0d4da', '#7a7f88'],
  ['#e69ac0', '#8a3f68'],
  ['#9ae6cf', '#2f8a6f'],
  ['#e6c079', '#8a6a2f'],
  ['#6ea8ff', '#2f5aa8'],
  ['#f0849e', '#8a3350'],
  ['#5fd39b', '#2f7d55'],
]

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
