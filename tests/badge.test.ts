// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { MENU_CLASS, createBadge, createFloatingContainer, disposeBadge, renderResult } from '../src/content/badge'
import type { CheckResponse } from '../src/shared/types'

const registerUrl = 'https://ind.nl/register'
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
    const box = createFloatingContainer('Philips', badge, () => {})
    document.body.appendChild(box)
    renderResult(badge, result('likely'))
    badge.click()
    expect(menu(badge)).not.toBeNull()
    box.querySelector('button')!.click()
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
    document.body.appendChild(createFloatingContainer('Philips', badge, () => {}))
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
