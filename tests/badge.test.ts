// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { MENU_CLASS, createBadge, createFloatingContainer, renderResult } from '../src/content/badge'
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

const menu = (badge: HTMLElement) => badge.querySelector<HTMLElement>(`.${MENU_CLASS}`)

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

  it('clicks inside the open menu do not close it', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    badge.click()
    menu(badge)!.querySelector('li')!.click()
    expect(badge.getAttribute('aria-expanded')).toBe('true')
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
    expect(menu(badge)!.classList.contains(`${MENU_CLASS}--up`)).toBe(true)
  })

  it('re-rendering replaces the previous menu', () => {
    const badge = mount()
    renderResult(badge, result('likely'))
    renderResult(badge, result('likely', sponsors.slice(0, 1)))
    expect(badge.querySelectorAll(`.${MENU_CLASS}`)).toHaveLength(1)
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
