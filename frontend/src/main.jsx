import { createRoot } from 'react-dom/client'
import './index.css'
import Providers from '@/app/providers'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <Providers>
    <App />
  </Providers>,
)
