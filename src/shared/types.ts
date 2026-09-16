/** One row of the IND public register of recognised sponsors. */
export interface Sponsor {
  name: string
  /** KVK (Dutch Chamber of Commerce) number, as printed in the register. */
  kvk: string
}

export type MatchStatus = 'sponsor' | 'likely' | 'none'

export interface MatchResult {
  status: MatchStatus
  /** The raw company name that was checked. */
  query: string
  /** The normalised form that was compared. */
  core: string
  /** Register entries that matched (empty when status is `none`). */
  matches: Sponsor[]
}

/** What the extension keeps in chrome.storage.local. */
export interface SponsorCache {
  sponsors: Sponsor[]
  /** Epoch ms when the list was fetched. */
  fetchedAt: number
  /** URL the list was fetched from, or `bundled` for the built-in snapshot. */
  source: string
  /** Free text such as "3 September 2026", scraped from the register page when available. */
  registerUpdatedText?: string
}

/** Remote-controlled settings, read from the Supabase `settings` table. */
export interface RemoteSettings {
  /** The IND register page. Shown to users and used as the HTML source. */
  registerUrl: string
  /** Optional: a JSON file to use instead of parsing the HTML page. */
  sponsorsJsonUrl?: string
  /** How often to re-download the register, in hours. */
  refreshHours: number
  /** Epoch ms when these settings were last fetched from Supabase. */
  fetchedAt?: number
}

export interface StatusInfo {
  count: number
  fetchedAt: number | null
  source: string | null
  registerUpdatedText?: string
  registerUrl: string
  refreshHours: number
  supabaseConfigured: boolean
  settingsFetchedAt: number | null
  lastError: string | null
  refreshing: boolean
}

export type Message =
  | { type: 'CHECK_COMPANY'; name: string }
  | { type: 'GET_STATUS' }
  | { type: 'REFRESH' }

export interface CheckResponse extends MatchResult {
  registerUrl: string
}
