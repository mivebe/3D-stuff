// central list of demos the shell can route to
// each demo module exports a descriptor following the shared contract:
//   { id, title, blurb, kind: 'r3f' | 'vanilla', component?, mount? }
// r3f demos export `component` (a React component)
// vanilla demos export `mount(container) -> dispose` for raw three.js

import fpsControls from '../demos/fps-controls/index.jsx'
import characterController from '../demos/character-controller/index.jsx'
import animationBlending from '../demos/animation-blending/index.jsx'

export const demos = [fpsControls, characterController, animationBlending]

export function getDemo(id) {
  return demos.find((d) => d.id === id)
}
