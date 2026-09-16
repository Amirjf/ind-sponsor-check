import { indeed } from './indeed'
import { linkedin } from './linkedin'
import type { SiteAdapter } from './types'

export const ADAPTERS: readonly SiteAdapter[] = [linkedin, indeed]

export function getAdapter(hostname: string): SiteAdapter | null {
  return ADAPTERS.find((a) => a.hosts.test(hostname)) ?? null
}

export type { CompanyTarget, PageKind, SiteAdapter } from './types'
