import './badge.css'
import type { CheckResponse, Message } from '../shared/types'
import { BADGE_CLASS, createBadge, renderError, renderResult } from './badge'
import { cleanText, findCompanyElement, isJobPage } from './linkedin'

const DEBOUNCE_MS = 250

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

function removeStaleBadges(keep?: Element) {
  for (const badge of document.querySelectorAll(`.${BADGE_CLASS}`)) {
    if (badge !== keep) badge.remove()
  }
}

async function scan() {
  if (!isJobPage()) {
    removeStaleBadges()
    return
  }
  const companyEl = findCompanyElement()
  if (!companyEl) return
  const name = cleanText(companyEl.textContent)
  if (!name) return

  const existing = companyEl.nextElementSibling
  if (existing instanceof HTMLElement && existing.classList.contains(BADGE_CLASS) && existing.dataset.company === name) {
    removeStaleBadges(existing)
    return
  }

  removeStaleBadges()
  const badge = createBadge(name)
  companyEl.insertAdjacentElement('afterend', badge)

  try {
    const result = await sendMessage<CheckResponse>({ type: 'CHECK_COMPANY', name })
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
