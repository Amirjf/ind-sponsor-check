# IND Sponsor Check

Chrome extension (Manifest V3, React + Vite + [CRXJS](https://crxjs.dev)) that
adds a badge next to the company name on LinkedIn and Indeed job pages and
company pages, and a floating badge on company websites, telling you whether
that company is in the IND
[public register of recognised sponsors](https://ind.nl/en/public-register-recognised-sponsors/public-register-work).

## What it looks like

<table>
  <tr>
    <td width="50%"><img src="store/screenshots/1280x800/01-job-page.png" alt="A LinkedIn job page with a green 'IND recognised sponsor' badge next to the company name"></td>
    <td width="50%"><img src="store/screenshots/1280x800/02-three-states.png" alt="Three job cards showing the green, amber and red badge states side by side"></td>
  </tr>
  <tr>
    <td><img src="store/screenshots/1280x800/03-similar-sponsors.png" alt="A company page with the amber badge open, listing the similar register entries with their KVK numbers"></td>
    <td><img src="store/screenshots/1280x800/04-company-website.png" alt="A company careers page with the floating sponsor badge card in the bottom-right corner"></td>
  </tr>
  <tr>
    <td><img src="store/screenshots/1280x800/05-popup.png" alt="The extension popup with a manual company lookup and the register's last-refresh time"></td>
    <td></td>
  </tr>
</table>

The images are rendered mock pages, not captures of real accounts; see
[Screenshots](#screenshots) for how they are produced and regenerated.

```
src/
  background/   service worker: downloads + caches the register, answers lookups
  content/      content script: finds the company name, injects the badge
  content/sites/  one adapter per job site (linkedin.ts, indeed.ts) + website.ts (JSON-LD)
  popup/        React popup: manual lookup, list status, refresh button
  intro/        React welcome page, opened once on install (also linked from the popup)
  assets/       icons and the screenshots the intro page imports (generated, see Screenshots)
  shared/       pure logic (name normalisation, matching, HTML parsing, user prefs) — unit tested
  data/         bundled snapshot of the register (offline / first-run fallback)
supabase/       schema.sql for the remote settings table
store/          Chrome Web Store listing text, privacy policy, screenshot scenes + renders
scripts/        icon generator, snapshot updater, zip for upload
```

## How it works

1. On install (and then every `refresh_hours`, default 24h) the service worker
   reads the settings table from Supabase, downloads the page at `register_url`,
   parses the Organisation / KVK table and stores it in `chrome.storage.local`.
   Until the first download succeeds it uses the bundled snapshot in `src/data`.
   Every company lookup also kicks off this refresh opportunistically, so both
   the settings read and the register download are gated on age — otherwise the
   `ignored_hosts` table (a couple of thousand rows, paged) would be
   re-downloaded on every job page opened. Only the alarm, install and the
   popup's **Refresh now** button bypass the gate.
2. The content script watches the page DOM (both sites are single-page apps),
   finds the company name on the open job or company profile, and asks the
   service worker for a match. Supported pages:
   - LinkedIn: `/jobs/...` (detail pane or full page) and `/company/<slug>`
   - Indeed (any country subdomain): `/jobs?...&vjk=` detail pane, `/viewjob`,
     and `/cmp/<slug>`
   - Any other site not on the ignore list (search engines, social networks,
     dev tools and every Dutch government domain: see
     `src/shared/ignored-hosts.ts`, extended by the Supabase `ignored_hosts`
     table), when the page carries schema.org JSON-LD naming an organisation:
     a floating badge appears bottom-right. Two kinds of page qualify:
     - the homepage (`/` or a locale root like `/nl/`), where any
       `Organization` (or subtype) node describes the company itself;
     - any URL carrying a `JobPosting` with a `hiringOrganization` — a careers
       subpage, a Greenhouse or Lever board, an ATS. Only the hiring
       organisation is read there; other organisations on such a page belong to
       whoever runs the board, not to the employer.

     The legal name, name and alternate name are tried in that order. Pages
     without such data are left alone.
3. The floating badge's `×` opens a small menu: hide it for now, hide it on
   this site (the host is added to `mutedHosts`), or hide it on all company
   websites (`websiteBadge: false`). Those choices live in `chrome.storage.local`
   under `userPrefs`, separately from the Supabase-backed settings, and are
   undone from the popup. They only affect the generic website check; the
   LinkedIn and Indeed badges are not touched.
4. Matching normalises both names (lowercase, strip accents/punctuation, drop
   legal forms like `B.V.`, `N.V.`, `Holding`, `Netherlands`, `Koninklijke`...):
   - identical → **✓ recognised sponsor**
   - one is a word-prefix of the other (`ING` vs `ING Bank`) → **≈ likely**
   - otherwise → **✕ not found**

## Setup

```bash
npm install
npm run icons        # only after changing src/assets/icons/logo.png (needs Pillow: pip install pillow)
cp .env.example .env # optional: fill in Supabase URL + anon key
npm run build        # -> dist/
```

Load it in Chrome: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → pick the `dist` folder. Open any LinkedIn job.

For development with hot reload run `npm run dev` and load the same `dist`
folder; CRXJS rebuilds on save.

### Remote settings (Supabase)

Without a `.env` the extension works with the built-in defaults. To control the
register URL remotely:

1. Create a Supabase project, open **SQL Editor** and run `supabase/schema.sql`.
2. Copy **Project URL** and the **anon public** key from *Project Settings →
   API* into `.env`, then rebuild.
3. Edit values in **Table Editor → settings**:

| key                 | meaning                                                                 |
|---------------------|-------------------------------------------------------------------------|
| `register_url`      | IND page to download and link to                                        |
| `refresh_hours`     | how often to re-download (1–720)                                        |
| `sponsors_json_url` | optional JSON list to use instead of parsing the page (leave empty)     |

The same SQL also creates the `ignored_hosts` table (one registrable domain
per row, no `www.`; subdomains are covered). Add a row to silence the
company-website check on a site; the bundled defaults in
`src/shared/ignored-hosts.ts` always apply as well. Rows are grouped by
`category`:

| category     | rows | what it covers                                                        |
|--------------|------|-----------------------------------------------------------------------|
| `everyday`   |  ~46 | search, social, video, shopping, dev tools, the other job sites        |
| `government` | ~2000| every Dutch ministry, agency, municipality, province and water board   |

Run `supabase/seed-government-hosts.sql` after `schema.sql` to load the
government set. It is generated from the [Open State Foundation
dataset](https://github.com/openstate/datasets/tree/master/government_domain_names),
which is compiled from the official Websiteregister Rijksoverheid and the
Overheidsalmanak. Private vendors that appear in that register only because
government uses them (for example `arcgis.com`) are excluded, so the badge
still works on their own sites.

To drop a site back in, delete its row:

```sql
delete from public.ignored_hosts where host = 'rijkswaterstaat.nl';
```

The anon key only grants `SELECT` on these tables (see the RLS policies in the SQL).

If IND ever moves the register to a domain other than `ind.nl`, either host a
JSON copy in Supabase Storage and point `sponsors_json_url` at it, or add the
new domain to `host_permissions` in `manifest.config.ts` and release an update.

## Scripts

| command            | what it does                                                  |
|--------------------|---------------------------------------------------------------|
| `npm run dev`      | Vite dev server with extension hot reload                     |
| `npm run build`    | type-check + production build into `dist/`                    |
| `npm test`         | unit tests (vitest)                                           |
| `npm run icons`    | regenerate the PNG icons from `logo.png` (needs Pillow)       |
| `npm run snapshot` | refresh `src/data/sponsors-snapshot.json` from ind.nl         |
| `npm run shots`    | render the store + intro screenshots from `store/scenes/` (needs `npm run dev`) |
| `npm run zip`      | zip `dist/` into `release/` for the Chrome Web Store          |

## Publishing to the Chrome Web Store

1. `npm test && npm run build && npm run zip` — the zip lands in `release/`
   named after `version` in `package.json`.
2. `npm run shots` (with `npm run dev` running) — regenerates the 1280x800
   uploads in `store/screenshots/1280x800/` (see [Screenshots](#screenshots)).
3. Register a developer account at https://chrome.google.com/webstore/devconsole
   (one-time $5 fee).
4. **New item** → upload the zip from `release/`.
5. Fill in the listing from `store/listing.md`: description, the screenshots
   from `store/screenshots/1280x800/`, the 128px icon, the single-purpose
   statement and the permission justifications.
6. *Privacy* tab: link the policy at https://zal-group.nl/ind-sponsor-check/privacy
   (source of truth: `store/privacy-policy.md` — publish it there before
   submitting) and declare "does not collect user data".
7. Submit for review. Bump `version` in `package.json` for every later upload;
   the store rejects a re-upload of a version it already has.

The popup's feedback link (`CONTACT_URL` in `src/shared/config.ts`) and the
privacy policy both point at the product page on zal-group.nl. Both pages have
to exist before the listing goes live, or the reviewer follows a dead link.

## Screenshots

The store listing and the intro page both use rendered scenes, not captures of
real pages: `store/scenes/*.html` are small mock pages (a job board, a company
profile, a company website, the popup) that import the extension's real badge
code from `src/content/` — and, for the popup scene, the real React popup with
a stubbed service worker — under a bold headline. Nothing in them is a real
person or account, so there is nothing to blur, and they can be re-rendered
whenever the badge design changes.

`npm run shots` (with `npm run dev` running, so the scenes can import from
`src/`) drives headless Chrome over each scene at 1024x640 with a 2x scale
factor and writes:

- `store/screenshots/1280x800/<scene>.png` — the store uploads, headline
  included, at the exact size the store requires.
- `src/assets/screenshots/<name>.jpg` — the page area only, 1600px wide, for
  the three figures the intro page imports.

Both outputs are generated, never edited by hand: edit the scene, re-run the
script, and look at every image before shipping. The company names in the
scenes are chosen so the badges are truthful against the bundled register
(Adyen is listed; "Bird" has three similar entries; the red badge belongs to a
made-up company). If the register changes, re-check them by typing the names
into the popup. The script expects Chrome at its default macOS
path; set `CHROME=/path/to/chrome` otherwise.

## Security notes for contributors

- Never commit `.env`. Only `.env.example` is tracked (see `.gitignore`).
- The Supabase **anon** key is designed to be public and ends up inside the
  built extension anyway; it can only `SELECT` from `settings` because of the
  RLS policy in `supabase/schema.sql`. Never put the `service_role` key in
  this project.
- `src/data/sponsors-snapshot.json` is public data from the IND register.

## When a site changes its markup, or to add a site

Each site is one file in `src/content/sites/` implementing `SiteAdapter`
(URL → page kind, DOM → company name element). Add the new selector to the top
of the relevant list, or add a new adapter and register it in
`src/content/sites/index.ts` plus `matches` in `manifest.config.ts`. Run
`npm test`; the adapter tests use small HTML fixtures copied from the live
pages.

## Contributing

Issues and pull requests are welcome. Please run `npm test` and `npm run build`
before opening a PR. Licensed under MIT.
