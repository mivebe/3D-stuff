import React from 'react'
import { createRoot } from 'react-dom/client'
import CharacterController from './CharacterController.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CharacterController />
  </React.StrictMode>,
)
