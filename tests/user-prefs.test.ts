import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFS,
  isWebsiteBadgeAllowed,
  muteHost,
  normalizePrefs,
  unmuteHost,
  type UserPrefs,
} from '../src/shared/user-prefs'

describe('normalizePrefs', () => {
  it('returns the defaults for nothing stored yet', () => {
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS)
  })

  it.each([null, 42, 'nope', []])('returns the defaults for malformed storage (%s)', (stored) => {
    expect(normalizePrefs(stored)).toEqual(DEFAULT_PREFS)
  })

  it('keeps the stored values it understands', () => {
    expect(normalizePrefs({ websiteBadge: false, websiteBadgeMode: 'compact', mutedHosts: ['acme.com'] })).toEqual({
      websiteBadge: false,
      websiteBadgeMode: 'compact',
      mutedHosts: ['acme.com'],
    })
  })

  it('fills in fields the stored copy is missing', () => {
    expect(normalizePrefs({ websiteBadge: false })).toEqual({ ...DEFAULT_PREFS, websiteBadge: false })
    expect(normalizePrefs({ mutedHosts: ['acme.com'] })).toEqual({ ...DEFAULT_PREFS, mutedHosts: ['acme.com'] })
  })

  it.each([null, 'pill', 42, ''])('falls back to the card layout for an unknown mode (%s)', (mode) => {
    expect(normalizePrefs({ websiteBadgeMode: mode }).websiteBadgeMode).toBe('card')
  })

  it('normalises stored hosts and drops unusable ones', () => {
    expect(normalizePrefs({ mutedHosts: ['www.Acme.com', '', 42, 'acme.com', 'foo.nl'] }).mutedHosts).toEqual([
      'acme.com',
      'foo.nl',
    ])
  })

  it('ignores a mutedHosts value that is not an array', () => {
    expect(normalizePrefs({ mutedHosts: 'acme.com' }).mutedHosts).toEqual([])
  })
})

describe('muteHost', () => {
  it('adds the host in its normalised form', () => {
    expect(muteHost(DEFAULT_PREFS, 'www.Acme.com').mutedHosts).toEqual(['acme.com'])
  })

  it('does not add the same host twice', () => {
    const once = muteHost(DEFAULT_PREFS, 'acme.com')
    expect(muteHost(once, 'www.acme.com').mutedHosts).toEqual(['acme.com'])
  })

  it('ignores an unusable host', () => {
    expect(muteHost(DEFAULT_PREFS, '   ').mutedHosts).toEqual([])
  })

  it('leaves the prefs it was given untouched', () => {
    const prefs: UserPrefs = { ...DEFAULT_PREFS, mutedHosts: [] as string[] }
    muteHost(prefs, 'acme.com')
    expect(prefs.mutedHosts).toEqual([])
  })
})

describe('unmuteHost', () => {
  it('removes the host, matching on its normalised form', () => {
    const prefs = { ...DEFAULT_PREFS, websiteBadge: true, mutedHosts: ['acme.com', 'foo.nl'] }
    expect(unmuteHost(prefs, 'www.Acme.com').mutedHosts).toEqual(['foo.nl'])
  })

  it('is a no-op for a host that was never muted', () => {
    const prefs = { ...DEFAULT_PREFS, websiteBadge: true, mutedHosts: ['acme.com'] }
    expect(unmuteHost(prefs, 'other.com').mutedHosts).toEqual(['acme.com'])
  })
})

describe('isWebsiteBadgeAllowed', () => {
  it('allows the badge by default', () => {
    expect(isWebsiteBadgeAllowed(DEFAULT_PREFS, 'acme.com')).toBe(true)
  })

  it('blocks every host once the badge is turned off', () => {
    expect(isWebsiteBadgeAllowed({ ...DEFAULT_PREFS, websiteBadge: false, mutedHosts: [] }, 'acme.com')).toBe(false)
  })

  it('blocks a muted host and its subdomains', () => {
    const prefs = { ...DEFAULT_PREFS, websiteBadge: true, mutedHosts: ['acme.com'] }
    expect(isWebsiteBadgeAllowed(prefs, 'acme.com')).toBe(false)
    expect(isWebsiteBadgeAllowed(prefs, 'www.acme.com')).toBe(false)
    expect(isWebsiteBadgeAllowed(prefs, 'careers.eu.acme.com')).toBe(false)
  })

  it('leaves other hosts alone', () => {
    const prefs = { ...DEFAULT_PREFS, websiteBadge: true, mutedHosts: ['acme.com'] }
    expect(isWebsiteBadgeAllowed(prefs, 'notacme.com')).toBe(true)
    expect(isWebsiteBadgeAllowed(prefs, 'acme.com.evil.test')).toBe(true)
  })
})
