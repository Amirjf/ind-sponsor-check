# Chrome Web Store listing

## Name
IND Sponsor Check

## Summary (132 chars max)
Shows on LinkedIn, Indeed and company websites whether the company is an IND recognised sponsor.

## Category
Productivity

## Website
https://zal-group.nl/ind-sponsor-check

## Privacy policy URL
https://zal-group.nl/ind-sponsor-check/privacy

## Description
Looking for a job in the Netherlands as a non-EU candidate? Only companies that
are "recognised sponsors" with the IND (Immigration and Naturalisation Service)
can sponsor a highly skilled migrant visa.

This extension adds a small badge next to the company name on every LinkedIn
or Indeed job you open and on every company profile page. On a company's own
website it shows a small floating badge (bottom-right) on the homepage when the
site publishes its organisation name as structured data (schema.org JSON-LD).
Everyday sites such as search engines, social networks, developer tools and
Dutch government domains are skipped:

- ✓ green: the company is in the IND public register of recognised sponsors
- ≈ yellow: companies with a similar name are in the register (click the badge to see the list)
- ✕ red: no matching name was found

Click the badge to open the official IND register. The list is downloaded from
ind.nl and refreshed automatically once a day; a built-in copy makes the
extension work offline and on first install.

You stay in control of the floating badge on company websites: its × hides it
for now, on that site only, or on all company websites — and the popup undoes
any of those choices. The badges on LinkedIn and Indeed are not affected.

The popup lets you check any company name by hand and shows when the list was
last updated. A short welcome page opens once on install to explain the three
badge colours.

The extension does not collect, store or transmit any personal data. It only
reads the company name on the page you are viewing (LinkedIn, Indeed, or the
structured data of a company website), and compares it locally against the
register. Nothing about the pages you visit leaves your browser.

Not affiliated with IND, LinkedIn or Indeed.

## Single purpose (reviewer field)
Display whether the company shown on the page the user is viewing (a LinkedIn
or Indeed job or company page, or a company's own website) is listed in the
IND public register of recognised sponsors.

## Permission justifications (reviewer field)
- `storage`: cache the downloaded sponsor list, the remote settings and the
  user's own badge preferences locally.
- `alarms`: refresh the sponsor list once a day in the background.
- Content script on `https://*/*` and `http://*/*`: reads the company name on
  LinkedIn and Indeed job and company pages, and on any other site reads only
  the page's schema.org JSON-LD to find the organisation name, then inserts
  the badge. The script sends the company name to the extension's own service
  worker for a local lookup and makes no other network request. Company
  websites cannot be enumerated in advance, which is why all sites are matched;
  LinkedIn and Indeed are single-page apps, so the script must also be present
  site-wide there.
- Host `https://ind.nl/*`: download the public sponsor register.
- Host `https://*.supabase.co/*`: read two small public tables — the register
  URL with the refresh interval, and the list of sites on which the badge stays
  hidden — so the extension can be repaired without a new release if IND moves
  the page. Anonymous reads; no user data is sent.

## Data usage disclosure
- Does not collect user data.
- Does not use remote code. (Remote data only: the sponsor list and two JSON
  tables of configuration.)

## Assets for the submission
- 128x128 icon: `src/assets/icons/icon-128.png` (generated from `logo.png` by `npm run icons`)
- Screenshots (1280x800 PNG, ready to upload, in order): `store/screenshots/1280x800/`
  — rendered from the scenes in `store/scenes/` by `npm run shots` (see the
  README); no real pages or people in them, nothing to blur
- Package: `release/ind-sponsor-check-1.0.0.zip` (`npm run build && npm run zip`)
- Optional 440x280 small promo tile — not made yet
