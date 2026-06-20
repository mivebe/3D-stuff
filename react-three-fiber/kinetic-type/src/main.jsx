import React from 'react'
import { createRoot } from 'react-dom/client'
import KineticType from './KineticType.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KineticType />
  </React.StrictMode>,
)
