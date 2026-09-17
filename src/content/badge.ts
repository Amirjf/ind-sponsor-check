import { createDismissMenu, type DismissChoice } from './dismiss-menu'
import { MODES_CLASS, createModeToggle, paintModeToggle } from './mode-toggle'
import type { CheckResponse } from '../shared/types'
import type { WebsiteBadgeMode } from '../shared/user-prefs'

export const BADGE_CLASS = 'indsc-badge'
export const FLOAT_CLASS = 'indsc-float'
export const MENU_CLASS = 'indsc-menu'

/** Cleanup for a badge that owns a menu (listeners, the menu node in <body>), so a re-render or removal can undo it. */
const teardowns = new WeakMap<HTMLElement, () => void>()

/** Removes the badge's dropdown menu and document listeners. Call before taking a badge out of the DOM. */
export function disposeBadge(badge: HTMLElement) {
  teardowns.get(badge)?.()
  teardowns.delete(badge)
}

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

/** Single character the compact chip shows per status, matching the badge's own prefix. */
const CHIP_GLYPHS: Record<string, string> = { checking: '…', sponsor: '✓', likely: '≈', none: '✕', error: '!' }

/**
 * Mirrors the badge's state onto the floating box it sits in, so the compact
 * chip (which is all you see until you point at it) carries the same glyph and
 * colour as the badge hidden behind it. A no-op for inline badges.
 */
function syncFloatStatus(badge: HTMLElement, status: string) {
  const box = badge.closest(`.${FLOAT_CLASS}`)
  if (!(box instanceof HTMLElement)) return
  box.dataset.status = status
  const chip = box.querySelector(`.${FLOAT_CLASS}__chip`)
  if (chip) chip.textContent = CHIP_GLYPHS[status] ?? '·'
}

export function renderResult(badge: HTMLAnchorElement, result: CheckResponse) {
  disposeBadge(badge)
  syncFloatStatus(badge, result.status)
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

/** Gap between the badge and the menu, and the minimum distance from the viewport edges. */
const MENU_GAP = 6
const MENU_MARGIN = 12

/**
 * Likely match: the badge becomes a toggle button with a scrollable list of
 * the similar register entries, so the user can see which ones might be the
 * company instead of guessing from a tooltip.
 *
 * The menu is appended to <body> with `position: fixed`, not nested in the
 * badge: job sites clip headers with `overflow: hidden` and stack later
 * content above them, and the badge's own hover filter would otherwise apply
 * to the menu too.
 */
function renderLikely(badge: HTMLAnchorElement, result: CheckResponse) {
  const count = result.matches.length
  badge.removeAttribute('href')
  badge.removeAttribute('title')
  badge.setAttribute('role', 'button')
  badge.setAttribute('aria-haspopup', 'true')
  badge.setAttribute('aria-expanded', 'false')
  badge.setAttribute('aria-label', `${count} similar sponsors found in the IND register. Show the list`)
  badge.setAttribute('tabindex', '0')

  const label = document.createElement('span')
  label.className = `${BADGE_CLASS}__label`
  label.textContent = `≈ Similar sponsors found (${count})`
  const arrow = document.createElement('span')
  arrow.className = `${BADGE_CLASS}__arrow`
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '▾'
  badge.replaceChildren(label, arrow)

  const menu = buildMenu(result)
  menu.hidden = true
  document.body.appendChild(menu)

  // In the floating box (bottom-right corner) the menu should open upward and hug the right edge.
  const inFloat = badge.closest(`.${FLOAT_CLASS}`) !== null

  const position = () => {
    const r = badge.getBoundingClientRect()
    const vw = document.documentElement.clientWidth || window.innerWidth
    const vh = document.documentElement.clientHeight || window.innerHeight
    const mw = menu.offsetWidth
    const mh = menu.offsetHeight
    const spaceBelow = vh - r.bottom - MENU_GAP - MENU_MARGIN
    const spaceAbove = r.top - MENU_GAP - MENU_MARGIN
    const up = inFloat || (mh > spaceBelow && spaceAbove > spaceBelow)
    menu.classList.toggle(`${MENU_CLASS}--up`, up)
    const left = inFloat ? r.right - mw : r.left
    menu.style.left = `${Math.round(Math.max(MENU_MARGIN, Math.min(left, vw - mw - MENU_MARGIN)))}px`
    if (up) {
      menu.style.top = 'auto'
      menu.style.bottom = `${Math.round(vh - r.top + MENU_GAP)}px`
    } else {
      menu.style.bottom = 'auto'
      menu.style.top = `${Math.round(r.bottom + MENU_GAP)}px`
    }
  }

  const isOpen = () => !menu.hidden
  const setOpen = (open: boolean) => {
    menu.hidden = !open
    badge.classList.toggle(`${BADGE_CLASS}--open`, open)
    badge.setAttribute('aria-expanded', String(open))
    if (open) position()
  }

  const onBadgeClick = (e: MouseEvent) => {
    e.preventDefault()
    setOpen(!isOpen())
  }
  const onBadgeKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(!isOpen())
    }
  }
  // The badge stops click propagation (see createBadge), so only clicks elsewhere reach the document.
  const onDocClick = (e: MouseEvent) => {
    if (!isOpen()) return
    if (menu.contains(e.target as Node)) {
      // Following the register link is the end of the interaction.
      if ((e.target as Element).closest?.(`.${MENU_CLASS}__footer`)) setOpen(false)
      return
    }
    setOpen(false)
  }
  const onDocKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false)
      badge.focus()
    }
  }
  const onViewportChange = () => {
    if (isOpen()) position()
  }
  badge.addEventListener('click', onBadgeClick)
  badge.addEventListener('keydown', onBadgeKey)
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
  window.addEventListener('scroll', onViewportChange, { capture: true, passive: true })
  window.addEventListener('resize', onViewportChange, { passive: true })
  teardowns.set(badge, () => {
    badge.removeEventListener('click', onBadgeClick)
    badge.removeEventListener('keydown', onBadgeKey)
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('keydown', onDocKey)
    window.removeEventListener('scroll', onViewportChange, { capture: true })
    window.removeEventListener('resize', onViewportChange)
    badge.classList.remove(`${BADGE_CLASS}--open`)
    menu.remove()
  })
}

function buildMenu(result: CheckResponse): HTMLElement {
  const menu = document.createElement('div')
  menu.className = MENU_CLASS
  menu.setAttribute('role', 'dialog')
  menu.setAttribute('aria-label', 'Similar sponsors in the IND register')

  const heading = document.createElement('div')
  heading.className = `${MENU_CLASS}__heading`
  const title = document.createElement('div')
  title.className = `${MENU_CLASS}__title`
  title.textContent = `${result.matches.length} similar ${result.matches.length === 1 ? 'name' : 'names'} for “${result.query}”`
  const sub = document.createElement('div')
  sub.className = `${MENU_CLASS}__sub`
  sub.textContent = 'IND public register of recognised sponsors'
  heading.append(title, sub)

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
  footer.textContent = 'Open the IND register ↗'

  menu.append(heading, list, footer)
  return menu
}

export function renderError(badge: HTMLAnchorElement, message: string) {
  disposeBadge(badge)
  syncFloatStatus(badge, 'error')
  badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--error`
  badge.textContent = '! IND check unavailable'
  badge.title = message
  badge.removeAttribute('href')
}

export interface FloatingContainerOptions {
  /** Company name from the page's structured data. */
  name: string
  /** Registrable host, for the wording of the hide menu. */
  host: string
  badge: HTMLElement
  /** Layout to open in. */
  mode: WebsiteBadgeMode
  onDismiss: (choice: DismissChoice) => void
  /** The user picked the other layout from the toggle; persist it. */
  onModeChange: (mode: WebsiteBadgeMode) => void
}

/**
 * Fixed-position box for pages without a company-name element (company
 * websites): the name found in the page's structured data, the badge, a toggle
 * between the two layouts, and a close button that asks how long "hidden"
 * should last.
 *
 * Both layouts are the same DOM — `compact` only adds a class, so switching is
 * instant and nothing has to be looked up or rendered again. The chip is always
 * present and hidden by CSS in `card` mode, which keeps the status in one place.
 */
export function createFloatingContainer({
  name,
  host,
  badge,
  mode,
  onDismiss,
  onModeChange,
}: FloatingContainerOptions): HTMLElement {
  const box = document.createElement('div')
  box.className = FLOAT_CLASS
  box.setAttribute('role', 'status')
  box.dataset.status = 'checking'

  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = `${FLOAT_CLASS}__chip`
  chip.textContent = CHIP_GLYPHS.checking
  chip.setAttribute('aria-expanded', 'false')
  chip.setAttribute('aria-label', `IND sponsor check for ${name}. Show the details`)
  chip.addEventListener('click', (e) => {
    e.stopPropagation()
    setExpanded(box, !box.classList.contains(`${FLOAT_CLASS}--expanded`))
  })

  // `display: contents` in card mode, so the box keeps its flat flex row; in
  // compact mode this is the part that slides out from under the chip.
  const body = document.createElement('div')
  body.className = `${FLOAT_CLASS}__body`

  const label = document.createElement('span')
  label.className = `${FLOAT_CLASS}__name`
  label.textContent = name
  label.title = `Company name from this page's structured data (schema.org): ${name}`

  const modes = document.createElement('div')
  modes.className = MODES_CLASS
  modes.appendChild(
    createModeToggle(mode, (next) => {
      setFloatMode(box, next)
      onModeChange(next)
    }),
  )

  const dismiss = createDismissMenu(host, (choice) => {
    onDismiss(choice)
    dismiss.dispose()
    disposeBadge(badge)
    box.remove()
  })

  // Pointing away closes a chip that was opened by click, so it cannot be left
  // sitting open over the page.
  box.addEventListener('mouseleave', () => setExpanded(box, false))

  body.append(label, badge, modes, dismiss.element)
  // Chip last: the box is anchored to the bottom-right corner, so keeping the
  // chip on that edge means it stays put and the panel slides out beside it.
  box.append(body, chip)
  setFloatMode(box, mode)
  return box
}

function setExpanded(box: HTMLElement, expanded: boolean) {
  box.classList.toggle(`${FLOAT_CLASS}--expanded`, expanded)
  box.querySelector(`.${FLOAT_CLASS}__chip`)?.setAttribute('aria-expanded', String(expanded))
}

/**
 * Switches an existing floating box between the two layouts. Called by the
 * toggle, and by the content script when the pref changes in another tab.
 */
export function setFloatMode(box: HTMLElement, mode: WebsiteBadgeMode) {
  box.classList.toggle(`${FLOAT_CLASS}--compact`, mode === 'compact')
  if (mode !== 'compact') setExpanded(box, false)
  const button = box.querySelector<HTMLButtonElement>(`.${MODES_CLASS}__button`)
  if (button) paintModeToggle(button, mode)
}
