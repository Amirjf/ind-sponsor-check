// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { findOrganization, website } from '../../src/content/sites/website'
import { getAdapter } from '../../src/content/sites'

function doc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}
const ld = (...blocks: unknown[]) =>
  doc(blocks.map((b) => `<script type="application/ld+json">${typeof b === 'string' ? b : JSON.stringify(b)}</script>`).join(''))

describe('website.getPageKind', () => {
  it.each([
    ['https://www.transferz.com/', 'company'],
    ['https://www.transferz.com', 'company'],
    ['https://www.transferz.com/?utm_source=x#top', 'company'],
    ['https://www.picnic.app/nl/', 'company'],
    ['https://www.picnic.app/en-us', 'company'],
    ['https://www.transferz.com/partners/api', null],
    ['https://www.freeday.ai/careers/backend-engineer', null],
    ['http://example.com/about', null],
    ['https://example.com/blog/', null],
    ['chrome://extensions', null],
    ['file:///Users/me/index.html', null],
    ['not a url', null],
  ])('%s -> %s', (url, expected) => {
    expect(website.getPageKind(url)).toBe(expected)
  })
})

describe('adapter registry', () => {
  it('uses the generic website adapter for unknown hosts', () => {
    expect(getAdapter('www.transferz.com')?.id).toBe('website')
    expect(getAdapter('www.linkedin.com')?.id).toBe('linkedin')
    expect(getAdapter('nl.indeed.com')?.id).toBe('indeed')
  })
})

describe('findOrganization', () => {
  it('reads a top-level Organization with a legal name', () => {
    const org = findOrganization(
      ld({
        '@context': 'https://schema.org',
        '@id': 'https://www.transferz.com/#organization',
        '@type': 'Organization',
        description: 'Transferz is a B2B ground transportation platform.',
        foundingDate: '2020',
        legalName: 'Transferz B.V.',
        logo: 'https://www.transferz.com/favicon.png',
        name: 'Transferz',
        url: 'https://www.transferz.com/',
      }),
    )
    expect(org).toEqual({ name: 'Transferz', candidates: ['Transferz B.V.', 'Transferz'] })
  })

  it('reads an Organization inside @graph with an alternate name', () => {
    const org = findOrganization(
      ld({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', '@id': 'https://www.freeday.ai/#website', name: 'Freeday', publisher: { '@id': 'https://www.freeday.ai/#organization' } },
          {
            '@id': 'https://www.freeday.ai/#organization',
            '@type': 'Organization',
            alternateName: 'Freeday AI',
            description: 'Enterprise AI digital employees.',
            foundingDate: '2022',
            name: 'Freeday',
          },
        ],
      }),
    )
    expect(org).toEqual({ name: 'Freeday', candidates: ['Freeday', 'Freeday AI'] })
  })

  it('prefers the hiring organization of a job posting', () => {
    const org = findOrganization(
      ld(
        { '@type': 'Organization', name: 'Some Job Board' },
        { '@type': 'JobPosting', title: 'Backend engineer', hiringOrganization: { '@type': 'Organization', name: 'Adyen', sameAs: 'https://adyen.com' } },
      ),
    )
    expect(org?.name).toBe('Adyen')
  })

  it('prefers a node whose @id ends in #organization over other organizations', () => {
    const org = findOrganization(
      ld(
        { '@type': 'Organization', name: 'Partner Ltd' },
        { '@type': 'Corporation', '@id': 'https://asml.com/#organization', name: 'ASML' },
      ),
    )
    expect(org?.name).toBe('ASML')
  })

  it('accepts Organization subtypes, arrays of types and schema.org URLs', () => {
    expect(findOrganization(ld({ '@type': 'LocalBusiness', name: 'Bakkerij Jansen' }))?.name).toBe('Bakkerij Jansen')
    expect(findOrganization(ld({ '@type': ['Organization', 'Brand'], name: 'Picnic' }))?.name).toBe('Picnic')
    expect(findOrganization(ld({ '@type': 'https://schema.org/Corporation', name: 'Philips' }))?.name).toBe('Philips')
    expect(findOrganization(ld({ '@type': 'schema:EducationalOrganization', name: 'TU Delft' }))?.name).toBe('TU Delft')
    expect(findOrganization(ld({ '@type': 'SoftwareCompany', name: 'Nope' }))).toBeNull()
  })

  it('finds an organization nested as publisher or brand', () => {
    const org = findOrganization(ld({ '@type': 'WebPage', name: 'Home', publisher: { '@type': 'Organization', name: 'Booking.com' } }))
    expect(org?.name).toBe('Booking.com')
  })

  it('handles localised name objects and array names', () => {
    expect(findOrganization(ld({ '@type': 'Organization', name: { '@value': 'Coolblue', '@language': 'nl' } }))?.name).toBe('Coolblue')
    expect(findOrganization(ld({ '@type': 'Organization', name: ['Bol', 'Bol.com'] }))?.candidates).toEqual(['Bol', 'Bol.com'])
  })

  it('ignores invalid JSON, non-organization data and nameless organizations', () => {
    expect(findOrganization(ld('{not json'))).toBeNull()
    expect(findOrganization(ld({ '@type': 'Person', name: 'Jane Doe' }))).toBeNull()
    expect(findOrganization(ld({ '@type': 'Organization', url: 'https://x.example' }))).toBeNull()
    expect(findOrganization(doc('<h1>No structured data</h1>'))).toBeNull()
  })

  it('skips invalid blocks and keeps reading later ones', () => {
    expect(findOrganization(ld('{not json', { '@type': 'Organization', name: 'Mollie' }))?.name).toBe('Mollie')
  })
})

describe('website adapter target', () => {
  it('returns a floating target with lookup candidates', () => {
    const t = website.findCompanyTarget(ld({ '@type': 'Organization', name: 'Transferz', legalName: 'Transferz B.V.' }), 'company')
    expect(t?.name).toBe('Transferz')
    expect(t?.candidates).toEqual(['Transferz B.V.', 'Transferz'])
    expect(t?.placement).toBe('floating')
  })

  it('returns null when the page has no organization data', () => {
    expect(website.findCompanyTarget(doc('<p>hi</p>'), 'company')).toBeNull()
  })
})
