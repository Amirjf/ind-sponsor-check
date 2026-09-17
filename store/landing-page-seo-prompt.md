# Prompt: search/SEO pass for the IND Sponsor Check page on zal-group.nl

Paste this into the session working on the zal-group.nl site. It assumes the
product page from `landing-page-prompt.md` already exists (or is being built in
the same pass) at `/ind-sponsor-check`. It is stack-agnostic: follow whatever
the site already uses.

This is a copy-and-metadata pass, not a redesign. Do not change the layout,
design tokens, or component structure. Everything below is about which words
appear in which slots.

---

## Where these numbers come from

Google Trends, Netherlands, past 12 months, pulled 2026-09-17. Terms were
tested in batches of five against a shared anchor term and renormalised, so the
figures are comparable across batches — the method self-checked to within 1%
(`kennismigrant` returned 2.09 and 2.11 in two independent runs).

The index below is relative: **`work in netherlands` = 100**. It is a measure of
*relative* search interest, not absolute monthly volume. Read it as ranking, not
as traffic forecasting.

## The data

| Keyword | Index | Notes |
|---|---|---|
| work in netherlands | 100 | stable year-round, peaks Nov–Feb |
| jobs in netherlands | 90 | |
| werken in nederland | 83 | Dutch-language — wrong audience, see below |
| visa sponsorship | 99 → **~36 real** | headline figure is a spike, see below |
| visa sponsorship jobs | 45 → ~15 real | same spike |
| english jobs netherlands | 29 | |
| 30% ruling | 21 | |
| expat netherlands | 21 | |
| highly skilled migrant | 20 | **cleanest intent of any term tested** |
| linkedin extension | 17 | |
| work visa netherlands | 16 | |
| move to netherlands | 15 | |
| kennismigrant | 14 | |
| english jobs in netherlands | 11 | |
| it jobs in netherlands | 11 | |
| visa sponsorship netherlands | 6 | |
| blue card netherlands | 6 | |
| ind sponsor | 5 | |
| ind highly skilled migrant | 3 | |
| netherlands job search | 3 | |
| visa sponsorship linkedin | 2 | |
| sponsorship jobs netherlands | 2 | |
| salary threshold netherlands | 2 | |
| dutch work permit | 1 | |
| recognised sponsor | 0.7 | |
| ind register | 0.7 | |
| 27% ruling | 0.2 | |
| erkend referent | 0.15 | |
| erkende referenten · kennismigrantenregeling · public register recognised sponsors · ind erkend referent · companies that sponsor visa netherlands · jobs in netherlands with visa sponsorship · who sponsors visa · knowledge migrant · relocate to netherlands | **0** | below Trends' measurement floor |

## Four findings that drive the copy

**1. The official vocabulary is the unsearched vocabulary.** `recognised
sponsor` scores 0.7 and `erkend referent` 0.15. `erkende referenten`,
`kennismigrantenregeling` and `public register recognised sponsors` are all
flat zero. The audience does not search the legal term for the thing they need —
they search `visa sponsorship` and `highly skilled migrant`. The page must
*explain* the term "recognised sponsor" (it is what the register is called, and
users see it on the badge) but must never *lead* with it.

**2. "IND" is ambiguous to a search engine.** Related queries for `ind` in the
Netherlands are dominated by cricket — `ind vs usa`, `ind vs ned`, `afg vs ind`,
`sl vs ind`, all Breakout. The only on-topic ones are `mijn ind` (100) and `ind
netherlands` (13). "IND" is the right name for people who already know what IND
is, and worth nothing for acquiring people who don't. Never let "IND" carry a
slot alone: pair it with "Netherlands", "visa" or "sponsor" every time it
appears in a title, heading or meta field.

**3. Do not optimise for Dutch.** `werken in nederland` scores 83, but that is
Dutch speakers looking for Dutch jobs — not non-EU candidates who need
sponsorship. Every genuinely on-target term tested is English. Keep the page in
English. A Dutch translation is not worth building for this audience.

**4. Ignore the `visa sponsorship` spike.** Weekly NL data sat flat near 5 from
September through May, then ran 18 → 28 → 40 → 53 → 100 (peak, 9–15 Aug 2026)
and fell back to 10 by mid-September. Every rising related query is Australian:
`australian visa sponsorship jobs`, `482 visa sponsorship jobs`, `seek australia
visa sponsorship jobs`, `australia care jobs with visa sponsorship`. That is a
foreign news cycle passing through, not Dutch demand. Plan against the ~36
baseline. If anyone points at a 7× year-over-year rise in this term, this is
what they are looking at.

## What to change

### Meta

The title currently specified in `landing-page-prompt.md` is:

> IND Sponsor Check — see which Dutch companies sponsor visas

Replace with:

> IND Sponsor Check — Visa Sponsorship Checker for Netherlands Jobs

This keeps the product name first (branded search, and it must match the Chrome
Web Store listing), then spends the remaining characters on `visa sponsorship`
(~36) and `netherlands jobs` (90–100) instead of on the weaker paraphrase
"companies sponsor visas". Keep it under ~60 characters so it does not truncate.

Meta description — one sentence, must contain `visa sponsorship`, `highly
skilled migrant`, `LinkedIn` and `Indeed`. For example:

> Free Chrome extension that shows visa sponsorship status on LinkedIn and
> Indeed — see instantly whether a Dutch employer is an IND recognised sponsor
> who can hire highly skilled migrants.

### H1 and hero

The existing brief suggests a headline like "Does this company sponsor a visa?"
— keep that question form, it matches how people actually phrase the problem.
But the hero subtext directly beneath it must contain, in prose and in this
order of priority: **visa sponsorship**, **highly skilled migrant**,
**Netherlands**, **LinkedIn / Indeed**. Do not stuff — one natural sentence
carrying all four is the target.

### Body vocabulary

Use these phrasings where they fit naturally. They are the audience's own words,
taken from Trends' related-query data:

- `visa sponsorship` — the single most-used phrase for this concept
- `highly skilled migrant` and `highly skilled migrant visa` — 100% on-target
  intent; related queries are `highly skilled migrant netherlands` (100), `ind
  highly skilled migrant` (58), `highly skilled migrant visa netherlands` (27)
- `English-speaking jobs in the Netherlands` — `english jobs in netherlands` is
  the #1 related query for `jobs in netherlands`
- `30% ruling` — index 21, and closely associated with this audience
- `work visa` / `Dutch work visa` — preferred over `work permit` (16 vs 1)

Avoid as load-bearing copy: `erkend referent`, `kennismigrant`, `knowledge
migrant`, `recognised sponsor` *as the first mention of the concept*.

### Salary thresholds — the strongest content opportunity found

`highly skilled migrant salary 2026` is a **+2,400% rising** query and scores 42
against `highly skilled migrant netherlands` at 100. `highly skilled migrant
salary 2024` still registers at 10, which means these pages keep earning traffic
for years after the year in the query.

Add a short section to the page covering the current IND salary thresholds for
the highly skilled migrant scheme, with the year in the heading (e.g. "Highly
skilled migrant salary thresholds in 2026"). Rules for it:

- Source the actual figures from ind.nl. **Do not invent or estimate them** — if
  you cannot verify the current amounts, leave a clear TODO and ship the rest of
  the page rather than guessing at numbers people will make decisions on.
- State the date the figures were checked, and link to the IND page they came
  from.
- Thresholds are indexed annually, so this section needs a yearly review. Note
  that wherever the repo tracks recurring maintenance.

This is adjacent to the product rather than about it, so keep it to a genuinely
useful short block — it earns its place by answering the question, not by being
long.

### FAQ

The existing brief already specifies an FAQ. Phrase the questions as the search
queries themselves rather than as internal paraphrases, and add the starred
ones:

- Which companies in the Netherlands sponsor a visa? ★
- What is an IND recognised sponsor? ★
- How do I find visa sponsorship jobs in the Netherlands? ★
- Does this work on LinkedIn and Indeed?
- Is it free?
- Does it work on Indeed outside .nl?
- Why does the badge not appear on some company websites?
- How current is the list?
- Is this official? (no — not affiliated with IND)

Mark them up with FAQPage structured data if the site already emits JSON-LD
anywhere. If it does not, add plain schema.org FAQPage JSON-LD for this page
only — do not introduce a general structured-data framework for one page.

### Timing

The `work in netherlands` cluster runs 8–10 off-season and peaks at 26–31 across
**November through February** — the New Year job-hunting season. This page wants
to be indexed and settled before that ramp, which means landing these changes in
October rather than December.

## Two things to hold back on

**Do not rename anything to "27% ruling" yet.** The Dutch scheme is changing,
but `27% ruling` scores 0.2 against `30% ruling` at 21. Search behaviour has not
moved. Keep writing `30% ruling`, and revisit once the term actually picks up.

**A browsable register on the site is a bigger decision than this pass.**
Publishing the sponsor list as indexable pages would target the high-intent
long-tail (`companies that sponsor visa netherlands` and similar) that Trends
cannot even measure, and the extension repo already parses that data. But it
means the site becomes a second source of truth for a list that changes, with a
staleness problem and a real duplication-of-ind.nl question. Raise it as a
proposal; do not build it as part of this pass.

## Caveat on the zeros

Google Trends reports 0 for anything beneath its measurement floor. Several
terms above — `companies that sponsor visa netherlands`, `jobs in netherlands
with visa sponsorship` — are almost certainly *low volume and very high intent*,
which is exactly what a niche landing page should rank for. Their zeros mean
"unmeasurable by this tool", not "nobody searches this". Do not use this data to
argue a long-tail phrase is worthless. If real volume figures are needed for
those, Keyword Planner or Ahrefs is the right instrument; Trends is not.
