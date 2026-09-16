import type { CheckResponse } from '../shared/types'

export const BADGE_CLASS = 'indsc-badge'
export const FLOAT_CLASS = 'indsc-float'

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
  badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--${result.status}`
  badge.href = result.registerUrl
  const names = result.matches.map((m) => `${m.name} (KVK ${m.kvk})`).join('\n')

  switch (result.status) {
    case 'sponsor':
      badge.textContent = '✓ IND recognised sponsor'
      badge.title = `Listed in the IND public register:\n${names}`
      break
    case 'likely': {
      const extra = result.matches.length > 1 ? ` +${result.matches.length - 1}` : ''
      badge.textContent = `≈ Likely IND sponsor: ${result.matches[0].name}${extra}`
      badge.title = `Similar names in the IND register:\n${names}\n\nCheck the register to be sure.`
      break
    }
    case 'none':
      badge.textContent = '✕ Not in IND sponsor register'
      badge.title = `No entry matching "${result.query}" in the IND public register. The company may be listed under a different legal name; click to search the register yourself.`
      break
  }
}

export function renderError(badge: HTMLAnchorElement, message: string) {
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
