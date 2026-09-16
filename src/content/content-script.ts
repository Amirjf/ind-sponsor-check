import './badge.css'
import type { CheckResponse, Message } from '../shared/types'
import { BADGE_CLASS, FLOAT_CLASS, createBadge, createFloatingContainer, disposeBadge, renderError, renderResult } from './badge'
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

/** Company name whose floating badge the user closed on this page load. */
let dismissedName: string | null = null

function removeStaleBadges(keep?: Element | null) {
  for (const badge of document.querySelectorAll<HTMLElement>(`.${BADGE_CLASS}`)) {
    if (badge === keep) continue
    disposeBadge(badge)
    badge.remove()
  }
  for (const box of document.querySelectorAll(`.${FLOAT_CLASS}`)) {
    if (!keep || !box.contains(keep)) box.remove()
  }
}

/** The badge already attached to this target, if any. */
function attachedBadge({ element, placement }: CompanyTarget): HTMLElement | null {
  const candidate =
    placement === 'floating'
      ? document.querySelector(`.${FLOAT_CLASS} .${BADGE_CLASS}`)
      : placement === 'inside'
        ? element.querySelector(`:scope > .${BADGE_CLASS}`)
        : element.nextElementSibling
  return candidate instanceof HTMLElement && candidate.classList.contains(BADGE_CLASS) ? candidate : null
}

function attachBadge({ element, name, placement }: CompanyTarget, badge: HTMLElement) {
  if (placement === 'floating') {
    element.appendChild(createFloatingContainer(name, badge, () => (dismissedName = name)))
  } else if (placement === 'inside') {
    element.appendChild(badge)
  } else {
    element.insertAdjacentElement('afterend', badge)
  }
}

/** Looks up each candidate name in turn; a definite hit wins, then a likely one, else the first answer. */
async function lookup(names: readonly string[]): Promise<CheckResponse> {
  let best: CheckResponse | null = null
  for (const name of names) {
    const result = await sendMessage<CheckResponse>({ type: 'CHECK_COMPANY', name })
    if (result.status === 'sponsor') return result
    if (!best || (result.status === 'likely' && best.status === 'none')) best = result
  }
  return best!
}

async function scan() {
  const kind = site?.getPageKind(location.href) ?? null
  if (!site || !kind) {
    removeStaleBadges()
    return
  }
  const target = site.findCompanyTarget(document, kind)
  if (!target) return
  if (target.placement === 'floating' && target.name === dismissedName) return

  const existing = attachedBadge(target)
  if (existing && existing.dataset.company === target.name) {
    removeStaleBadges(existing)
    return
  }

  removeStaleBadges()
  const badge = createBadge(target.name)
  attachBadge(target, badge)

  try {
    const result = await lookup(target.candidates?.length ? target.candidates : [target.name])
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
