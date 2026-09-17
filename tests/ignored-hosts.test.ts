import { describe, expect, it } from 'vitest'
import { DEFAULT_IGNORED_HOSTS, buildIgnoreSet, isIgnoredHost, mergeIgnoredHosts, normalizeHost } from '../src/shared/ignored-hosts'

describe('normalizeHost', () => {
  it.each([
    ['www.Google.com', 'google.com'],
    ['  youtube.com. ', 'youtube.com'],
    ['*.example.com', 'example.com'],
    [42, ''],
    [null, ''],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected)
  })
})

describe('isIgnoredHost', () => {
  const list = ['google.com', 'WWW.YouTube.com', 'localhost']
  it.each([
    ['www.google.com', true],
    ['google.com', true],
    ['mail.google.com', true],
    ['youtube.com', true],
    ['m.youtube.com', true],
    ['localhost', true],
    ['google.com.evil.example', false],
    ['notgoogle.com', false],
    ['transferz.com', false],
    ['', false],
  ])('%s -> %s', (host, expected) => {
    expect(isIgnoredHost(host, list)).toBe(expected)
  })
})

describe('mergeIgnoredHosts', () => {
  it('adds remote entries to the defaults without duplicates', () => {
    const merged = mergeIgnoredHosts(['www.Google.com', 'example.org', '', 'example.org'])
    expect(merged.length).toBe(DEFAULT_IGNORED_HOSTS.length + 1)
    expect(merged).toContain('example.org')
    expect(merged.filter((h) => h === 'google.com')).toHaveLength(1)
  })
  it('works without a remote list', () => {
    expect(mergeIgnoredHosts(undefined)).toEqual([...DEFAULT_IGNORED_HOSTS])
  })
  it('defaults are already normalised', () => {
    for (const h of DEFAULT_IGNORED_HOSTS) expect(normalizeHost(h)).toBe(h)
  })
})

describe('buildIgnoreSet', () => {
  it('normalises entries and drops unusable ones', () => {
    expect(buildIgnoreSet(['WWW.Example.com ', 'example.com', '', '*.foo.nl'])).toEqual(new Set(['example.com', 'foo.nl']))
  })

  it('is accepted directly by isIgnoredHost', () => {
    const set = buildIgnoreSet(['rijksoverheid.nl'])
    expect(isIgnoredHost('www.rijksoverheid.nl', set)).toBe(true)
    expect(isIgnoredHost('transferz.com', set)).toBe(false)
  })
})

describe('suffix matching', () => {
  const set = buildIgnoreSet(['example.com', 'localhost', 'gov.nl'])
  it.each([
    ['example.com', true],
    ['a.example.com', true],
    ['a.b.c.example.com', true],
    ['business.gov.nl', true],
    ['localhost', true],
    ['notexample.com', false],
    ['example.com.evil.test', false],
    ['examplexcom', false],
    ['com', false],
  ])('%s -> %s', (host, expected) => {
    expect(isIgnoredHost(host, set)).toBe(expected)
  })

  it('never matches on a bare public suffix', () => {
    expect(isIgnoredHost('transferz.com', buildIgnoreSet(['example.com']))).toBe(false)
  })

  it('stays correct for a list the size of the government register', () => {
    const many = Array.from({ length: 2500 }, (_, i) => `org${i}.nl`)
    const big = buildIgnoreSet([...many, 'transferz.com'])
    expect(isIgnoredHost('www.org2499.nl', big)).toBe(true)
    expect(isIgnoredHost('freeday.ai', big)).toBe(false)
  })
})

describe('bundled government core', () => {
  const set = buildIgnoreSet(DEFAULT_IGNORED_HOSTS)
  it.each(['www.belastingdienst.nl', 'mijn.duo.nl', 'digid.nl', 'werk.nl', 'www.amsterdam.nl', 'rijksoverheid.nl'])(
    'covers %s before any Supabase fetch',
    (host) => expect(isIgnoredHost(host, set)).toBe(true),
  )

  it('leaves ordinary company sites alone', () => {
    for (const host of ['transferz.com', 'freeday.ai', 'adyen.com', 'tudelft.nl', 'asml.com'])
      expect(isIgnoredHost(host, set)).toBe(false)
  })
})
