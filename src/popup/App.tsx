import { useCallback, useEffect, useState } from 'react'
import { INTRO_PAGE } from '../background/onboarding'
import { CONTACT_URL } from '../shared/config'
import logo from '../assets/icons/icon-32.png'
import type { CheckResponse, Message, StatusInfo } from '../shared/types'
import { unmuteHost, type UserPrefs } from '../shared/user-prefs'

function send<T>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>
}

function formatDate(ms: number | null | undefined): string {
  if (!ms) return 'never'
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "today" / "yesterday" / "5 days ago", for the one-line status. */
function formatAge(ms: number | null | undefined): string {
  if (!ms) return 'not downloaded yet'
  const days = Math.floor((Date.now() - ms) / 86_400_000)
  if (days <= 0) return 'updated today'
  if (days === 1) return 'updated yesterday'
  return `updated ${days} days ago`
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
  const [prefs, setPrefs] = useState<UserPrefs | null>(null)

  const loadStatus = useCallback(async () => {
    setStatus(await send<StatusInfo>({ type: 'GET_STATUS' }))
  }, [])

  useEffect(() => {
    void loadStatus()
    void send<UserPrefs>({ type: 'GET_PREFS' }).then(setPrefs)
  }, [loadStatus])

  /** Undoes a choice made from the badge's hide menu. */
  async function updatePrefs(patch: Partial<UserPrefs>) {
    setPrefs(await send<UserPrefs>({ type: 'SET_PREFS', prefs: patch }))
  }

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

  const refreshing = busy || status?.refreshing

  return (
    <div className="app">
      <header>
        <img src={logo} alt="" width={20} height={20} />
        <h1>IND Sponsor Check</h1>
      </header>

      <section className="card">
        <label htmlFor="q">Check a company</label>
        <input
          id="q"
          placeholder="e.g. Adyen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {result ? (
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
        ) : (
          <p className="hint">Or open a LinkedIn or Indeed job, or a company website, to see the badge.</p>
        )}
      </section>

      {status && (
        <details className="details">
          <summary>
            <span>
              {status.count.toLocaleString()} sponsors · {formatAge(status.fetchedAt)}
            </span>
          </summary>
          <div className="details__body">
            <div className="row">
              <span className="label">List downloaded</span>
              <span>{formatDate(status.fetchedAt)}</span>
            </div>
            {status.registerUpdatedText && (
              <div className="row">
                <span className="label">IND last updated</span>
                <span>{status.registerUpdatedText}</span>
              </div>
            )}
            <div className="row">
              <span className="label">Source</span>
              <span>{status.source === 'bundled' ? 'built-in snapshot' : 'live download'}</span>
            </div>
            {status.lastError && <p className="error">Last refresh failed: {status.lastError}</p>}
            <div className="actions">
              <button onClick={() => void refresh()} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh now'}
              </button>
              <a href={status.registerUrl} target="_blank" rel="noopener noreferrer">
                IND register
              </a>
            </div>
          </div>
        </details>
      )}

      {prefs && (!prefs.websiteBadge || prefs.mutedHosts.length > 0) && (
        <section className="card hidden-badges">
          <label>Hidden badges</label>
          {!prefs.websiteBadge && (
            <div className="row hidden-badges__row">
              <span>Off on all company websites</span>
              <button onClick={() => void updatePrefs({ websiteBadge: true })}>Turn on</button>
            </div>
          )}
          {prefs.mutedHosts.map((host) => (
            <div className="row hidden-badges__row" key={host}>
              <span className="hidden-badges__host">{host}</span>
              <button
                onClick={() => void updatePrefs({ mutedHosts: unmuteHost(prefs, host).mutedHosts })}
                aria-label={`Show the badge on ${host} again`}
              >
                Show
              </button>
            </div>
          ))}
          <p className="hint">Badges on LinkedIn and Indeed job pages are not affected.</p>
        </section>
      )}

      <a className="contact" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
        Feature request or feedback? →
      </a>

      <p className="foot">
        A “not found” result can also mean the company is registered under a different legal name.{' '}
        <a href={chrome.runtime.getURL(INTRO_PAGE)} target="_blank" rel="noopener noreferrer">
          How it works
        </a>
      </p>
    </div>
  )
}
