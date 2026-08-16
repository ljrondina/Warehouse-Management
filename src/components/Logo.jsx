import { useTheme } from '../context/ThemeContext'

// Official Megawide logo assets (public/). Colour follows the brand book:
//  - 'auto'   : full-colour lockup on light theme, white lockup on dark
//  - 'darkbg' : white lockup, ALWAYS — for the sidebar, which stays the dark
//               brand shell regardless of the app's light/dark theme
//  - 'white'  : white lockup, for the red login hero
//  - 'mark'   : red icon only (compact / mobile)
// Assets live in public/ and must be prefixed with the Vite base path so they
// resolve under a GitHub Pages sub-path (/Warehouse-Management/) as well as at
// the root in dev.
const asset = (file) => `${import.meta.env.BASE_URL}${file}`

export default function Logo({ variant = 'auto', height = 30, sub }) {
  const { theme } = useTheme()

  if (variant === 'mark') {
    return <img src={asset('megawide-mark.png')} alt="Megawide" style={{ height, width: 'auto' }} />
  }

  const onDarkSurface = variant === 'white' || variant === 'darkbg' || theme === 'dark'
  const src = asset(onDarkSurface ? 'megawide-white.png' : 'megawide-color.png')

  const onDark = variant === 'white' || variant === 'darkbg'

  // `sub` may be an array of lines (e.g. ['Procurement', '×', 'Warehouse Management'])
  // to stack as its own centred block, or a plain string for the single-line case.
  const subLines = Array.isArray(sub) ? sub : sub ? [sub] : []

  return (
    <div className="logo-lockup">
      <img src={src} alt="Megawide Construction" style={{ height, width: 'auto', maxWidth: '100%' }} />
      {subLines.length > 0 && (
        <span className={`logo-sub ${onDark ? 'on-dark' : ''}`}>
          {subLines.map((line, i) => <span key={i} className="logo-sub-line">{line}</span>)}
        </span>
      )}
    </div>
  )
}
