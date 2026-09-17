// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DISMISS_CLASS, createDismissMenu, type DismissChoice } from '../src/content/dismiss-menu'

function mount(host = 'acme.com') {
  const onChoose = vi.fn<(choice: DismissChoice) => void>()
  const { element, dispose } = createDismissMenu(host, onChoose)
  document.body.appendChild(element)
  const button = element.querySelector<HTMLButtonElement>(`.${DISMISS_CLASS}__button`)!
  const menu = element.querySelector<HTMLElement>(`.${DISMISS_CLASS}__menu`)!
  const items = () => menu.querySelectorAll<HTMLButtonElement>(`.${DISMISS_CLASS}__item`)
  return { element, dispose, onChoose, button, menu, items }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('createDismissMenu', () => {
  it('starts as a closed menu button', () => {
    const { button, menu } = mount()
    expect(button.getAttribute('aria-haspopup')).toBe('true')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(menu.hidden).toBe(true)
  })

  it('opens on click with the three choices, naming the site', () => {
    const { button, menu, items } = mount('acme.com')
    button.click()
    expect(menu.hidden).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(items()).toHaveLength(3)
    expect(items()[0].textContent).toBe('Hide for now')
    expect(items()[1].textContent).toBe("Don't show again on acme.com")
    expect(items()[2].textContent).toBe("Don't show on any website again")
  })

  it('says that the job-site badges keep working', () => {
    const { button, menu } = mount()
    button.click()
    expect(menu.textContent).toContain('LinkedIn and Indeed')
  })

  it.each([
    [0, 'now'],
    [1, 'site'],
    [2, 'websites'],
  ] as const)('item %i reports the choice %s', (index, choice) => {
    const { button, items, onChoose } = mount()
    button.click()
    items()[index].click()
    expect(onChoose).toHaveBeenCalledWith(choice)
  })

  it('closes on a second click, on Escape, and on an outside click', () => {
    const { button, menu } = mount()
    button.click()
    button.click()
    expect(menu.hidden).toBe(true)

    button.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(menu.hidden).toBe(true)

    button.click()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(menu.hidden).toBe(true)
  })

  it('does not close when a click lands inside the open menu', () => {
    const { button, menu } = mount()
    button.click()
    menu.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(menu.hidden).toBe(false)
  })

  it('keeps clicks off the host page underneath', () => {
    const onHostClick = vi.fn()
    document.body.addEventListener('click', onHostClick)
    const { button, items } = mount()
    button.click()
    items()[0].click()
    expect(onHostClick).not.toHaveBeenCalled()
    document.body.removeEventListener('click', onHostClick)
  })

  it('dispose drops the document listeners', () => {
    const { button, menu, dispose } = mount()
    button.click()
    dispose()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    // No listener left to react; the element is the caller's to remove.
    expect(menu.hidden).toBe(false)
  })
})

/**
 * The menu used to be an absolutely positioned child of the floating box. In
 * the compact layout that box clips its sliding panel with `overflow: hidden`,
 * which swallowed the menu whole. It is now placed against the viewport, so no
 * ancestor's overflow can reach it.
 */
describe('placement', () => {
  const SIZE = { width: 280, height: 160 }

  function sized(rect: { top: number; bottom: number; left: number; right: number }) {
    const m = mount()
    m.button.getBoundingClientRect = () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect
    Object.defineProperty(m.menu, 'offsetWidth', { value: SIZE.width, configurable: true })
    Object.defineProperty(m.menu, 'offsetHeight', { value: SIZE.height, configurable: true })
    return m
  }
  // jsdom's viewport: 1024 x 768.
  const bottomRight = { top: 700, bottom: 722, left: 980, right: 1002 }

  it('opens above the button, right edges aligned', () => {
    const { button, menu } = sized(bottomRight)
    button.click()
    // 768 - 700 + 8 gap
    expect(menu.style.bottom).toBe('76px')
    expect(menu.style.top).toBe('auto')
    // 1002 - 280
    expect(menu.style.left).toBe('722px')
  })

  it('opens below when the button sits too high for the menu to fit above', () => {
    const { button, menu } = sized({ top: 40, bottom: 62, left: 980, right: 1002 })
    button.click()
    expect(menu.style.top).toBe('70px')
    expect(menu.style.bottom).toBe('auto')
  })

  it('stays inside the viewport when the button is near an edge', () => {
    const { button, menu } = sized({ top: 700, bottom: 722, left: 18, right: 40 })
    button.click()
    expect(menu.style.left).toBe('12px')
  })

  it('follows the button when the viewport changes while open', () => {
    const { button, menu } = sized(bottomRight)
    button.click()
    button.getBoundingClientRect = () => ({ top: 300, bottom: 322, left: 500, right: 522, width: 22, height: 22, x: 500, y: 300, toJSON: () => ({}) }) as DOMRect
    window.dispatchEvent(new Event('resize'))
    expect(menu.style.bottom).toBe('476px')
    expect(menu.style.left).toBe('242px')
  })

  it('does not chase the viewport while closed', () => {
    const { button, menu } = sized(bottomRight)
    button.click()
    button.click()
    const before = menu.style.cssText
    window.dispatchEvent(new Event('resize'))
    expect(menu.style.cssText).toBe(before)
  })

  it('dispose drops the viewport listeners', () => {
    const { button, menu, dispose } = sized(bottomRight)
    button.click()
    dispose()
    const before = menu.style.cssText
    button.getBoundingClientRect = () => ({ top: 300, bottom: 322, left: 500, right: 522, width: 22, height: 22, x: 500, y: 300, toJSON: () => ({}) }) as DOMRect
    window.dispatchEvent(new Event('resize'))
    expect(menu.style.cssText).toBe(before)
  })
})
