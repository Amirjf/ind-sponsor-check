# Chrome Web Store listing

## Name
IND Sponsor Check

## Summary (132 chars max)
Shows on LinkedIn, Indeed and company websites whether the company is an IND recognised sponsor.

## Category
Productivity

## Description
Looking for a job in the Netherlands as a non-EU candidate? Only companies that
are "recognised sponsors" with the IND (Immigration and Naturalisation Service)
can sponsor a highly skilled migrant visa.

This extension adds a small badge next to the company name on every LinkedIn
or Indeed job you open and on every company profile page. On a company's own
website it shows a small floating badge (bottom-right) on the homepage when the
site publishes its organisation name as structured data (schema.org JSON-LD):

- ✓ green: the company is in the IND public register of recognised sponsors
- ≈ yellow: a company with a very similar name is in the register (check the tooltip)
- ✕ red: no matching name was found

Click the badge to open the official IND register. The list is downloaded from
ind.nl and refreshed automatically once a day; a built-in copy makes the
extension work offline and on first install.

The popup lets you check any company name by hand and shows when the list was
last updated.

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
- `storage`: cache the downloaded sponsor list and settings locally.
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
- Host `https://*.supabase.co/*`: read a small remote configuration table
  (the register URL and refresh interval) so the extension can be repaired
  without a new release if IND moves the page.

## Data usage disclosure
- Does not collect user data.
- Does not use remote code. (Remote data only: the sponsor list and a JSON settings table.)

## Assets needed before submitting
- 128x128 icon: `src/assets/icons/icon-128.png` (generated from `logo.png` by `npm run icons`)
- At least one 1280x800 or 640x400 screenshot of a LinkedIn job page with the badge
- Optional 440x280 small promo tile
- A public privacy policy URL (see `store/privacy-policy.md`; host it on GitHub Pages or any site)
