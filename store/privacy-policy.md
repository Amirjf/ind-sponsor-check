# Privacy Policy — IND Sponsor Check

_Last updated: 17 September 2026_
_Published at: https://zal-group.nl/ind-sponsor-check/privacy_

**IND Sponsor Check** (the "Extension") is a browser extension
that shows whether a company shown on LinkedIn, Indeed or a company's own
website appears in the public
register of recognised sponsors published by the Dutch Immigration and
Naturalisation Service (IND).

## What the Extension does with data

- The Extension reads the **company name** shown on the LinkedIn or Indeed
  job or company page you are currently viewing. On any other website it reads
  only the page's public structured data (schema.org JSON-LD) to find the
  organisation name. This happens entirely inside your browser.
- The company name is compared against a copy of the IND public register that
  is stored locally in your browser.
- The Extension **does not send the company name, the job you are viewing, or
  any other information about you** to the developer or to any third party.

## Network requests the Extension makes

- **ind.nl**: to download the public register of recognised sponsors
  (approximately once per day).
- **Supabase (a hosted database used by the developer)**: to read two small
  public tables — the address of the register page with the refresh interval,
  and a list of websites on which the badge stays hidden (search engines,
  social networks, developer tools and Dutch government domains). Both
  requests are anonymous reads that contain no information about you and no
  information about the pages you visit.

No analytics, tracking, advertising or telemetry of any kind is used.

## Data storage

The downloaded register, the configuration, and your own settings — which
badges you hid, and on which sites — are stored in your browser's local
extension storage. They never leave your browser and are removed when you
uninstall the Extension.

## Feedback you choose to send

The Extension itself sends nothing. The popup links to the product page at
zal-group.nl, where you can send feedback through a form. Anything you type
into that form is submitted by the website, not by the Extension, and only
when you choose to send it.

## Changes

If this policy changes, the updated version will be published at the same URL
and the "last updated" date will change.

## Contact

Questions about this policy: privacy@zal-group.nl
