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
