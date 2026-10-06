import { BarChart3, CheckSquare2, Moon, Newspaper, Sun } from 'lucide-react'

interface HeaderProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  editor?: boolean
  goHome: () => void
}

export function Header({ theme, toggleTheme, editor = false, goHome }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-brand-group">
        <button className="brand" type="button" onClick={goHome} aria-label="Market Daily News home">
          <span className="brand-mark"><BarChart3 size={23} /></span>
          <span><strong>Market Daily News</strong></span>
        </button>
        <a className="header-app-switch" href="https://tasks-gt.onrender.com/" aria-label="Open Tasks">
          <CheckSquare2 size={17} />
          <span>Tasks</span>
        </a>
      </div>
      <div className="header-actions">
        {editor && <span className="editor-badge"><Newspaper size={15} />Editor</span>}
        <button className="theme-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  )
}
