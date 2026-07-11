import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// @ts-expect-error -- CSS side-effect import is handled by the bundler
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
