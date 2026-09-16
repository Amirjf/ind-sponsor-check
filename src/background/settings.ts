import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/config'
import type { RemoteSettings } from '../shared/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** Settings stored in the Supabase `settings` table as key/value rows. */
interface SettingsRow {
  key: string
  value: string
}

export async function loadCachedSettings(): Promise<RemoteSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] as Partial<RemoteSettings> | undefined) }
}

/**
 * Fetches the settings rows from Supabase and merges them over the defaults.
 * Falls back to the cached copy (or defaults) when Supabase is not configured
 * or unreachable, so the extension keeps working.
 */
export async function fetchRemoteSettings(): Promise<RemoteSettings> {
  if (!supabaseConfigured) return loadCachedSettings()

  const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Accept: 'application/json',
      // Legacy anon keys are JWTs and go in Authorization too; the newer
      // `sb_publishable_...` keys are not JWTs and must only be sent as apikey.
      ...(SUPABASE_ANON_KEY!.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`Supabase settings request failed: ${res.status}`)
  const rows = (await res.json()) as SettingsRow[]
  const kv = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  const settings: RemoteSettings = {
    registerUrl: isHttpUrl(kv.register_url) ? kv.register_url : DEFAULT_SETTINGS.registerUrl,
    sponsorsJsonUrl: isHttpUrl(kv.sponsors_json_url) ? kv.sponsors_json_url : undefined,
    refreshHours: clampHours(Number(kv.refresh_hours)),
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
