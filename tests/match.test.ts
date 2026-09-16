import { describe, expect, it } from 'vitest'
import { buildIndex, matchCompany } from '../src/shared/match'

const index = buildIndex([
  { name: 'Adyen N.V.', kvk: '1' },
  { name: 'ASML Netherlands B.V.', kvk: '2' },
  { name: 'Koninklijke Philips N.V.', kvk: '3' },
  { name: 'Philips Electronics Nederland B.V.', kvk: '4' },
  { name: 'ING Bank N.V.', kvk: '5' },
  { name: 'Booking.com B.V.', kvk: '6' },
  { name: 'ABN AMRO Bank N.V.', kvk: '7' },
  { name: 'AB Sciex Netherlands B.V.', kvk: '8' },
])

describe('matchCompany', () => {
  it('finds exact matches after normalisation', () => {
    const r = matchCompany('Adyen', index)
    expect(r.status).toBe('sponsor')
    expect(r.matches.map((m) => m.kvk)).toEqual(['1'])
  })

  it('strips country suffixes on the register side', () => {
    expect(matchCompany('ASML', index).status).toBe('sponsor')
  })

  it('strips royal prefixes on the register side', () => {
    const r = matchCompany('Philips', index)
    expect(r.status).toBe('sponsor')
    expect(r.matches.map((m) => m.kvk)).toEqual(['3'])
  })

  it('reports a word-boundary prefix as likely', () => {
    const r = matchCompany('ING', index)
    expect(r.status).toBe('likely')
    expect(r.matches.map((m) => m.kvk)).toEqual(['5'])
  })

  it('reports the reverse prefix as likely too', () => {
    const r = matchCompany('Philips Electronics', index)
    expect(r.status).toBe('sponsor')
    const r2 = matchCompany('Booking.com Customer Service Center', index)
    expect(r2.status).toBe('likely')
    expect(r2.matches[0].kvk).toBe('6')
  })

  it('does not prefix-match very short names', () => {
    expect(matchCompany('AB', index).status).toBe('none')
  })

  it('does not match partial words', () => {
    expect(matchCompany('Ady', index).status).toBe('none')
    expect(matchCompany('Adyenify', index).status).toBe('none')
  })

  it('returns none for unknown companies and empty input', () => {
    expect(matchCompany('Totally Unknown Corp', index).status).toBe('none')
    expect(matchCompany('   ', index).status).toBe('none')
  })
})

describe('likely cap', () => {
  it('returns up to 25 prefix matches', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ name: `Acme Unit ${i} B.V.`, kvk: String(i) }))
    const r = matchCompany('Acme', buildIndex(many))
    expect(r.status).toBe('likely')
    expect(r.matches).toHaveLength(25)
  })
})
