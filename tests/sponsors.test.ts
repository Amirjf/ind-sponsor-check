import { describe, expect, it } from 'vitest'
import { parseRegisterHtml, parseRegisterUpdatedText, parseSponsorsJson } from '../src/shared/sponsors'

const html = `
<p>The register was last updated on 3 September 2026.</p>
<table><thead><tr><th scope="col">Organisation</th><th scope="col">KVK number</th></tr></thead>
<tbody>
<tr><th scope="row">""Aa-Dee"" Machinefabriek B.V.</th><td>16051874</td></tr>
<tr><th scope="row">A&amp;S System Integrators B.V.</th><td>52135403</td></tr>
<tr><th scope="row">Caf&#233; Zomer</th><td>  01234567 </td></tr>
<tr><th scope="row"><a href="#">Linked Name</a> B.V.</th><td>99999999</td></tr>
</tbody></table>`

describe('parseRegisterHtml', () => {
  it('extracts organisation and KVK rows and skips the header', () => {
    expect(parseRegisterHtml(html)).toEqual([
      { name: '""Aa-Dee"" Machinefabriek B.V.', kvk: '16051874' },
      { name: 'A&S System Integrators B.V.', kvk: '52135403' },
      { name: 'Café Zomer', kvk: '01234567' },
      { name: 'Linked Name B.V.', kvk: '99999999' },
    ])
  })
  it('returns an empty list for pages without the table', () => {
    expect(parseRegisterHtml('<html><body>Maintenance</body></html>')).toEqual([])
  })
})

describe('parseRegisterUpdatedText', () => {
  it('finds the last-updated sentence', () => {
    expect(parseRegisterUpdatedText(html)).toBe('3 September 2026')
  })
  it('is undefined when absent', () => {
    expect(parseRegisterUpdatedText('<p>nothing</p>')).toBeUndefined()
  })
})

describe('parseSponsorsJson', () => {
  it('accepts a bare array', () => {
    expect(parseSponsorsJson('[{"name":"X B.V.","kvk":"1"}]')).toEqual([{ name: 'X B.V.', kvk: '1' }])
  })
  it('accepts the snapshot object shape and tolerates missing kvk', () => {
    expect(parseSponsorsJson('{"sponsors":[{"name":" Y "},{"nope":1}]}')).toEqual([{ name: 'Y', kvk: '' }])
  })
  it('rejects other shapes', () => {
    expect(() => parseSponsorsJson('{"foo":1}')).toThrow()
  })
})
