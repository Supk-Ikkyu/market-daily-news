import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, Newspaper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Article } from '../types'
import { ErrorState, LoadingState } from '../components/Status'

export function Home({ openArticle, openEditor }: { openArticle: (date: string) => void; openEditor: () => void }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: requestError } = await supabase!
      .from('daily_news')
      .select('*')
      .eq('status', 'published')
      .order('publication_date', { ascending: false })
    if (requestError) setError(requestError.message)
    else setArticles((data || []) as Article[])
    setLoading(false)
  }, [])

  useEffect(() => { void loadArticles() }, [loadArticles])

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Independent daily briefing</p>
        <h1>The market day,<br />without the noise.</h1>
        <p>Long-form summaries of the U.S. stock market, major economic developments, company news, and the events that matter next.</p>
      </section>

      <section className="archive-section" aria-labelledby="archive-title">
        <div className="section-heading"><div><p className="eyebrow">Daily archive</p><h2 id="archive-title">Latest briefings</h2></div><span>{articles.length} {articles.length === 1 ? 'edition' : 'editions'}</span></div>
        {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={() => void loadArticles()} /> : articles.length === 0 ? (
          <div className="empty-archive"><Newspaper size={30} /><h2>No published briefings yet</h2><p>Open the editor to publish the first daily market report.</p></div>
        ) : (
          <div className="article-card-list">
            {articles.map((article, index) => (
              <article className={index === 0 ? 'daily-card featured' : 'daily-card'} key={article.id}>
                <div className="daily-card-index">{String(articles.length - index).padStart(2, '0')}</div>
                <div className="daily-card-copy">
                  <div className="article-meta"><span><CalendarDays size={16} />{formatLongDate(article.publication_date)}</span><span><Clock3 size={16} />{readingTime(article.content_markdown)} min read</span>{index === 0 && <strong>Latest</strong>}</div>
                  <h2>{article.title}</h2>
                  <p>{article.summary}</p>
                  <button className="read-button" type="button" onClick={() => openArticle(article.publication_date)}>Read daily brief <ArrowRight size={18} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="site-footer"><span>Market Daily News</span><button type="button" onClick={openEditor}>Editor access</button></footer>
    </main>
  )
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220))
}
