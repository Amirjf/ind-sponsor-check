// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getPageKind, indeed } from '../../src/content/sites/indeed'
import { getAdapter } from '../../src/content/sites'

function doc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}
const name = (html: string, kind: 'job' | 'company') => indeed.findCompanyTarget(doc(html), kind)?.name ?? null

describe('indeed.getPageKind', () => {
  it.each([
    ['https://nl.indeed.com/jobs?q=software+engineer&l=Amsterdam&vjk=1fc52aea37934e77', 'job'],
    ['https://nl.indeed.com/jobs?q=x', 'job'],
    ['https://nl.indeed.com/viewjob?jk=1fc52aea37934e77', 'job'],
    ['https://www.indeed.com/q-software-engineer-l-amsterdam-jobs.html', 'job'],
    ['https://nl.indeed.com/cmp/Tradinco-Instruments-1?campaignid=mobvjcmp', 'company'],
    ['https://nl.indeed.com/cmp/Adyen/reviews', 'company'],
    ['https://nl.indeed.com/cmp/', null],
    ['https://nl.indeed.com/', null],
    ['https://nl.indeed.com/career-advice', null],
    ['not a url', null],
  ])('%s -> %s', (url, expected) => {
    expect(getPageKind(url)).toBe(expected)
  })
})

describe('adapter registry', () => {
  it.each([
    ['nl.indeed.com', 'indeed'],
    ['www.indeed.com', 'indeed'],
    ['www.linkedin.com', 'linkedin'],
    ['indeed.com.evil.example', 'website'],
    ['example.com', 'website'],
  ])('%s -> %s', (host, id) => {
    expect(getAdapter(host)?.id ?? null).toBe(id)
  })
})

describe('indeed job pages', () => {
  const detailPane = `
    <main>
      <ul><li><span data-testid="company-name">Wolf Groep</span></li></ul>
      <div data-testid="viewjob-main-content">
        <div data-testid="desktop-job-header">
          <div data-testid="company-info-metadata">
            <div><a dir="ltr" href="https://nl.indeed.com/cmp/Tradinco-Instruments-1?campaignid=mobvjcmp" target="_blank"
                    aria-label="Tradinco Instruments (opens in new tab)">Tradinco Instruments</a></div>
          </div>
        </div>
      </div>
    </main>`

  it('reads the company link in the detail pane, not the result cards', () => {
    const t = indeed.findCompanyTarget(doc(detailPane), 'job')
    expect(t?.name).toBe('Tradinco Instruments')
    expect(t?.placement).toBe('after')
    expect(t?.element.tagName).toBe('A')
  })

  it('supports the older header markup', () => {
    expect(name(`<div data-testid="inlineHeader-companyName"><a href="/cmp/Adyen">Adyen</a></div>`, 'job')).toBe('Adyen')
    expect(name(`<div data-company-name="true">ASML</div>`, 'job')).toBe('ASML')
  })

  it('returns null on a search page with no job open', () => {
    expect(name(`<main><ul><li><span data-testid="company-name">Wolf Groep</span></li></ul></main>`, 'job')).toBeNull()
  })
})

describe('indeed company pages', () => {
  it('reads the schema.org name and places the badge inside it', () => {
    const t = indeed.findCompanyTarget(
      doc(`<div data-testid="head"><h1 class="x">Carrières en werk bij Tradinco Instruments</h1><div itemprop="name">Tradinco Instruments</div></div>`),
      'company',
    )
    expect(t?.name).toBe('Tradinco Instruments')
    expect(t?.placement).toBe('inside')
    expect(t?.element.getAttribute('itemprop')).toBe('name')
  })

  it('falls back to the h1 with the localised prefix removed', () => {
    expect(name(`<h1>Carrières en werk bij Tradinco Instruments</h1>`, 'company')).toBe('Tradinco Instruments')
    expect(name(`<h1>Working at Adyen</h1>`, 'company')).toBe('Adyen')
    expect(name(`<h1>Some Company</h1>`, 'company')).toBe('Some Company')
  })

  it('ignores an already inserted badge', () => {
    expect(name(`<div itemprop="name">Adyen<a class="indsc-badge">✓</a></div>`, 'company')).toBe('Adyen')
  })
})
