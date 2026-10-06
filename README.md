# Market Daily News

A responsive English-language website for publishing one long-form U.S. market briefing per day. Public readers do not need an account. Editors use a shared password to create, preview, save, publish, revise, or delete Markdown articles.

## Features

- Large daily edition cards and a distraction-free long-form reader
- Markdown headings, bold text, lists, tables, links, quotes, and code blocks
- No short content limit; article content uses PostgreSQL `text`
- Desktop split-screen Write/Preview editor and mobile tabbed editor
- Draft and published states
- Shared editor password verified only by a Supabase Edge Function
- Public Row Level Security permits reading published articles only
- Responsive light and dark themes using navy, cream, and blue tones

## 1. Local setup

Requirements: Node.js, Git, a Supabase project, GitHub, and Render.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Add the same Supabase values used by the Tasks website:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Never put the `service_role` key or editor password in `.env`, React code, GitHub, or Render frontend environment variables.

## 2. Create the database table

Open **Supabase Dashboard > SQL Editor**, paste the complete contents of `supabase/schema.sql`, and run it once.

The schema permits public users to select only rows whose status is `published`. There are no public insert, update, or delete policies.

## 3. Create the shared editor password

Choose a long, unique password. Do not send the password to ChatGPT or commit it to Git.

Generate its SHA-256 hash locally, replacing the final placeholder with the real password:

```powershell
node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "YOUR_STRONG_EDITOR_PASSWORD"
```

Copy the 64-character result. This hash is safe to store as a Supabase Edge Function secret, but the original password should still remain private.

## 4. Link and deploy the Edge Function

If this local folder has not been linked to Supabase yet:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
```

Set the function secrets. Replace the hash and production URL if necessary:

```powershell
npx.cmd supabase secrets set EDITOR_PASSWORD_HASH="YOUR_64_CHARACTER_HASH" ALLOWED_ORIGINS="https://marketdailynews.onrender.com,http://localhost:5173"
```

Deploy the function:

```powershell
npx.cmd supabase functions deploy manage-news --no-verify-jwt
```

The original editor password is sent only over HTTPS when an editor unlocks the page. The Edge Function hashes it and compares it with `EDITOR_PASSWORD_HASH`. Database writes use the server-side service role automatically supplied to the Edge Function.

## 5. Test locally

```powershell
npm.cmd run dev
```

Open:

- Public website: `http://localhost:5173`
- Editor: `http://localhost:5173/editor`

Paste Markdown into the editor, save a draft, preview it, and publish it. Confirm that the published edition appears on the public homepage.

Run the production build:

```powershell
npm.cmd run build
```

## 6. GitHub

Create an empty GitHub repository named `market-daily-news`, then run:

```powershell
git init
git branch -M main
git add .
git commit -m "Initial Market Daily News website"
git remote add origin https://github.com/YOUR_USERNAME/market-daily-news.git
git push -u origin main
```

Confirm that `.env` is not included:

```powershell
git check-ignore .env
```

## 7. Render

Create a new **Static Site** connected to the new GitHub repository.

- Name: `marketdailynews`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Rewrite rule: `/*` to `/index.html`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

If `marketdailynews` is available, the address will be:

`https://marketdailynews.onrender.com`

After the final address is confirmed, ensure the exact URL is present in the Supabase `ALLOWED_ORIGINS` secret. If the Render name changes, update the secret and redeploy `manage-news`.

## Daily publishing workflow

1. Ask ChatGPT to research and produce the daily report in Markdown.
2. Open `/editor` and enter the shared password.
3. Select the publication date and enter the headline and executive summary.
4. Paste the complete Markdown report into Write.
5. Review the rendered Preview.
6. Save as a draft or publish it.
7. Share the public article link.

The editor password remains in `sessionStorage` only for the current browser tab session. Selecting **Lock editor** clears it immediately.
