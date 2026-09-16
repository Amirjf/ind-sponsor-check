export type PageKind = 'job' | 'company'

export interface CompanyTarget {
  /** Element that shows the company name. */
  element: HTMLElement
  /** Cleaned company name (badge text excluded). */
  name: string
  /** `after`: badge goes right after an inline element (a link).
   *  `inside`: badge is appended into a block heading (an h1). */
  placement: 'after' | 'inside'
}

/**
 * One job site. Everything that depends on a site's URLs and DOM lives in its
 * adapter so there is one place to update when the markup changes.
 */
export interface SiteAdapter {
  id: string
  /** Tested against `location.hostname`. */
  hosts: RegExp
  getPageKind(url: string): PageKind | null
  findCompanyTarget(root: ParentNode, kind: PageKind): CompanyTarget | null
}
