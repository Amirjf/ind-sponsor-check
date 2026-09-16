// Re-downloads the IND register and rewrites the bundled snapshot.
// Usage: npm run snapshot   (Node 22.6+ / 24 runs TypeScript directly)
import { writeFileSync } from 'node:fs'
import { parseRegisterHtml, parseRegisterUpdatedText } from '../src/shared/sponsors.ts'

const SOURCE = process.argv[2] ?? 'https://ind.nl/en/public-register-recognised-sponsors/public-register-work'
const OUT = 'src/data/sponsors-snapshot.json'

const res = await fetch(SOURCE, { headers: { 'User-Agent': 'Mozilla/5.0 (ind-sponsor-check snapshot script)' } })
if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
const html = await res.text()
const sponsors = parseRegisterHtml(html)
if (sponsors.length < 1000) throw new Error(`Only parsed ${sponsors.length} rows; page layout may have changed`)

writeFileSync(
  OUT,
  JSON.stringify({
    source: SOURCE,
    fetchedAt: new Date().toISOString().slice(0, 10),
    registerUpdatedText: parseRegisterUpdatedText(html),
    count: sponsors.length,
    sponsors,
  }),
)
console.log(`wrote ${OUT}: ${sponsors.length} sponsors (IND last updated: ${parseRegisterUpdatedText(html) ?? 'unknown'})`)
