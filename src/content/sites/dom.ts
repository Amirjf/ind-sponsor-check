import { BADGE_CLASS } from '../badge'

export function cleanText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** Text of an element with any badge we inserted earlier removed. */
export function elementText(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll(`.${BADGE_CLASS}`).forEach((b) => b.remove())
  return cleanText(clone.textContent)
}

/** First element matching any selector (in order) that has visible text. */
export function firstWithText(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = root.querySelector<HTMLElement>(selector)
    if (el && elementText(el)) return el
  }
  return null
}

/** First link whose href contains `hrefPart`, searched inside each scope in order. */
export function firstLinkIn(root: ParentNode, scopes: readonly string[], hrefPart: string): HTMLAnchorElement | null {
  for (const scope of scopes) {
    const container = root.querySelector(scope)
    if (!container) continue
    const link = Array.from(container.querySelectorAll<HTMLAnchorElement>(`a[href*="${hrefPart}"]`)).find((a) =>
      elementText(a),
    )
    if (link) return link
  }
  return null
}

export function toTarget(element: HTMLElement | null, placement: CompanyTargetPlacement): CompanyTargetOrNull {
  if (!element) return null
  const name = elementText(element)
  return name ? { element, name, placement } : null
}

type CompanyTargetPlacement = 'after' | 'inside'
type CompanyTargetOrNull = { element: HTMLElement; name: string; placement: CompanyTargetPlacement } | null
