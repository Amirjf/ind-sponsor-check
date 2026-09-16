import { describe, expect, it } from 'vitest'
import snapshot from '../src/data/sponsors-snapshot.json'
import { buildIndex, matchCompany } from '../src/shared/match'
import type { Sponsor } from '../src/shared/types'

/** Guards the matcher against the real register: well-known sponsors must resolve. */
const index = buildIndex(snapshot.sponsors as Sponsor[])

describe('real register snapshot', () => {
  it('has a plausible number of rows', () => {
    expect(index.size).toBeGreaterThan(10000)
  })

  it.each([
    'Adyen', 'ASML', 'Booking.com', 'Philips', 'ING', 'ABN AMRO', 'Rabobank', 'Uber', 'Mollie', 'bunq',
    'Picnic', 'TomTom', 'Shell', 'Heineken', 'Ahold Delhaize', 'Coolblue', 'Bol.com',
    'Databricks', 'Optiver', 'IMC', 'Flow Traders', 'Nike', 'Netflix', 'Google', 'Microsoft',
  ])('%s is found (sponsor or likely)', (name) => {
    const r = matchCompany(name, index)
    expect(r.status, `${name} -> ${r.core} ${JSON.stringify(r.matches.map((m) => m.name))}`).not.toBe('none')
  })

  it('does not match made-up companies', () => {
    expect(matchCompany('Zzyzx Quantum Llamas', index).status).toBe('none')
  })

  // Known limitation: brands listed only under an unrelated legal name
  // (KLM = "Koninklijke Luchtvaart Maatschappij N.V.", Miro = "RealtimeBoard")
  // and partial words ("Elastic" vs "elasticsearch B.V.") are reported as none.
  it.each(['KLM', 'Miro', 'Elastic'])('%s is a documented miss', (name) => {
    expect(matchCompany(name, index).status).toBe('none')
  })
})
