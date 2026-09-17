import type { RemoteSettings } from './types'

/** Used until Supabase settings are fetched, or when Supabase is not configured. */
export const DEFAULT_SETTINGS: RemoteSettings = {
  registerUrl: 'https://ind.nl/en/public-register-recognised-sponsors/public-register-work',
  refreshHours: 24,
}

/** A fetched register with fewer rows than this is treated as a broken download. */
export const MIN_PLAUSIBLE_SPONSORS = 1000

export const ALARM_NAME = 'refresh-sponsors'

/**
 * Where the popup sends people with feature requests and feedback. The page
 * itself lives outside the extension, so this is the only thing to change if
 * the site moves.
 */
export const CONTACT_URL = 'https://zal-group.nl/ind-sponsor-check#feedback'

export const STORAGE_KEYS = {
  cache: 'sponsorCache',
  settings: 'remoteSettings',
  prefs: 'userPrefs',
  lastError: 'lastError',
} as const
