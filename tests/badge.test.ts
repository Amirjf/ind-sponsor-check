// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FLOAT_CLASS,
  MENU_CLASS,
  createBadge,
  createFloatingContainer,
  disposeBadge,
  renderResult,
  setFloatMode,
} from '../src/content/badge'
import { DISMISS_CLASS } from '../src/content/dismiss-menu'
import { MODES_CLASS } from '../src/content/mode-toggle'
import type { DismissChoice } from '../src/content/dismiss-menu'
import type { CheckResponse } from '../src/shared/types'

const registerUrl = 'https://ind.nl/register'
const floatOptions = {
  name: 'Philips',
  host: 'acme.com',
  mode: 'card' as const,
  onDismiss: () => {},
  onModeChange: () => {},
}
const sponsors = [
  { name: 'Philips Electronics Nederland B.V.', kvk: '1' },
  { name: 'Philips Lighting B.V.', kvk: '2' },
  { name: 'Philips Medical Systems B.V.', kvk: '3' },
]

function result(status: CheckResponse['status'], matches = sponsors): CheckResponse {
  return { status, query: 'Philips', core: 'philips', matches: status === 'none' ? [] : matches, registerUrl }
}

function mount(): HTMLAnchorElement {
  const badge = createBadge('Philips')
  document.body.appendChild(badge)
  return badge
}

// The menu is rendered into <body>, not into the badge, so host pages cannot clip it.
const menu = (_badge?: HTMLElement) => document.body.querySelector<HTMLElement>(`:scope > .${MENU_CLASS}`)

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('renderResult: likely', () => {
  it('shows how many similar sponsors were found', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    expect(badge.textContent).toContain('Similar sponsors found (3)')
    expect(badge.classList.contains('indsc-badge--likely')).toBe(true)
  })

  it('acts as a closed menu button, not a link', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    expect(badge.hasAttribute('href')).toBe(false)
    expect(badge.getAttribute('role')).toBe('button')
    expect(badge.getAttribute('aria-expanded')).toBe('false')
    expect(menu(badge)?.hidden).toBe(true)
  })

  it('opens on click and lists every match with its KVK number', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    badge.click()
    expect(badge.getAttribute('aria-expanded')).toBe('true')
    const rows = menu(badge)!.querySelectorAll('li')
    expect(rows).toHaveLength(3)
    expect(rows[1].textContent).toContain('Philips Lighting B.V.')
    expect(rows[1].textContent).toContain('KVK 2')
    expect(menu(badge)!.hidden).toBe(false)
  })

  it('closes on a second click, on Escape, and on an outside click', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    badge.click()
    badge.click()
    expect(badge.getAttribute('aria-expanded')).toBe('false')

    badge.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(badge.getAttribute('aria-expanded')).toBe('false')

    badge.click()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(badge.getAttribute('aria-expanded')).toBe('false')
  })

  it('clicks inside the open menu do not close it, except on the register link', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    badge.click()
    menu(badge)!.querySelector('li')!.click()
    expect(badge.getAttribute('aria-expanded')).toBe('true')
    menu(badge)!.querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(badge.getAttribute('aria-expanded')).toBe('false')
  })

  it('positions the menu below the badge and flips it above when there is no room', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    const m = menu(badge)!
    Object.defineProperty(m, 'offsetHeight', { value: 300, configurable: true })
    Object.defineProperty(m, 'offsetWidth', { value: 320, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 800, configurable: true })
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1200, configurable: true })
    const rect = (top: number) => ({ top, bottom: top + 30, left: 100, right: 300, width: 200, height: 30 }) as DOMRect

    badge.getBoundingClientRect = () => rect(100)
    badge.click()
    expect(m.classList.contains(`${MENU_CLASS}--up`)).toBe(false)
    expect(m.style.top).toBe('136px')
    expect(m.style.left).toBe('100px')
    badge.click()

    badge.getBoundingClientRect = () => rect(700)
    badge.click()
    expect(m.classList.contains(`${MENU_CLASS}--up`)).toBe(true)
    expect(m.style.bottom).toBe('106px')
  })

  it('keeps the menu inside the viewport horizontally', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    const m = menu(badge)!
    Object.defineProperty(m, 'offsetWidth', { value: 320, configurable: true })
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1000, configurable: true })
    badge.getBoundingClientRect = () => ({ top: 10, bottom: 40, left: 900, right: 990 }) as DOMRect
    badge.click()
    expect(m.style.left).toBe('668px')
  })

  it('disposeBadge removes the menu and its document listeners', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    badge.click()
    disposeBadge(badge)
    expect(menu(badge)).toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(badge.classList.contains('indsc-badge--open')).toBe(false)
  })

  it('closing the floating box removes the menu too', () => {
    const badge = createBadge('Philips')
    const box = createFloatingContainer({ ...floatOptions, badge })
    document.body.appendChild(box)
    renderResult(badge, result('likely'))
    badge.click()
    expect(menu(badge)).not.toBeNull()
    box.querySelector<HTMLButtonElement>(`.${DISMISS_CLASS}__button`)!.click()
    box.querySelectorAll<HTMLButtonElement>(`.${DISMISS_CLASS}__item`)[0].click()
    expect(menu(badge)).toBeNull()
  })

  it('has a footer link to the IND register', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    const link = menu(badge)!.querySelector<HTMLAnchorElement>('a')
    expect(link?.href).toBe(registerUrl)
    expect(link?.target).toBe('_blank')
  })

  it('opens upward inside the floating container', () => {
    const badge = createBadge('Philips')
    document.body.appendChild(createFloatingContainer({ ...floatOptions, badge }))
    renderResult(badge, result('likely'))
    badge.click()
    expect(menu(badge)!.classList.contains(`${MENU_CLASS}--up`)).toBe(true)
  })

  it('re-rendering replaces the previous menu', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    renderResult(badge, result('likely', sponsors.slice(0, 1)))
    expect(document.querySelectorAll(`.${MENU_CLASS}`)).toHaveLength(1)
    expect(badge.textContent).toContain('(1)')
  })
})

describe('renderResult: other states', () => {
  it.each(['sponsor', 'none'] as const)('%s links to the register and has no menu', (status) => {
    const badge = mount()
    renderResult(badge, result('likely'))
    renderResult(badge, result(status))
    expect(badge.href).toBe(registerUrl)
    expect(badge.hasAttribute('role')).toBe(false)
    expect(menu(badge)).toBeNull()
  })
})

describe('createFloatingContainer', () => {
  const box = (onDismiss: (choice: DismissChoice) => void) => {
    const badge = createBadge('Philips')
    const el = createFloatingContainer({ ...floatOptions, badge, onDismiss })
    document.body.appendChild(el)
    return el
  }
  const open = (el: HTMLElement) => el.querySelector<HTMLButtonElement>(`.${DISMISS_CLASS}__button`)!.click()
  const items = (el: HTMLElement) => el.querySelectorAll<HTMLButtonElement>(`.${DISMISS_CLASS}__item`)

  it('shows the company name and the badge', () => {
    const el = box(() => {})
    expect(el.querySelector(`.${FLOAT_CLASS}__name`)?.textContent).toBe('Philips')
    expect(el.querySelector('.indsc-badge')).not.toBeNull()
  })

  it('the close button opens the menu instead of dismissing straight away', () => {
    const onDismiss = vi.fn()
    const el = box(onDismiss)
    open(el)
    expect(onDismiss).not.toHaveBeenCalled()
    expect(el.isConnected).toBe(true)
    expect(items(el)[1].textContent).toBe("Don't show again on acme.com")
  })

  it.each([
    [0, 'now'],
    [1, 'site'],
    [2, 'websites'],
  ] as const)('choice %i reports %s and removes the box', (index, choice) => {
    const onDismiss = vi.fn()
    const el = box(onDismiss)
    open(el)
    items(el)[index].click()
    expect(onDismiss).toHaveBeenCalledWith(choice)
    expect(el.isConnected).toBe(false)
  })

  it('stops listening once it has been dismissed', () => {
    const onDismiss = vi.fn()
    const el = box(onDismiss)
    open(el)
    items(el)[0].click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('floating box layouts', () => {
  const box = (mode: 'card' | 'compact', onModeChange = vi.fn()) => {
    const badge = createBadge('Philips')
    const el = createFloatingContainer({ ...floatOptions, badge, mode, onModeChange })
    document.body.appendChild(el)
    return { el, badge, onModeChange }
  }
  const toggle = (el: HTMLElement) => el.querySelector<HTMLButtonElement>(`.${MODES_CLASS}__button`)!
  const chip = (el: HTMLElement) => el.querySelector<HTMLButtonElement>(`.${FLOAT_CLASS}__chip`)!
  const compact = (el: HTMLElement) => el.classList.contains(`${FLOAT_CLASS}--compact`)

  it('opens in the stored layout', () => {
    expect(compact(box('card').el)).toBe(false)
    expect(compact(box('compact').el)).toBe(true)
  })

  it('keeps the same content in both layouts, so switching needs no re-check', () => {
    for (const mode of ['card', 'compact'] as const) {
      const { el } = box(mode)
      expect(el.querySelector(`.${FLOAT_CLASS}__name`)?.textContent).toBe('Philips')
      expect(el.querySelector('.indsc-badge')).not.toBeNull()
      expect(el.querySelector(`.${DISMISS_CLASS}__button`)).not.toBeNull()
    }
  })

  it('the toggle switches the layout and reports the choice', () => {
    const { el, onModeChange } = box('card')
    toggle(el).click()
    expect(compact(el)).toBe(true)
    expect(onModeChange).toHaveBeenCalledWith('compact')
    toggle(el).click()
    expect(compact(el)).toBe(false)
    expect(onModeChange).toHaveBeenLastCalledWith('card')
  })

  it('the toggle describes the layout it would switch to', () => {
    const { el } = box('card')
    expect(toggle(el).getAttribute('aria-label')).toContain('corner chip')
    toggle(el).click()
    expect(toggle(el).getAttribute('aria-label')).toContain('full box')
  })

  it('the chip carries the result, since it is all the compact layout shows', () => {
    const { el, badge } = box('compact')
    expect(el.dataset.status).toBe('checking')
    renderResult(badge, result('sponsor'))
    expect(el.dataset.status).toBe('sponsor')
    expect(chip(el).textContent).toBe('✓')
    renderResult(badge, result('none'))
    expect(chip(el).textContent).toBe('✕')
  })

  it('clicking the chip opens the box for people who cannot hover', () => {
    const { el } = box('compact')
    expect(chip(el).getAttribute('aria-expanded')).toBe('false')
    chip(el).click()
    expect(el.classList.contains(`${FLOAT_CLASS}--expanded`)).toBe(true)
    expect(chip(el).getAttribute('aria-expanded')).toBe('true')
    el.dispatchEvent(new MouseEvent('mouseleave'))
    expect(el.classList.contains(`${FLOAT_CLASS}--expanded`)).toBe(false)
  })

  it('follows the pref when it changes somewhere else', () => {
    const { el, onModeChange } = box('card')
    setFloatMode(el, 'compact')
    expect(compact(el)).toBe(true)
    expect(toggle(el).getAttribute('aria-label')).toContain('full box')
    // A change from the popup is already stored; nothing to write back.
    expect(onModeChange).not.toHaveBeenCalled()
  })

  it('switching back to the box collapses an expanded chip', () => {
    const { el } = box('compact')
    chip(el).click()
    setFloatMode(el, 'card')
    expect(el.classList.contains(`${FLOAT_CLASS}--expanded`)).toBe(false)
    expect(chip(el).getAttribute('aria-expanded')).toBe('false')
  })
})
