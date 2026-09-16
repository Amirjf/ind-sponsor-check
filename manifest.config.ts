import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'IND Sponsor Check for LinkedIn',
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
      // LinkedIn is a single-page app: a user can land on /feed and navigate
      // to /jobs without a reload, so the script must be present site-wide.
      // It does nothing unless the current URL is a job page.
      matches: ['https://www.linkedin.com/*'],
      js: ['src/content/content-script.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'alarms'],
  host_permissions: ['https://ind.nl/*', 'https://*.supabase.co/*'],
})
