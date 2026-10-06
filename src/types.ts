export type ArticleStatus = 'draft' | 'published'

export interface Article {
  id: string
  publication_date: string
  title: string
  summary: string
  content_markdown: string
  status: ArticleStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ArticleDraft = Pick<Article, 'id' | 'publication_date' | 'title' | 'summary' | 'content_markdown' | 'status'>
