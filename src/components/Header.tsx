import { BarChart3, Moon, Newspaper, Sun } from 'lucide-react'

interface HeaderProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  editor?: boolean
  goHome: () => void
}

export function Header({ theme, toggleTheme, editor = false, goHome }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={goHome} aria-label="Market Daily News home">
        <span className="brand-mark"><BarChart3 size={23} /></span>
        <span><strong>Market Daily News</strong><small>U.S. markets, clearly explained</small></span>
      </button>
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
