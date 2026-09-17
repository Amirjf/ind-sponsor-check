import { afterEach, describe, expect, it, vi } from 'vitest'
import { INTRO_PAGE, openIntroOnInstall } from '../src/background/onboarding'

const create = vi.fn()
const getURL = vi.fn((path: string) => `chrome-extension://abc/${path}`)

vi.stubGlobal('chrome', { tabs: { create }, runtime: { getURL } })

afterEach(() => {
  create.mockClear()
})

describe('openIntroOnInstall', () => {
  it('opens the intro page in a new tab on a fresh install', () => {
    openIntroOnInstall({ reason: 'install' })
    expect(getURL).toHaveBeenCalledWith(INTRO_PAGE)
    expect(create).toHaveBeenCalledWith({ url: `chrome-extension://abc/${INTRO_PAGE}` })
  })

  it('does nothing on an update or a Chrome update', () => {
    openIntroOnInstall({ reason: 'update', previousVersion: '0.1.0' })
    openIntroOnInstall({ reason: 'chrome_update' })
    expect(create).not.toHaveBeenCalled()
  })
})
