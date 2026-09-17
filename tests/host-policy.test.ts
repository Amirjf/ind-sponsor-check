import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../src/shared/config'
import { websiteBadgePolicy } from '../src/background/host-policy'

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

const blocked = async (host: string) => (await websiteBadgePolicy(host)).ignored

describe('websiteBadgePolicy', () => {
  it('lets the badge run on an ordinary company site', async () => {
    await expect(blocked('transferz.com')).resolves.toBe(false)
  })

  it('blocks a host on the bundled ignore list', async () => {
    await expect(blocked('mail.google.com')).resolves.toBe(true)
  })

  it('blocks a host the remote list added', async () => {
    store[STORAGE_KEYS.settings] = { ignoredHosts: ['gemeente-example.nl'], fetchedAt: 1 }
    await expect(blocked('www.gemeente-example.nl')).resolves.toBe(true)
  })

  it('blocks a host the user muted, and its subdomains', async () => {
    store[STORAGE_KEYS.prefs] = { websiteBadge: true, mutedHosts: ['acme.com'] }
    await expect(blocked('acme.com')).resolves.toBe(true)
    await expect(blocked('careers.acme.com')).resolves.toBe(true)
    await expect(blocked('other.com')).resolves.toBe(false)
  })

  it('blocks every host once the user turned the website badge off', async () => {
    store[STORAGE_KEYS.prefs] = { websiteBadge: false, mutedHosts: [] }
    await expect(blocked('transferz.com')).resolves.toBe(true)
  })
})
