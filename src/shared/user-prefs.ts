import { isIgnoredHost, normalizeHost } from './ignored-hosts'

/**
 * How the company-website badge presents itself:
 * - `card`: the bottom-right box with the company name, the badge and the hide menu.
 * - `compact`: a bottom-right chip showing only the status, which opens to the
 *   same box on hover, focus or click.
 */
export type WebsiteBadgeMode = 'card' | 'compact'

export const WEBSITE_BADGE_MODES: readonly WebsiteBadgeMode[] = ['card', 'compact']

/**
 * Choices the user made from the badge's own menu. Kept apart from
 * `RemoteSettings`: that object is replaced wholesale on every Supabase fetch,
 * and these must survive it.
 */
export interface UserPrefs {
  /** False once the user turned the company-website badge off for every site. */
  websiteBadge: boolean
  /** Which layout the company-website badge uses. */
  websiteBadgeMode: WebsiteBadgeMode
  /** Sites the user silenced one at a time. Registrable hosts; subdomains count as muted too. */
  mutedHosts: string[]
}

export const DEFAULT_PREFS: UserPrefs = { websiteBadge: true, websiteBadgeMode: 'card', mutedHosts: [] }

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Stored prefs merged over the defaults. Anything unrecognised falls back rather than throwing. */
export function normalizePrefs(stored: unknown): UserPrefs {
  if (!isObject(stored)) return { ...DEFAULT_PREFS }
  const hosts = Array.isArray(stored.mutedHosts) ? stored.mutedHosts : []
  const mode = stored.websiteBadgeMode
  return {
    websiteBadge: typeof stored.websiteBadge === 'boolean' ? stored.websiteBadge : DEFAULT_PREFS.websiteBadge,
    websiteBadgeMode: WEBSITE_BADGE_MODES.includes(mode as WebsiteBadgeMode)
      ? (mode as WebsiteBadgeMode)
      : DEFAULT_PREFS.websiteBadgeMode,
    mutedHosts: [...new Set(hosts.map(normalizeHost).filter(Boolean))],
  }
}

export function muteHost(prefs: UserPrefs, host: string): UserPrefs {
  const h = normalizeHost(host)
  if (!h || prefs.mutedHosts.includes(h)) return { ...prefs, mutedHosts: [...prefs.mutedHosts] }
  return { ...prefs, mutedHosts: [...prefs.mutedHosts, h] }
}

export function unmuteHost(prefs: UserPrefs, host: string): UserPrefs {
  const h = normalizeHost(host)
  return { ...prefs, mutedHosts: prefs.mutedHosts.filter((m) => m !== h) }
}

/** Whether the floating company-website badge may still appear on `hostname`. */
export function isWebsiteBadgeAllowed(prefs: UserPrefs, hostname: string): boolean {
  if (!prefs.websiteBadge) return false
  return !isIgnoredHost(hostname, prefs.mutedHosts)
}
