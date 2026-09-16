import { firstLinkIn, firstWithText, toTarget } from './dom'
import type { PageKind, SiteAdapter } from './types'

/** Job detail pages. Ordered from most to least specific; first non-empty hit wins. */
export const JOB_SELECTORS = [
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

/** Containers searched for a generic company link when no job selector matched. */
const JOB_FALLBACK_SCOPES = ['.jobs-details', '.job-view-layout', '.jobs-search__job-details--container', '.top-card-layout', 'main']

/** Company profile pages (/company/<slug>/...). */
export const COMPANY_PAGE_SELECTORS = [
  'h1.org-top-card-summary__title', // logged-in
  '.org-top-card-summary__title',
  'h1.top-card-layout__title', // logged-out / guest
  '.top-card-layout__title',
  'main h1',
]

export function getPageKind(url: string): PageKind | null {
  if (/linkedin\.com\/jobs\//.test(url) || /[?&]currentJobId=/.test(url)) return 'job'
  if (/linkedin\.com\/company\/[^/?#]+/.test(url)) return 'company'
  return null
}

export const linkedin: SiteAdapter = {
  id: 'linkedin',
  hosts: /(^|\.)linkedin\.com$/,
  getPageKind,
  findCompanyTarget(root, kind) {
    if (kind === 'job') {
      return toTarget(firstWithText(root, JOB_SELECTORS) ?? firstLinkIn(root, JOB_FALLBACK_SCOPES, '/company/'), 'after')
    }
    return toTarget(firstWithText(root, COMPANY_PAGE_SELECTORS), 'inside')
  },
}
