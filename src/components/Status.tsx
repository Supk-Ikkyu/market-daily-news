import { AlertCircle, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading the latest briefing…' }: { label?: string }) {
  return <div className="status-card"><LoaderCircle className="spin" /><p>{label}</p></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="status-card error"><AlertCircle /><h2>Something went wrong</h2><p>{message}</p>{retry && <button className="secondary-button" type="button" onClick={retry}>Try again</button>}</div>
}
