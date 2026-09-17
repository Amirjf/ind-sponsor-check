export type PageKind = 'job' | 'company'

export interface CompanyTarget {
  /** Element that shows the company name. */
  element: HTMLElement
  /** Cleaned company name (badge text excluded), shown to the user. */
  name: string
  /** Names to look up, most specific first. Defaults to `[name]`. */
  candidates?: string[]
  /** `after`: badge goes right after an inline element (a link).
   *  `inside`: badge is appended into a block heading (an h1).
   *  `floating`: no suitable element; badge floats in a corner of the page. */
  placement: 'after' | 'inside' | 'floating'
}

/**
 * One job site (or, for the generic `website` adapter, any other site). Everything that depends on a site's URLs and DOM lives in its
 * adapter so there is one place to update when the markup changes.
 */
export interface SiteAdapter {
  id: string
  /** Tested against `location.hostname`. */
  hosts: RegExp
  /** `root` is the live document; adapters that need the page's markup (JSON-LD) to tell job pages apart read it. */
  getPageKind(url: string, root?: ParentNode): PageKind | null
  findCompanyTarget(root: ParentNode, kind: PageKind): CompanyTarget | null
}
