import type { PageKind, SiteAdapter } from './types'

/**
 * Any other website, typically a company's own site. There is no company-name
 * element to hang a badge on, so the name comes from schema.org JSON-LD
 * (`<script type="application/ld+json">`) and the badge floats in a corner.
 */

export interface Organization {
  /** Name to show to the user. */
  name: string
  /** Names to look up in the register, most specific first (legal name, name, alternate name). */
  candidates: string[]
}

/** schema.org Organization and its direct subtypes. Deeper subtypes are caught by the suffix test. */
const ORG_TYPES = new Set([
  'Organization', 'Corporation', 'LocalBusiness', 'Airline', 'Consortium', 'EducationalOrganization',
  'FundingScheme', 'GovernmentOrganization', 'LibrarySystem', 'MedicalOrganization', 'NGO', 'NewsMediaOrganization',
  'OnlineBusiness', 'PerformingGroup', 'ResearchOrganization', 'SportsOrganization', 'WorkersUnion',
  'Store', 'Restaurant', 'Hotel', 'Bank', 'Dentist', 'Hospital', 'Pharmacy', 'Physician', 'School', 'CollegeOrUniversity',
])
/** Names of LocalBusiness subtypes (FinancialService, ClothingStore, ...). */
const ORG_TYPE_SUFFIX = /(Organization|Business|Store|Shop|Service|Agency|Station|Center|Centre|Club|Dealer|Salon|Studio)$/

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

function isObject(v: Json | undefined): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** "https://schema.org/Corporation" | "schema:Corporation" -> "Corporation" */
function localType(t: Json): string {
  return typeof t === 'string' ? t.replace(/^.*[/#:]/, '') : ''
}

function isOrganizationType(type: Json | undefined): boolean {
  const types = Array.isArray(type) ? type : [type ?? null]
  return types.some((t) => {
    const name = localType(t)
    return ORG_TYPES.has(name) || (name !== 'Organization' && ORG_TYPE_SUFFIX.test(name) && name !== 'Person')
  })
}

/** A schema.org text value: string, `{ "@value": ... }`, or an array of those. */
function textValues(v: Json | undefined): string[] {
  if (typeof v === 'string') return [v.replace(/\s+/g, ' ').trim()].filter(Boolean)
  if (Array.isArray(v)) return v.flatMap(textValues)
  if (isObject(v)) return textValues(v['@value'])
  return []
}

function toOrganization(node: JsonObject): Organization | null {
  const names = textValues(node.name)
  const legal = textValues(node.legalName)
  const alternate = textValues(node.alternateName)
  const candidates = [...new Set([...legal, ...names, ...alternate])]
  if (candidates.length === 0) return null
  return { name: names[0] ?? candidates[0], candidates }
}

interface Candidate {
  org: Organization
  /** Lower is better. */
  rank: number
}

/** Walks the whole tree (including `@graph` and nested nodes) collecting organizations. */
function collect(value: Json, key: string | null, out: Candidate[]) {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, key, out)
    return
  }
  if (!isObject(value)) return

  const isHiring = key === 'hiringOrganization'
  if (isHiring || isOrganizationType(value['@type'])) {
    const org = toOrganization(value)
    if (org) {
      const id = typeof value['@id'] === 'string' ? value['@id'] : ''
      const rank = isHiring ? 0 : /#organization$/i.test(id) ? 1 : 2
      out.push({ org, rank })
    }
  }
  for (const [k, v] of Object.entries(value)) {
    // `@graph` holds the node list; other `@` keys (`@type`, `@id`, `@context`) are metadata.
    if (k.startsWith('@') && k !== '@graph') continue
    collect(v, k, out)
  }
}

/** The organization the page describes, or null when the page carries no JSON-LD organization. */
export function findOrganization(root: ParentNode): Organization | null {
  const found: Candidate[] = []
  for (const script of root.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json" i]')) {
    let data: Json
    try {
      data = JSON.parse(script.textContent ?? '') as Json
    } catch {
      continue
    }
    collect(data, null, found)
  }
  if (found.length === 0) return null
  // Stable sort: document order breaks ties within a rank.
  return found.sort((a, b) => a.rank - b.rank)[0].org
}

/** "/" or a single locale segment ("/nl", "/en-us/"): the site root, where the JSON-LD describes the company itself. */
const HOME_PATH = /^\/([a-z]{2}(-[a-z]{2})?\/?)?$/i

/** Only the homepage: subpages often describe a product, article or partner page instead of the company. */
export function getPageKind(url: string): PageKind | null {
  try {
    const u = new URL(url)
    return /^https?:$/.test(u.protocol) && HOME_PATH.test(u.pathname) ? 'company' : null
  } catch {
    return null
  }
}

export const website: SiteAdapter = {
  id: 'website',
  hosts: /./,
  getPageKind,
  findCompanyTarget(root) {
    const org = findOrganization(root)
    if (!org) return null
    const element = (root as Document).body ?? (root as Document).documentElement
    if (!element) return null
    return { element, name: org.name, candidates: org.candidates, placement: 'floating' }
  },
}
