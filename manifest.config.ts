import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'IND Sponsor Check',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'src/assets/icons/icon-16.png',
    32: 'src/assets/icons/icon-32.png',
    48: 'src/assets/icons/icon-48.png',
    128: 'src/assets/icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'IND Sponsor Check',
    default_icon: {
      16: 'src/assets/icons/icon-16.png',
      32: 'src/assets/icons/icon-32.png',
    },
  },
  // NOTE: entry files need distinct basenames. With two `index.ts` entries CRXJS
  // emitted one chunk name and the service-worker loader imported the content script.
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      // LinkedIn and Indeed get dedicated adapters (job + company pages). Every
      // other site is treated as a possible company website: the script reads
      // the page's schema.org JSON-LD and only shows a badge when it names an
      // organisation. Job sites are single-page apps, so the script must be
      // present site-wide rather than only on job URLs.
      matches: ['https://*/*', 'http://*/*'],
      exclude_matches: ['https://ind.nl/*'],
      js: ['src/content/content-script.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'alarms'],
  host_permissions: ['https://ind.nl/*', 'https://*.supabase.co/*'],
})
