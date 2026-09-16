import { coreName } from './normalize'
import type { MatchResult, Sponsor } from './types'

interface IndexedSponsor {
  core: string
  sponsor: Sponsor
}

export interface SponsorIndex {
  size: number
  /** core name -> sponsors with exactly that core */
  exact: Map<string, Sponsor[]>
  /** first token of core -> all sponsors starting with it (for prefix matches) */
  byFirst: Map<string, IndexedSponsor[]>
}

export function buildIndex(sponsors: Sponsor[]): SponsorIndex {
  const exact = new Map<string, Sponsor[]>()
  const byFirst = new Map<string, IndexedSponsor[]>()
  for (const sponsor of sponsors) {
    const core = coreName(sponsor.name)
    if (!core) continue
    push(exact, core, sponsor)
    push(byFirst, core.split(' ')[0], { core, sponsor })
  }
  return { size: sponsors.length, exact, byFirst }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

const MAX_LIKELY = 25
/** Prefix matching on very short cores ("ab") would be noise. */
const MIN_PREFIX_LENGTH = 3

/**
 * `sponsor`: the normalised names are identical.
 * `likely`: one normalised name is a word-boundary prefix of the other
 *           ("philips" vs "philips electronics", "ing" vs "ing bank").
 * `none`:   nothing found.
 */
export function matchCompany(query: string, index: SponsorIndex): MatchResult {
  const core = coreName(query)
  const none: MatchResult = { status: 'none', query, core, matches: [] }
  if (!core) return none

  const exact = index.exact.get(core)
  if (exact?.length) return { status: 'sponsor', query, core, matches: exact }

  if (core.length < MIN_PREFIX_LENGTH) return none
  const candidates = index.byFirst.get(core.split(' ')[0]) ?? []
  const likely = candidates.filter(
    (c) => c.core.startsWith(core + ' ') || core.startsWith(c.core + ' '),
  )
  if (likely.length) {
    return { status: 'likely', query, core, matches: likely.slice(0, MAX_LIKELY).map((c) => c.sponsor) }
  }
  return none
}
