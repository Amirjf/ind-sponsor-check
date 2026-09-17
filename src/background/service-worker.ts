import { ALARM_NAME, STORAGE_KEYS } from '../shared/config'
import type { CheckResponse, HostPolicyResponse, Message, StatusInfo } from '../shared/types'
import { websiteBadgePolicy } from './host-policy'
import { openIntroOnInstall } from './onboarding'
import { loadPrefs, muteHostPref, patchPrefs } from './prefs'
import { fetchRemoteSettings, loadCachedSettings, settingsAreStale, supabaseConfigured } from './settings'
import { check, getCacheOrBundled, isStale, refreshSponsors } from './sponsor-store'

let refreshing: Promise<void> | null = null

async function setLastError(message: string | null) {
  await chrome.storage.local.set({ [STORAGE_KEYS.lastError]: message })
}

async function getLastError(): Promise<string | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.lastError)
  return (stored[STORAGE_KEYS.lastError] as string | null | undefined) ?? null
}

/**
 * Re-reads settings from Supabase, then re-downloads the register if needed.
 *
 * Both fetches are gated on age. That matters because every company lookup
 * calls this opportunistically: without the gate, the `ignored_hosts` table
 * (a couple of thousand rows, paged) would be re-downloaded on every job page
 * the user opens. `force` is for install, the alarm and the popup's button.
 */
function refresh(force: boolean): Promise<void> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    let settings = await loadCachedSettings()
    if (force || settingsAreStale(settings)) {
      try {
        settings = await fetchRemoteSettings()
      } catch (err) {
        console.warn('[ind-sponsor-check] settings fetch failed, using cached/default', err)
      }
    }
    await scheduleAlarm(settings.refreshHours)

    const cache = await getCacheOrBundled()
    if (!force && cache.source !== 'bundled' && !isStale(cache, settings.refreshHours)) return

    try {
      const fresh = await refreshSponsors(settings)
      await setLastError(null)
      console.info(`[ind-sponsor-check] loaded ${fresh.sponsors.length} sponsors from ${fresh.source}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await setLastError(message)
      console.warn('[ind-sponsor-check] refresh failed', err)
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function scheduleAlarm(refreshHours: number) {
  const periodInMinutes = Math.max(60, Math.round(refreshHours * 60))
  const existing = await chrome.alarms.get(ALARM_NAME)
  if (existing && existing.periodInMinutes === periodInMinutes) return
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes, delayInMinutes: periodInMinutes })
}

async function status(): Promise<StatusInfo> {
  const [cache, settings, lastError] = await Promise.all([getCacheOrBundled(), loadCachedSettings(), getLastError()])
  return {
    count: cache.sponsors.length,
    fetchedAt: cache.fetchedAt,
    source: cache.source,
    registerUpdatedText: cache.registerUpdatedText,
    registerUrl: settings.registerUrl,
    refreshHours: settings.refreshHours,
    supabaseConfigured,
    settingsFetchedAt: settings.fetchedAt ?? null,
    lastError,
    refreshing: refreshing !== null,
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  openIntroOnInstall(details)
  void refresh(true)
})

chrome.runtime.onStartup.addListener(() => {
  void refresh(false)
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void refresh(true)
})

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_COMPANY': {
      void (async () => {
        const [result, settings] = await Promise.all([check(message.name), loadCachedSettings()])
        const response: CheckResponse = { ...result, registerUrl: settings.registerUrl }
        sendResponse(response)
        // Opportunistic background refresh; never blocks the answer.
        void refresh(false)
      })()
      return true
    }
    case 'IS_HOST_IGNORED': {
      void websiteBadgePolicy(message.host).then((policy) => sendResponse(policy satisfies HostPolicyResponse))
      return true
    }
    case 'GET_PREFS': {
      void loadPrefs().then(sendResponse)
      return true
    }
    case 'SET_PREFS': {
      void patchPrefs(message.prefs).then(sendResponse)
      return true
    }
    case 'MUTE_HOST': {
      void muteHostPref(message.host).then(sendResponse)
      return true
    }
    case 'GET_STATUS': {
      void status().then(sendResponse)
      return true
    }
    case 'REFRESH': {
      void refresh(true).then(status).then(sendResponse)
      return true
    }
    default:
      return false
  }
})
