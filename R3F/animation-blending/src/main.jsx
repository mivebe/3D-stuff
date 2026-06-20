import React from 'react'
import { createRoot } from 'react-dom/client'
import AnimationBlending from './AnimationBlending.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AnimationBlending />
  </React.StrictMode>,
)
