// Zips dist/ into release/<name>-<version>.zip for Chrome Web Store upload.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
if (!existsSync('dist/manifest.json')) {
  console.error('dist/manifest.json not found. Run `npm run build` first.')
  process.exit(1)
}
mkdirSync('release', { recursive: true })
const out = `release/${pkg.name}-${pkg.version}.zip`
rmSync(out, { force: true })
execFileSync('zip', ['-r', '-X', `../${out}`, '.'], { cwd: 'dist', stdio: 'inherit' })
console.log(`\nwrote ${out}`)
