export const DISMISS_CLASS = 'indsc-dismiss'

/** What the user picked: this page load only, this site forever, or every company website. */
export type DismissChoice = 'now' | 'site' | 'websites'

interface DismissMenu {
  /** The button and its dropdown. The caller places and removes it. */
  element: HTMLElement
  /** Drops the document-level listeners. Call before taking the element out of the DOM. */
  dispose: () => void
}

/** Gap between the button and its menu, and the minimum distance from the viewport edges. */
const MENU_GAP = 8
const MENU_MARGIN = 12

/**
 * The floating box's close control: a × that opens a three-item menu instead of
 * dismissing straight away, so "stop showing this" can mean this page, this
 * site, or all company websites.
 *
 * The menu stays inside the wrapper — keeping it a descendant is what lets the
 * compact box treat a pointer on the menu as a pointer on the box, so it does
 * not collapse under its own dropdown — but it is `position: fixed` and placed
 * from the button's rect. The compact layout clips its sliding panel with
 * `overflow: hidden`, and an absolutely positioned menu was clipped away with
 * it; a fixed one is laid out against the viewport, which no ancestor's
 * overflow can reach.
 */
export function createDismissMenu(host: string, onChoose: (choice: DismissChoice) => void): DismissMenu {
  const element = document.createElement('div')
  element.className = DISMISS_CLASS

  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${DISMISS_CLASS}__button`
  button.textContent = '×'
  button.title = 'Hide this badge'
  button.setAttribute('aria-label', 'Hide IND sponsor check')
  button.setAttribute('aria-haspopup', 'true')
  button.setAttribute('aria-expanded', 'false')

  const menu = document.createElement('div')
  menu.className = `${DISMISS_CLASS}__menu`
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', 'Hide this badge')
  menu.hidden = true

  const choices: [DismissChoice, string, string][] = [
    ['now', 'Hide for now', 'Comes back the next time you open a page'],
    ['site', `Don't show again on ${host}`, `The badge stays off on ${host} and its subdomains`],
    ['websites', "Don't show on any website again", 'Turns the company-website badge off everywhere'],
  ]
  for (const [choice, label, hint] of choices) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = `${DISMISS_CLASS}__item`
    item.setAttribute('role', 'menuitem')
    item.textContent = label
    item.title = hint
    item.addEventListener('click', () => onChoose(choice))
    menu.appendChild(item)
  }

  const note = document.createElement('p')
  note.className = `${DISMISS_CLASS}__note`
  note.textContent = 'Job badges on LinkedIn and Indeed keep working. Undo from the extension popup.'
  menu.appendChild(note)

  /** Above the button and right-aligned with it — the box lives in the bottom-right corner — unless the space is not there. */
  const position = () => {
    const r = button.getBoundingClientRect()
    const vw = document.documentElement.clientWidth || window.innerWidth
    const vh = document.documentElement.clientHeight || window.innerHeight
    const mw = menu.offsetWidth
    const mh = menu.offsetHeight
    const spaceAbove = r.top - MENU_GAP - MENU_MARGIN
    const spaceBelow = vh - r.bottom - MENU_GAP - MENU_MARGIN
    const up = mh <= spaceAbove || spaceAbove > spaceBelow
    menu.style.left = `${Math.round(Math.max(MENU_MARGIN, Math.min(r.right - mw, vw - mw - MENU_MARGIN)))}px`
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
    button.setAttribute('aria-expanded', String(open))
    element.classList.toggle(`${DISMISS_CLASS}--open`, open)
    // Measuring only works once it is out of `hidden`, so place it after.
    if (open) position()
  }

  button.addEventListener('click', () => setOpen(!isOpen()))
  // Host pages often treat a click anywhere as "open this card"; our own
  // document listener still sees it, because it runs on the capture-free
  // document node after this handler.
  element.addEventListener('click', (e) => e.stopPropagation())

  const onDocClick = (e: MouseEvent) => {
    if (isOpen() && !element.contains(e.target as Node)) setOpen(false)
  }
  const onDocKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false)
      button.focus()
    }
  }
  const onViewportChange = () => {
    if (isOpen()) position()
  }
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)
  window.addEventListener('scroll', onViewportChange, { capture: true, passive: true })
  window.addEventListener('resize', onViewportChange, { passive: true })

  element.append(button, menu)
  return {
    element,
    dispose: () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onDocKey)
      window.removeEventListener('scroll', onViewportChange, { capture: true })
      window.removeEventListener('resize', onViewportChange)
    },
  }
}
