/**
 * Sites where the generic "company website" check must stay quiet: search
 * engines, social networks, tools people keep open all day. The list below is
 * the bundled baseline; the Supabase `ignored_hosts` table extends it remotely.
 * Entries are registrable domains (no `www.`); every subdomain is covered too.
 */
export const DEFAULT_IGNORED_HOSTS: readonly string[] = [
  // search / mail / browsers' home pages
  'google.com', 'google.nl', 'gmail.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'live.com', 'outlook.com', 'office.com',
  // social / video / chat
  'youtube.com', 'facebook.com', 'instagram.com', 'whatsapp.com', 'x.com', 'twitter.com', 'tiktok.com', 'reddit.com',
  'discord.com', 'slack.com', 'zoom.us', 'twitch.tv', 'netflix.com', 'spotify.com',
  // reference / dev tools / AI
  'wikipedia.org', 'github.com', 'gitlab.com', 'stackoverflow.com', 'notion.so', 'chatgpt.com', 'openai.com',
  'claude.ai', 'anthropic.com', 'supabase.com', 'localhost',
  // shopping
  'amazon.com', 'amazon.nl', 'bol.com', 'marktplaats.nl', 'ebay.com', 'aliexpress.com',
  // job sites (own adapters or not useful), news, IND itself
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'glassdoor.nl', 'nu.nl', 'ind.nl',
  // Dutch government: the everyday admin sites people in NL keep coming back to.
  // This is only the core; the full register (~2000 domains, every ministry,
  // agency, municipality, province and water board) lives in the Supabase
  // `ignored_hosts` table under category 'government'.
  'rijksoverheid.nl', 'overheid.nl', 'mijnoverheid.nl', 'digid.nl', 'belastingdienst.nl', 'toeslagen.nl',
  'werk.nl', 'uwv.nl', 'duo.nl', 'svb.nl', 'cak.nl', 'cjib.nl', 'coa.nl', 'politie.nl', 'rechtspraak.nl',
  'kvk.nl', 'rdw.nl', 'cbr.nl', 'kadaster.nl', 'defensie.nl', 'government.nl', 'nederlandwereldwijd.nl',
  'netherlandsworldwide.nl', 'officielebekendmakingen.nl', 'tweedekamer.nl', 'eerstekamer.nl',
  'raadvanstate.nl', 'nationaleombudsman.nl', 'autoriteitpersoonsgegevens.nl', 'acm.nl', 'afm.nl', 'dnb.nl',
  'amsterdam.nl', 'rotterdam.nl', 'denhaag.nl', 'utrecht.nl', 'eindhoven.nl', 'groningen.nl',
]

/** Lowercase, no leading `www.`, no trailing dot. Returns '' for unusable input. */
export function normalizeHost(host: unknown): string {
  if (typeof host !== 'string') return ''
  return host.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '').replace(/^\*\./, '')
}

/**
 * Normalised lookup set. Build this once per settings refresh: the list runs to
 * a couple of thousand entries, and rebuilding it on every page would mean
 * normalising all of them again.
 */
export function buildIgnoreSet(hosts: Iterable<string>): Set<string> {
  const set = new Set<string>()
  for (const raw of hosts) {
    const h = normalizeHost(raw)
    if (h) set.add(h)
  }
  return set
}

/**
 * True when `hostname` equals an entry or is a subdomain of one. Walks the
 * hostname's own suffixes (`a.b.example.com` -> `b.example.com` -> `example.com`)
 * so the cost is the number of labels, not the size of the list.
 */
export function isIgnoredHost(hostname: string, hosts: Iterable<string> | Set<string>): boolean {
  const h = normalizeHost(hostname)
  if (!h) return false
  const set = hosts instanceof Set ? hosts : buildIgnoreSet(hosts)
  const labels = h.split('.')
  for (let i = 0; i < labels.length; i++) {
    if (set.has(labels.slice(i).join('.'))) return true
  }
  return false
}

/** Bundled defaults plus the remote list, de-duplicated. */
export function mergeIgnoredHosts(remote: readonly string[] | undefined): string[] {
  return [...new Set([...DEFAULT_IGNORED_HOSTS, ...(remote ?? [])].map(normalizeHost).filter(Boolean))]
}
