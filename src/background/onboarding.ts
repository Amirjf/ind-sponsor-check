/** Path of the intro page inside the built extension (CRXJS keeps HTML entry paths). */
export const INTRO_PAGE = 'src/intro/index.html'

/**
 * Opens the intro page in a new tab the first time the extension is installed.
 * Updates (ours or Chrome's) are silent.
 */
export function openIntroOnInstall(details: chrome.runtime.InstalledDetails): void {
  if (details.reason !== 'install') return
  void chrome.tabs.create({ url: chrome.runtime.getURL(INTRO_PAGE) })
}
