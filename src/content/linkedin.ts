/**
 * Everything that depends on LinkedIn's DOM lives here so it is one place to
 * update when LinkedIn changes its markup.
 */

/** Ordered from most to least specific. The first non-empty hit wins. */
export const COMPANY_SELECTORS = [
  // Logged-in job detail (two-pane search view and /jobs/view/ page)
  '.job-details-jobs-unified-top-card__company-name a',
  '.job-details-jobs-unified-top-card__company-name',
  '.jobs-unified-top-card__company-name a',
  '.jobs-unified-top-card__company-name',
  '.job-details-jobs-unified-top-card__primary-description-container a[href*="/company/"]',
  // Logged-out / guest job page
  'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
  '.topcard__org-name-link',
  '.top-card-layout__second-subline a[href*="/company/"]',
]

/** Containers searched for a generic company link when no selector matched. */
const FALLBACK_SCOPES = [
  '.jobs-details',
  '.job-view-layout',
  '.jobs-search__job-details--container',
  '.top-card-layout',
  'main',
]

export function cleanText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

export function isJobPage(url: string = location.href): boolean {
  return /linkedin\.com\/jobs\//.test(url) || /[?&]currentJobId=/.test(url)
}

export function findCompanyElement(root: ParentNode = document): HTMLElement | null {
  for (const selector of COMPANY_SELECTORS) {
    const el = root.querySelector<HTMLElement>(selector)
    if (el && cleanText(el.textContent)) return el
  }
  for (const scope of FALLBACK_SCOPES) {
    const container = root.querySelector(scope)
    if (!container) continue
    const link = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="/company/"]')).find((a) =>
      cleanText(a.textContent),
    )
    if (link) return link
  }
  return null
}

export function extractCompanyName(root: ParentNode = document): string | null {
  const el = findCompanyElement(root)
  return el ? cleanText(el.textContent) : null
}
