import { MIN_PLAUSIBLE_SPONSORS, STORAGE_KEYS } from '../shared/config'
import { buildIndex, matchCompany, type SponsorIndex } from '../shared/match'
import { parseRegisterHtml, parseRegisterUpdatedText, parseSponsorsJson } from '../shared/sponsors'
import type { MatchResult, RemoteSettings, Sponsor, SponsorCache } from '../shared/types'
import snapshot from '../data/sponsors-snapshot.json'

/**
 * The service worker can be shut down at any time, so the index lives in a
 * module-level cache that is rebuilt lazily from chrome.storage.local (or
 * the bundled snapshot on first run).
 */
let index: SponsorIndex | null = null
let indexSource: string | null = null

export async function loadCache(): Promise<SponsorCache | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.cache)
  return (stored[STORAGE_KEYS.cache] as SponsorCache | undefined) ?? null
}

function bundledCache(): SponsorCache {
  return {
    sponsors: snapshot.sponsors as Sponsor[],
    fetchedAt: Date.parse(snapshot.fetchedAt),
    source: 'bundled',
    registerUpdatedText: snapshot.registerUpdatedText,
  }
}

export async function getCacheOrBundled(): Promise<SponsorCache> {
  return (await loadCache()) ?? bundledCache()
}

async function getIndex(): Promise<SponsorIndex> {
  const cache = await getCacheOrBundled()
  const key = `${cache.source}@${cache.fetchedAt}`
  if (!index || indexSource !== key) {
    index = buildIndex(cache.sponsors)
    indexSource = key
  }
  return index
}

export async function check(name: string): Promise<MatchResult> {
  return matchCompany(name, await getIndex())
}

export function isStale(cache: SponsorCache, refreshHours: number): boolean {
  return Date.now() - cache.fetchedAt > refreshHours * 3600 * 1000
}

/** Downloads the register from the configured source and replaces the cache. */
export async function refreshSponsors(settings: RemoteSettings): Promise<SponsorCache> {
  const source = settings.sponsorsJsonUrl ?? settings.registerUrl
  const res = await fetch(source, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Register download failed: ${res.status} ${res.statusText}`)
  const text = await res.text()

  let sponsors: Sponsor[]
  let registerUpdatedText: string | undefined
  if (settings.sponsorsJsonUrl) {
    sponsors = parseSponsorsJson(text)
  } else {
    sponsors = parseRegisterHtml(text)
    registerUpdatedText = parseRegisterUpdatedText(text)
  }
  if (sponsors.length < MIN_PLAUSIBLE_SPONSORS) {
    throw new Error(`Register parse returned only ${sponsors.length} rows; keeping the previous list`)
  }

  const cache: SponsorCache = { sponsors, fetchedAt: Date.now(), source, registerUpdatedText }
  await chrome.storage.local.set({ [STORAGE_KEYS.cache]: cache })
  index = null
  return cache
}
