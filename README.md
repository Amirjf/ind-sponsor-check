# IND Sponsor Check for LinkedIn

Chrome extension (Manifest V3, React + Vite + [CRXJS](https://crxjs.dev)) that
adds a badge next to the company name on every LinkedIn job page telling you
whether that company is in the IND
[public register of recognised sponsors](https://ind.nl/en/public-register-recognised-sponsors/public-register-work).

```
src/
  background/   service worker: downloads + caches the register, answers lookups
  content/      LinkedIn content script: finds the company name, injects the badge
  popup/        React popup: manual lookup, list status, refresh button
  shared/       pure logic (name normalisation, matching, HTML parsing) — unit tested
  data/         bundled snapshot of the register (offline / first-run fallback)
supabase/       schema.sql for the remote settings table
store/          Chrome Web Store listing text + privacy policy
scripts/        icon generator, snapshot updater, zip for upload
```

## How it works

1. On install (and then every `refresh_hours`, default 24h) the service worker
   reads the settings table from Supabase, downloads the page at `register_url`,
   parses the Organisation / KVK table and stores it in `chrome.storage.local`.
   Until the first download succeeds it uses the bundled snapshot in `src/data`.
2. The content script watches the LinkedIn DOM (it is a single-page app), finds
   the company name on the open job, and asks the service worker for a match.
3. Matching normalises both names (lowercase, strip accents/punctuation, drop
   legal forms like `B.V.`, `N.V.`, `Holding`, `Netherlands`, `Koninklijke`...):
   - identical → **✓ recognised sponsor**
   - one is a word-prefix of the other (`ING` vs `ING Bank`) → **≈ likely**
   - otherwise → **✕ not found**

## Setup

```bash
npm install
npm run icons        # generates placeholder icons in src/assets/icons
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

The anon key only grants `SELECT` on this table (see the RLS policy in the SQL).

If IND ever moves the register to a domain other than `ind.nl`, either host a
JSON copy in Supabase Storage and point `sponsors_json_url` at it, or add the
new domain to `host_permissions` in `manifest.config.ts` and release an update.

## Scripts

| command            | what it does                                                  |
|--------------------|---------------------------------------------------------------|
| `npm run dev`      | Vite dev server with extension hot reload                     |
| `npm run build`    | type-check + production build into `dist/`                    |
| `npm test`         | unit tests (vitest)                                           |
| `npm run icons`    | regenerate placeholder PNG icons                              |
| `npm run snapshot` | refresh `src/data/sponsors-snapshot.json` from ind.nl         |
| `npm run zip`      | zip `dist/` into `release/` for the Chrome Web Store          |

## Publishing to the Chrome Web Store

1. `npm run build && npm run zip`
2. Register a developer account at https://chrome.google.com/webstore/devconsole
   (one-time $5 fee).
3. **New item** → upload the zip from `release/`.
4. Fill in the listing from `store/listing.md`, upload screenshots and the
   128px icon, and paste the permission justifications.
5. Host `store/privacy-policy.md` somewhere public (e.g. GitHub Pages) and link
   it in the *Privacy* tab. Declare "does not collect user data".
6. Submit for review. Bump `version` in `package.json` for every later upload.

## Security notes for contributors

- Never commit `.env`. Only `.env.example` is tracked (see `.gitignore`).
- The Supabase **anon** key is designed to be public and ends up inside the
  built extension anyway; it can only `SELECT` from `settings` because of the
  RLS policy in `supabase/schema.sql`. Never put the `service_role` key in
  this project.
- `src/data/sponsors-snapshot.json` is public data from the IND register.

## When LinkedIn changes its markup

All LinkedIn-specific selectors live in `src/content/linkedin.ts`
(`COMPANY_SELECTORS`). Add the new selector to the top of the list and run
`npm test`.

## Contributing

Issues and pull requests are welcome. Please run `npm test` and `npm run build`
before opening a PR. Licensed under MIT.
