export const DISMISS_CLASS = 'indsc-dismiss'

/** What the user picked: this page load only, this site forever, or every company website. */
export type DismissChoice = 'now' | 'site' | 'websites'

interface DismissMenu {
  /** The button and its dropdown. The caller places and removes it. */
  element: HTMLElement
  /** Drops the document-level listeners. Call before taking the element out of the DOM. */
  dispose: () => void
}

/**
 * The floating box's close control: a × that opens a three-item menu instead of
 * dismissing straight away, so "stop showing this" can mean this page, this
 * site, or all company websites.
 *
 * The menu is nested in the wrapper rather than in <body> (unlike the
 * similar-sponsors menu): the floating box is our own element, fixed at the
 * top of the stacking order, so nothing on the host page can clip it.
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

  const isOpen = () => !menu.hidden
  const setOpen = (open: boolean) => {
    menu.hidden = !open
    button.setAttribute('aria-expanded', String(open))
    element.classList.toggle(`${DISMISS_CLASS}--open`, open)
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
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKey)

  element.append(button, menu)
  return {
    element,
    dispose: () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onDocKey)
    },
  }
}
