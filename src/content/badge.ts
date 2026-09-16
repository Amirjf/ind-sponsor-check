import type { CheckResponse } from '../shared/types'

export const BADGE_CLASS = 'indsc-badge'
export const FLOAT_CLASS = 'indsc-float'
export const MENU_CLASS = 'indsc-menu'

/** Document-level listeners installed for an open-able badge, so a re-render can remove them. */
const teardowns = new WeakMap<HTMLElement, () => void>()

export function createBadge(name: string): HTMLAnchorElement {
  const badge = document.createElement('a')
  badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--checking`
  badge.dataset.company = name
  badge.textContent = '… checking IND register'
  badge.target = '_blank'
  badge.rel = 'noopener noreferrer'
  badge.addEventListener('click', (e) => e.stopPropagation())
  return badge
}

export function renderResult(badge: HTMLAnchorElement, result: CheckResponse) {
  teardowns.get(badge)?.()
  teardowns.delete(badge)
  badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--${result.status}`
  badge.href = result.registerUrl
  badge.removeAttribute('role')
  badge.removeAttribute('aria-expanded')
  badge.removeAttribute('aria-haspopup')
  badge.removeAttribute('tabindex')
  const names = result.matches.map((m) => `${m.name} (KVK ${m.kvk})`).join('\n')

  switch (result.status) {
    case 'sponsor':
      badge.textContent = '✓ IND recognised sponsor'
      badge.title = `Listed in the IND public register:\n${names}`
      break
    case 'likely':
      renderLikely(badge, result)
      break
    case 'none':
      badge.textContent = '✕ Not in IND sponsor register'
      badge.title = `No entry matching "${result.query}" in the IND public register. The company may be listed under a different legal name; click to search the register yourself.`
      break
  }
}

/**
 * Likely match: the badge becomes a toggle button with a scrollable list of
 * the similar register entries, so the user can see which ones might be the
 * company instead of guessing from a tooltip.
 */
function renderLikely(badge: HTMLAnchorElement, result: CheckResponse) {
  const count = result.matches.length
  badge.removeAttribute('href')
  badge.title = 'Click to see the similar names in the IND register'
  badge.setAttribute('role', 'button')
  badge.setAttribute('aria-haspopup', 'true')
  badge.setAttribute('aria-expanded', 'false')
  badge.setAttribute('tabindex', '0')

  const label = document.createElement('span')
  label.className = `${BADGE_CLASS}__label`
  label.textContent = `≈ Similar sponsors found (${count}) ▾`

  const menu = document.createElement('div')
  menu.className = MENU_CLASS
  // Inside the floating box (bottom-right corner) the menu must open upward and hug the right edge.
  if (badge.closest(`.${FLOAT_CLASS}`)) menu.classList.add(`${MENU_CLASS}--up`)
  menu.hidden = true

  const heading = document.createElement('div')
  heading.className = `${MENU_CLASS}__heading`
  heading.textContent = `Similar names in the IND register for “${result.query}”`

  const list = document.createElement('ul')
  list.className = `${MENU_CLASS}__list`
  for (const m of result.matches) {
    const li = document.createElement('li')
    li.className = `${MENU_CLASS}__item`
    const name = document.createElement('span')
    name.className = `${MENU_CLASS}__name`
    name.textContent = m.name
    const kvk = document.createElement('span')
    kvk.className = `${MENU_CLASS}__kvk`
    kvk.textContent = `KVK ${m.kvk}`
    li.append(name, kvk)
    list.appendChild(li)
  }

  const footer = document.createElement('a')
  footer.className = `${MENU_CLASS}__footer`
  footer.href = result.registerUrl
  footer.target = '_blank'
  footer.rel = 'noopener noreferrer'
  footer.textContent = 'Check the IND register ↗'

  menu.append(heading, list, footer)
  badge.replaceChildren(label, menu)

  const setOpen = (open: boolean) => {
    menu.hidden = !open
    badge.setAttribute('aria-expanded', String(open))
  }
  const isOpen = () => !menu.hidden

  const onBadgeClick = (e: MouseEvent) => {
    // Clicks inside the list (selecting text, following the footer link) must not toggle it.
    if (menu.contains(e.target as Node)) return
    e.preventDefault()
    setOpen(!isOpen())
  }
  const onBadgeKey = (e: KeyboardEvent) => {
    if (menu.contains(e.target as Node)) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(!isOpen())
    }
  }
  // The badge stops click propagation (see createBadge), so a click reaching the document is outside it.
  const onDocClick = () => {
    if (isOpen()) setOpen(false)
  }
  const onDocKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false)
  }
  badge.addEventListener('click', onBadgeClick)
  badge.addEventListener('keydown', onBadgeKey)
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
  teardowns.set(badge, () => {
    badge.removeEventListener('click', onBadgeClick)
    badge.removeEventListener('keydown', onBadgeKey)
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('keydown', onDocKey)
  })
}

export function renderError(badge: HTMLAnchorElement, message: string) {
  teardowns.get(badge)?.()
  teardowns.delete(badge)
  badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--error`
  badge.textContent = '! IND check unavailable'
  badge.title = message
  badge.removeAttribute('href')
}

/**
 * Fixed-position box for pages without a company-name element (company
 * websites): shows the name found in the page's structured data, the badge,
 * and a close button.
 */
export function createFloatingContainer(name: string, badge: HTMLElement, onClose: () => void): HTMLElement {
  const box = document.createElement('div')
  box.className = FLOAT_CLASS
  box.setAttribute('role', 'status')

  const label = document.createElement('span')
  label.className = `${FLOAT_CLASS}__name`
  label.textContent = name
  label.title = `Company name from this page's structured data (schema.org): ${name}`

  const close = document.createElement('button')
  close.type = 'button'
  close.className = `${FLOAT_CLASS}__close`
  close.textContent = '×'
  close.title = 'Hide'
  close.setAttribute('aria-label', 'Hide IND sponsor check')
  close.addEventListener('click', (e) => {
    e.stopPropagation()
    onClose()
    box.remove()
  })

  box.append(label, badge, close)
  return box
}
