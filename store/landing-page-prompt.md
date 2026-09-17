# Prompt: product page for IND Sponsor Check on zal-group.nl

Paste this into the session working on the zal-group.nl site. It is written to
be stack-agnostic — whatever the site already uses (Next.js, Astro, plain HTML)
should be followed rather than replaced.

On the path: the extension is listed on the Chrome Web Store as **IND Sponsor
Check**, so the URL should match it. `/ind-finder` reads well but sends people
looking for a different product name; `/ind-sponsor-check` keeps the store
listing, the popup link and the page all saying the same thing.

---

Build a product page for a Chrome extension on this site, at two routes:

- `/ind-sponsor-check` — the landing page
- `/ind-sponsor-check/privacy` — the privacy policy

Match the site's existing layout, navigation, footer, typography and colour
tokens. Do not introduce a new design system, a new font, or a component
library the site does not already use. The page must work on mobile and respect
the site's light/dark handling if it has one.

## What the product is

IND Sponsor Check is a free Chrome extension for people job-hunting in the
Netherlands who need visa sponsorship. Only companies on the IND's public
register of "recognised sponsors" can sponsor a highly skilled migrant visa,
and that register is a long table on ind.nl that nobody wants to search by hand
for every job posting.

The extension puts the answer next to the company name while you browse:

- On any LinkedIn or Indeed job page or company page, a badge appears beside
  the company name.
- On a company's own website, a small floating badge appears bottom-right
  (homepage only, and only when the site publishes its organisation name as
  schema.org structured data).

Three states:

| badge | meaning |
|---|---|
| ✓ green — "IND recognised sponsor" | the company is on the register |
| ≈ yellow — "likely" | companies with a similar name are on the register; clicking opens the list |
| ✕ red — "not found" | no matching name |

Other facts worth using on the page:

- The register is downloaded from ind.nl and refreshed once a day. A copy is
  bundled with the extension, so it works offline and on first install.
- The popup checks any company name by hand and shows when the list was last
  updated.
- The floating badge on company websites can be hidden for now, on that site,
  or everywhere — and un-hidden from the popup. The LinkedIn and Indeed badges
  are unaffected.
- Search engines, social networks, developer tools and Dutch government
  domains are skipped entirely.
- Nothing about the pages the user visits leaves their browser. No analytics,
  no tracking, no accounts.
- Not affiliated with IND, LinkedIn or Indeed.

## Page structure

1. **Hero** — headline naming the problem ("Does this company sponsor a visa?"
   or similar), one sentence of subtext, and a primary "Add to Chrome" button
   pointing at the Chrome Web Store listing. The store URL does not exist yet:
   use a constant at the top of the file, `CHROME_STORE_URL`, set to `"#"` with
   a TODO comment so it is one edit to fill in once the listing is live. When
   it is `"#"`, render the button disabled with the label "Coming to the Chrome
   Web Store".
2. **Screenshots** — from `store/screenshots/1280x800/` in the extension
   repo: `01-job-page.png`, `03-similar-sponsors.png`, `04-company-website.png`
   (the other two, `02-three-states.png` and `05-popup.png`, are optional).
   Copy them into the site's asset pipeline. They are rendered mock pages with
   a headline band, 1280x800, with no real people or accounts in them. Caption
   each with the surface it shows.
3. **How it works** — three short steps (install → open a job → read the
   badge), and the three-state table above.
4. **Privacy, on the landing page itself** — a short block, not only a link:
   "The extension reads the company name on the page you are looking at and
   compares it against a copy of the register stored in your own browser.
   Nothing about the pages you visit is sent anywhere." Link to
   `/ind-sponsor-check/privacy` for the full text.
5. **Feedback** — a section with `id="feedback"`. The extension's popup links
   directly to `https://zal-group.nl/ind-sponsor-check#feedback`, so that
   anchor must exist and must be visible when linked to. See below.
6. **FAQ** — short answers to: Is it free? (yes) · Does it work on Indeed
   outside .nl? (yes, any country subdomain) · Why does the badge not appear on
   some company sites? (only homepages that publish schema.org organisation
   data; everyday sites are skipped) · How current is the list? (refreshed
   daily from ind.nl) · Is this official? (no, not affiliated with IND).

## The feedback form

Writes directly to the project's existing Supabase database from the browser,
using the publishable/anon key — the same project the extension reads its
settings from. Ask me for `SUPABASE_URL` and the publishable key; put them in
the site's environment config, never inline in a committed file.

Insert into `public.feedback`. The table already exists with this shape, and
RLS allows INSERT only (anon cannot read the table back):

```sql
public.feedback (
  id                uuid primary key default gen_random_uuid(),
  message           text not null,   -- trimmed length must be 5..2000
  email             text,            -- optional, <=200 chars, must look like an address
  extension_version text,            -- optional, <=20 chars
  handled           boolean not null default false,
  created_at        timestamptz not null default now()
)
```

Form requirements:

- Fields: message (textarea, required) and email (optional, labelled
  "Email — only if you want a reply").
- Validate in the browser to the same limits as the constraints above, so a
  rejected insert is not the first feedback the user gets. Send `null`, not an
  empty string, for a blank email.
- Do not set `handled`. Leave `extension_version` null unless the URL carries a
  `?v=` parameter, in which case pass it through.
- On success replace the form with a thank-you message; on failure show a
  readable error and keep what the user typed.
- No CAPTCHA unless the site already has one.

## The privacy page

Render the full policy at `/ind-sponsor-check/privacy`, as ordinary page
content (not a PDF, not an embedded iframe) — a Chrome Web Store reviewer opens
this URL and it must load without a login. The source text is
`store/privacy-policy.md` in the extension repo; use it close to verbatim. Keep
the "Last updated" date and the contact address `privacy@zal-group.nl` visible,
and make sure that mailbox or alias actually receives mail before the listing
goes live.

## Meta

- Title: "IND Sponsor Check — see which Dutch companies sponsor visas"
- Description: one sentence naming LinkedIn, Indeed and the IND register.
- Open Graph image: the LinkedIn job screenshot.
- Link the page from wherever the site lists products.
