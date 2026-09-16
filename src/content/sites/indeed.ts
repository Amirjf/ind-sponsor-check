import { cleanText, elementText, firstLinkIn, firstWithText, toTarget } from './dom'
import type { PageKind, SiteAdapter } from './types'

/**
 * Indeed (nl.indeed.com, www.indeed.com, ...). The search page shows the
 * clicked job (`?vjk=`) in a right-hand pane; /viewjob is the standalone page.
 */

/** Company link in the job header (detail pane and standalone page). */
export const JOB_SELECTORS = [
  '[data-testid="viewjob-main-content"] [data-testid="company-info-metadata"] a[href*="/cmp/"]',
  '[data-testid="desktop-job-header"] a[href*="/cmp/"]',
  '[data-testid="inlineHeader-companyName"] a',
  '[data-testid="inlineHeader-companyName"]',
  '[data-testid="jobsearch-JobInfoHeader-companyName"] a',
  '[data-testid="jobsearch-JobInfoHeader-companyName"]',
  'div[data-company-name="true"] a',
  'div[data-company-name="true"]',
  '.jobsearch-InlineCompanyRating a[href*="/cmp/"]',
  '.jobsearch-CompanyInfoContainer a[href*="/cmp/"]',
]

/** Only the job detail pane: never fall back to result-list cards. */
const JOB_FALLBACK_SCOPES = [
  '[data-testid="viewjob-main-content"]',
  '.jobsearch-ViewJobLayout',
  '#viewJobSSRRoot',
  '.jobsearch-JobComponent',
  '#jobsearch-ViewJob',
]

/** Company profile pages (/cmp/<slug>). The visible name is schema.org markup. */
export const COMPANY_PAGE_SELECTORS = [
  '[data-testid="head"] div[itemprop="name"]',
  'div[itemprop="name"]',
  '[data-testid="cmp-CompanyName"]',
  '.cmp-CompanyName',
]

/** Localised h1 prefixes ("Carrières en werk bij X", "Working at X"). */
const H1_PREFIX = /^(carri[eè]res? (en|et) (werk(en)?|emplois?) (bij|chez)|working at|careers and employment at|jobs at|karriere bei|trabajar en)\s+/i

export function getPageKind(url: string): PageKind | null {
  let path: string
  try {
    path = new URL(url).pathname
  } catch {
    return null
  }
  if (/^\/cmp\/[^/?#]+/.test(path)) return 'company'
  if (/^\/(m\/)?(jobs|viewjob|q-|jobs\.html)/.test(path) || /-jobs\.html$/.test(path)) return 'job'
  return null
}

export const indeed: SiteAdapter = {
  id: 'indeed',
  hosts: /(^|\.)indeed\.com$/,
  getPageKind,
  findCompanyTarget(root, kind) {
    if (kind === 'job') {
      return toTarget(firstWithText(root, JOB_SELECTORS) ?? firstLinkIn(root, JOB_FALLBACK_SCOPES, '/cmp/'), 'after')
    }
    const named = toTarget(firstWithText(root, COMPANY_PAGE_SELECTORS), 'inside')
    if (named) return named
    const h1 = root.querySelector<HTMLElement>('h1')
    if (!h1) return null
    const name = cleanText(elementText(h1).replace(H1_PREFIX, ''))
    return name ? { element: h1, name, placement: 'inside' } : null
  },
}
