import type { HostPolicyResponse } from '../shared/types'
import { isWebsiteBadgeAllowed } from '../shared/user-prefs'
import { loadPrefs } from './prefs'
import { isHostIgnored } from './settings'

/**
 * The one question the content script asks before running the generic
 * company-website check: two independent reasons to stay quiet — the curated
 * ignore list (bundled + Supabase), and the user's own choices from the
 * badge's hide menu. The layout rides along, because the prefs are already
 * loaded here and the content script needs it before it draws anything.
 */
export async function websiteBadgePolicy(hostname: string): Promise<HostPolicyResponse> {
  const [curated, prefs] = await Promise.all([isHostIgnored(hostname), loadPrefs()])
  return { ignored: curated || !isWebsiteBadgeAllowed(prefs, hostname), mode: prefs.websiteBadgeMode }
}
