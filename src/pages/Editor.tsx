import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, Edit3, Eye, FilePlus2, KeyRound, LockKeyhole, Save, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Article, ArticleDraft, ArticleStatus } from '../types'
import { MarkdownArticle } from '../components/MarkdownArticle'
import { ErrorState, LoadingState } from '../components/Status'

const blankArticle = (): ArticleDraft => ({
  id: '',
  publication_date: new Date().toISOString().slice(0, 10),
  title: '',
  summary: '',
  content_markdown: '# Market Overview\n\nBegin the daily briefing here.\n\n## Key Market Drivers\n\n- First development\n- Second development\n\n## What to Watch Next\n\nAdd the next market catalysts here.',
  status: 'draft',
})

export function Editor({ goHome }: { goHome: () => void }) {
  const [password, setPassword] = useState(() => sessionStorage.getItem('market-editor-password') || '')
  const [passwordInput, setPasswordInput] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(Boolean(password))
  const [articles, setArticles] = useState<Article[]>([])
  const [draft, setDraft] = useState<ArticleDraft>(blankArticle)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [mobilePane, setMobilePane] = useState<'write' | 'preview'>('write')

  const wordCount = useMemo(() => draft.content_markdown.trim() ? draft.content_markdown.trim().split(/\s+/).length : 0, [draft.content_markdown])

  const callEditor = useCallback(async <T,>(body: Record<string, unknown>, suppliedPassword = password): Promise<T> => {
    const { data, error: requestError } = await supabase!.functions.invoke('manage-news', {
      body,
      headers: { 'x-editor-password': suppliedPassword },
    })
    if (requestError) {
      let message = requestError.message
      const context = (requestError as { context?: Response }).context
      if (context) {
        try {
          const responseBody = await context.clone().json() as { error?: string }
          if (responseBody.error) message = responseBody.error
        } catch { /* Keep the Supabase client error when no JSON response is available. */ }
      }
      throw new Error(message)
    }
    if (data?.error) throw new Error(data.error)
    return data as T
  }, [password])

  const loadArticles = useCallback(async (activePassword = password) => {
    setLoadingArticles(true)
    const response = await callEditor<{ articles: Article[] }>({ action: 'list' }, activePassword)
    setArticles(response.articles)
    setLoadingArticles(false)
  }, [callEditor, password])

  useEffect(() => {
    if (!password) { setChecking(false); return }
    let active = true
    callEditor<{ ok: boolean }>({ action: 'authenticate' }, password)
      .then(async () => {
        if (!active) return
        setAuthenticated(true)
        setChecking(false)
        await loadArticles(password)
      })
      .catch(() => {
        sessionStorage.removeItem('market-editor-password')
        if (active) { setPassword(''); setChecking(false) }
      })
    return () => { active = false }
  }, []) // Validate a restored editor session once on page load.

  async function unlock(event: FormEvent) {
    event.preventDefault()
    setChecking(true)
    setError('')
    try {
      await callEditor<{ ok: boolean }>({ action: 'authenticate' }, passwordInput)
      sessionStorage.setItem('market-editor-password', passwordInput)
      setPassword(passwordInput)
      setAuthenticated(true)
      setPasswordInput('')
      await loadArticles(passwordInput)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The editor password is incorrect.')
    } finally {
      setChecking(false)
    }
  }

  function lockEditor() {
    sessionStorage.removeItem('market-editor-password')
    setPassword('')
    setAuthenticated(false)
    setArticles([])
    setDraft(blankArticle())
  }

  function editArticle(article: Article) {
    setDraft({ id: article.id, publication_date: article.publication_date, title: article.title, summary: article.summary, content_markdown: article.content_markdown, status: article.status })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function newArticle() {
    setDraft(blankArticle())
    setError('')
    setSuccess('')
  }

  async function saveArticle(status: ArticleStatus) {
    if (!draft.title.trim() || !draft.summary.trim() || !draft.content_markdown.trim()) {
      setError('Date, headline, summary, and article content are required.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await callEditor<{ article: Article }>({ action: 'save', article: { ...draft, status } })
      setDraft({ id: response.article.id, publication_date: response.article.publication_date, title: response.article.title, summary: response.article.summary, content_markdown: response.article.content_markdown, status: response.article.status })
      setSuccess(status === 'published' ? 'The daily briefing is now published.' : 'Draft saved successfully.')
      await loadArticles()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The article could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle() {
    if (!draft.id) return
    setSaving(true)
    setError('')
    try {
      await callEditor({ action: 'delete', id: draft.id })
      setDeleteOpen(false)
      setSuccess('Article deleted.')
      setDraft(blankArticle())
      await loadArticles()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The article could not be deleted.')
    } finally {
      setSaving(false)
    }
  }

  if (checking && !authenticated) return <main className="editor-lock-page"><LoadingState label="Checking editor access…" /></main>

  if (!authenticated) {
    return (
      <main className="editor-lock-page">
        <button className="back-button" type="button" onClick={goHome}><ArrowLeft size={18} />Return to news</button>
        <section className="editor-lock-card">
          <span className="lock-icon"><LockKeyhole size={28} /></span>
          <p className="eyebrow">Restricted workspace</p>
          <h1>Editor access</h1>
          <p>Enter the shared editor password to create, revise, or publish a daily briefing.</p>
          {error && <div className="inline-error">{error}</div>}
          <form onSubmit={unlock}>
            <label><span>Editor password</span><div className="password-input"><KeyRound size={18} /><input type="password" value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} autoComplete="current-password" autoFocus required /></div></label>
            <button className="primary-button full-width" type="submit" disabled={checking}>{checking ? 'Checking…' : 'Open editor'}</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="editor-page">
      <div className="editor-topbar">
        <button className="back-button" type="button" onClick={goHome}><ArrowLeft size={18} />View published site</button>
        <div><button className="secondary-button" type="button" onClick={newArticle}><FilePlus2 size={17} />New article</button><button className="text-button" type="button" onClick={lockEditor}>Lock editor</button></div>
      </div>

      {error && <div className="editor-message error">{error}</div>}
      {success && <div className="editor-message success"><CheckCircle2 size={18} />{success}</div>}

      <section className="editor-details">
        <div className="field-grid">
          <label><span>Publication date</span><input type="date" value={draft.publication_date} onChange={(event) => setDraft({ ...draft, publication_date: event.target.value })} required /></label>
          <label><span>Status</span><div className={`status-pill ${draft.status}`}>{draft.status}</div></label>
        </div>
        <label><span>Headline</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A clear headline for today's market briefing" maxLength={200} /></label>
        <label><span>Executive summary <small>{draft.summary.length}/1,000</small></span><textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="A short overview shown on the daily archive card" maxLength={1000} rows={4} /></label>
      </section>

      <div className="mobile-editor-tabs" aria-label="Editor view">
        <button className={mobilePane === 'write' ? 'active' : ''} type="button" onClick={() => setMobilePane('write')}><Edit3 size={16} />Write</button>
        <button className={mobilePane === 'preview' ? 'active' : ''} type="button" onClick={() => setMobilePane('preview')}><Eye size={16} />Preview</button>
      </div>

      <section className="editor-workspace">
        <div className={`editor-pane write-pane${mobilePane !== 'write' ? ' mobile-hidden' : ''}`}>
          <div className="pane-heading"><div><p className="eyebrow">Markdown</p><h2>Write</h2></div><span>{wordCount.toLocaleString()} words</span></div>
          <textarea className="markdown-editor" value={draft.content_markdown} onChange={(event) => setDraft({ ...draft, content_markdown: event.target.value })} spellCheck placeholder="Paste the complete ChatGPT Markdown response here…" />
          <p className="markdown-help"><code># Heading</code><code>**Bold**</code><code>- List</code><code>&gt; Quote</code><code>| Table |</code></p>
        </div>
        <div className={`editor-pane preview-pane${mobilePane !== 'preview' ? ' mobile-hidden' : ''}`}>
          <div className="pane-heading"><div><p className="eyebrow">Rendered article</p><h2>Preview</h2></div></div>
          <div className="preview-scroll"><MarkdownArticle content={draft.content_markdown || '*Nothing to preview yet.*'} /></div>
        </div>
      </section>

      <div className="editor-actions">
        {draft.id && <button className="danger-button" type="button" onClick={() => setDeleteOpen(true)} disabled={saving}><Trash2 size={17} />Delete</button>}
        <span />
        <button className="secondary-button" type="button" onClick={() => void saveArticle('draft')} disabled={saving}><Save size={17} />{saving ? 'Saving…' : 'Save draft'}</button>
        <button className="primary-button" type="button" onClick={() => void saveArticle('published')} disabled={saving}><Send size={17} />{saving ? 'Publishing…' : draft.status === 'published' ? 'Update publication' : 'Publish'}</button>
      </div>

      <section className="editor-library">
        <div className="section-heading"><div><p className="eyebrow">Content library</p><h2>All editions</h2></div><span>{articles.length} total</span></div>
        {loadingArticles ? <LoadingState label="Loading articles…" /> : articles.length === 0 ? <p className="editor-empty">No articles have been created.</p> : (
          <div className="editor-article-list">{articles.map((article) => <button key={article.id} type="button" onClick={() => editArticle(article)}><span><strong>{article.title}</strong><small>{formatDate(article.publication_date)}</small></span><em className={article.status}>{article.status}</em></button>)}</div>
        )}
      </section>

      {deleteOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) setDeleteOpen(false) }}><div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="delete-title"><span className="delete-icon"><Trash2 /></span><h2 id="delete-title">Delete this article?</h2><p>This action cannot be undone. The daily briefing will be removed from the archive.</p><strong>{draft.title}</strong><div><button className="secondary-button" type="button" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancel</button><button className="danger-button solid" type="button" onClick={() => void deleteArticle()} disabled={saving}>{saving ? 'Deleting…' : 'Delete article'}</button></div></div></div>}
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
