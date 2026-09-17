import { describe, expect, it } from 'vitest'
import { settingsAreStale } from '../src/background/settings'
import type { RemoteSettings } from '../src/shared/types'

const HOUR = 3600 * 1000
const NOW = Date.UTC(2026, 8, 17, 12, 0, 0)

function settings(over: Partial<RemoteSettings> = {}): RemoteSettings {
  return { registerUrl: 'https://ind.nl/register', refreshHours: 24, ...over }
}

describe('settingsAreStale', () => {
  it('is stale when nothing has ever been fetched', () => {
    expect(settingsAreStale(settings(), NOW)).toBe(true)
  })

  it('is fresh right after a fetch', () => {
    expect(settingsAreStale(settings({ fetchedAt: NOW }), NOW)).toBe(false)
  })

  it('is fresh an hour into a 24-hour window', () => {
    expect(settingsAreStale(settings({ fetchedAt: NOW - HOUR }), NOW)).toBe(false)
  })

  it('is still fresh exactly on the window, and stale one millisecond past it', () => {
    expect(settingsAreStale(settings({ fetchedAt: NOW - 24 * HOUR }), NOW)).toBe(false)
    expect(settingsAreStale(settings({ fetchedAt: NOW - 24 * HOUR - 1 }), NOW)).toBe(true)
  })

  it('uses the refreshHours the settings themselves carry', () => {
    const hourly = settings({ refreshHours: 1, fetchedAt: NOW - 2 * HOUR })
    const daily = settings({ refreshHours: 24, fetchedAt: NOW - 2 * HOUR })
    expect(settingsAreStale(hourly, NOW)).toBe(true)
    expect(settingsAreStale(daily, NOW)).toBe(false)
  })

  it('treats a clock that jumped backwards as fresh rather than refetching in a loop', () => {
    expect(settingsAreStale(settings({ fetchedAt: NOW + 5 * HOUR }), NOW)).toBe(false)
  })
})
