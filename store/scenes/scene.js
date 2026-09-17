// Helpers shared by the screenshot scenes: they render the extension's real
// badge code (src/content/badge.ts + badge.css) into a mock page.
import '/src/content/badge.css'
import { createBadge, createFloatingContainer, renderResult } from '/src/content/badge.ts'

export const REGISTER_URL = 'https://ind.nl/en/public-register-recognised-sponsors/public-register-work'

/** A CheckResponse as the service worker would answer it. */
export function check(status, query, matches = []) {
  return { status, query, core: query.toLowerCase(), matches, registerUrl: REGISTER_URL }
}

/** Appends a badge to `target` (the element holding the company name) and renders `result` into it. */
export function inlineBadge(target, result) {
  const badge = createBadge(result.query)
  target.appendChild(badge)
  renderResult(badge, result)
  return badge
}

/** The floating box a company website gets, appended to <body>. */
export function floatingBadge(name, host, result, mode = 'card') {
  const badge = createBadge(name)
  const box = createFloatingContainer({ name, host, badge, mode, onDismiss() {}, onModeChange() {} })
  document.body.appendChild(box)
  renderResult(badge, result)
  return box
}

/** Resolves once `selector` exists in the document. */
export function waitFor(selector) {
  return new Promise((resolve) => {
    const tick = () => {
      const el = document.querySelector(selector)
      el ? resolve(el) : requestAnimationFrame(tick)
    }
    tick()
  })
}
