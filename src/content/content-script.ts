import './badge.css'
import type { CheckResponse, Message } from '../shared/types'
import { BADGE_CLASS, createBadge, renderError, renderResult } from './badge'
import { getAdapter, type CompanyTarget } from './sites'

const DEBOUNCE_MS = 250
const site = getAdapter(location.hostname)

function sendMessage<T>(message: Message): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        const err = chrome.runtime.lastError
        if (err) reject(new Error(err.message))
        else resolve(response)
      })
    } catch (err) {
      reject(err)
    }
  })
}

function removeStaleBadges(keep?: Element | null) {
  for (const badge of document.querySelectorAll(`.${BADGE_CLASS}`)) {
    if (badge !== keep) badge.remove()
  }
}

/** The badge already attached to this target, if any. */
function attachedBadge({ element, placement }: CompanyTarget): HTMLElement | null {
  const candidate = placement === 'inside' ? element.querySelector(`:scope > .${BADGE_CLASS}`) : element.nextElementSibling
  return candidate instanceof HTMLElement && candidate.classList.contains(BADGE_CLASS) ? candidate : null
}

function attachBadge({ element, placement }: CompanyTarget, badge: HTMLElement) {
  if (placement === 'inside') element.appendChild(badge)
  else element.insertAdjacentElement('afterend', badge)
}

async function scan() {
  const kind = site?.getPageKind(location.href) ?? null
  if (!site || !kind) {
    removeStaleBadges()
    return
  }
  const target = site.findCompanyTarget(document, kind)
  if (!target) return

  const existing = attachedBadge(target)
  if (existing && existing.dataset.company === target.name) {
    removeStaleBadges(existing)
    return
  }

  removeStaleBadges()
  const badge = createBadge(target.name)
  attachBadge(target, badge)

  try {
    const result = await sendMessage<CheckResponse>({ type: 'CHECK_COMPANY', name: target.name })
    renderResult(badge, result)
  } catch (err) {
    renderError(badge, err instanceof Error ? err.message : String(err))
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
function scheduleScan() {
  clearTimeout(timer)
  timer = setTimeout(() => void scan(), DEBOUNCE_MS)
}

if (site) {
  const observer = new MutationObserver((mutations) => {
    // Ignore mutations caused by our own badges to avoid feedback loops.
    if (mutations.every((m) => m.target instanceof Element && m.target.closest(`.${BADGE_CLASS}`))) return
    scheduleScan()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })

  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      scheduleScan()
    }
  }, 500)

  scheduleScan()
}
