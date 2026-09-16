import { describe, expect, it } from 'vitest'
import { coreName, tokenize } from '../src/shared/normalize'

describe('tokenize', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(tokenize('Coöperatie "Aa-Dee" B.V.')).toEqual(['cooperatie', 'aa', 'dee', 'b', 'v'])
  })
  it('turns & into and', () => {
    expect(tokenize('A&S System Integrators')).toEqual(['a', 'and', 's', 'system', 'integrators'])
  })
})

describe('coreName', () => {
  it.each([
    ['Adyen N.V.', 'adyen'],
    ['Adyen', 'adyen'],
    ['ASML Netherlands B.V.', 'asml'],
    ['Booking.com B.V.', 'booking com'],
    ['Koninklijke Philips N.V.', 'philips'],
    ['Philips Electronics Nederland B.V.', 'philips electronics'],
    ['ING Bank N.V.', 'ing bank'],
    ['Stichting Amsterdam UMC', 'amsterdam umc'],
    ['Tiffany & Co.', 'tiffany'],
    ['2 Getthere Holding B.V.', '2 getthere'],
    ['Uber International Holding B.V.', 'uber'],
    ['The Netherlands Cancer Institute', 'netherlands cancer institute'],
    ['A.T. Kearney B.V.', 'a t kearney'],
    ['Vereniging V.O.F.', 'vereniging'],
  ])('%s -> %s', (input, expected) => {
    expect(coreName(input)).toBe(expected)
  })

  it('never strips the last token', () => {
    expect(coreName('Holland International B.V.')).toBe('holland')
    expect(coreName('Holding')).toBe('holding')
  })
})
