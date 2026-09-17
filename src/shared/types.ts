import type { UserPrefs, WebsiteBadgeMode } from './user-prefs'

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
  /** Hosts from the Supabase `ignored_hosts` table (merged with the bundled defaults at lookup time). */
  ignoredHosts?: string[]
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
  | { type: 'IS_HOST_IGNORED'; host: string }
  | { type: 'GET_STATUS' }
  | { type: 'REFRESH' }
  | { type: 'GET_PREFS' }
  /** Partial update; fields left out keep their stored value. Answers with the saved prefs. */
  | { type: 'SET_PREFS'; prefs: Partial<UserPrefs> }
  /** Adds one host to the muted list. Answers with the saved prefs. */
  | { type: 'MUTE_HOST'; host: string }

export interface HostPolicyResponse {
  ignored: boolean
  /** Layout the company-website badge should open in. */
  mode: WebsiteBadgeMode
}

export interface CheckResponse extends MatchResult {
  registerUrl: string
}
