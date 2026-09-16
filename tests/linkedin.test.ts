// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { extractCompanyName, isJobPage } from '../src/content/linkedin'

function doc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('isJobPage', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/123/', true],
    ['https://www.linkedin.com/jobs/search/?currentJobId=1&keywords=x', true],
    ['https://www.linkedin.com/jobs/collections/recommended/?currentJobId=2', true],
    ['https://www.linkedin.com/feed/', false],
    ['https://www.linkedin.com/in/someone/', false],
  ])('%s -> %s', (url, expected) => {
    expect(isJobPage(url)).toBe(expected)
  })
})

describe('extractCompanyName', () => {
  it('reads the logged-in top card', () => {
    const d = doc(`
      <div class="job-details-jobs-unified-top-card__company-name">
        <a href="/company/adyen/life">  Adyen </a>
      </div>`)
    expect(extractCompanyName(d)).toBe('Adyen')
  })

  it('reads the guest top card', () => {
    const d = doc(`<a class="topcard__org-name-link" href="/company/asml">ASML</a>`)
    expect(extractCompanyName(d)).toBe('ASML')
  })

  it('falls back to any company link inside main', () => {
    const d = doc(`<main><div><a href="https://www.linkedin.com/company/booking-com/">Booking.com</a></div></main>`)
    expect(extractCompanyName(d)).toBe('Booking.com')
  })

  it('returns null when nothing matches', () => {
    expect(extractCompanyName(doc('<main><p>no company here</p></main>'))).toBeNull()
  })
})
