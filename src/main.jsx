import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { TourProvider } from './context/TourContext'
import { SafekeepingProvider } from './context/SafekeepingContext'
import { hydrate } from './lib/hydrate'
import './styles/index.css'

// Pull the warehouse dataset from Postgres BEFORE the first render, so no page
// needs a loading state and no component ever sees half-loaded data. There is no
// bundled dataset to fall back on — see src/lib/hydrate.js.
// Written as .then() rather than top-level await: TLA would force the build
// target up to es2022 and drop the older browsers the site still supports.
hydrate().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <TourProvider>
            <SafekeepingProvider>
              {/* basename keeps routes correct under the GitHub Pages sub-path */}
              <BrowserRouter basename={import.meta.env.BASE_URL}>
                <App />
              </BrowserRouter>
            </SafekeepingProvider>
          </TourProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
})
