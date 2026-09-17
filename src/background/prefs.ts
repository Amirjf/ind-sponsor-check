import { STORAGE_KEYS } from '../shared/config'
import { muteHost, normalizePrefs, type UserPrefs } from '../shared/user-prefs'

/**
 * The user's own badge choices. Small and written rarely (only when someone
 * uses the badge's hide menu or the popup), so every change is a plain
 * read-modify-write of the whole object.
 */
export async function loadPrefs(): Promise<UserPrefs> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.prefs)
  return normalizePrefs(stored[STORAGE_KEYS.prefs])
}

async function save(prefs: UserPrefs): Promise<UserPrefs> {
  await chrome.storage.local.set({ [STORAGE_KEYS.prefs]: prefs })
  return prefs
}

/** Applies a partial change over the stored prefs. */
export async function patchPrefs(patch: Partial<UserPrefs>): Promise<UserPrefs> {
  const current = await loadPrefs()
  return save(normalizePrefs({ ...current, ...patch }))
}

/** Adds one host to the muted list, keeping the rest of the list. */
export async function muteHostPref(host: string): Promise<UserPrefs> {
  return save(muteHost(await loadPrefs(), host))
}
