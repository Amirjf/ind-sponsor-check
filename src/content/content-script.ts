import './badge.css'
import type { CheckResponse, HostPolicyResponse, Message } from '../shared/types'
import {
  BADGE_CLASS,
  FLOAT_CLASS,
  createBadge,
  createFloatingContainer,
  disposeBadge,
  renderError,
  renderResult,
  setFloatMode,
} from './badge'
import type { DismissChoice } from './dismiss-menu'
import { normalizeHost } from '../shared/ignored-hosts'
import { STORAGE_KEYS } from '../shared/config'
import { normalizePrefs, type WebsiteBadgeMode } from '../shared/user-prefs'
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

/** Set when the user hid the badge for good: nothing more is rendered until the next page load. */
let stopped = false

/** Layout for the company-website badge. Read once at boot, then kept in step with storage. */
let badgeMode: WebsiteBadgeMode = 'card'

/** The user flipped the layout from the badge's own toggle. The box has already switched itself. */
function onModeChange(mode: WebsiteBadgeMode) {
  badgeMode = mode
  void sendMessage({ type: 'SET_PREFS', prefs: { websiteBadgeMode: mode } }).catch(() => {
    // The service worker was gone; the layout still holds for this page.
  })
}

/** Follows the pref when it changes elsewhere (the popup, or another tab's toggle). */
function watchModePref() {
  chrome.storage.onChanged.addListener((changes, area) => {
    const change = area === 'local' ? changes[STORAGE_KEYS.prefs] : undefined
    if (!change) return
    const mode = normalizePrefs(change.newValue).websiteBadgeMode
    if (mode === badgeMode) return
    badgeMode = mode
    const box = document.querySelector<HTMLElement>(`.${FLOAT_CLASS}`)
    if (box) setFloatMode(box, mode)
  })
}

/**
 * The user picked one of the hide options. "Hide for now" lasts until the name
 * changes; the other two are persisted by the service worker, which will keep
 * the badge away on the next load, so here they only have to stop this page.
 */
function onDismiss(choice: DismissChoice, name: string) {
  dismissedName = name
  if (choice === 'now') return
  stopped = true
  const message: Message =
    choice === 'site' ? { type: 'MUTE_HOST', host: location.hostname } : { type: 'SET_PREFS', prefs: { websiteBadge: false } }
  void sendMessage(message).catch(() => {
    // The service worker was gone; the badge still stays hidden for this page.
  })
}

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
    const host = normalizeHost(location.hostname) || location.hostname
    element.appendChild(
      createFloatingContainer({
        name,
        host,
        badge,
        mode: badgeMode,
        onDismiss: (choice) => onDismiss(choice, name),
        onModeChange,
      }),
    )
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
  if (stopped) return
  const kind = site?.getPageKind(location.href, document) ?? null
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

function start() {
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

/** Site adapters always run. The generic website check first asks whether this host is on the ignore list. */
async function boot() {
  if (!site) return
  if (site.id === 'website') {
    try {
      const { ignored, mode } = await sendMessage<HostPolicyResponse>({ type: 'IS_HOST_IGNORED', host: location.hostname })
      if (ignored) return
      badgeMode = mode
      watchModePref()
    } catch {
      return // service worker unavailable: stay quiet on unknown sites
    }
  }
  start()
}

void boot()
