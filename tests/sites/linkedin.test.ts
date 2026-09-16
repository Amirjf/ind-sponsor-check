// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getPageKind, linkedin } from '../../src/content/sites/linkedin'

function doc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}
const name = (html: string, kind: 'job' | 'company') => linkedin.findCompanyTarget(doc(html), kind)?.name ?? null

describe('linkedin.getPageKind', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/123/', 'job'],
    ['https://www.linkedin.com/jobs/search/?currentJobId=1&keywords=x', 'job'],
    ['https://www.linkedin.com/jobs/collections/recommended/?currentJobId=2', 'job'],
    ['https://www.linkedin.com/company/transferz/', 'company'],
    ['https://www.linkedin.com/company/transferz/jobs/', 'company'],
    ['https://www.linkedin.com/company/12345/about/?x=1', 'company'],
    ['https://www.linkedin.com/company/', null],
    ['https://www.linkedin.com/feed/', null],
    ['https://www.linkedin.com/in/someone/', null],
  ])('%s -> %s', (url, expected) => {
    expect(getPageKind(url)).toBe(expected)
  })
  it('matches linkedin hosts only', () => {
    expect(linkedin.hosts.test('www.linkedin.com')).toBe(true)
    expect(linkedin.hosts.test('nl.linkedin.com')).toBe(true)
    expect(linkedin.hosts.test('linkedin.com.evil.example')).toBe(false)
  })
})

describe('linkedin job pages', () => {
  it('reads the logged-in top card and places the badge after the link', () => {
    const t = linkedin.findCompanyTarget(
      doc(`<div class="job-details-jobs-unified-top-card__company-name"><a href="/company/adyen/life">  Adyen </a></div>`),
      'job',
    )
    expect(t?.name).toBe('Adyen')
    expect(t?.placement).toBe('after')
    expect(t?.element.tagName).toBe('A')
  })
  it('reads the guest top card', () => {
    expect(name(`<a class="topcard__org-name-link" href="/company/asml">ASML</a>`, 'job')).toBe('ASML')
  })
  it('falls back to any company link inside main', () => {
    expect(name(`<main><div><a href="https://www.linkedin.com/company/booking-com/">Booking.com</a></div></main>`, 'job')).toBe('Booking.com')
  })
  it('returns null when nothing matches', () => {
    expect(name('<main><p>no company here</p></main>', 'job')).toBeNull()
  })
})

describe('linkedin company pages', () => {
  it('reads the guest title and places the badge inside the h1', () => {
    const t = linkedin.findCompanyTarget(doc(`<main><h1 class="top-card-layout__title font-bold">transferz</h1></main>`), 'company')
    expect(t?.name).toBe('transferz')
    expect(t?.placement).toBe('inside')
    expect(t?.element.tagName).toBe('H1')
  })
  it('reads the logged-in title', () => {
    expect(name(`<h1 class="org-top-card-summary__title"><span dir="ltr"> Adyen </span></h1>`, 'company')).toBe('Adyen')
  })
  it('falls back to the first h1 in main', () => {
    expect(name(`<main><section><h1>Some Company</h1></section></main>`, 'company')).toBe('Some Company')
  })
  it('ignores a badge already inserted into the heading', () => {
    expect(name(`<h1 class="org-top-card-summary__title">Adyen<a class="indsc-badge">✓ IND recognised sponsor</a></h1>`, 'company')).toBe('Adyen')
  })
  it('does not use job selectors on company pages', () => {
    expect(name(`<main><a href="/company/other/">Other Co</a></main>`, 'company')).toBeNull()
  })
})
