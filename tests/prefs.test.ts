import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../src/shared/config'
import { DEFAULT_PREFS } from '../src/shared/user-prefs'
import { loadPrefs, muteHostPref, patchPrefs } from '../src/background/prefs'

let store: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
    },
  },
})

beforeEach(() => {
  store = {}
})

describe('loadPrefs', () => {
  it('returns the defaults before anything is stored', async () => {
    await expect(loadPrefs()).resolves.toEqual(DEFAULT_PREFS)
  })

  it('repairs a malformed stored value instead of failing', async () => {
    store[STORAGE_KEYS.prefs] = { websiteBadge: 'no', mutedHosts: { nope: true } }
    await expect(loadPrefs()).resolves.toEqual(DEFAULT_PREFS)
  })

  it('reads back what was stored', async () => {
    store[STORAGE_KEYS.prefs] = { websiteBadge: false, mutedHosts: ['www.Acme.com'] }
    await expect(loadPrefs()).resolves.toEqual({ ...DEFAULT_PREFS, websiteBadge: false, mutedHosts: ['acme.com'] })
  })
})

describe('patchPrefs', () => {
  it('changes one field and leaves the rest alone', async () => {
    await muteHostPref('acme.com')
    const prefs = await patchPrefs({ websiteBadge: false })
    expect(prefs).toEqual({ ...DEFAULT_PREFS, websiteBadge: false, mutedHosts: ['acme.com'] })
    expect(store[STORAGE_KEYS.prefs]).toEqual(prefs)
  })

  it('can clear the muted list', async () => {
    await muteHostPref('acme.com')
    await expect(patchPrefs({ mutedHosts: [] })).resolves.toEqual(DEFAULT_PREFS)
  })
})

describe('muteHostPref', () => {
  it('stores the host in its normalised form', async () => {
    await expect(muteHostPref('www.Acme.com')).resolves.toEqual({ ...DEFAULT_PREFS, websiteBadge: true, mutedHosts: ['acme.com'] })
    expect(store[STORAGE_KEYS.prefs]).toEqual({ ...DEFAULT_PREFS, websiteBadge: true, mutedHosts: ['acme.com'] })
  })

  it('adds to the list rather than replacing it, without duplicates', async () => {
    await muteHostPref('acme.com')
    await muteHostPref('foo.nl')
    await expect(muteHostPref('www.acme.com')).resolves.toEqual({
      ...DEFAULT_PREFS,
      websiteBadge: true,
      mutedHosts: ['acme.com', 'foo.nl'],
    })
  })
})
