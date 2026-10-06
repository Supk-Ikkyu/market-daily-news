import { AlertCircle, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading the latest briefing…' }: { label?: string }) {
  return <div className="status-card"><LoaderCircle className="spin" /><p>{label}</p></div>
}

export function NewsGridSkeleton() {
  return (
    <div className="loading-news-grid" aria-label="Loading the latest briefings" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="loading-news-card" key={index} aria-hidden="true">
          <span className="skeleton-line meta" />
          <span className="skeleton-line title" />
          <span className="skeleton-line title short" />
          <span className="skeleton-line copy" />
          <span className="skeleton-line copy short" />
          <span className="skeleton-line action" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="status-card error"><AlertCircle /><h2>Something went wrong</h2><p>{message}</p>{retry && <button className="secondary-button" type="button" onClick={retry}>Try again</button>}</div>
}
