/**
 * Company-name normalisation so that "Adyen" matches "Adyen N.V." and
 * "ASML" matches "ASML Netherlands B.V.".
 */

/** Tokens dropped from the END of a name, repeatedly. Multi-letter legal
 *  forms like "b.v." arrive as separate tokens ("b", "v") and are checked
 *  as joined 2- and 3-token groups ("bv", "vof"). */
const SUFFIX_TOKENS = new Set([
  // Dutch / Belgian legal forms
  'bv', 'nv', 'vof', 'cv', 'ua', 'bvba', 'sprl', 'coop', 'cooperatie', 'cooperatief', 'cooperatieve',
  // international legal forms
  'ltd', 'limited', 'inc', 'incorporated', 'llc', 'plc', 'gmbh', 'ag', 'sa', 'sarl', 'srl', 'spa',
  'co', 'company', 'corp', 'corporation', 'kg', 'oy', 'ab', 'aps', 'as', 'se', 'pty', 'pvt', 'llp', 'lp',
  'sro', 'zoo', 'ou', 'doo', 'kft', 'sl', 'sas', 'sasu',
  // structure words
  'holding', 'holdings', 'group', 'groep', 'international', 'internationaal',
  // geography that LinkedIn usually omits
  'nederland', 'netherlands', 'holland', 'nl', 'europe', 'europa', 'eu', 'emea', 'benelux',
  // dangling connectors left after stripping ("Tiffany & Co" -> "tiffany and")
  'the', 'and', 'en',
])

/** Tokens dropped from the START of a name. */
const PREFIX_TOKENS = new Set(['the', 'koninklijke', 'royal', 'stichting', 'cooperatie', 'cooperatieve', 'cooperative'])

export function tokenize(name: string): string[] {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * The comparable "core" of a company name: lowercase, ASCII, no punctuation,
 * with legal forms and generic prefixes/suffixes removed. At least one token
 * is always kept.
 */
export function coreName(name: string): string {
  let t = tokenize(name)
  while (t.length > 1 && PREFIX_TOKENS.has(t[0])) t = t.slice(1)

  let changed = true
  while (changed && t.length > 1) {
    changed = false
    for (const n of [3, 2, 1]) {
      if (t.length > n && SUFFIX_TOKENS.has(t.slice(-n).join(''))) {
        t = t.slice(0, -n)
        changed = true
        break
      }
    }
  }
  return t.join(' ')
}
