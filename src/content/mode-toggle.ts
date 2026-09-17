import type { WebsiteBadgeMode } from '../shared/user-prefs'

export const MODES_CLASS = 'indsc-modes'

/** With two layouts the toggle is a straight swap: the icon shows where you land. */
const NEXT: Record<WebsiteBadgeMode, WebsiteBadgeMode> = { card: 'compact', compact: 'card' }

/** Keyed by the mode the click would switch *to*. */
const LABELS: Record<WebsiteBadgeMode, string> = {
  card: 'Switch to the full box: company name and result always visible',
  compact: 'Switch to a corner chip: just the result, opens when you point at it',
}

const SVG_NS = 'http://www.w3.org/2000/svg'

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  return el
}

/**
 * A miniature of the layout the click leads to: the page outline with either a
 * wide bar (the box) or a dot (the chip) in its bottom-right corner — the same
 * corner the real thing occupies.
 */
function preview(target: WebsiteBadgeMode): SVGSVGElement {
  const root = svg('svg', { viewBox: '0 0 16 16', width: '15', height: '15', fill: 'none' })
  root.setAttribute('aria-hidden', 'true')
  root.append(
    svg('rect', {
      x: '1.4',
      y: '2.4',
      width: '13.2',
      height: '11.2',
      rx: '2',
      stroke: 'currentColor',
      'stroke-width': '1.2',
      opacity: '0.45',
    }),
    target === 'card'
      ? svg('rect', { x: '5.6', y: '8.6', width: '7.6', height: '3.6', rx: '1.8', fill: 'currentColor' })
      : svg('circle', { cx: '11.4', cy: '10.4', r: '2.1', fill: 'currentColor' }),
  )
  return root
}

/**
 * Points the button at the layout that is *not* `current`. Also used when the
 * mode changes from somewhere else (the popup, another tab), so the button
 * never advertises the layout you are already looking at.
 */
export function paintModeToggle(button: HTMLButtonElement, current: WebsiteBadgeMode) {
  const target = NEXT[current]
  button.dataset.mode = current
  button.title = LABELS[target]
  button.setAttribute('aria-label', LABELS[target])
  button.replaceChildren(preview(target))
}

export function createModeToggle(
  current: WebsiteBadgeMode,
  onChange: (mode: WebsiteBadgeMode) => void,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${MODES_CLASS}__button`
  paintModeToggle(button, current)
  button.addEventListener('click', (e) => {
    // Host pages often treat a click anywhere as "open this card".
    e.stopPropagation()
    e.preventDefault()
    onChange(NEXT[(button.dataset.mode as WebsiteBadgeMode | undefined) ?? 'card'])
    // A mouse click leaves focus on the button, and the compact box stays open
    // for as long as it contains focus — so the user would not see the layout
    // they just chose. `detail` is 0 when the click came from Enter or Space,
    // where dropping focus would strand a keyboard user instead.
    if (e.detail > 0) button.blur()
  })
  return button
}
