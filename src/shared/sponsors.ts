/**
 * Parsers for the IND public register. Kept dependency-free so the same
 * code runs in the extension service worker, in tests, and in
 * `scripts/update-snapshot.ts` under plain Node.
 */
import type { Sponsor } from './types'

// A cell may contain inline tags but never another closing cell tag, which
// stops the pattern from spanning the header row into the first data row.
const CELL = '((?:(?!<\\/t[hd]>)[\\s\\S])*)'
const ROW_RE = new RegExp(`<tr[^>]*>\\s*<t[hd][^>]*>${CELL}<\\/t[hd]>\\s*<td[^>]*>${CELL}<\\/td>`, 'g')
const KVK_RE = /^\d{6,10}$/

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

/** Extracts (organisation, KVK number) rows from the register's HTML table. */
export function parseRegisterHtml(html: string): Sponsor[] {
  const out: Sponsor[] = []
  for (const m of html.matchAll(ROW_RE)) {
    const name = cellText(m[1])
    const kvk = cellText(m[2])
    if (name && KVK_RE.test(kvk)) out.push({ name, kvk })
  }
  return out
}

/** "The register was last updated on 3 September 2026." -> "3 September 2026" */
export function parseRegisterUpdatedText(html: string): string | undefined {
  const m = /last updated on\s+([^.<]+)/i.exec(html)
  return m?.[1]?.trim()
}

/** Accepts either `[{name,kvk}]` or `{ sponsors: [{name,kvk}] }`. */
export function parseSponsorsJson(text: string): Sponsor[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { sponsors?: unknown }).sponsors)
      ? (data as { sponsors: unknown[] }).sponsors
      : null
  if (!list) throw new Error('Sponsors JSON must be an array or an object with a `sponsors` array')
  return list
    .filter((s): s is { name: string; kvk?: string } => !!s && typeof s === 'object' && typeof (s as { name?: unknown }).name === 'string')
    .map((s) => ({ name: s.name.trim(), kvk: String(s.kvk ?? '').trim() }))
    .filter((s) => s.name)
}
