import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../src/shared/config'
import type { Message } from '../src/shared/types'

/**
 * The service worker is imported for its side effects (it registers the
 * listeners on import), so the whole chrome surface it touches is stubbed
 * before that import and the message listener is captured as it registers.
 */
type Listener = (m: Message, s: unknown, respond: (r: unknown) => void) => boolean

let store: Record<string, unknown> = {}
let listener: Listener
const fetchMock = vi.fn()

vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_test')
vi.stubGlobal('fetch', fetchMock)
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
    },
  },
  alarms: { get: vi.fn(async () => undefined), create: vi.fn(async () => {}), onAlarm: { addListener: vi.fn() } },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn((l: Listener) => (listener = l)) },
  },
  tabs: { create: vi.fn() },
})

/** Every Supabase table read comes back empty, which is enough to count calls. */
fetchMock.mockImplementation(async () => new Response('[]', { status: 200 }))

await import('../src/background/service-worker')

/** Sends CHECK_COMPANY and resolves once the opportunistic refresh has settled. */
async function check(name: string) {
  await new Promise<void>((resolve) => listener({ type: 'CHECK_COMPANY', name }, null, () => resolve()))
  // The refresh is fired after the response; let its microtasks drain.
  for (let i = 0; i < 20; i++) await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

const supabaseCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes('/rest/v1/')).length

beforeEach(() => {
  store = {}
  fetchMock.mockClear()
})

describe('opportunistic refresh on every company lookup', () => {
  it('fetches the settings tables once when nothing has been fetched yet', async () => {
    await check('Philips')
    expect(supabaseCalls()).toBeGreaterThan(0)
  })

  it('does not re-fetch them on the next lookups while they are fresh', async () => {
    await check('Philips')
    const first = supabaseCalls()
    expect(first).toBeGreaterThan(0)

    fetchMock.mockClear()
    await check('Adyen')
    await check('Booking')
    expect(supabaseCalls()).toBe(0)
  })

  it('fetches again once the cached settings are older than refreshHours', async () => {
    store[STORAGE_KEYS.settings] = {
      registerUrl: 'https://ind.nl/register',
      refreshHours: 24,
      fetchedAt: Date.now() - 25 * 3600 * 1000,
    }
    await check('Philips')
    expect(supabaseCalls()).toBeGreaterThan(0)
  })
})
