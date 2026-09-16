import { useCallback, useEffect, useState } from 'react'
import type { CheckResponse, Message, StatusInfo } from '../shared/types'

function send<T>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>
}

function formatDate(ms: number | null | undefined): string {
  if (!ms) return 'never'
  return new Date(ms).toLocaleString()
}

const STATUS_LABEL: Record<CheckResponse['status'], string> = {
  sponsor: 'Recognised sponsor',
  likely: 'Likely a sponsor (similar names found)',
  none: 'Not found in the register',
}

export default function App() {
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<CheckResponse | null>(null)
  const [busy, setBusy] = useState(false)

  const loadStatus = useCallback(async () => {
    setStatus(await send<StatusInfo>({ type: 'GET_STATUS' }))
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!query.trim()) {
      setResult(null)
      return
    }
    const handle = setTimeout(() => {
      void send<CheckResponse>({ type: 'CHECK_COMPANY', name: query }).then(setResult)
    }, 200)
    return () => clearTimeout(handle)
  }, [query])

  async function refresh() {
    setBusy(true)
    try {
      setStatus(await send<StatusInfo>({ type: 'REFRESH' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>IND Sponsor Check</h1>
        <p className="sub">Open a LinkedIn or Indeed job, or a company website, to see the badge.</p>
      </header>

      <section className="card">
        <label htmlFor="q">Check a company manually</label>
        <input
          id="q"
          placeholder="e.g. Adyen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {result && (
          <div className={`result result--${result.status}`}>
            <strong>{STATUS_LABEL[result.status]}</strong>
            {result.matches.length > 0 && (
              <ul>
                {result.matches.map((m) => (
                  <li key={m.kvk + m.name}>
                    {m.name} <span className="label">KVK {m.kvk}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card">
        {status ? (
          <>
            <div className="row"><span className="label">Sponsors in list</span><span>{status.count.toLocaleString()}</span></div>
            <div className="row"><span className="label">List downloaded</span><span>{formatDate(status.fetchedAt)}</span></div>
            {status.registerUpdatedText && (
              <div className="row"><span className="label">IND last updated</span><span>{status.registerUpdatedText}</span></div>
            )}
            <div className="row"><span className="label">Source</span><span>{status.source === 'bundled' ? 'built-in snapshot' : 'live download'}</span></div>
            <div className="row">
              <span className="label">Settings</span>
              <span>{status.supabaseConfigured ? `Supabase (${formatDate(status.settingsFetchedAt)})` : 'defaults (no Supabase)'}</span>
            </div>
            {status.lastError && <div className="row error"><span>Last refresh error: {status.lastError}</span></div>}
          </>
        ) : (
          <span className="label">Loading…</span>
        )}
      </section>

      <div className="actions">
        <button className="primary" onClick={() => void refresh()} disabled={busy || status?.refreshing}>
          {busy || status?.refreshing ? 'Refreshing…' : 'Refresh list now'}
        </button>
        {status && (
          <a href={status.registerUrl} target="_blank" rel="noopener noreferrer">
            Open IND register
          </a>
        )}
      </div>

      <p className="foot">
        Data: IND public register of recognised sponsors. A “not found” result can also mean the company is registered
        under a different legal name.
      </p>
    </div>
  )
}
