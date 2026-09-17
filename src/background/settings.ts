import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/config'
import { buildIgnoreSet, isIgnoredHost, mergeIgnoredHosts, normalizeHost } from '../shared/ignored-hosts'
import type { RemoteSettings } from '../shared/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** Settings stored in the Supabase `settings` table as key/value rows. */
interface SettingsRow {
  key: string
  value: string
}

/** One row of the Supabase `ignored_hosts` table. */
interface IgnoredHostRow {
  host: string
}

export async function loadCachedSettings(): Promise<RemoteSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] as Partial<RemoteSettings> | undefined) }
}

/** Cached lookup set, rebuilt only when the stored list changes. */
let ignoreSet: { key: string; set: Set<string> } | null = null

/** Whether the generic website check must stay off this host (bundled defaults + remote list). */
export async function isHostIgnored(hostname: string): Promise<boolean> {
  const settings = await loadCachedSettings()
  const remote = settings.ignoredHosts
  const key = `${settings.fetchedAt ?? 0}:${remote?.length ?? 0}`
  if (!ignoreSet || ignoreSet.key !== key) {
    ignoreSet = { key, set: buildIgnoreSet(mergeIgnoredHosts(remote)) }
  }
  return isIgnoredHost(hostname, ignoreSet.set)
}

/**
 * Whether the remote settings are old enough to re-fetch. Mirrors `isStale` for
 * the register cache, but reads `refreshHours` off the settings themselves.
 *
 * A `fetchedAt` in the future (a clock that moved backwards, or a machine that
 * suspended across a timezone fix) counts as fresh: refetching on every lookup
 * until the clock catches up is worse than using a slightly odd cache.
 */
export function settingsAreStale(settings: RemoteSettings, now = Date.now()): boolean {
  if (!settings.fetchedAt) return true
  return now - settings.fetchedAt > settings.refreshHours * 3600 * 1000
}

function supabaseHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY!,
    Accept: 'application/json',
    // Legacy anon keys are JWTs and go in Authorization too; the newer
    // `sb_publishable_...` keys are not JWTs and must only be sent as apikey.
    ...(SUPABASE_ANON_KEY!.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
  }
}

/** PostgREST caps a response at 1000 rows, so anything larger has to be paged. */
const PAGE_SIZE = 1000
const MAX_PAGES = 25

/**
 * Reads a whole table. `order` must be a stable column (the primary key) or
 * paging by offset can repeat or skip rows between requests.
 */
async function fetchRows<T>(table: string, select: string, order: string): Promise<T[]> {
  const all: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = `select=${select}&order=${order}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: supabaseHeaders() })
    if (!res.ok) throw new Error(`Supabase ${table} request failed: ${res.status}`)
    const rows = (await res.json()) as T[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
  console.warn(`[ind-sponsor-check] ${table} hit the ${MAX_PAGES}-page cap; list may be truncated`)
  return all
}

/**
 * Fetches the settings rows from Supabase and merges them over the defaults.
 * Falls back to the cached copy (or defaults) when Supabase is not configured
 * or unreachable, so the extension keeps working.
 */
export async function fetchRemoteSettings(): Promise<RemoteSettings> {
  if (!supabaseConfigured) return loadCachedSettings()

  const cached = await loadCachedSettings()
  const [rows, hostRows] = await Promise.all([
    fetchRows<SettingsRow>('settings', 'key,value', 'key'),
    // The ignore list is optional: an older database without the table keeps the cached list.
    fetchRows<IgnoredHostRow>('ignored_hosts', 'host', 'host').catch((err) => {
      console.warn('[ind-sponsor-check] ignored_hosts fetch failed, keeping cached list', err)
      return null
    }),
  ])
  const kv = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  const settings: RemoteSettings = {
    registerUrl: isHttpUrl(kv.register_url) ? kv.register_url : DEFAULT_SETTINGS.registerUrl,
    sponsorsJsonUrl: isHttpUrl(kv.sponsors_json_url) ? kv.sponsors_json_url : undefined,
    refreshHours: clampHours(Number(kv.refresh_hours)),
    ignoredHosts: hostRows ? hostRows.map((r) => normalizeHost(r.host)).filter(Boolean) : cached.ignoredHosts,
    fetchedAt: Date.now(),
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings })
  return settings
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function clampHours(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SETTINGS.refreshHours
  return Math.min(Math.max(n, 1), 24 * 30)
}
