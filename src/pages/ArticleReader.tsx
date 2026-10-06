import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Article } from '../types'
import { MarkdownArticle } from '../components/MarkdownArticle'
import { ErrorState, LoadingState } from '../components/Status'

export function ArticleReader({ date, goHome, openArticle }: { date: string; goHome: () => void; openArticle: (date: string) => void }) {
  const [article, setArticle] = useState<Article | null>(null)
  const [neighbors, setNeighbors] = useState<{ newer: string | null; older: string | null }>({ newer: null, older: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadArticle = useCallback(async () => {
    setLoading(true)
    setError('')
    const [articleResult, newerResult, olderResult] = await Promise.all([
      supabase!.from('daily_news').select('*').eq('status', 'published').eq('publication_date', date).maybeSingle(),
      supabase!.from('daily_news').select('publication_date').eq('status', 'published').gt('publication_date', date).order('publication_date').limit(1).maybeSingle(),
      supabase!.from('daily_news').select('publication_date').eq('status', 'published').lt('publication_date', date).order('publication_date', { ascending: false }).limit(1).maybeSingle(),
    ])
    const requestError = articleResult.error || newerResult.error || olderResult.error
    if (requestError) setError(requestError.message)
    else if (!articleResult.data) setError('This briefing does not exist or has not been published.')
    else {
      setArticle(articleResult.data as Article)
      setNeighbors({ newer: newerResult.data?.publication_date || null, older: olderResult.data?.publication_date || null })
    }
    setLoading(false)
  }, [date])

  useEffect(() => { void loadArticle(); window.scrollTo({ top: 0 }) }, [loadArticle])

  if (loading) return <main className="reader-shell"><LoadingState label="Opening the daily briefing…" /></main>
  if (error || !article) return <main className="reader-shell"><ErrorState message={error} /><button className="secondary-button" type="button" onClick={goHome}><ArrowLeft size={17} />Return to archive</button></main>

  return (
    <main className="reader-shell">
      <button className="back-button" type="button" onClick={goHome}><ArrowLeft size={18} />All briefings</button>
      <article className="reader-card">
        <header className="reader-heading">
          <p className="eyebrow">Daily market briefing</p>
          <h1>{article.title}</h1>
          <p className="reader-summary">{article.summary}</p>
          <div className="article-meta"><span><CalendarDays size={16} />{formatLongDate(article.publication_date)}</span><span><Clock3 size={16} />{readingTime(article.content_markdown)} min read</span></div>
        </header>
        <MarkdownArticle content={article.content_markdown} />
      </article>
      <nav className="article-navigation" aria-label="Adjacent daily briefings">
        <button type="button" disabled={!neighbors.newer} onClick={() => neighbors.newer && openArticle(neighbors.newer)}><small>Newer edition</small><strong>{neighbors.newer ? formatShortDate(neighbors.newer) : 'None'}</strong></button>
        <button type="button" disabled={!neighbors.older} onClick={() => neighbors.older && openArticle(neighbors.older)}><small>Older edition</small><strong>{neighbors.older ? formatShortDate(neighbors.older) : 'None'}</strong></button>
      </nav>
    </main>
  )
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220))
}
