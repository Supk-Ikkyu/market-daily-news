import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'
import { Header } from './components/Header'
import { isSupabaseConfigured } from './lib/supabase'
import { Home } from './pages/Home'
import { ArticleReader } from './pages/ArticleReader'
import { Editor } from './pages/Editor'

type Route = { page: 'home' } | { page: 'article'; date: string } | { page: 'editor' }

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute())
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('market-news-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('market-news-theme', theme)
  }, [theme])

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(next: Route) {
    const url = next.page === 'home' ? '/' : next.page === 'editor' ? '/editor' : `/?article=${next.date}`
    window.history.pushState({}, '', url)
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isSupabaseConfigured) {
    return <div className="setup-page"><div className="setup-card"><Database size={34} /><p className="eyebrow">Setup required</p><h1>Connect Supabase</h1><p>Copy <code>.env.example</code> to <code>.env</code>, add the project URL and publishable key, then restart the development server.</p></div></div>
  }

  return (
    <div className="app-shell">
      <Header theme={theme} toggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} editor={route.page === 'editor'} goHome={() => navigate({ page: 'home' })} />
      {route.page === 'home' && <Home openArticle={(date) => navigate({ page: 'article', date })} openEditor={() => navigate({ page: 'editor' })} />}
      {route.page === 'article' && <ArticleReader date={route.date} goHome={() => navigate({ page: 'home' })} openArticle={(date) => navigate({ page: 'article', date })} />}
      {route.page === 'editor' && <Editor goHome={() => navigate({ page: 'home' })} />}
    </div>
  )
}

function readRoute(): Route {
  if (window.location.pathname === '/editor') return { page: 'editor' }
  const article = new URLSearchParams(window.location.search).get('article')
  return article ? { page: 'article', date: article } : { page: 'home' }
}
