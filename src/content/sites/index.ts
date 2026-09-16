import { indeed } from './indeed'
import { linkedin } from './linkedin'
import { website } from './website'
import type { SiteAdapter } from './types'

/** Ordered: site-specific adapters first, the generic website adapter (matches any host) last. */
export const ADAPTERS: readonly SiteAdapter[] = [linkedin, indeed, website]

export function getAdapter(hostname: string): SiteAdapter | null {
  return ADAPTERS.find((a) => a.hosts.test(hostname)) ?? null
}

export type { CompanyTarget, PageKind, SiteAdapter } from './types'
