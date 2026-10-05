import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/600.css";
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
