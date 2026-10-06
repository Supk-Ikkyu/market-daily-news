import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const editorPasswordHash = (Deno.env.get('EDITOR_PASSWORD_HASH') || '').toLowerCase()
const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || ''
  const originAllowed = configuredOrigins.length === 0 || !origin || configuredOrigins.includes(origin)
  const corsHeaders = {
    'Access-Control-Allow-Origin': originAllowed ? (origin || '*') : configuredOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-editor-password',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }

  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, corsHeaders)
  if (!originAllowed) return json({ error: 'This website origin is not allowed.' }, 403, corsHeaders)
  if (!editorPasswordHash) return json({ error: 'Editor access has not been configured.' }, 503, corsHeaders)

  const suppliedPassword = request.headers.get('x-editor-password') || ''
  const suppliedHash = await sha256(suppliedPassword)
  if (!timingSafeEqual(suppliedHash, editorPasswordHash)) return json({ error: 'The editor password is incorrect.' }, 401, corsHeaders)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON request.' }, 400, corsHeaders) }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const action = body.action

  if (action === 'authenticate') return json({ ok: true }, 200, corsHeaders)

  if (action === 'list') {
    const { data, error } = await supabase.from('daily_news').select('*').order('publication_date', { ascending: false })
    if (error) return json({ error: error.message }, 500, corsHeaders)
    return json({ articles: data || [] }, 200, corsHeaders)
  }

  if (action === 'save') {
    const article = validateArticle(body.article)
    if ('error' in article) return json(article, 400, corsHeaders)

    const payload = {
      publication_date: article.publication_date,
      title: article.title,
      summary: article.summary,
      content_markdown: article.content_markdown,
      status: article.status,
      published_at: article.status === 'published' ? new Date().toISOString() : null,
    }

    const requestQuery = article.id
      ? supabase.from('daily_news').update(payload).eq('id', article.id).select('*').single()
      : supabase.from('daily_news').upsert(payload, { onConflict: 'publication_date' }).select('*').single()
    const { data, error } = await requestQuery
    if (error) return json({ error: friendlyDatabaseError(error.message) }, 400, corsHeaders)
    return json({ article: data }, 200, corsHeaders)
  }

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!isUuid(id)) return json({ error: 'A valid article ID is required.' }, 400, corsHeaders)
    const { error } = await supabase.from('daily_news').delete().eq('id', id)
    if (error) return json({ error: error.message }, 500, corsHeaders)
    return json({ ok: true }, 200, corsHeaders)
  }

  return json({ error: 'Unknown editor action.' }, 400, corsHeaders)
})

function validateArticle(value: unknown) {
  if (!value || typeof value !== 'object') return { error: 'Article data is required.' }
  const input = value as Record<string, unknown>
  const id = typeof input.id === 'string' ? input.id : ''
  const publication_date = typeof input.publication_date === 'string' ? input.publication_date : ''
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
  const content_markdown = typeof input.content_markdown === 'string' ? input.content_markdown.trim() : ''
  const status = input.status === 'published' ? 'published' : 'draft'

  if (id && !isUuid(id)) return { error: 'The article ID is invalid.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publication_date)) return { error: 'Choose a valid publication date.' }
  if (!title || title.length > 200) return { error: 'Headline must contain 1–200 characters.' }
  if (!summary || summary.length > 1000) return { error: 'Executive summary must contain 1–1,000 characters.' }
  if (!content_markdown) return { error: 'Article content cannot be empty.' }
  return { id, publication_date, title, summary, content_markdown, status }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function friendlyDatabaseError(message: string) {
  if (message.includes('daily_news_publication_date_key')) return 'An article already exists for this publication date.'
  return message
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
