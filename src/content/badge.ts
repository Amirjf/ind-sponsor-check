import type { CheckResponse } from '../shared/types'

export const BADGE_CLASS = 'indsc-badge'

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
