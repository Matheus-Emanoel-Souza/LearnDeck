import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { applyTheme, getInitialTheme } from './lib/theme'
import './styles/global.css'

// Aplica o tema antes do primeiro render pra evitar flash de tela clara.
applyTheme(getInitialTheme())

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
